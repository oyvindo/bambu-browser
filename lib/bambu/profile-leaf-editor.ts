import {
  PROFILE_CONFIG_DEFS,
  type ProfileConfigDef,
} from "./profile-config-bounds.generated";
import { PROFILE_VALUE_VALIDATION } from "./profile-value-validation.generated";
import {
  FILAMENT_ROOT_KEYS,
  PROCESS_ROOT_KEYS,
  PROFILE_METADATA_KEYS,
} from "./profile-schema";
import type { ProfileKind } from "./resolver";
import type { SlicerSource } from "./slicer-source";

export type ProfileValidationSeverity = "blocker" | "error" | "warning";

export type ProfileValidationFinding = {
  severity: ProfileValidationSeverity;
  key?: string;
  message: string;
};

export type ProfileValidationResult = {
  data: Record<string, unknown> | null;
  findings: ProfileValidationFinding[];
  canSave: boolean;
};

type ValidationOptions = {
  kind: ProfileKind;
  slicer?: SlicerSource;
  original: Record<string, unknown>;
  inherited?: Record<string, unknown>;
};

type GeneratedKindValidation = {
  knownKeys: readonly string[];
  numericBounds: Readonly<
    Record<string, { min: number; max: number; samples: number }>
  >;
  booleanKeys: readonly string[];
  categoricalValues: Readonly<Record<string, readonly string[]>>;
  valueShapes: Readonly<Record<string, "array" | "scalar" | "mixed">>;
};

export const LOCKED_FIELDS = ["inherits", "type", "name", "from"] as const;
const SKIPPED_VALUE_KEYS = new Set([
  "compatible_printers",
  "compatible_printers_condition",
  "description",
  // Prices are in whatever currency the user thinks in, so any amount is valid.
  "filament_cost",
  "filament_ids",
  "filament_notes",
  "filament_settings_id",
  "filament_vendor",
  "filename_format",
  "print_settings_id",
  "setting_id",
  "volumetric_speed_coefficients",
]);

function sortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJsonValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortedJsonValue(nested)]),
    );
  }
  return value;
}

export function formatProfileJson(value: unknown): string {
  return `${JSON.stringify(sortedJsonValue(value), null, 4)}\n`;
}

export function parseProfileJson(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Profile JSON must be an object.");
  }
  return parsed as Record<string, unknown>;
}

/** Copy identity fields from the on-disk leaf; omit them if they were inherited. */
export function restoreLockedProfileFields(
  draft: Record<string, unknown>,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...draft };
  for (const key of LOCKED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(original, key)) {
      next[key] = original[key];
    } else {
      delete next[key];
    }
  }
  return next;
}

export function hasLockedFieldFinding(
  findings: readonly { key?: string }[],
): boolean {
  return findings.some(
    (finding) =>
      finding.key !== undefined &&
      (LOCKED_FIELDS as readonly string[]).includes(finding.key),
  );
}

/** Profile-setting overrides stored in a leaf, excluding identity metadata. */
export function profileSettingKeys(
  value: Readonly<Record<string, unknown>>,
): string[] {
  return Object.keys(value)
    .filter((key) => !PROFILE_METADATA_KEYS.has(key))
    .sort((left, right) => left.localeCompare(right));
}

/** Index just past a JSON value that starts at or after `from`. */
function endOfJsonValue(text: string, from: number): number {
  let index = from;
  while (index < text.length && /\s/.test(text[index]!)) index += 1;
  const opening = text[index];
  if (opening === "{" || opening === "[") {
    let depth = 0;
    let inString = false;
    while (index < text.length) {
      const char = text[index]!;
      if (inString) {
        if (char === "\\") index += 1;
        else if (char === '"') inString = false;
      } else if (char === '"') {
        inString = true;
      } else if (char === "{" || char === "[") {
        depth += 1;
      } else if (char === "}" || char === "]") {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
      index += 1;
    }
    return text.length;
  }
  let inString = false;
  while (index < text.length) {
    const char = text[index]!;
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "," || char === "}" || char === "]" || char === "\n") {
      break;
    }
    index += 1;
  }
  while (index > from && /\s/.test(text[index - 1]!)) index -= 1;
  return index;
}

