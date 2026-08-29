import { describe, expect, it } from "vitest";

import type { UserProfileEntry } from "@/lib/bambu/list-user-profiles";
import {
  flattenSidebarRows,
  type SidebarSection,
  type SidebarRow,
} from "./sidebarRows";

function filament(fileName: string): UserProfileEntry {
  return {
    userId: "1",
    kind: "filament",
    relativePath: `user/1/filament/${fileName}`,
    fileName,
    filamentCategory: "standard",
  };
}

function process(fileName: string): UserProfileEntry {
  return {
    userId: "1",
    kind: "process",
    relativePath: `user/1/process/${fileName}`,
    fileName,
  };
}

const grouped = [
  ["filament_custom", [filament("custom.json")]],
  ["filament_standard", [filament("first.json"), filament("last.json")]],
  ["process", [process("proc.json")]],
] as const;

function label(row: SidebarRow): string {
  return row.kind === "section" ? `[${row.section}]` : row.relativePath;
}

function rowsFor(open: Record<SidebarSection, boolean>): string[] {
  return flattenSidebarRows(grouped, open).map(label);
}

describe("sidebar keyboard rows", () => {
  it("places the next heading directly after the last profile of a group", () => {
    const rows = rowsFor({
      filament_custom: false,
      filament_standard: true,
      process: false,
    });
    expect(rows).toEqual([
      "[filament_custom]",
      "[filament_standard]",
      "user/1/filament/first.json",
      "user/1/filament/last.json",
      "[process]",
    ]);
    expect(rows[rows.indexOf("user/1/filament/last.json") + 1]).toBe(
      "[process]",
    );
  });

  it("lists only headings while every group is collapsed", () => {
    expect(
      rowsFor({
        filament_custom: false,
        filament_standard: false,
        process: false,
      }),
    ).toEqual(["[filament_custom]", "[filament_standard]", "[process]"]);
  });

  it("puts a group's first profile right after its heading once expanded", () => {
    const rows = rowsFor({
      filament_custom: true,
      filament_standard: false,
      process: false,
    });
    expect(rows[rows.indexOf("[filament_custom]") + 1]).toBe(
      "user/1/filament/custom.json",
    );
    expect(rows[rows.indexOf("user/1/filament/custom.json") + 1]).toBe(
      "[filament_standard]",
    );
  });
});
