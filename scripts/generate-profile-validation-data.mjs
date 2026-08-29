import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import prettier from "prettier";

const studioRoot =
  process.env.BAMBUSTUDIO_ROOT ??
  path.join(process.env.HOME ?? "", "Documents", "BambuStudio");
const outputPath = path.resolve(
  "lib/bambu/profile-value-validation.generated.ts",
);

const SKIP_CATEGORICAL = new Set([
  "compatible_printers",
  "compatible_printers_condition",
  "description",
  "filament_ids",
  "filament_notes",
  "filament_settings_id",
  "filament_vendor",
  "filename_format",
  "from",
  "inherits",
  "name",
  "print_settings_id",
  "setting_id",
  "version",
]);

async function jsonFilesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await jsonFilesUnder(absolute)));
    } else if (entry.name.toLowerCase().endsWith(".json")) {
      files.push(absolute);
    }
  }
  return files;
}

function leaves(value) {
  return Array.isArray(value) ? value.flatMap(leaves) : [value];
}

function numericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/%$/, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function createKeyStats() {
  return {
    count: 0,
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    scalar: false,
    array: false,
    values: new Map(),
  };
}

function createKindStats() {
  return { fileCount: 0, keys: new Map() };
}

function stableObject(entries) {
  return Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right)),
  );
}

const stats = {
  process: createKindStats(),
  filament: createKindStats(),
};

for (const kind of ["process", "filament"]) {
  const directory = path.join(studioRoot, "system", "BBL", kind);
  for (const file of await jsonFilesUnder(directory)) {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      parsed.type !== kind
    ) {
      continue;
    }
    stats[kind].fileCount += 1;
    for (const [key, value] of Object.entries(parsed)) {
      const keyStats = stats[kind].keys.get(key) ?? createKeyStats();
      keyStats.array ||= Array.isArray(value);
      keyStats.scalar ||= !Array.isArray(value);
      for (const leaf of leaves(value)) {
        const number = numericValue(leaf);
        if (number !== null) {
          keyStats.count += 1;
          keyStats.min = Math.min(keyStats.min, number);
          keyStats.max = Math.max(keyStats.max, number);
        }
        if (
          leaf === null ||
          ["string", "number", "boolean"].includes(typeof leaf)
        ) {
          const canonical = JSON.stringify(leaf);
          keyStats.values.set(
            canonical,
            (keyStats.values.get(canonical) ?? 0) + 1,
          );
        }
      }
      stats[kind].keys.set(key, keyStats);
    }
  }
}

function generatedKind(kind) {
  const kindStats = stats[kind];
  const numericBounds = [];
  const categoricalValues = [];
  const booleanKeys = [];
  const valueShapes = [];

  for (const [key, keyStats] of kindStats.keys) {
    if (keyStats.count > 0) {
      numericBounds.push([
        key,
        {
          min: keyStats.min,
          max: keyStats.max,
          samples: keyStats.count,
        },
      ]);
    }

    const rawValues = [...keyStats.values.keys()];
    const boolish =
      rawValues.length > 0 &&
      rawValues.every((value) =>
        ['"0"', '"1"', '"true"', '"false"', "true", "false", "0", "1"].includes(
          value,
        ),
      );
    if (boolish) booleanKeys.push(key);

    const categoryCandidates = rawValues
      .map((value) => JSON.parse(value))
      .filter(
        (value) =>
          typeof value === "string" &&
          numericValue(value) === null &&
          value.length <= 80,
      );
    const uniqueCategories = [...new Set(categoryCandidates)].sort();
    if (
      !SKIP_CATEGORICAL.has(key) &&
      !key.endsWith("_gcode") &&
      !key.endsWith("_notes") &&
      uniqueCategories.length > 0 &&
      uniqueCategories.length <= 24
    ) {
      categoricalValues.push([key, uniqueCategories]);
    }

    valueShapes.push([
      key,
      keyStats.array && keyStats.scalar
        ? "mixed"
        : keyStats.array
          ? "array"
          : "scalar",
    ]);
  }

  return {
    fileCount: kindStats.fileCount,
    knownKeys: [...kindStats.keys.keys()].sort(),
    numericBounds: stableObject(numericBounds),
    booleanKeys: booleanKeys.sort(),
    categoricalValues: stableObject(categoricalValues),
    valueShapes: stableObject(valueShapes),
  };
}

const generated = {
  process: generatedKind("process"),
  filament: generatedKind("filament"),
};
const source = path.relative(process.env.HOME ?? "", studioRoot);
const contents = await prettier.format(
  `/**\n * Generated by scripts/generate-profile-validation-data.mjs.\n * Source: ~/${source}; do not edit manually.\n */\nexport const PROFILE_VALUE_VALIDATION = ${JSON.stringify(generated, null, 2)} as const;\n`,
  { parser: "typescript" },
);

await writeFile(outputPath, contents, "utf8");
console.log(
  `Generated ${outputPath} from ${generated.process.fileCount} process and ${generated.filament.fileCount} filament profiles.`,
);
