import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import prettier from 'prettier';

const ORCA_VERSION = 'v2.4.2';
const ORCA_COMMIT = '8500fcdccaa10b5099ac20d252af3a7c560046f1';
const DEFAULT_SOURCE_URL = `https://raw.githubusercontent.com/OrcaSlicer/OrcaSlicer/${ORCA_VERSION}/src/libslic3r/PrintConfig.cpp`;
const outputPath = path.resolve('lib/bambu/orca-profile-config.generated.ts');
const sourceUrl = process.env.ORCASLICER_PRINTCONFIG_URL ?? DEFAULT_SOURCE_URL;

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`Could not download ${sourceUrl}: ${response.status}`);
}
const text = await response.text();

function decodeCppString(raw) {
  const jsonString = raw
    .replace(/^u8/, '')
    .replace(/\\x([0-9a-fA-F]{2})/g, (_match, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString
      .slice(1, -1)
      .replaceAll('\\n', '\n')
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\');
  }
}

function stringsIn(expression) {
  return [...expression.matchAll(/(?:u8)?"(?:\\.|[^"\\])*"/g)].map((match) =>
    decodeCppString(match[0]),
  );
}

function assignment(block, property) {
  const startMatch = new RegExp(`def\\s*->\\s*${property}\\s*=\\s*`).exec(block);
  if (!startMatch || startMatch.index === undefined) return null;

  const start = startMatch.index + startMatch[0].length;
  let inString = false;
  for (let index = start; index < block.length; index += 1) {
    const char = block[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === ';') {
      return block.slice(start, index);
    }
  }
  return null;
}

function assignedText(block, property) {
  const expression = assignment(block, property);
  if (!expression) return undefined;
  const parts = stringsIn(expression);
  return parts.length > 0 ? parts.join('') : undefined;
}

const constants = new Map();
for (const match of text.matchAll(
  /(?:static\s+)?const\s+(?:int|float|double)\s+(\w+)\s*=\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?f?)\s*;/gi,
)) {
  const value = Number(match[2].replace(/f$/i, ''));
  if (Number.isFinite(value)) constants.set(match[1], value);
}

function numberFrom(raw) {
  const trimmed = raw.trim().replace(/f$/i, '');
  if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(trimmed)) {
    return Number(trimmed);
  }
  const constant = trimmed.match(/^([+-]?)([A-Za-z_]\w*)$/);
  if (!constant) return undefined;
  const value = constants.get(constant[2]);
  if (value === undefined) return undefined;
  return constant[1] === '-' ? -value : value;
}

const enumKeyMaps = new Map();
for (const match of text.matchAll(
  /(?:static\s+)?t_config_enum_values\s+(\w+)\s*\{([\s\S]*?)\};/g,
)) {
  const values = [...match[2].matchAll(/\{\s*(?:u8)?"((?:\\.|[^"\\])*)"\s*,[\s\S]*?\}/g)].map(
    (entry) => decodeCppString(`"${entry[1]}"`),
  );
  if (values.length > 0) enumKeyMaps.set(match[1], values);
}