/**
 * Character range of a top-level `"key": value` pair, from the opening quote of
 * the key through the end of its value. Nested keys of the same name are
 * ignored so the editor highlights the entry the tag refers to.
 */
export function findProfileKeyRange(
  text: string,
  key: string,
): { start: number; end: number } | null {
  let depth = 0;
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === '"') {
      const quoteStart = index;
      index += 1;
      let name = "";
      while (index < text.length) {
        const inner = text[index]!;
        if (inner === "\\") {
          name += text[index + 1] ?? "";
          index += 2;
          continue;
        }
        if (inner === '"') break;
        name += inner;
        index += 1;
      }
      index += 1;
      if (depth === 1 && name === key) {
        let colon = index;
        while (colon < text.length && /\s/.test(text[colon]!)) colon += 1;
        if (text[colon] === ":") {
          return { start: quoteStart, end: endOfJsonValue(text, colon + 1) };
        }
      }
      continue;
    }
    if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") depth -= 1;
    index += 1;
  }
  return null;
}

function deepEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(sortedJsonValue(left)) ===
    JSON.stringify(sortedJsonValue(right))
  );
}

function scalarValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value.flatMap(scalarValues) : [value];
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/%$/, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function comparableNumeric(value: unknown): number | null {
  const values = scalarValues(value)
    .map(parseNumeric)
    .filter((entry): entry is number => entry !== null);
  return values.length === 1 ? values[0]! : null;
}

function configDef(key: string): ProfileConfigDef | undefined {
  return PROFILE_CONFIG_DEFS[key];
}

/** Only continuous options; counts, bitfields and flags jump by design. */
function isContinuous(def: ProfileConfigDef | undefined): boolean {
  return (
    def !== undefined &&
    (def.type.startsWith("coFloat") || def.type.startsWith("coPercent"))
  );
}

function isBoolean(def: ProfileConfigDef | undefined): boolean {
  return def !== undefined && def.type.startsWith("coBool");
}

function isFreeText(def: ProfileConfigDef | undefined): boolean {
  return def !== undefined && def.type.startsWith("coString");
}

function addFinding(
  findings: ProfileValidationFinding[],
  severity: ProfileValidationSeverity,
  message: string,
  key?: string,
) {
  findings.push({ severity, message, ...(key ? { key } : {}) });
}

