export function normalizeRelativePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

/**
 * Turn absolute or mixed `inherits` strings into paths under the BambuStudio root
 * (e.g. macOS `.../BambuStudio/system/BBL/filament/x.json` → `system/BBL/filament/x.json`).
 */
export function normalizeInheritsReference(raw: string): string {
  let t = raw.trim().replace(/\\/g, "/");
  const lower = t.toLowerCase();
  const needle = "bambustudio/";
  const idx = lower.lastIndexOf(needle);
  if (idx !== -1) {
    t = t.slice(idx + needle.length);
  }
  return normalizeRelativePath(t);
}

export function splitPath(path: string): string[] {
  return normalizeRelativePath(path).split("/").filter(Boolean);
}

export function dirname(relPath: string): string {
  const parts = splitPath(relPath);
  parts.pop();
  return parts.join("/");
}

export function joinPath(dir: string, fileName: string): string {
  const d = dir.replace(/\/+$/, "");
  const f = fileName.replace(/^\/+/, "");
  return d ? `${d}/${f}` : f;
}

export async function getFileHandleFromRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle | null> {
  const parts = splitPath(relativePath);
  if (parts.length === 0) return null;
  const fileName = parts[parts.length - 1]!;
  let dir: FileSystemDirectoryHandle = root;
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      dir = await dir.getDirectoryHandle(parts[i]!);
    } catch {
      return null;
    }
  }
  try {
    return await dir.getFileHandle(fileName);
  } catch {
    return null;
  }
}

export async function fileExistsUnderRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<boolean> {
  const h = await getFileHandleFromRoot(root, relativePath);
  return h !== null;
}

export async function readJsonUnderRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<Record<string, unknown>> {
  const handle = await getFileHandleFromRoot(root, relativePath);
  if (!handle) {
    throw new Error(`Profile not found: ${relativePath}`);
  }
  const file = await handle.getFile();
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid profile JSON (expected object): ${relativePath}`);
  }
  return parsed as Record<string, unknown>;
}
