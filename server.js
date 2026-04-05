/**
 * Local BambuStudio JSON API (Node fs — bypasses browser sandbox on ~/Library).
 *
 * Usage:
 *   BAMBUSTUDIO_ROOT="/path/to/BambuStudio" PORT=3847 node server.js
 *
 * Defaults (macOS): ~/Library/Application Support/BambuStudio
 * Frontend: set NEXT_PUBLIC_BAMBU_API_URL=http://127.0.0.1:3847
 */

const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 3847);
const DEFAULT_ROOT =
  process.platform === "darwin"
    ? path.join(os.homedir(), "Library", "Application Support", "BambuStudio")
    : path.join(os.homedir(), "BambuStudio");

const STUDIO_ROOT = path.resolve(process.env.BAMBUSTUDIO_ROOT || DEFAULT_ROOT);

const SYSTEM_PROCESS_DIR = "system/BBL/process";
const SYSTEM_FILAMENT_DIR = "system/BBL/filament";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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
  const needle = "bambustudio/";
  const idx = lower.lastIndexOf(needle);
  if (idx !== -1) {
    t = t.slice(idx + needle.length);
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
    throw new Error("Path escapes BambuStudio root");
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

function systemDirForKind(kind) {
  return kind === "filament" ? SYSTEM_FILAMENT_DIR : SYSTEM_PROCESS_DIR;
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
  add(systemDir);

  for (const dir of searchDirs) {
    const rel = joinRel(dir, fileName);
    if (await fileExists(rootAbs, rel)) return normalizeRelativePath(rel);
  }
  return null;
}

async function resolveInheritanceRecursive(
  rootAbs,
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
    return [{ relativePath: p, data }];
  }

  const parentPath = await resolveParentRelativePath(
    rootAbs,
    p,
    inherits,
    kind,
  );
  if (!parentPath) {
    throw new Error(
      `Could not resolve inherits "${inherits}" from "${p}". Tried same folder and ${systemDirForKind(kind)}.`,
    );
  }

  const ancestors = await resolveInheritanceRecursive(
    rootAbs,
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

  if (route === "/health" || route === "/api/health") {
    try {
      await fs.access(STUDIO_ROOT);
      return sendJson(res, 200, { ok: true, root: STUDIO_ROOT });
    } catch {
      return sendJson(res, 200, {
        ok: false,
        root: STUDIO_ROOT,
        error:
          "BambuStudio root not found or not readable. Set BAMBUSTUDIO_ROOT.",
      });
    }
  }

  try {
    await fs.access(STUDIO_ROOT);
  } catch {
    return sendJson(res, 500, {
      error: `BambuStudio root not found or not readable: ${STUDIO_ROOT}`,
      hint: "Set BAMBUSTUDIO_ROOT to your BambuStudio folder.",
    });
  }

  if (route === "/api/meta") {
    const { layout, accounts } = await detectLayout(STUDIO_ROOT);
    return sendJson(res, 200, {
      root: STUDIO_ROOT,
      layout,
      accountCount: accounts.length,
    });
  }

  if (route === "/api/accounts") {
    const { layout, accounts } = await detectLayout(STUDIO_ROOT);
    return sendJson(res, 200, { layout, accounts });
  }

  if (route === "/api/profiles") {
    const full =
      url.searchParams.get("full") === "1" ||
      url.searchParams.get("full") === "true";
    if (full) {
      const profiles = await listAllProfiles(STUDIO_ROOT);
      return sendJson(res, 200, { profiles });
    }
    const account = url.searchParams.get("account");
    if (!account) {
      return sendJson(res, 400, {
        error: "Missing account query (or use full=1)",
      });
    }
    const { layout } = await detectLayout(STUDIO_ROOT);
    if (!layout) {
      return sendJson(res, 404, {
        error: "No users/ or user/ directory under BambuStudio root",
      });
    }
    const profiles = await listProfilesForAccount(STUDIO_ROOT, layout, account);
    return sendJson(res, 200, { profiles, layout });
  }

  if (route === "/api/resolve") {
    const rel = url.searchParams.get("path");
    if (!rel) {
      return sendJson(res, 400, {
        error:
          "Missing path query (POSIX path under BambuStudio, e.g. users/name/process/x.json)",
      });
    }
    let normalized;
    try {
      normalized = normalizeRelativePath(rel);
      safeFsPath(STUDIO_ROOT, normalized);
    } catch (e) {
      return sendJson(res, 400, {
        error: e instanceof Error ? e.message : "Invalid path",
      });
    }
    const kind = inferProfileKind(normalized);
    try {
      const chain = await resolveInheritanceRecursive(
        STUDIO_ROOT,
        normalized,
        kind,
        new Set(),
      );
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
      "/api/resolve?path=",
    ],
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
  console.log(`BambuStudio API listening on http://127.0.0.1:${PORT}`);
  console.log(`Reading from: ${STUDIO_ROOT}`);
});
