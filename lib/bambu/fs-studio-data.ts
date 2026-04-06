import { directoryEntries } from "./fs-dir-entries";
import { joinPath, normalizeRelativePath } from "./fs-path-utils";
import {
  createStudioRootAccess,
  listUserAccountFolderNames,
} from "./profile-fs-access";
import {
  BambuInheritanceResolver,
  type InheritanceChainLevel,
} from "./resolver";
import {
  isFdmFilamentInternalPreset,
  isSupportPresetFileName,
  isUnderscorePresetFileName,
  type SystemFilamentEntry,
} from "./system-filament-filters";

async function listJsonFileNamesInDir(
  dir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, h] of directoryEntries(dir)) {
    if (h.kind === "file" && name.toLowerCase().endsWith(".json")) {
      names.push(name);
    }
  }
  return names.sort();
}

/**
 * Lists system filament presets under `system/BBL/filament` (same rules as server.js).
 */
export async function listSystemFilamentEntriesFromStudioRoot(
  root: FileSystemDirectoryHandle,
): Promise<SystemFilamentEntry[]> {
  const base = "system/BBL/filament";
  let dir: FileSystemDirectoryHandle;
  try {
    const sys = await root.getDirectoryHandle("system");
    const bbl = await sys.getDirectoryHandle("BBL");
    dir = await bbl.getDirectoryHandle("filament");
  } catch {
    return [];
  }

  const out: SystemFilamentEntry[] = [];
  for await (const [name, h] of directoryEntries(dir)) {
    if (h.kind === "file") {
      if (!name.toLowerCase().endsWith(".json")) continue;
      if (
        isFdmFilamentInternalPreset(name) ||
        isSupportPresetFileName(name) ||
        isUnderscorePresetFileName(name)
      ) {
        continue;
      }
      out.push({
        relativePath: joinPath(base, name),
        folder: "",
        fileName: name,
      });
    } else if (h.kind === "directory") {
      const subDir = h as FileSystemDirectoryHandle;
      const files = await listJsonFileNamesInDir(subDir);
      for (const f of files) {
        if (
          isFdmFilamentInternalPreset(f) ||
          isSupportPresetFileName(f) ||
          isUnderscorePresetFileName(f)
        ) {
          continue;
        }
        out.push({
          relativePath: joinPath(joinPath(base, name), f),
          folder: name,
          fileName: f,
        });
      }
    }
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function detectStudioLayoutFromRoot(
  root: FileSystemDirectoryHandle,
): Promise<{ layout: "users" | "user" | null; accounts: string[] }> {
  try {
    const users = await root.getDirectoryHandle("users");
    const accounts = await listUserAccountFolderNames(users);
    return { layout: "users", accounts };
  } catch {
    /* no users */
  }
  try {
    const userRoot = await root.getDirectoryHandle("user");
    const accounts: string[] = [];
    for await (const [name, h] of directoryEntries(userRoot)) {
      if (h.kind === "directory") accounts.push(name);
    }
    accounts.sort();
    return { layout: "user", accounts };
  } catch {
    return { layout: null, accounts: [] };
  }
}

function inferProfileKind(relPath: string): "process" | "filament" {
  return normalizeRelativePath(relPath).includes("/filament/")
    ? "filament"
    : "process";
}

/**
 * Resolves inheritance for a profile under a studio root, including optional
 * filament compare chain (same semantics as GET /api/resolve).
 */
export async function resolveChainFromStudioRoot(
  root: FileSystemDirectoryHandle,
  relPath: string,
  compareWith: string | null,
): Promise<InheritanceChainLevel[]> {
  const normalized = normalizeRelativePath(relPath);
  const parts = normalized.split("/").filter(Boolean);
  for (const p of parts) {
    if (p === "..") throw new Error("Invalid path segment");
  }

  const compareNorm =
    compareWith && compareWith.trim()
      ? normalizeRelativePath(compareWith.trim())
      : null;

  if (compareNorm) {
    if (!compareNorm.startsWith("system/BBL/filament/")) {
      throw new Error("compareWith must be under system/BBL/filament/");
    }
    if (!compareNorm.toLowerCase().endsWith(".json")) {
      throw new Error("compareWith must be a .json file");
    }
    const cParts = compareNorm.split("/").filter(Boolean);
    for (const p of cParts) {
      if (p === "..") throw new Error("Invalid path segment");
    }
    if (inferProfileKind(normalized) !== "filament") {
      throw new Error("compareWith is only valid for filament profiles");
    }
    const access = createStudioRootAccess(root);
    const customData = await access.readJson(normalized);
    const compareChain =
      await BambuInheritanceResolver.fromStudioRoot(root).resolveInheritance(
        compareNorm,
      );
    return [...compareChain, { relativePath: normalized, data: customData }];
  }

  return BambuInheritanceResolver.fromStudioRoot(root).resolveInheritance(
    normalized,
  );
}
