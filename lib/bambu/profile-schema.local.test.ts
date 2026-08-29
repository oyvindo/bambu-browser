import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProfileTable } from "@/components/profile-manager/profileTreeGrid/ProfileTable";
import { LocaleProvider } from "@/localization/context";
import { FILAMENT_ROOT_KEYS, PROCESS_ROOT_KEYS } from "./profile-schema";

const studioRoot =
  process.env.BAMBUSTUDIO_ROOT ??
  (process.platform === "darwin"
    ? path.join(homedir(), "Library", "Application Support", "BambuStudio")
    : path.join(homedir(), "BambuStudio"));

function readRootKeys(relativePath: string): string[] | null {
  const filePath = path.join(studioRoot, relativePath);
  if (!existsSync(filePath)) return null;
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<
    string,
    unknown
  >;
  return Object.keys(parsed).sort();
}

function readRootData(relativePath: string): Record<string, unknown> | null {
  const filePath = path.join(studioRoot, relativePath);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function setDifference(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((key) => !rightSet.has(key));
}

describe("installed Bambu Studio root schemas", () => {
  it.each([
    [
      "process",
      "system/BBL/process/fdm_process_common.json",
      PROCESS_ROOT_KEYS,
    ],
    [
      "filament",
      "system/BBL/filament/fdm_filament_common.json",
      FILAMENT_ROOT_KEYS,
    ],
  ] as const)(
    "%s manifest matches the installed common root",
    (_kind, relativePath, expectedKeys) => {
      const installedKeys = readRootKeys(relativePath);
      if (!installedKeys) {
        console.warn(
          `Skipping ${relativePath}: no Bambu Studio root at ${studioRoot}`,
        );
        return;
      }

      const missing = setDifference(installedKeys, expectedKeys);
      const stale = setDifference(expectedKeys, installedKeys);
      expect(
        { missing, stale },
        `Schema drift in ${relativePath}. Add missing keys and review stale keys.`,
      ).toEqual({ missing: [], stale: [] });
    },
  );

  it.each([
    [
      "process",
      "system/BBL/process/fdm_process_common.json",
      PROCESS_ROOT_KEYS,
    ],
    [
      "filament",
      "system/BBL/filament/fdm_filament_common.json",
      FILAMENT_ROOT_KEYS,
    ],
  ] as const)(
    "server-renders every installed %s root field",
    (_kind, relativePath, expectedKeys) => {
      const data = readRootData(relativePath);
      if (!data) return;

      const table = React.createElement(ProfileTable, {
        chain: [{ relativePath, data }],
        hasCompareAccordion: false,
      });
      const html = renderToStaticMarkup(
        React.createElement(LocaleProvider, null, table),
      );

      for (const key of expectedKeys) {
        expect(html, key).toContain(key);
      }
    },
  );
});
