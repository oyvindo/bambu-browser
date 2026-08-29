import type { UserProfileEntry } from "@/lib/bambu/list-user-profiles";

export type SidebarSection =
  "filament_custom" | "filament_standard" | "process";

/** One keyboard-navigable row in the sidebar tree. */
export type SidebarRow =
  | { kind: "section"; section: SidebarSection }
  | { kind: "profile"; section: SidebarSection; relativePath: string };

/** Headings and the profiles of expanded groups, in the order they appear. */
export function flattenSidebarRows(
  grouped: readonly (readonly [SidebarSection, readonly UserProfileEntry[]])[],
  openSections: Record<SidebarSection, boolean>,
): SidebarRow[] {
  return grouped.flatMap(([section, items]) => [
    { kind: "section" as const, section },
    ...(openSections[section]
      ? items.map((item) => ({
          kind: "profile" as const,
          section,
          relativePath: item.relativePath,
        }))
      : []),
  ]);
}
