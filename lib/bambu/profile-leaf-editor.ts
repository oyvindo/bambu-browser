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

const LOCKED_FIELDS = ["inherits", "type", "name"] as const;
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