function enumValuesFrom(block) {
  const mapName = block.match(/def\s*->\s*enum_keys_map\s*=\s*&(\w+)\s*;/)?.[1];
  if (mapName && enumKeyMaps.has(mapName)) return enumKeyMaps.get(mapName);

  const direct = [
    ...block.matchAll(
      /enum_values\.(?:push_back|emplace_back)\(\s*(?:L\(\s*)?((?:u8)?"(?:\\.|[^"\\])*")\s*\)?\s*\)/g,
    ),
  ].map((entry) => decodeCppString(entry[1]));
  if (direct.length > 0) return direct;

  const assigned = assignment(block, 'enum_values');
  if (assigned?.trim().startsWith('{')) {
    const values = stringsIn(assigned);
    if (values.length > 0) return values;
  }
  return undefined;
}

const definitions = new Map();
const enumAliases = new Map();
const definitionVariables = new Map(
  [
    ...text.matchAll(
      /(?:auto\s+)?(def_\w+)\s*=\s*(?:def\s*=\s*)?this->add(?:_nullable)?\(\s*"([A-Za-z0-9_]+)"/g,
    ),
  ].map((match) => [match[1], match[2]]),
);
const addPattern = /this->add(?:_nullable)?\(\s*"([A-Za-z0-9_]+)"\s*,\s*(co\w+)\s*\)/g;
const additions = [...text.matchAll(addPattern)];

for (const [index, match] of additions.entries()) {
  const key = match[1];
  const blockStart = match.index + match[0].length;
  const blockEnd = additions[index + 1]?.index ?? text.length;
  const block = text.slice(blockStart, blockEnd);
  const definition = { type: match[2] };

  const min = assignment(block, 'min');
  const max = assignment(block, 'max');
  const minValue = min ? numberFrom(min) : undefined;
  const maxValue = max ? numberFrom(max) : undefined;
  if (minValue !== undefined) definition.min = minValue;
  if (maxValue !== undefined) definition.max = maxValue;

  const enumValues = enumValuesFrom(block);
  if (enumValues) definition.enumValues = enumValues;
  const enumAlias = assignment(block, 'enum_values')?.match(/^\s*(def_\w+)->enum_values\s*$/)?.[1];
  if (enumAlias) enumAliases.set(key, enumAlias);

  const label = assignedText(block, 'label');
  const category = assignedText(block, 'category');
  const tooltip = assignedText(block, 'tooltip');
  const sidetext = assignedText(block, 'sidetext');
  if (label) definition.label = label;
  if (category) definition.category = category;
  if (tooltip) definition.tooltip = tooltip;
  if (sidetext) definition.sidetext = sidetext;
  if (/def\s*->\s*mode\s*=\s*comAdvanced\s*;/.test(block)) {
    definition.advanced = true;
  }

  const existing = definitions.get(key);
  definitions.set(key, existing ? { ...existing, ...definition } : definition);
}

for (const [key, variable] of enumAliases) {
  const sourceKey = definitionVariables.get(variable);
  const values = sourceKey ? definitions.get(sourceKey)?.enumValues : undefined;
  if (values) definitions.get(key).enumValues = values;
}

const overrideList = text.match(/filament_extruder_override_keys\s*=\s*\{([\s\S]*?)\};/)?.[1];
if (overrideList) {
  const simpleOverrides = new Set([
    'filament_retraction_length',
    'filament_z_hop',
    'filament_long_retractions_when_cut',
    'filament_retraction_distances_when_cut',
  ]);
  for (const filamentKey of stringsIn(overrideList)) {
    const source = definitions.get(filamentKey.replace(/^filament_/, ''));
    if (!source) {
      throw new Error(`Could not find source definition for dynamic option ${filamentKey}.`);
    }
    definitions.set(filamentKey, {
      ...source,
      ...(simpleOverrides.has(filamentKey) ? {} : { advanced: true }),
    });
  }
}

const sorted = Object.fromEntries(
  [...definitions.entries()].sort(([left], [right]) => left.localeCompare(right)),
);

const contents = await prettier.format(
  `/**
 * Generated by scripts/generate-orca-profile-config.mjs.
 * Source: OrcaSlicer ${ORCA_VERSION} (${ORCA_COMMIT})
 * ${sourceUrl}
 * Do not edit manually.
 */
export const ORCA_PROFILE_CONFIG_SOURCE = {
  version: ${JSON.stringify(ORCA_VERSION)},
  commit: ${JSON.stringify(ORCA_COMMIT)},
  url: ${JSON.stringify(sourceUrl)},
} as const;

export type OrcaProfileConfigDef = {
  type: string;
  min?: number;
  max?: number;
  enumValues?: readonly string[];
  label?: string;
  category?: string;
  tooltip?: string;
  sidetext?: string;
  advanced?: boolean;
};

export const ORCA_PROFILE_CONFIG_DEFS: Readonly<
  Record<string, OrcaProfileConfigDef>
> = ${JSON.stringify(sorted, null, 2)};
`,
  { parser: 'typescript' },
);

await writeFile(outputPath, contents, 'utf8');
console.log(
  `Generated ${outputPath} with ${definitions.size} option definitions from OrcaSlicer ${ORCA_VERSION}.`,
);