export function validateProfileJson(
  text: string,
  options: ValidationOptions,
): ProfileValidationResult {
  let data: Record<string, unknown>;
  try {
    data = parseProfileJson(text);
  } catch (error) {
    return {
      data: null,
      canSave: false,
      findings: [
        {
          severity: "error",
          message:
            error instanceof Error ? error.message : "Invalid profile JSON.",
        },
      ],
    };
  }

  const findings: ProfileValidationFinding[] = [];
  const generated = PROFILE_VALUE_VALIDATION[
    options.kind
  ] as GeneratedKindValidation;
  const knownKeys = new Set([
    ...generated.knownKeys,
    ...(options.kind === "filament" ? FILAMENT_ROOT_KEYS : PROCESS_ROOT_KEYS),
    ...PROFILE_METADATA_KEYS,
  ]);
  const booleanKeys = new Set(generated.booleanKeys);

  for (const key of LOCKED_FIELDS) {
    const inOriginal = Object.prototype.hasOwnProperty.call(
      options.original,
      key,
    );
    const inDraft = Object.prototype.hasOwnProperty.call(data, key);
    // Absent in both means the value is inherited, so it cannot have changed.
    if (!inOriginal && !inDraft) continue;
    if (inOriginal && inDraft && deepEqual(data[key], options.original[key])) {
      continue;
    }
    // Spelling out the inherited kind is harmless; every other change is not.
    if (!inOriginal && key === "type" && data.type === options.kind) continue;
    addFinding(
      findings,
      key === "inherits" ? "blocker" : "error",
      `${key} cannot be changed.`,
      key,
    );
  }
  if (data.type !== undefined && data.type !== options.kind) {
    addFinding(
      findings,
      "error",
      `type must remain "${options.kind}".`,
      "type",
    );
  }

  // OrcaSlicer shares the JSON/inheritance model but has its own evolving
  // PrintConfig schema and commonly uses scalar values where Bambu uses
  // one-element arrays. Keep structural and locked-field checks above, but do
  // not apply Bambu-generated bounds, enums, shapes, or unknown-key rules.
  if (options.slicer === "orca") {
    return {
      data,
      findings,
      canSave: !findings.some(
        ({ severity }) => severity === "blocker" || severity === "error",
      ),
    };
  }

  for (const [key, value] of Object.entries(data)) {
    if (
      !knownKeys.has(key) &&
      !Object.prototype.hasOwnProperty.call(options.original, key)
    ) {
      addFinding(findings, "error", "Unknown profile field.", key);
      continue;
    }
    if (
      SKIPPED_VALUE_KEYS.has(key) ||
      key.endsWith("_gcode") ||
      key.endsWith("_notes")
    ) {
      continue;
    }

    const expectedShape = generated.valueShapes[key];
    if (
      expectedShape &&
      expectedShape !== "mixed" &&
      (Array.isArray(value) ? "array" : "scalar") !== expectedShape
    ) {
      addFinding(
        findings,
        "warning",
        `Expected a ${expectedShape} value.`,
        key,
      );
    }

    const def = configDef(key);

    if (isBoolean(def) || (def === undefined && booleanKeys.has(key))) {
      const valid = scalarValues(value).every((entry) =>
        [0, 1, "0", "1", true, false, "true", "false"].includes(entry as never),
      );
      if (!valid) {
        addFinding(
          findings,
          "warning",
          "Expected a boolean value (0/1 or true/false).",
          key,
        );
      }
    }

    // Studio's own enum lists are exhaustive; values seen in shipped profiles
    // only stand in where Studio does not declare the option at all.
    const categories =
      def?.enumValues ??
      (def === undefined ? generated.categoricalValues[key] : undefined);
    if (categories && !isFreeText(def)) {
      for (const entry of scalarValues(value)) {
        if (
          typeof entry === "string" &&
          parseNumeric(entry) === null &&
          !categories.includes(entry)
        ) {
          addFinding(
            findings,
            "warning",
            `Unrecognized value "${entry}". Known values: ${categories.join(", ")}.`,
            key,
          );
        }
      }
    }

    if (def && (def.min !== undefined || def.max !== undefined)) {
      for (const entry of scalarValues(value)) {
        const number = parseNumeric(entry);
        if (number === null) continue;
        if (def.min !== undefined && number < def.min) {
          addFinding(
            findings,
            "warning",
            `Value ${number} is below the supported minimum ${def.min}.`,
            key,
          );
        }
        if (def.max !== undefined && number > def.max) {
          addFinding(
            findings,
            "warning",
            `Value ${number} is above the supported maximum ${def.max}.`,
            key,
          );
        }
      }
    }

    const currentNumber = comparableNumeric(value);
    const inheritedNumber = comparableNumeric(options.inherited?.[key]);
    if (
      isContinuous(def) &&
      currentNumber !== null &&
      inheritedNumber !== null &&
      Math.abs(currentNumber - inheritedNumber) >= 0.01 &&
      ((inheritedNumber === 0 && Math.abs(currentNumber) >= 1) ||
        (inheritedNumber !== 0 &&
          Math.abs(currentNumber / inheritedNumber) >= 2))
    ) {
      addFinding(
        findings,
        "warning",
        `Value ${currentNumber} differs substantially from inherited value ${inheritedNumber}.`,
        key,
      );
    }
  }

  return {
    data,
    findings,
    canSave: !findings.some(
      ({ severity }) => severity === "blocker" || severity === "error",
    ),
  };
}
