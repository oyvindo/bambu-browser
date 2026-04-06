import { formatBambuMappedValue, type BambuValueUnit } from "./mapping";
import type { InheritanceChainLevel } from "./resolver";

/** One column in the TreeGrid: merged state up this inheritance step (root → … → profile). */
export type InheritanceColumnMeta = {
  index: number;
  level: InheritanceChainLevel;
  /** Short header role */
  roleLabel: string;
};

export type ColumnRoleLabels = {
  profile: string;
  root: string;
  parent: string;
  /** `levelIndex` is 1-based for display (second column → 2). */
  level: (levelIndex: number) => string;
};

function defaultColumnRoleLabels(): ColumnRoleLabels {
  return {
    profile: "Profile",
    root: "Root",
    parent: "Parent",
    level: (levelIndex: number) => `Level ${levelIndex}`,
  };
}

function columnRoleLabel(
  index: number,
  n: number,
  labels: ColumnRoleLabels,
): string {
  if (n === 1) return labels.profile;
  if (index === 0) return labels.root;
  if (index === n - 1) return labels.profile;
  if (index === n - 2) return labels.parent;
  return labels.level(index + 1);
}

/**
 * One column per resolver level: chain[0] = root template … chain[n-1] = selected profile.
 */
export function getInheritanceColumns(
  chain: readonly InheritanceChainLevel[],
  roleLabels: ColumnRoleLabels = defaultColumnRoleLabels(),
): InheritanceColumnMeta[] {
  const n = chain.length;
  if (n === 0) return [];
  return chain.map((level, index) => ({
    index,
    level,
    roleLabel: columnRoleLabel(index, n, roleLabels),
  }));
}

export type ThreeColumnSlice = {
  root: InheritanceChainLevel | null;
  system: InheritanceChainLevel | null;
  user: InheritanceChainLevel | null;
  rootIndex: number;
  systemIndex: number;
  userIndex: number;
};

/**
 * @deprecated Prefer {@link getInheritanceColumns} for full-chain columns.
 * Collapses chain to Root / System / User only.
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

/**
 * True when the leaf column’s displayed value differs from the previous inheritance
 * step (same condition as emerald “override” styling in the profile tree grid).
 */
export function isLeafInheritanceOverride(
  chain: readonly InheritanceChainLevel[],
  key: string,
  unit: BambuValueUnit,
  activeExtruderIndex: number,
): boolean {
  const n = chain.length;
  if (n < 2) return false;
  const parentText = formatBambuMappedValue(
    mergedValueAt(chain, n - 2, key),
    unit,
    activeExtruderIndex,
  );
  const leafText = formatBambuMappedValue(
    mergedValueAt(chain, n - 1, key),
    unit,
    activeExtruderIndex,
  );
  return parentText !== leafText;
}
