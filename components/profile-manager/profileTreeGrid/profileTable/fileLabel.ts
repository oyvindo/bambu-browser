export function fileLabel(relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? relativePath;
}
