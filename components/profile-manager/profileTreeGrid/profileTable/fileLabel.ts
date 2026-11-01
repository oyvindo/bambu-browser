export function fileLabel(relativePath: string): string {
  // PrusaSlicer bundle presets: `vendor/<file>.ini#<kind>:<preset name>`.
  const section = /^vendor\/[^/#]+#[a-z]+:(.+)$/.exec(relativePath);
  if (section) return section[1]!;
  const parts = relativePath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? relativePath;
}
