/** TypeScript's DOM lib omits directory iteration helpers in some versions. */
export type DirectoryEntryIterator = AsyncIterableIterator<
  [string, FileSystemHandle]
>;

export function directoryEntries(
  dir: FileSystemDirectoryHandle,
): DirectoryEntryIterator {
  return (dir as unknown as { entries(): DirectoryEntryIterator }).entries();
}
