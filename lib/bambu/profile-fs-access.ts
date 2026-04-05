import { directoryEntries } from "./fs-dir-entries";
import {
  fileExistsUnderRoot,
  normalizeRelativePath,
  readJsonUnderRoot,
} from "./fs-path-utils";

/**
 * Virtual path I/O for inheritance resolution (studio root and split users + system picks).
 */
export type ProfileFsAccess = {
  readJson(relativePath: string): Promise<Record<string, unknown>>;
  exists(relativePath: string): Promise<boolean>;
};

export function createStudioRootAccess(
  root: FileSystemDirectoryHandle,
): ProfileFsAccess {
  return {
    readJson: (p) => readJsonUnderRoot(root, normalizeRelativePath(p)),
    exists: (p) => fileExistsUnderRoot(root, normalizeRelativePath(p)),
  };
}

export type SplitUsersAccessParams = {
  usersDir: FileSystemDirectoryHandle;
  username: string;
  systemProcessDir: FileSystemDirectoryHandle;
  systemFilamentDir?: FileSystemDirectoryHandle;
};

/**
 * User picked `.../BambuStudio/users` and `.../system/BBL/process` separately.
 * Logical paths: `users/<username>/process|filament/<file>`, `users/.../filament/base/<file>`, `system/BBL/process|filament/<file>`.
 */
export function createSplitUsersAccess(
  params: SplitUsersAccessParams,
): ProfileFsAccess {
  const { usersDir, username, systemProcessDir, systemFilamentDir } = params;
  const userProcessPrefix = `users/${username}/process/`;
  const userFilamentPrefix = `users/${username}/filament/`;
  const sysProcessPrefix = "system/BBL/process/";
  const sysFilamentPrefix = "system/BBL/filament/";

  async function getUserSubFile(
    sub: "process" | "filament",
    fileName: string,
  ): Promise<FileSystemFileHandle | null> {
    try {
      const account = await usersDir.getDirectoryHandle(username);
      const folder = await account.getDirectoryHandle(sub);
      return await folder.getFileHandle(fileName);
    } catch {
      return null;
    }
  }

  async function getUserFilamentPath(
    relativeToFilament: string,
  ): Promise<FileSystemFileHandle | null> {
    if (!relativeToFilament || relativeToFilament.includes("..")) {
      return null;
    }
    if (!relativeToFilament.includes("/")) {
      return getUserSubFile("filament", relativeToFilament);
    }
    const m = /^base\/([^/]+)$/.exec(relativeToFilament);
    if (!m) return null;
    const baseName = m[1]!;
    try {
      const account = await usersDir.getDirectoryHandle(username);
      const filament = await account.getDirectoryHandle("filament");
      const baseDir = await filament.getDirectoryHandle("base");
      return await baseDir.getFileHandle(baseName);
    } catch {
      return null;
    }
  }

  async function existsImpl(p: string): Promise<boolean> {
    const path = normalizeRelativePath(p);
    if (path.startsWith(userProcessPrefix)) {
      const name = path.slice(userProcessPrefix.length);
      if (!name || name.includes("/")) return false;
      return (await getUserSubFile("process", name)) !== null;
    }
    if (path.startsWith(userFilamentPrefix)) {
      const rel = path.slice(userFilamentPrefix.length);
      if (!rel) return false;
      return (await getUserFilamentPath(rel)) !== null;
    }
    if (path.startsWith(sysProcessPrefix)) {
      const name = path.slice(sysProcessPrefix.length);
      if (!name || name.includes("/")) return false;
      try {
        await systemProcessDir.getFileHandle(name);
        return true;
      } catch {
        return false;
      }
    }
    if (path.startsWith(sysFilamentPrefix) && systemFilamentDir) {
      const name = path.slice(sysFilamentPrefix.length);
      if (!name || name.includes("/")) return false;
      try {
        await systemFilamentDir.getFileHandle(name);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  return {
    exists: existsImpl,
    async readJson(path) {
      const normalized = normalizeRelativePath(path);
      if (!(await existsImpl(normalized))) {
        throw new Error(`Profile not found: ${normalized}`);
      }
      if (normalized.startsWith(userProcessPrefix)) {
        const name = normalized.slice(userProcessPrefix.length);
        const h = await getUserSubFile("process", name);
        if (!h) throw new Error(`Profile not found: ${normalized}`);
        return readJsonFromFileHandle(h, normalized);
      }
      if (normalized.startsWith(userFilamentPrefix)) {
        const rel = normalized.slice(userFilamentPrefix.length);
        const h = await getUserFilamentPath(rel);
        if (!h) throw new Error(`Profile not found: ${normalized}`);
        return readJsonFromFileHandle(h, normalized);
      }
      if (normalized.startsWith(sysProcessPrefix)) {
        const name = normalized.slice(sysProcessPrefix.length);
        try {
          const h = await systemProcessDir.getFileHandle(name);
          return readJsonFromFileHandle(h, normalized);
        } catch {
          throw new Error(`Profile not found: ${normalized}`);
        }
      }
      if (normalized.startsWith(sysFilamentPrefix) && systemFilamentDir) {
        const name = normalized.slice(sysFilamentPrefix.length);
        try {
          const h = await systemFilamentDir.getFileHandle(name);
          return readJsonFromFileHandle(h, normalized);
        } catch {
          throw new Error(`Profile not found: ${normalized}`);
        }
      }
      throw new Error(`Profile not found: ${normalized}`);
    },
  };
}

async function readJsonFromFileHandle(
  handle: FileSystemFileHandle,
  label: string,
): Promise<Record<string, unknown>> {
  const file = await handle.getFile();
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid profile JSON (expected object): ${label}`);
  }
  return parsed as Record<string, unknown>;
}

export async function listUserAccountFolderNames(
  usersDir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, h] of directoryEntries(usersDir)) {
    if (h.kind !== "directory") continue;
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}
