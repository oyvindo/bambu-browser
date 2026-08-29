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

function assertEditableUserProfilePath(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  const parts = splitPath(normalized);
  const validRoot = parts[0] === "user" || parts[0] === "users";
  const validKind = parts[2] === "process" || parts[2] === "filament";
  if (
    !validRoot ||
    !validKind ||
    parts.some((part) => part === "..") ||
    !normalized.toLowerCase().endsWith(".json")
  ) {
    throw new Error(
      "Only existing user process and filament JSON files are editable.",
    );
  }
  return normalized;
}

export async function readEditableProfileUnderRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<Record<string, unknown>> {
  const normalized = assertEditableUserProfilePath(relativePath);
  const data = await readJsonUnderRoot(root, normalized);
  if (String(data.from).toLowerCase() === "system") {
    throw new Error("System profiles are read-only.");
  }
  return data;
}

export async function writeEditableProfileUnderRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  formattedJson: string,
): Promise<void> {
  const normalized = assertEditableUserProfilePath(relativePath);
  const current = await readEditableProfileUnderRoot(root, normalized);
  const next: unknown = JSON.parse(formattedJson);
  if (next === null || typeof next !== "object" || Array.isArray(next)) {
    throw new Error("Profile JSON must be an object.");
  }
  if (
    String((next as Record<string, unknown>).from).toLowerCase() === "system"
  ) {
    throw new Error("System profiles are read-only.");
  }
  if (String(current.from).toLowerCase() === "system") {
    throw new Error("System profiles are read-only.");
  }
  const handle = await getFileHandleFromRoot(root, normalized);
  if (!handle) throw new Error(`Profile not found: ${normalized}`);
  const writable = await handle.createWritable();
  try {
    await writable.write(formattedJson);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
}
