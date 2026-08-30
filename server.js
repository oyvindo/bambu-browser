/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Øyvind Øyen
 *
 * Local Bambu Studio / OrcaSlicer JSON API.
 *
 * Usage:
 *   BAMBUSTUDIO_ROOT="/path/to/BambuStudio" ORCASLICER_ROOT="/path/to/OrcaSlicer" PORT=3847 node server.js
 *
 * Defaults (macOS): ~/Library/Application Support/{BambuStudio,OrcaSlicer}
 * Defaults (Windows): %APPDATA%\\{BambuStudio,OrcaSlicer}
 * Frontend: set NEXT_PUBLIC_BAMBU_API_URL=http://127.0.0.1:3847
 */

const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 3847);
const SLICERS = {
  bambu: {
    displayName: "BambuStudio",
    envName: "BAMBUSTUDIO_ROOT",
    appDirectory: "BambuStudio",
  },
  orca: {
    displayName: "OrcaSlicer",
    envName: "ORCASLICER_ROOT",
    appDirectory: "OrcaSlicer",
  },
};

function defaultStudioRoot(appDirectory) {
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      appDirectory,
    );
  }
  if (process.platform === "win32") {
    const roaming =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(roaming, appDirectory);
  }
  return path.join(os.homedir(), appDirectory);
}

function slicerContext(slicer) {
  const config = SLICERS[slicer];
  const root = path.resolve(
    process.env[config.envName] || defaultStudioRoot(config.appDirectory),
  );
  return { slicer, root, ...config };
}

