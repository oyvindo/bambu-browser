/**
 * Bambu Studio process profile: JSON key → group / subgroup / UI label / unit / advanced.
 * Row title: label + unit in parentheses when applicable.
 */

export type BambuValueUnit =
  | "mm"
  | "mm/s"
  | "mm/s²"
  | "%"
  | "°"
  | "count"
  | "string"
  | "enum"
  | "boolean";

export type BambuPropertyRowDef = {
  key: string;
  /** Bambu Studio UI name */
  label: string;
  unit: BambuValueUnit;
  /** Hidden unless “Advanced” is on */
  advanced?: boolean;
};

export type BambuMappedSubgroup = {
  id: string;
  label: string;
  properties: readonly BambuPropertyRowDef[];
};

export type BambuMappedGroup = {
  id: string;
  label: string;
  subgroups: readonly BambuMappedSubgroup[];
};

/**
 * Ordered TreeGrid: Quality → Strength → Speed → Support → Others.
 * Structure is strictly 3 levels: Group (tab) → Subgroup (section) → Property (JSON key).
 */
export const BAMBU_PROCESS_UI_TREE: readonly BambuMappedGroup[] = [
  {
    id: "quality",
    label: "Quality",
    subgroups: [
      {
        id: "quality-layer-height",
        label: "Layer height",
        properties: [
          { key: "layer_height", label: "Layer height", unit: "mm" },
          {
            key: "initial_layer_print_height",
            label: "First layer height",
            unit: "mm",
          },
        ],
      },
      {
        id: "quality-line-width",
        label: "Line width",
        properties: [
          { key: "line_width", label: "Default line width", unit: "mm" },
          {
            key: "initial_layer_line_width",
            label: "First layer",
            unit: "mm",
            advanced: true,
          },
          { key: "outer_wall_line_width", label: "Outer wall", unit: "mm" },
          { key: "inner_wall_line_width", label: "Inner wall", unit: "mm" },
          {
            key: "sparse_infill_line_width",
            label: "Sparse infill",
            unit: "mm",
          },
          {
            key: "internal_solid_infill_line_width",
            label: "Internal solid infill",
            unit: "mm",
            advanced: true,
          },
          { key: "top_surface_line_width", label: "Top surface", unit: "mm" },
        ],
      },
      {
        id: "quality-wall-seam",
        label: "Wall & seam",
        properties: [
          {
            key: "wall_generator",
            label: "Wall generator",
            unit: "enum",
            advanced: true,
          },
          { key: "seam_position", label: "Seam position", unit: "enum" },
          {
            key: "detect_thin_wall",
            label: "Detect thin wall",
            unit: "boolean",
            advanced: true,
          },
        ],
      },
      {
        id: "quality-precision",
        label: "Precision",
        properties: [
          {
            key: "elefant_foot_compensation",
            label: "Elephant foot compensation",
            unit: "mm",
            advanced: true,
          },
          {
            key: "enable_arc_fitting",
            label: "Enable arc fitting",
            unit: "boolean",
            advanced: true,
          },
          {
            key: "bridge_flow",
            label: "Bridge flow",
            unit: "count",
            advanced: true,
          },
        ],
      },
    ],
  },
  {
    id: "strength",
    label: "Strength",
    subgroups: [
      {
        id: "strength-walls",
        label: "Walls",
        properties: [
          { key: "wall_loops", label: "Wall loops", unit: "count" },
          { key: "top_shell_layers", label: "Top shell layers", unit: "count" },
          {
            key: "bottom_shell_layers",
            label: "Bottom shell layers",
            unit: "count",
          },
          {
            key: "wall_infill_order",
            label: "Wall in-fill order",
            unit: "enum",
            advanced: true,
          },
        ],
      },
      {
        id: "strength-infill",
        label: "Infill",
        properties: [
          {
            key: "sparse_infill_density",
            label: "Sparse infill density",
            unit: "%",
          },
          {
            key: "sparse_infill_pattern",
            label: "Sparse infill pattern",
            unit: "enum",
          },
          {
            key: "infill_direction",
            label: "Infill direction",
            unit: "°",
            advanced: true,
          },
          {
            key: "infill_wall_overlap",
            label: "Infill/wall overlap",
            unit: "%",
            advanced: true,
          },
        ],
      },
    ],
  },
  {
    id: "speed",
    label: "Speed",
    subgroups: [
      {
        id: "speed-print",
        label: "Print speed",
        properties: [
          { key: "initial_layer_speed", label: "First layer", unit: "mm/s" },
          { key: "outer_wall_speed", label: "Outer wall", unit: "mm/s" },
          { key: "inner_wall_speed", label: "Inner wall", unit: "mm/s" },
          { key: "sparse_infill_speed", label: "Sparse infill", unit: "mm/s" },
          { key: "travel_speed", label: "Travel", unit: "mm/s" },
        ],
      },
      {
        id: "speed-acceleration",
        label: "Acceleration",
        properties: [
          {
            key: "default_acceleration",
            label: "Normal printing",
            unit: "mm/s²",
          },
          { key: "travel_acceleration", label: "Travel", unit: "mm/s²" },
        ],
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    subgroups: [
      {
        id: "support-basic",
        label: "Support",
        properties: [
          { key: "enable_support", label: "Enable support", unit: "boolean" },
          { key: "support_type", label: "Type", unit: "enum" },
          { key: "support_style", label: "Style", unit: "enum" },
          {
            key: "support_on_build_plate_only",
            label: "On build plate only",
            unit: "boolean",
          },
        ],
      },
      {
        id: "support-advanced",
        label: "Advanced",
        properties: [
          {
            key: "support_threshold_angle",
            label: "Threshold angle",
            unit: "°",
            advanced: true,
          },
          {
            key: "support_top_z_distance",
            label: "Top Z distance",
            unit: "mm",
          },
          {
            key: "support_bottom_z_distance",
            label: "Bottom Z distance",
            unit: "mm",
            advanced: true,
          },
          {
            key: "support_interface_pattern",
            label: "Interface pattern",
            unit: "enum",
            advanced: true,
          },
        ],
      },
    ],
  },
  {
    id: "others",
    label: "Others",
    subgroups: [
      {
        id: "others-brim",
        label: "Brim",
        properties: [
          { key: "brim_type", label: "Brim type", unit: "enum" },
          { key: "brim_width", label: "Brim width", unit: "mm" },
          {
            key: "brim_object_gap",
            label: "Brim-object gap",
            unit: "mm",
            advanced: true,
          },
        ],
      },
      {
        id: "others-skirt",
        label: "Skirt",
        properties: [
          { key: "skirt_loops", label: "Skirt loops", unit: "count" },
          { key: "skirt_distance", label: "Skirt distance", unit: "mm" },
          { key: "skirt_height", label: "Skirt height", unit: "count" },
        ],
      },
      {
        id: "others-prime-tower",
        label: "Prime tower",
        properties: [
          {
            key: "enable_prime_tower",
            label: "Enable prime tower",
            unit: "boolean",
            advanced: true,
          },
          {
            key: "prime_tower_width",
            label: "Width",
            unit: "mm",
            advanced: true,
          },
        ],
      },
    ],
  },
] as const;

/** @deprecated Use BAMBU_PROCESS_UI_TREE */
export const BAMBU_PROCESS_UI_MAP = BAMBU_PROCESS_UI_TREE;

/** Alias for docs / external references */
export const BAMBU_MAPPING = BAMBU_PROCESS_UI_TREE;

const UNITS_IN_TITLE: ReadonlySet<string> = new Set([
  "mm",
  "mm/s",
  "mm/s²",
  "%",
  "°",
  "count",
]);

/** Row title: ui label plus unit in parentheses when it is a physical/count unit. */
export function propertyRowTitle(p: BambuPropertyRowDef): string {
  if (p.unit === "string" || p.unit === "enum" || p.unit === "boolean") {
    return p.label;
  }
  if (UNITS_IN_TITLE.has(p.unit)) {
    return `${p.label} (${p.unit})`;
  }
  return p.label;
}

/** Pick scalar from profile: first array element when value is an array. */
export function pickScalarValue(
  value: unknown,
  extruderIndex: number,
): unknown {
  if (!Array.isArray(value)) return value;
  if (value.length === 0) return undefined;
  const i = Math.min(Math.max(0, extruderIndex), value.length - 1);
  return value[i] ?? value[0];
}

/**
 * Display string for a cell: arrays → first element (or index); strings as-is; append unit when helpful.
 */
export function formatBambuMappedValue(
  value: unknown,
  unit: BambuValueUnit,
  extruderIndex: number,
): string {
  const v = pickScalarValue(value, extruderIndex);
  if (v === undefined || v === null) return "—";

  if (unit === "boolean") {
    if (v === true || v === "true" || v === 1 || v === "1") return "Yes";
    if (v === false || v === "false" || v === 0 || v === "0") return "No";
    return String(v);
  }
  if (typeof v === "boolean") {
    return v ? "Yes" : "No";
  }

  const s =
    typeof v === "number" && Number.isFinite(v) ? String(v) : String(v).trim();
  if (s === "") return "—";

  if (unit === "string" || unit === "enum") {
    return s;
  }

  if (unit === "%") {
    if (s.endsWith("%")) return s;
    return `${s}%`;
  }

  if (unit === "mm" || unit === "mm/s" || unit === "mm/s²" || unit === "°") {
    const suffix = unit === "mm/s²" ? "mm/s²" : unit;
    if (s.toLowerCase().endsWith(suffix.toLowerCase())) return s;
    return `${s} ${suffix}`;
  }

  if (unit === "count") {
    return s;
  }

  return s;
}

export type BambuPropertyLookup = {
  group: BambuMappedGroup;
  subgroup: BambuMappedSubgroup;
  property: BambuPropertyRowDef;
};

/** @alias BambuPropertyLookup */
export type MappedPropertyLookup = BambuPropertyLookup;

let keyToPropertyCache: ReadonlyMap<string, BambuPropertyLookup> | null = null;

export function buildKeyIndex(): ReadonlyMap<string, BambuPropertyLookup> {
  if (keyToPropertyCache) return keyToPropertyCache;
  const m = new Map<string, BambuPropertyLookup>();
  for (const group of BAMBU_PROCESS_UI_TREE) {
    for (const subgroup of group.subgroups) {
      for (const property of subgroup.properties) {
        m.set(property.key, { group, subgroup, property });
      }
    }
  }
  keyToPropertyCache = m;
  return m;
}

export function getMappedPropertyByKey(
  key: string,
): MappedPropertyLookup | undefined {
  return buildKeyIndex().get(key);
}

export type BambuFlatRow = BambuPropertyLookup & { order: number };

export function iterateMappedTreeRows(options: {
  includeAdvanced: boolean;
}): BambuFlatRow[] {
  let order = 0;
  const rows: BambuFlatRow[] = [];
  for (const group of BAMBU_PROCESS_UI_TREE) {
    for (const subgroup of group.subgroups) {
      for (const property of subgroup.properties) {
        if (property.advanced && !options.includeAdvanced) continue;
        rows.push({ group, subgroup, property, order: order++ });
      }
    }
  }
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Legacy helpers (kept for any older imports)                                */
/* -------------------------------------------------------------------------- */

export type PropertyValueLayout =
  | { kind: "scalar" }
  | {
      kind: "array";
      semantics: "per_extruder" | "per_component" | "generic";
      length?: number;
    };

/** @deprecated Use BambuPropertyRowDef */
export type MappedProperty = {
  key: string;
  label: string;
  layout: PropertyValueLayout;
};

/** @deprecated Use BambuMappedSubgroup */
export type MappedSubgroup = {
  id: string;
  label: string;
  properties: readonly MappedProperty[];
};

/** @deprecated Use BambuMappedGroup */
export type MappedGroup = {
  id: string;
  label: string;
  subgroups: readonly MappedSubgroup[];
};

export type MappedPropertyLookupLegacy = {
  group: MappedGroup;
  subgroup: MappedSubgroup;
  property: MappedProperty;
};

export type MappedPropertyRow = MappedPropertyLookupLegacy & { order: number };

export function iterateMappedProperties(): MappedPropertyRow[] {
  const out: MappedPropertyRow[] = [];
  let order = 0;
  for (const group of BAMBU_PROCESS_UI_TREE) {
    for (const subgroup of group.subgroups) {
      for (const row of subgroup.properties) {
        const property: MappedProperty = {
          key: row.key,
          label: row.label,
          layout: row.advanced ? { kind: "scalar" } : { kind: "scalar" },
        };
        out.push({
          group: group as unknown as MappedGroup,
          subgroup: subgroup as unknown as MappedSubgroup,
          property,
          order: order++,
        });
      }
    }
  }
  return out;
}

export function propertyExpectsArray(property: MappedProperty): boolean {
  void property;
  return false;
}

export function segmentsForProfileValue(
  value: unknown,
  layout: PropertyValueLayout,
): { index: number | null; text: string }[] {
  void layout;
  if (Array.isArray(value)) {
    return value.map((v, i) => ({ index: i, text: formatJsonLeaf(v) }));
  }
  return [{ index: null, text: formatJsonLeaf(value) }];
}

function formatJsonLeaf(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function valuesEqualForLayout(
  a: unknown,
  b: unknown,
  layout: PropertyValueLayout,
): boolean {
  if (layout.kind === "array") {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) =>
        valuesEqualForLayout(v, b[i], { kind: "scalar" }),
      );
    }
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.every((v, i) => valuesEqualForLayout(v, b[i], { kind: "scalar" }));
  }
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value as object).sort();
  const entries = keys.map(
    (k) =>
      `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
  );
  return `{${entries.join(",")}}`;
}
