/**
 * Browser-only: resolves Bambu Studio profile inheritance using the
 * File System Access API. Import from client components only.
 */

import { dirname, joinPath, normalizeRelativePath } from "./fs-path-utils";
import type { ProfileFsAccess } from "./profile-fs-access";
import {
  createSplitUsersAccess,
  createStudioRootAccess,
  type SplitUsersAccessParams,
} from "./profile-fs-access";

export type ProfileKind = "process" | "filament";

/** One level in the inheritance chain (root → … → selected user file). */
export type InheritanceChainLevel = {
  /** Path relative to the chosen BambuStudio root (POSIX-style). */
  relativePath: string;
  /** Parsed profile JSON for this level. */
  data: Record<string, unknown>;
};

const SYSTEM_PROCESS_DIR = "system/BBL/process";
const SYSTEM_FILAMENT_DIR = "system/BBL/filament";

function inferProfileKind(relPath: string): ProfileKind {
  const n = normalizeRelativePath(relPath);
  if (n.includes("/filament/")) return "filament";
  return "process";
}

function systemDirForKind(kind: ProfileKind): string {
  return kind === "filament" ? SYSTEM_FILAMENT_DIR : SYSTEM_PROCESS_DIR;
}

function normalizeInheritsFileName(inherits: string): string {
  const trimmed = inherits.trim();
  const base = trimmed.includes("/")
    ? (trimmed.split("/").pop() ?? trimmed)
    : trimmed;
  if (!base.toLowerCase().endsWith(".json")) {
    return `${base}.json`;
  }
  return base;
}

function getInheritsField(data: Record<string, unknown>): string | null {
  const v = data.inherits;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

async function resolveParentRelativePath(
  access: ProfileFsAccess,
  currentPath: string,
  inheritsRaw: string,
  kind: ProfileKind,
): Promise<string | null> {
  const trimmed = inheritsRaw.trim();
  const currentDir = dirname(normalizeRelativePath(currentPath));
  const systemDir = systemDirForKind(kind);

  if (trimmed.includes("/")) {
    const fromCurrent = normalizeRelativePath(joinPath(currentDir, trimmed));
    if (await access.exists(fromCurrent)) return fromCurrent;
    const fromRoot = normalizeRelativePath(trimmed);
    if (await access.exists(fromRoot)) return fromRoot;
  }

  const fileName = normalizeInheritsFileName(trimmed);
  const searchDirs: string[] = [];
  const add = (d: string) => {
    if (d && !searchDirs.includes(d)) searchDirs.push(d);
  };
  add(currentDir);
  add(systemDir);

  for (const dir of searchDirs) {
    const rel = joinPath(dir, fileName);
    if (await access.exists(rel)) return normalizeRelativePath(rel);
  }

  return null;
}

async function resolveInheritanceRecursive(
  access: ProfileFsAccess,
  userFilePath: string,
  kind: ProfileKind,
  visited: Set<string>,
): Promise<InheritanceChainLevel[]> {
  const path = normalizeRelativePath(userFilePath);
  if (visited.has(path)) {
    throw new Error(`Inheritance cycle detected at "${path}"`);
  }
  visited.add(path);

  const data = await access.readJson(path);
  const inherits = getInheritsField(data);

  if (!inherits) {
    return [{ relativePath: path, data }];
  }

  const parentPath = await resolveParentRelativePath(
    access,
    path,
    inherits,
    kind,
  );
  if (!parentPath) {
    throw new Error(
      `Could not resolve inherits "${inherits}" from "${path}". Tried same folder and ${systemDirForKind(kind)}.`,
    );
  }

  const ancestors = await resolveInheritanceRecursive(
    access,
    parentPath,
    kind,
    visited,
  );
  return [...ancestors, { relativePath: path, data }];
}

type DirectoryPickerOptions = {
  mode?: "read" | "readwrite";
  id?: string;
  startIn?: FileSystemHandle;
};

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (
    options?: DirectoryPickerOptions,
  ) => Promise<FileSystemDirectoryHandle>;
};

/** macOS Go to Folder — `users` holds one folder per Bambu Lab account name. */
export const MACOS_BAMBUSTUDIO_USERS_GO_TO =
  "~/Library/Application Support/BambuStudio/users";

export const MACOS_BAMBUSTUDIO_SYSTEM_PROCESS_GO_TO =
  "~/Library/Application Support/BambuStudio/system/BBL/process";

export const MACOS_BAMBUSTUDIO_ROOT_FOLDER_GO_TO =
  "~/Library/Application Support/BambuStudio";

/** Legacy singular folder name (older layouts). */
export const MACOS_BAMBUSTUDIO_USER_FOLDER_GO_TO =
  MACOS_BAMBUSTUDIO_USERS_GO_TO;

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as WindowWithDirectoryPicker).showDirectoryPicker ===
      "function"
  );
}

export type PickDirectoryOptions = {
  id: string;
  startIn?: FileSystemDirectoryHandle;
};

export async function pickDirectory(
  options: PickDirectoryOptions,
): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }
  const w = window as WindowWithDirectoryPicker;
  return w.showDirectoryPicker!({
    mode: "read",
    id: options.id,
    ...(options.startIn ? { startIn: options.startIn } : {}),
  });
}

export async function pickBambuStudioFolder(options?: {
  startIn?: FileSystemDirectoryHandle;
}): Promise<FileSystemDirectoryHandle | null> {
  return pickDirectory({ id: "bambu-studio-root", ...options });
}

/**
 * Resolves `inherits` chains using a virtual path layout (full studio or split handles).
 */
export class BambuInheritanceResolver {
  constructor(private readonly access: ProfileFsAccess) {}

  static fromStudioRoot(
    root: FileSystemDirectoryHandle,
  ): BambuInheritanceResolver {
    return new BambuInheritanceResolver(createStudioRootAccess(root));
  }

  static fromSplitUsers(
    params: SplitUsersAccessParams,
  ): BambuInheritanceResolver {
    return new BambuInheritanceResolver(createSplitUsersAccess(params));
  }

  /**
   * Walks `inherits` from the user file up to the root template (e.g. fdm_process_common.json).
   * Returns ordered chain: [root, …, selected file].
   */
  async resolveInheritance(
    userFilePath: string,
  ): Promise<InheritanceChainLevel[]> {
    const path = normalizeRelativePath(userFilePath);
    const kind = inferProfileKind(path);
    return resolveInheritanceRecursive(this.access, path, kind, new Set());
  }
}

export async function resolveInheritanceChain(
  root: FileSystemDirectoryHandle,
  userFilePath: string,
): Promise<InheritanceChainLevel[]> {
  return BambuInheritanceResolver.fromStudioRoot(root).resolveInheritance(
    userFilePath,
  );
}
