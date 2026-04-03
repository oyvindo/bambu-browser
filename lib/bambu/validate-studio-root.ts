/**
 * True if this directory looks like the BambuStudio data root (has user + system).
 */
export async function isBambuStudioRootDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await handle.getDirectoryHandle("user");
    await handle.getDirectoryHandle("system");
    return true;
  } catch {
    return false;
  }
}
