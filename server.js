/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Øyvind Øyen
 *
 * Local slicer JSON API (Node fs — bypasses browser sandbox on ~/Library).
 *
 * Supports both **BambuStudio** and **OrcaSlicer** data roots. The active root
 * is chosen per request via `?slicer=bambu|orca` (default: `bambu`).
 *
 * Usage:
 *   BAMBUSTUDIO_ROOT="/path/to/BambuStudio" \
 *   ORCASLICER_ROOT="/path/to/OrcaSlicer" \
 *   PORT=3847 node server.js
 *
 * Defaults (macOS):
 *   - bambu: ~/Library/Application Support/BambuStudio
 *   - orca:  ~/Library/Application Support/OrcaSlicer
 *
 * Frontend: set NEXT_PUBLIC_BAMBU_API_URL=http://127.0.0.1:3847
 */

const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 3847);

const DEFAULT_ROOTS = {
  bambu:
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support", "BambuStudio")
      : path.join(os.homedir(), "BambuStudio"),
  orca:
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support", "OrcaSlicer")
      : path.join(os.homedir(), "OrcaSlicer"),
};

const ROOTS = {
  bambu: path.resolve(process.env.BAMBUSTUDIO_ROOT || DEFAULT_ROOTS.bambu),
  orca: path.resolve(process.env.ORCASLICER_ROOT || DEFAULT_ROOTS.orca),
};

/** BambuStudio puts everything under a single vendor folder (`BBL`). */
const BAMBU_SYSTEM_VENDOR = "BBL";
/** Same logical path as BambuStudio/system/BBL/filament/fdm_filament_common.json */
const FDM_FILAMENT_COMMON_FILENAME = "fdm_filament_common.json";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** `?slicer=orca` selects OrcaSlicer; anything else (including missing) → bambu. */
function getSlicer(url) {
  const v = (url.searchParams.get("slicer") || "").toLowerCase();
  return v === "orca" ? "orca" : "bambu";
}

function rootForSlicer(slicer) {
  return ROOTS[slicer];
}

