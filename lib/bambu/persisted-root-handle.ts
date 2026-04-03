/**
 * Remembers the last chosen BambuStudio directory so showDirectoryPicker can use it as startIn.
 * Browsers cannot open the dialog at an arbitrary path (e.g. ~/Library/...) without a prior handle.
 */

type DirectoryHandleWithPermissions = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: {
    mode: "read" | "readwrite";
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor: {
    mode: "read" | "readwrite";
  }) => Promise<PermissionState>;
};

const DB_NAME = "bambu-browser-fs";
const STORE = "handles";
const KEY_STUDIO_ROOT = "lastBambuStudioRoot";
const KEY_USERS_DIR = "lastBambuUsersDir";
const KEY_SYSTEM_PROCESS = "lastBambuSystemProcess";
const KEY_SYSTEM_FILAMENT = "lastBambuSystemFilament";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function putDirectoryHandle(
  key: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB write failed"));
    tx.objectStore(STORE).put(handle, key);
  });
}

async function getDirectoryHandle(
  key: string,
): Promise<FileSystemDirectoryHandle | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB read failed"));
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () =>
        resolve(req.result as FileSystemDirectoryHandle | undefined);
    });
  } catch {
    return undefined;
  }
}

export async function saveBambuStudioRootHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await putDirectoryHandle(KEY_STUDIO_ROOT, handle);
}

export async function loadBambuStudioRootHandle(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return getDirectoryHandle(KEY_STUDIO_ROOT);
}

export async function saveUsersDirHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await putDirectoryHandle(KEY_USERS_DIR, handle);
}

export async function loadUsersDirHandle(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return getDirectoryHandle(KEY_USERS_DIR);
}

export async function saveSystemProcessDirHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await putDirectoryHandle(KEY_SYSTEM_PROCESS, handle);
}

export async function loadSystemProcessDirHandle(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return getDirectoryHandle(KEY_SYSTEM_PROCESS);
}

export async function saveSystemFilamentDirHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await putDirectoryHandle(KEY_SYSTEM_FILAMENT, handle);
}

export async function loadSystemFilamentDirHandle(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return getDirectoryHandle(KEY_SYSTEM_FILAMENT);
}

export async function clearSplitHandles(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB clear failed"));
    const s = tx.objectStore(STORE);
    s.delete(KEY_USERS_DIR);
    s.delete(KEY_SYSTEM_PROCESS);
    s.delete(KEY_SYSTEM_FILAMENT);
  });
}

/** Ensure read permission so the handle can be used as picker startIn. */
export async function ensureReadAccess(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const h = handle as DirectoryHandleWithPermissions;
    const query = h.queryPermission?.bind(h);
    const request = h.requestPermission?.bind(h);
    if (!query || !request) return true;
    const q = await query({ mode: "read" });
    if (q === "granted") return true;
    if (q === "denied") return false;
    return (await request({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}