function selectedSlicer(url) {
  const slicer = (url.searchParams.get("slicer") || "bambu").toLowerCase();
  return Object.hasOwn(SLICERS, slicer) ? slicer : null;
}
const WRITE_ORIGINS = new Set(
  String(process.env.BAMBU_BROWSER_WRITE_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const SYSTEM_PROCESS_DIR = "system/BBL/process";
const SYSTEM_FILAMENT_DIR = "system/BBL/filament";
/** Same logical path as BambuStudio/system/BBL/process/fdm_process_common.json */
const FDM_PROCESS_COMMON_RELATIVE =
  "system/BBL/process/fdm_process_common.json";
/** Same logical path as BambuStudio/system/BBL/filament/fdm_filament_common.json */
const FDM_FILAMENT_COMMON_RELATIVE =
  "system/BBL/filament/fdm_filament_common.json";

function writeOriginAllowed(origin) {
  if (!origin) return true;
  if (WRITE_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function setCors(req, res) {
  const origin = req.headers.origin;
  const requestedMethod = req.headers["access-control-request-method"];
  const writeRequest = req.method === "PUT" || requestedMethod === "PUT";
  if (!writeRequest) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && writeOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
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

function safeFsPath(rootAbs, relativePosix, displayName = "slicer") {
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
    throw new Error(`Path escapes ${displayName} root`);
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

function editableUserProfilePath(rootAbs, raw, displayName) {
  const normalized = normalizeRelativePath(raw);
  const parts = normalized.split("/").filter(Boolean);
  if (
    (parts[0] !== "user" && parts[0] !== "users") ||
    (parts[2] !== "process" && parts[2] !== "filament") ||
    parts.some((part) => part === "..") ||
    !normalized.toLowerCase().endsWith(".json")
  ) {
    throw new Error(
      "Only existing user process and filament JSON files are editable.",
    );
  }
  safeFsPath(rootAbs, normalized, displayName);
  return normalized;
}

async function readRequestText(req, maxBytes = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function replaceProfileFile(rootAbs, relPosix, formattedJson) {
  const current = await readJsonFile(rootAbs, relPosix);
  const next = JSON.parse(formattedJson);
  if (next === null || typeof next !== "object" || Array.isArray(next)) {
    throw new Error("Profile JSON must be an object.");
  }
  if (
    String(current.from).toLowerCase() === "system" ||
    String(next.from).toLowerCase() === "system"
  ) {
    const error = new Error("System profiles are read-only.");
    error.statusCode = 403;
    throw error;
  }
  const expectedKind = inferProfileKind(relPosix);
  for (const key of ["inherits", "type", "name", "from"]) {
    if (JSON.stringify(current[key]) === JSON.stringify(next[key])) continue;
    const spellsOutInheritedKind =
      !(key in current) && key === "type" && next.type === expectedKind;
    if (spellsOutInheritedKind) continue;
    throw new Error(`${key} cannot be changed.`);
  }
  if (next.type !== undefined && next.type !== expectedKind) {
    throw new Error(`type must remain "${expectedKind}".`);
  }

  const full = safeFsPath(rootAbs, relPosix);
  const temporary = `${full}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, formattedJson, {
      encoding: "utf8",
      flag: "wx",
    });
    await fs.rename(temporary, full);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function inferProfileKind(relPath) {
  return normalizeRelativePath(relPath).includes("/filament/")
    ? "filament"
    : "process";
}

function systemDirForKind(kind) {
  return kind === "filament" ? SYSTEM_FILAMENT_DIR : SYSTEM_PROCESS_DIR;
}

async function listDirectoriesRecursive(rootAbs, startRelative) {
  const directories = [];
  const visit = async (relativeDir) => {
    let entries;
    try {
      entries = await fs.readdir(safeFsPath(rootAbs, relativeDir), {
        withFileTypes: true,
      });
    } catch {
      return;
    }
    directories.push(normalizeRelativePath(relativeDir));
    const children = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => joinRel(relativeDir, entry.name))
      .sort((a, b) => a.localeCompare(b));
    for (const child of children) await visit(child);
  };
  await visit(startRelative);
  return directories;
}

function isRelevantSystemDirectory(relativeDir, kind) {
  const parts = normalizeRelativePath(relativeDir)
    .toLowerCase()
    .split("/")
    .filter(Boolean);
  if (parts[0] !== "system") return false;
  if (parts.includes(kind)) return true;
  return (
    kind === "filament" &&
    (parts[1] === "custom" || parts[1] === "orcafilamentlibrary")
  );
}

async function findSystemProfileByName(rootAbs, fileName, kind) {
  const directories = await listDirectoriesRecursive(rootAbs, "system");
  const matches = [];
  for (const directory of directories) {
    if (!isRelevantSystemDirectory(directory, kind)) continue;
    const candidate = joinRel(directory, fileName);
    if (await fileExists(rootAbs, candidate)) matches.push(candidate);
  }
  matches.sort((a, b) => a.localeCompare(b));
  return matches[0] || null;
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
  currentPath,
  inheritsRaw,
  kind,
  slicer = "bambu",
) {
  const trimmed = inheritsRaw.trim();
  const normalizedPath = normalizeRelativePath(currentPath);
  const currentDir = dirnameRel(normalizedPath);
  const systemDir = systemDirForKind(kind);
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
  if (slicer === "bambu") add(systemDir);

  for (const dir of searchDirs) {
    const rel = joinRel(dir, fileName);
    if (await fileExists(rootAbs, rel)) return normalizeRelativePath(rel);
  }
  if (slicer === "orca") {
    return findSystemProfileByName(rootAbs, fileName, kind);
  }
  return null;
}

async function resolveInheritanceRecursive(
  rootAbs,
  userFilePath,
  kind,
  visited,
  slicer = "bambu",
) {
  const p = normalizeRelativePath(userFilePath);
  if (visited.has(p)) throw new Error(`Inheritance cycle detected at "${p}"`);
  visited.add(p);

  const data = await readJsonFile(rootAbs, p);
  const inherits = getInheritsField(data);

  if (!inherits) {
    const leaf = { relativePath: p, data };
    if (slicer === "orca") return [leaf];
    const commonPath =
      kind === "filament"
        ? FDM_FILAMENT_COMMON_RELATIVE
        : FDM_PROCESS_COMMON_RELATIVE;
    if (normalizeRelativePath(p) !== normalizeRelativePath(commonPath)) {
      let commonData = {};
      if (await fileExists(rootAbs, commonPath)) {
        commonData = await readJsonFile(rootAbs, commonPath);
      }
      return [{ relativePath: commonPath, data: commonData }, leaf];
    }
    return [leaf];
  }

  const parentPath = await resolveParentRelativePath(
    rootAbs,
    p,
    inherits,
    kind,
    slicer,
  );
  if (!parentPath) {
    throw new Error(
      `Could not resolve inherits "${inherits}" from "${p}" in ${SLICERS[slicer].displayName}.`,
    );
  }

  const ancestors = await resolveInheritanceRecursive(
    rootAbs,
    parentPath,
    kind,
    visited,
    slicer,
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
 * system/BBL/filament: root-level JSON + one level of subfolders (e.g. Polymaker / P1P).
 * Returns { relativePath, folder, fileName }.
 */
async function listSystemFilamentEntries(rootAbs) {
  const base = "system/BBL/filament";
  const dirAbs = path.join(rootAbs, "system", "BBL", "filament");
  const out = [];
  let ents;
  try {
    ents = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return out;
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
  out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return out;
}

async function listOrcaSystemFilamentEntries(rootAbs) {
  const out = [];
  const directories = await listDirectoriesRecursive(rootAbs, "system");
  for (const directory of directories) {
    if (!isRelevantSystemDirectory(directory, "filament")) continue;
    const files = await listJsonInDir(safeFsPath(rootAbs, directory));
    for (const fileName of files) {
      if (isFdmFilamentInternalPreset(fileName)) continue;
      if (isSupportPresetFileName(fileName)) continue;
      out.push({
        relativePath: joinRel(directory, fileName),
        folder: directory.replace(/^system\/?/, ""),
        fileName,
      });
    }
  }
  out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return out;
}

function isSystemFilamentPath(relativePath, slicer) {
  const normalized = normalizeRelativePath(relativePath);
  if (slicer === "bambu") {
    return normalized.startsWith("system/BBL/filament/");
  }
  return isRelevantSystemDirectory(dirnameRel(normalized), "filament");
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
  setCors(req, res);
  if (req.method === "OPTIONS") {
    if (
      req.headers["access-control-request-method"] === "PUT" &&
      !writeOriginAllowed(req.headers.origin)
    ) {
      return sendJson(res, 403, { error: "Origin is not allowed to write." });
    }
    res.writeHead(204);
    return res.end();
  }
  if (req.method !== "GET" && req.method !== "PUT") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let url;
  try {
    url = new URL(req.url || "/", "http://127.0.0.1");
  } catch {
    return sendJson(res, 400, { error: "Bad URL" });
  }

  const route = url.pathname;
  const slicer = selectedSlicer(url);
  if (!slicer) {
    return sendJson(res, 400, {
      error: 'slicer must be either "bambu" or "orca"',
    });
  }
  const context = slicerContext(slicer);
  const studioRoot = context.root;

  if (req.method === "PUT" && route !== "/api/profile-file") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  if (req.method === "PUT" && !writeOriginAllowed(req.headers.origin)) {
    return sendJson(res, 403, { error: "Origin is not allowed to write." });
  }

  if (route === "/health" || route === "/api/health") {
    try {
      await fs.access(studioRoot);
      return sendJson(res, 200, { ok: true, root: studioRoot });
    } catch {
      return sendJson(res, 200, {
        ok: false,
        root: studioRoot,
        error: `${context.displayName} root not found or not readable. Set ${context.envName}.`,
      });
    }
  }

  try {
    await fs.access(studioRoot);
  } catch {
    return sendJson(res, 500, {
      error: `${context.displayName} root not found or not readable: ${studioRoot}`,
      hint: `Set ${context.envName} to your ${context.displayName} folder.`,
    });
  }

  if (route === "/api/profile-file") {
    const rawPath = url.searchParams.get("path");
    if (!rawPath) {
      return sendJson(res, 400, { error: "Missing path query" });
    }
    let relativePath;
    try {
      relativePath = editableUserProfilePath(
        studioRoot,
        rawPath,
        context.displayName,
      );
      const current = await readJsonFile(studioRoot, relativePath);
      if (String(current.from).toLowerCase() === "system") {
        return sendJson(res, 403, { error: "System profiles are read-only." });
      }
      if (req.method === "GET") {
        return sendJson(res, 200, { relativePath, data: current });
      }
      const body = await readRequestText(req);
      await replaceProfileFile(studioRoot, relativePath, body);
      return sendJson(res, 200, { ok: true, relativePath });
    } catch (e) {
      const status =
        typeof e?.statusCode === "number"
          ? e.statusCode
          : e?.code === "ENOENT"
            ? 404
            : e instanceof SyntaxError
              ? 400
              : 400;
      return sendJson(res, status, {
        error: e instanceof Error ? e.message : "Profile file operation failed",
      });
    }
  }

  if (route === "/api/meta") {
    const { layout, accounts } = await detectLayout(studioRoot);
    return sendJson(res, 200, {
      root: studioRoot,
      layout,
      accountCount: accounts.length,
    });
  }

  if (route === "/api/accounts") {
    const { layout, accounts } = await detectLayout(studioRoot);
    return sendJson(res, 200, { layout, accounts });
  }

  if (route === "/api/profiles") {
    const full =
      url.searchParams.get("full") === "1" ||
      url.searchParams.get("full") === "true";
    if (full) {
      const profiles = await listAllProfiles(studioRoot);
      return sendJson(res, 200, { profiles });
    }
    const account = url.searchParams.get("account");
    if (!account) {
      return sendJson(res, 400, {
        error: "Missing account query (or use full=1)",
      });
    }
    const { layout } = await detectLayout(studioRoot);
    if (!layout) {
      return sendJson(res, 404, {
        error: `No users/ or user/ directory under ${context.displayName} root`,
      });
    }
    const profiles = await listProfilesForAccount(studioRoot, layout, account);
    return sendJson(res, 200, { profiles, layout });
  }

  if (route === "/api/system-filaments") {
    try {
      const entries =
        slicer === "orca"
          ? await listOrcaSystemFilamentEntries(studioRoot)
          : await listSystemFilamentEntries(studioRoot);
      return sendJson(res, 200, { entries });
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
        error: `Missing path query (POSIX path under ${context.displayName}, e.g. user/default/process/x.json)`,
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
      safeFsPath(studioRoot, normalized, context.displayName);
      if (compareNorm) {
        if (!isSystemFilamentPath(compareNorm, slicer)) {
          return sendJson(res, 400, {
            error: `compareWith must be a ${context.displayName} system filament path`,
          });
        }
        safeFsPath(studioRoot, compareNorm, context.displayName);
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
        const customData = await readJsonFile(studioRoot, normalized);
        const compareChain = await resolveInheritanceRecursive(
          studioRoot,
          compareNorm,
          "filament",
          new Set(),
          slicer,
        );
        chain = [
          ...compareChain,
          { relativePath: normalized, data: customData },
        ];
      } else {
        chain = await resolveInheritanceRecursive(
          studioRoot,
          normalized,
          kind,
          new Set(),
          slicer,
        );
      }
      return sendJson(res, 200, { chain });
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
      "/api/profile-file?path=",
      "/api/resolve?path=",
    ],
  });
}

function createServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error(err);
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Internal error",
      });
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, "127.0.0.1", () => {
    console.log(
      `Bambu Studio / OrcaSlicer API listening on http://127.0.0.1:${PORT}`,
    );
    console.log(`BambuStudio root: ${slicerContext("bambu").root}`);
    console.log(`OrcaSlicer root: ${slicerContext("orca").root}`);
  });
}

module.exports = {
  createServer,
  findSystemProfileByName,
  isSystemFilamentPath,
  listOrcaSystemFilamentEntries,
  resolveInheritanceRecursive,
  slicerContext,
};