function normalizeRelativePath(p) {
  return String(p)
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function normalizeInheritsReference(raw) {
  let t = String(raw).trim().replace(/\\/g, "/");
  const lower = t.toLowerCase();
  // Strip a leading "BambuStudio/" or "OrcaSlicer/" anchor if some preset
  // happens to ship absolute-ish references.
  for (const needle of ["bambustudio/", "orcaslicer/"]) {
    const idx = lower.lastIndexOf(needle);
    if (idx !== -1) {
      t = t.slice(idx + needle.length);
      break;
    }
  }
  return normalizeRelativePath(t);
}

function isUnderFilamentBase(relPath) {
  return normalizeRelativePath(relPath).includes("/filament/base/");
}

function dirnameRel(relPath) {
  const parts = normalizeRelativePath(relPath).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function joinRel(dir, fileName) {
  const d = dir.replace(/\/+$/, "");
  const f = String(fileName).replace(/^\/+/, "");
  return d ? `${d}/${f}` : f;
}

function safeFsPath(rootAbs, relativePosix) {
  const norm = normalizeRelativePath(relativePosix);
  const parts = norm.split("/").filter(Boolean);
  for (const p of parts) {
    if (p === "..") throw new Error("Invalid path segment");
  }
  const joined = path.join(rootAbs, ...parts);
  const resolved = path.resolve(joined);
  const rootResolved = path.resolve(rootAbs);
  const sep = path.sep;
  const prefix = rootResolved.endsWith(sep) ? rootResolved : rootResolved + sep;
  if (resolved !== rootResolved && !resolved.startsWith(prefix)) {
    throw new Error("Path escapes slicer root");
  }
  return resolved;
}

async function fileExists(rootAbs, relPosix) {
  try {
    await fs.stat(safeFsPath(rootAbs, relPosix));
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(rootAbs, relPosix) {
  const full = safeFsPath(rootAbs, relPosix);
  const text = await fs.readFile(full, "utf8");
  const data = JSON.parse(text);
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid profile JSON (expected object): ${relPosix}`);
  }
  return data;
}

function inferProfileKind(relPath) {
  return normalizeRelativePath(relPath).includes("/filament/")
    ? "filament"
    : "process";
}

/**
 * Returns the list of `system/<vendor>/<kind>` dirs to search for inherits
 * references. Bambu uses a single vendor (BBL); Orca enumerates every
 * top-level vendor folder under `system/`.
 */
async function systemSearchDirs(rootAbs, slicer, kind) {
  const sub = kind === "filament" ? "filament" : "process";
  if (slicer === "bambu") {
    return [`system/${BAMBU_SYSTEM_VENDOR}/${sub}`];
  }
  const sysAbs = path.join(rootAbs, "system");
  let ents;
  try {
    ents = await fs.readdir(sysAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = [];
  for (const e of ents) {
    if (e.isDirectory()) {
      dirs.push(`system/${e.name}/${sub}`);
    }
  }
  return dirs;
}

/** Best-effort lookup of `fdm_filament_common.json` across known system dirs. */
async function findFdmFilamentCommon(rootAbs, slicer) {
  const dirs = await systemSearchDirs(rootAbs, slicer, "filament");
  for (const d of dirs) {
    const rel = joinRel(d, FDM_FILAMENT_COMMON_FILENAME);
    if (await fileExists(rootAbs, rel)) return rel;
  }
  return null;
}

function normalizeInheritsFileName(inherits) {
  const trimmed = inherits.trim();
  const base = trimmed.includes("/")
    ? trimmed.split("/").pop() || trimmed
    : trimmed;
  if (!base.toLowerCase().endsWith(".json")) return `${base}.json`;
  return base;
}

function getInheritsField(data) {
  const v = data.inherits;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

async function resolveParentRelativePath(
  rootAbs,
  slicer,
  currentPath,
  inheritsRaw,
  kind,
) {
  const trimmed = inheritsRaw.trim();
  const normalizedPath = normalizeRelativePath(currentPath);
  const currentDir = dirnameRel(normalizedPath);
  const sysDirs = await systemSearchDirs(rootAbs, slicer, kind);
  const ref = normalizeInheritsReference(trimmed);

  if (ref.includes("/")) {
    const fromCurrent = normalizeRelativePath(joinRel(currentDir, ref));
    if (await fileExists(rootAbs, fromCurrent)) return fromCurrent;
    const fromRoot = ref;
    if (await fileExists(rootAbs, fromRoot)) return fromRoot;
  }

  const fileName = normalizeInheritsFileName(ref);
  const searchDirs = [];
  const add = (d) => {
    if (d && !searchDirs.includes(d)) searchDirs.push(d);
  };
  add(currentDir);
  if (kind === "filament" && !isUnderFilamentBase(currentPath)) {
    add(joinRel(currentDir, "base"));
  }
  for (const d of sysDirs) add(d);

  for (const dir of searchDirs) {
    const rel = joinRel(dir, fileName);
    if (await fileExists(rootAbs, rel)) return normalizeRelativePath(rel);
  }
  return null;
}

async function resolveInheritanceRecursive(
  rootAbs,
  slicer,
  userFilePath,
  kind,
  visited,
) {
  const p = normalizeRelativePath(userFilePath);
  if (visited.has(p)) throw new Error(`Inheritance cycle detected at "${p}"`);
  visited.add(p);

  const data = await readJsonFile(rootAbs, p);
  const inherits = getInheritsField(data);

  if (!inherits) {
    const leaf = { relativePath: p, data };
    if (kind === "filament") {
      const commonRel = await findFdmFilamentCommon(rootAbs, slicer);
      if (commonRel && normalizeRelativePath(p) !== commonRel) {
        const commonData = await readJsonFile(rootAbs, commonRel);
        return [{ relativePath: commonRel, data: commonData }, leaf];
      }
    }
    return [leaf];
  }

  const parentPath = await resolveParentRelativePath(
    rootAbs,
    slicer,
    p,
    inherits,
    kind,
  );
  if (!parentPath) {
    const sysDirs = await systemSearchDirs(rootAbs, slicer, kind);
    throw new Error(
      `Could not resolve inherits "${inherits}" from "${p}". Tried same folder and ${sysDirs.join(", ") || "(no system dirs)"}.`,
    );
  }

  const ancestors = await resolveInheritanceRecursive(
    rootAbs,
    slicer,
    parentPath,
    kind,
    visited,
  );
  return [...ancestors, { relativePath: p, data }];
}

async function detectLayout(rootAbs) {
  const usersPath = path.join(rootAbs, "users");
  const userPath = path.join(rootAbs, "user");
  try {
    await fs.access(usersPath);
    const ents = await fs.readdir(usersPath, { withFileTypes: true });
    return {
      layout: "users",
      accounts: ents
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort(),
    };
  } catch {
    /* no users */
  }
  try {
    await fs.access(userPath);
    const ents = await fs.readdir(userPath, { withFileTypes: true });
    return {
      layout: "user",
      accounts: ents
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort(),
    };
  } catch {
    /* no user */
  }
  return { layout: null, accounts: [] };
}

async function listJsonInDir(dirAbs) {
  const names = [];
  let ents;
  try {
    ents = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return names;
  }
  for (const e of ents) {
    if (e.isFile() && e.name.toLowerCase().endsWith(".json"))
      names.push(e.name);
  }
  return names.sort();
}

/** Hide Bambu shared layer templates `fdm_filament_*` only. */
function isFdmFilamentInternalPreset(name) {
  const base = name.replace(/\.json$/i, "");
  return /^fdm_filament(?:_|$)/i.test(base);
}

function isSupportPresetFileName(name) {
  return name.toLowerCase().includes("support");
}

function isUnderscorePresetFileName(name) {
  return name.includes("_");
}

/**
 * For Bambu: system/BBL/filament root-level JSON + one subfolder level.
 * For Orca: aggregate the same shape across every vendor folder under system/.
 * Returns { relativePath, folder, fileName }.
 */
async function listSystemFilamentEntries(rootAbs, slicer) {
  const vendorBases =
    slicer === "bambu"
      ? [`system/${BAMBU_SYSTEM_VENDOR}/filament`]
      : await (async () => {
          const sysAbs = path.join(rootAbs, "system");
          let ents;
          try {
            ents = await fs.readdir(sysAbs, { withFileTypes: true });
          } catch {
            return [];
          }
          return ents
            .filter((e) => e.isDirectory())
            .map((e) => `system/${e.name}/filament`);
        })();

  const out = [];
  for (const base of vendorBases) {
    const dirAbs = path.join(rootAbs, ...base.split("/"));
    let ents;
    try {
      ents = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      if (
        e.isFile() &&
        e.name.toLowerCase().endsWith(".json") &&
        !isFdmFilamentInternalPreset(e.name) &&
        !isSupportPresetFileName(e.name) &&
        !isUnderscorePresetFileName(e.name)
      ) {
        out.push({
          relativePath: joinRel(base, e.name),
          folder: "",
          fileName: e.name,
        });
      } else if (e.isDirectory()) {
        const subAbs = path.join(dirAbs, e.name);
        const files = await listJsonInDir(subAbs);
        for (const f of files) {
          if (isFdmFilamentInternalPreset(f)) continue;
          if (isSupportPresetFileName(f)) continue;
          if (isUnderscorePresetFileName(f)) continue;
          out.push({
            relativePath: joinRel(joinRel(base, e.name), f),
            folder: e.name,
            fileName: f,
          });
        }
      }
    }
  }
  out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return out;
}

async function listProfilesForAccount(rootAbs, layout, account) {
  const base =
    layout === "users"
      ? path.join(rootAbs, "users", account)
      : path.join(rootAbs, "user", account);
  const out = [];
  for (const sub of ["process", "filament"]) {
    const dirAbs = path.join(base, sub);
    const kind = sub === "filament" ? "filament" : "process";
    const files = await listJsonInDir(dirAbs);
    const prefix =
      layout === "users" ? `users/${account}/${sub}` : `user/${account}/${sub}`;
    for (const fileName of files) {
      out.push({
        userId: account,
        kind,
        relativePath: `${prefix}/${fileName}`,
        fileName,
        ...(kind === "filament" ? { filamentCategory: "standard" } : {}),
      });
    }
    if (sub === "filament") {
      const baseAbs = path.join(dirAbs, "base");
      const baseFiles = await listJsonInDir(baseAbs);
      const basePrefix =
        layout === "users"
          ? `users/${account}/filament/base`
          : `user/${account}/filament/base`;
      for (const fileName of baseFiles) {
        out.push({
          userId: account,
          kind: "filament",
          relativePath: `${basePrefix}/${fileName}`,
          fileName,
          filamentCategory: "custom",
        });
      }
    }
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function listAllProfiles(rootAbs) {
  const { layout, accounts } = await detectLayout(rootAbs);
  if (!layout) return [];
  const out = [];
  for (const account of accounts) {
    out.push(...(await listProfilesForAccount(rootAbs, layout, account)));
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function handleRequest(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let url;
  try {
    url = new URL(req.url || "/", "http://127.0.0.1");
  } catch {
    return sendJson(res, 400, { error: "Bad URL" });
  }

  const route = url.pathname;
  const slicer = getSlicer(url);
  const slicerRoot = rootForSlicer(slicer);

  if (route === "/health" || route === "/api/health") {
    try {
      await fs.access(slicerRoot);
      return sendJson(res, 200, { ok: true, root: slicerRoot, slicer });
    } catch {
      return sendJson(res, 200, {
        ok: false,
        root: slicerRoot,
        slicer,
        error:
          slicer === "orca"
            ? "OrcaSlicer root not found or not readable. Set ORCASLICER_ROOT."
            : "BambuStudio root not found or not readable. Set BAMBUSTUDIO_ROOT.",
      });
    }
  }

  try {
    await fs.access(slicerRoot);
  } catch {
    return sendJson(res, 500, {
      error: `${slicer === "orca" ? "OrcaSlicer" : "BambuStudio"} root not found or not readable: ${slicerRoot}`,
      hint:
        slicer === "orca"
          ? "Set ORCASLICER_ROOT to your OrcaSlicer folder."
          : "Set BAMBUSTUDIO_ROOT to your BambuStudio folder.",
    });
  }

  if (route === "/api/meta") {
    const { layout, accounts } = await detectLayout(slicerRoot);
    return sendJson(res, 200, {
      root: slicerRoot,
      slicer,
      layout,
      accountCount: accounts.length,
    });
  }

  if (route === "/api/accounts") {
    const { layout, accounts } = await detectLayout(slicerRoot);
    return sendJson(res, 200, { layout, accounts, slicer });
  }

  if (route === "/api/profiles") {
    const full =
      url.searchParams.get("full") === "1" ||
      url.searchParams.get("full") === "true";
    if (full) {
      const profiles = await listAllProfiles(slicerRoot);
      return sendJson(res, 200, { profiles, slicer });
    }
    const account = url.searchParams.get("account");
    if (!account) {
      return sendJson(res, 400, {
        error: "Missing account query (or use full=1)",
      });
    }
    const { layout } = await detectLayout(slicerRoot);
    if (!layout) {
      return sendJson(res, 404, {
        error: `No users/ or user/ directory under ${slicer === "orca" ? "OrcaSlicer" : "BambuStudio"} root`,
      });
    }
    const profiles = await listProfilesForAccount(slicerRoot, layout, account);
    return sendJson(res, 200, { profiles, layout, slicer });
  }

  if (route === "/api/system-filaments") {
    try {
      const entries = await listSystemFilamentEntries(slicerRoot, slicer);
      return sendJson(res, 200, { entries, slicer });
    } catch (e) {
      return sendJson(res, 500, {
        error:
          e instanceof Error ? e.message : "Failed to list system filaments",
      });
    }
  }

  if (route === "/api/resolve") {
    const rel = url.searchParams.get("path");
    if (!rel) {
      return sendJson(res, 400, {
        error:
          "Missing path query (POSIX path under slicer root, e.g. users/name/process/x.json)",
      });
    }
    const compareRaw = url.searchParams.get("compareWith");
    const compareNorm =
      compareRaw && String(compareRaw).trim()
        ? normalizeRelativePath(String(compareRaw).trim())
        : null;
    let normalized;
    try {
      normalized = normalizeRelativePath(rel);
      safeFsPath(slicerRoot, normalized);
      if (compareNorm) {
        if (!compareNorm.startsWith("system/")) {
          return sendJson(res, 400, {
            error: "compareWith must be under system/",
          });
        }
        safeFsPath(slicerRoot, compareNorm);
        if (!compareNorm.toLowerCase().endsWith(".json")) {
          return sendJson(res, 400, {
            error: "compareWith must be a .json file",
          });
        }
      }
    } catch (e) {
      return sendJson(res, 400, {
        error: e instanceof Error ? e.message : "Invalid path",
      });
    }
    const kind = inferProfileKind(normalized);
    if (compareNorm && kind !== "filament") {
      return sendJson(res, 400, {
        error: "compareWith is only valid for filament profiles",
      });
    }
    try {
      let chain;
      if (compareNorm) {
        const customData = await readJsonFile(slicerRoot, normalized);
        const compareChain = await resolveInheritanceRecursive(
          slicerRoot,
          slicer,
          compareNorm,
          "filament",
          new Set(),
        );
        chain = [
          ...compareChain,
          { relativePath: normalized, data: customData },
        ];
      } else {
        chain = await resolveInheritanceRecursive(
          slicerRoot,
          slicer,
          normalized,
          kind,
          new Set(),
        );
      }
      return sendJson(res, 200, { chain, slicer });
    } catch (e) {
      return sendJson(res, 500, {
        error: e instanceof Error ? e.message : "Resolve failed",
      });
    }
  }

  return sendJson(res, 404, {
    error: "Not found",
    routes: [
      "/health",
      "/api/meta",
      "/api/accounts",
      "/api/profiles",
      "/api/system-filaments",
      "/api/resolve?path=",
    ],
    note: "All routes accept ?slicer=bambu|orca (default bambu)",
  });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error(err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : "Internal error",
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Slicer API listening on http://127.0.0.1:${PORT}`);
  console.log(`  bambu root: ${ROOTS.bambu}`);
  console.log(`  orca  root: ${ROOTS.orca}`);
});
