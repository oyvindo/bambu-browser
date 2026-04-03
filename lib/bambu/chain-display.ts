import type { InheritanceChainLevel } from "./resolver";

export type ThreeColumnSlice = {
  root: InheritanceChainLevel | null;
  system: InheritanceChainLevel | null;
  user: InheritanceChainLevel | null;
  rootIndex: number;
  systemIndex: number;
  userIndex: number;
};

/**
 * Maps a full resolver chain to Root / System / User columns.
 * System = immediate parent of the user file (second-to-last level).
 */
export function getThreeColumnSlice(
  chain: readonly InheritanceChainLevel[],
): ThreeColumnSlice {
  const n = chain.length;
  if (n === 0) {
    return {
      root: null,
      system: null,
      user: null,
      rootIndex: -1,
      systemIndex: -1,
      userIndex: -1,
    };
  }
  if (n === 1) {
    return {
      root: chain[0]!,
      system: chain[0]!,
      user: chain[0]!,
      rootIndex: 0,
      systemIndex: 0,
      userIndex: 0,
    };
  }
  if (n === 2) {
    return {
      root: chain[0]!,
      system: chain[0]!,
      user: chain[1]!,
      rootIndex: 0,
      systemIndex: 0,
      userIndex: 1,
    };
  }
  return {
    root: chain[0]!,
    system: chain[n - 2]!,
    user: chain[n - 1]!,
    rootIndex: 0,
    systemIndex: n - 2,
    userIndex: n - 1,
  };
}

/** Merged value from root up to `uptoInclusive` when each file overrides `key`. */
export function mergedValueAt(
  chain: readonly InheritanceChainLevel[],
  uptoInclusive: number,
  key: string,
): unknown {
  let v: unknown = undefined;
  for (let i = 0; i <= uptoInclusive; i++) {
    const level = chain[i];
    if (!level) continue;
    const d = level.data;
    if (Object.prototype.hasOwnProperty.call(d, key)) {
      v = d[key];
    }
  }
  return v;
}

/**
 * Display for grid cells: strings like "25%" as-is; arrays use the active extruder slot (default 0), then first element.
 */
export function formatProfileCellValue(
  value: unknown,
  activeExtruderIndex: number,
): string {
  if (value === undefined || value === null) return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    const i = Math.min(Math.max(0, activeExtruderIndex), value.length - 1);
    const picked = value[i] ?? value[0];
    if (picked === undefined || picked === null) return "—";
    return String(picked);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** True if displayed values differ (used for override highlighting). */
export function displayValuesDiffer(
  a: unknown,
  b: unknown,
  activeExtruderIndex: number,
): boolean {
  return (
    formatProfileCellValue(a, activeExtruderIndex) !==
    formatProfileCellValue(b, activeExtruderIndex)
  );
}
