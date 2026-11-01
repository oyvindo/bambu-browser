import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  assignedText,
  assignment,
  createPrintConfigReader,
  stringsIn,
} from './lib/print-config-cpp.mjs';

/**
 * Reads PrusaSlicer's option definitions (labels, categories, tooltips,
 * limits, enum keys, `ratio_over` and built-in defaults) from PrintConfig.cpp,
 * and which keys a print or filament preset holds from Preset.cpp.
 */
const PRUSA_VERSION = 'version_2.9.6';
const RAW_BASE = `https://raw.githubusercontent.com/prusa3d/PrusaSlicer/${PRUSA_VERSION}/src/libslic3r`;
const outputPath = path.resolve('lib/prusa/prusa-profile-config.generated.ts');

async function loadSource(envName, fileName) {
  const local = process.env[envName];
  if (local) return readFile(local, 'utf8');
  const url = `${RAW_BASE}/${fileName}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  return response.text();
}

const text = await loadSource('PRUSASLICER_PRINTCONFIG', 'PrintConfig.cpp');
const presetText = await loadSource('PRUSASLICER_PRESET', 'Preset.cpp');
const { numberFrom } = createPrintConfigReader(text);

/** Text between `open` at `start` and its matching closing bracket. */
function balanced(source, start) {
  const open = source[start];
  const close = { '(': ')', '{': '}' }[open];
  let depth = 0;
  let inString = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, index);
    }
  }
  return null;
}

/** Splits on commas that are not inside brackets or strings. */
function topLevelItems(source) {
  const items = [];
  let depth = 0;
  let inString = false;
  let current = '';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    current += char;
    if (inString) {
      if (char === '\\') current += source[++index] ?? '';
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if ('({'.includes(char)) depth += 1;
    else if (')}'.includes(char)) depth -= 1;
    else if (char === ',' && depth === 0) {
      items.push(current.slice(0, -1).trim());
      current = '';
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

// `t_config_enum_values s_keys_map_InfillPattern { { "stars", ipStars }, … }`
const enumConstants = new Map();
for (const match of text.matchAll(
  /t_config_enum_values\s+s_keys_map_(\w+)\s*=?\s*\{([\s\S]*?)\};/g,
)) {
  const byConstant = new Map();
  for (const pair of match[2].matchAll(
    /\{\s*"((?:\\.|[^"\\])*)"\s*,\s*(?:(?:int|static_cast<int>)\(\s*)?([\w:]+)\s*\)?\s*\}/g,
  )) {
    byConstant.set(pair[2], pair[1]);
  }
  enumConstants.set(match[1], byConstant);
}

// Tooltips shared by several options: `auto description = L("…");`
const textVariables = new Map();
for (const match of text.matchAll(/auto\s+(\w+)\s*=\s*L\(([\s\S]*?)\);/g)) {
  const parts = stringsIn(match[2]);
  if (parts.length > 0) textVariables.set(match[1], parts.join(''));
}

function textProperty(block, property) {
  const direct = assignedText(block, property);
  if (direct) return direct;
  const variable = assignment(block, property)?.trim();
  return variable ? textVariables.get(variable) : undefined;
}

function formatNumber(raw) {
  const value = numberFrom(raw.replace(/\.$/, '.0'));
  return value === undefined ? undefined : String(value);
}

// Slic3r::escape_string_cstyle: a single string escapes \\, \n and \r, unquoted.
function escapeCString(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('\r', '\\r');
}

// Slic3r::escape_strings_cstyle: elements are joined with ';' and quoted only
// when they hold a space, ';', tab, backslash, quote or line break (or when a
// lone element is empty).
function escapeCStrings(values) {
  return values
    .map((value) => {
      const quote = (values.length === 1 && value === '') || /[ ;\t\\"\r\n]/.test(value);
      if (!quote) return value;
      const escaped = value
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\r', '\\r')
        .replaceAll('\n', '\\n');
      return `"${escaped}"`;
    })
    .join(';');
}

function scalarText(kind, raw) {
  const trimmed = raw.trim();
  if (/nil_value\(\)/.test(trimmed)) return 'nil';
  if (kind === 'Bool') {
    if (trimmed === 'true' || trimmed === '1') return '1';
    if (trimmed === 'false' || trimmed === '0') return '0';
    return undefined;
  }
  if (kind === 'FloatOrPercent') {
    const parts = topLevelItems(trimmed.replace(/^\{|\}$/g, ''));
    const value = parts[0] ? formatNumber(parts[0]) : undefined;
    if (value === undefined) return undefined;
    return parts[1]?.trim() === 'true' ? `${value}%` : value;
  }
  const value = formatNumber(trimmed);
  if (value === undefined) return undefined;
  return kind === 'Percent' ? `${value}%` : value;
}

/** INI text PrusaSlicer writes for `set_default_value(new ConfigOption…)`, if readable. */
function defaultValueFrom(block) {
  const match =
    /set_default_value\(\s*new\s+ConfigOption(\w+?)(Nullable)?(?:<(\w+)>)?\s*(?=[({])/.exec(block);
  if (!match) return undefined;
  const args = balanced(block, match.index + match[0].length);
  if (args === null) return undefined;
  const kind = match[1];
  const inner = args.trim().replace(/^\{([\s\S]*)\}$/, '$1');

  if (kind === 'Enum') {
    return enumConstants.get(match[3])?.get(inner.trim());
  }
  if (kind === 'Enums') {
    const keys = topLevelItems(inner).map((item) => enumConstants.get(match[3])?.get(item));
    return keys.length > 0 && keys.every(Boolean) ? keys.join(',') : undefined;
  }
  if (kind === 'String') {
    const parts = stringsIn(inner);
    return parts.length > 0 ? escapeCString(parts.join('')) : inner.trim() === '' ? '' : undefined;
  }
  if (kind === 'Strings') {
    if (/[A-Za-z_]\w*\s*\(/.test(inner.replace(/"(?:\\.|[^"\\])*"/g, ''))) return undefined;
    return escapeCStrings(topLevelItems(inner).map((item) => stringsIn(item).join('')));
  }
  if (['Float', 'Int', 'Percent', 'Bool', 'FloatOrPercent'].includes(kind)) {
    return scalarText(kind, inner);
  }
  const vectorKinds = {
    Floats: 'Float',
    Ints: 'Int',
    Percents: 'Percent',
    Bools: 'Bool',
    FloatsOrPercents: 'FloatOrPercent',
  };
  if (vectorKinds[kind]) {
    if (/static_cast|values\b/.test(inner)) return undefined;
    const items = topLevelItems(inner);
    const texts = items.map((item) => scalarText(vectorKinds[kind], item));
    return texts.every((item) => item !== undefined) ? texts.join(',') : undefined;
  }
  return undefined;
}

/** Keys and English labels of `def->set_enum<…>({ … })`. */
function enumFrom(block) {
  const match = /set_enum(?:<\w+>)?\(\s*(?=\{)/.exec(block);
  if (!match) return undefined;
  const body = balanced(block, match.index + match[0].length);
  if (!body) return undefined;
  const values = [];
  const labels = {};
  for (const item of topLevelItems(body)) {
    const strings = stringsIn(item);
    if (strings.length === 0) continue;
    values.push(strings[0]);
    if (strings[1]) labels[strings[0]] = strings[1];
  }
  return values.length > 0 ? { values, labels } : undefined;
}

const definitions = new Map();
const addPattern = /this->add(_nullable)?\(\s*"([A-Za-z0-9_]+)"\s*,\s*(co\w+)\s*\)/g;
const additions = [...text.matchAll(addPattern)];

for (const [index, match] of additions.entries()) {
  const key = match[2];
  const blockStart = match.index + match[0].length;
  const blockEnd = additions[index + 1]?.index ?? text.length;
  const block = text.slice(blockStart, blockEnd);
  const definition = { type: match[3] };
  if (match[1]) definition.nullable = true;

  const min = assignment(block, 'min');
  const max = assignment(block, 'max');
  const minValue = min ? numberFrom(min) : undefined;
  const maxValue = max ? numberFrom(max) : undefined;
  if (minValue !== undefined) definition.min = minValue;
  if (maxValue !== undefined) definition.max = maxValue;

  if (definition.type.startsWith('coEnum')) {
    const enumDef = enumFrom(block);
    if (enumDef) {
      definition.enumValues = enumDef.values;
      if (Object.keys(enumDef.labels).length > 0) definition.enumLabels = enumDef.labels;
    }
  }

  for (const property of ['label', 'category', 'tooltip', 'sidetext']) {
    const value = textProperty(block, property);
    if (value) definition[property] = value;
  }
  const ratioOver = assignedText(block, 'ratio_over');
  if (ratioOver) definition.ratioOver = ratioOver;
  // ConfigOptionDef::mode defaults to comSimple.
  if (/def\s*->\s*mode\s*=\s*com(?:Advanced|Expert)\s*;/.test(block.split(/\bdef\s*=/)[0])) {
    definition.advanced = true;
  }
  const defaultValue = defaultValueFrom(block);
  if (defaultValue !== undefined) definition.defaultValue = defaultValue;

  definitions.set(key, definition);
}

// Filament overrides are declared in loops: `add_nullable(std::string("filament_") + opt_key, …)`.
for (const match of text.matchAll(
  /for\s*\(\s*const\s+char\s*\*\s*opt_key\s*:\s*\{([^}]*)\}\s*\)\s*\{[\s\S]*?add_nullable\(\s*std::string\("filament_"\)\s*\+\s*opt_key\s*,\s*([\w>.-]+)\s*\)/g,
)) {
  const forcedType = /^co\w+$/.test(match[2]) ? match[2] : undefined;
  for (const sourceKey of stringsIn(match[1])) {
    const source = definitions.get(sourceKey);
    if (!source) {
      throw new Error(`Could not find source definition for filament_${sourceKey}.`);
    }
    const override = { type: forcedType ?? source.type, nullable: true };
    for (const property of ['label', 'tooltip', 'sidetext', 'advanced', 'min', 'max']) {
      if (source[property] !== undefined) override[property] = source[property];
    }
    if (source.defaultValue !== undefined) override.defaultValue = source.defaultValue;
    definitions.set(`filament_${sourceKey}`, override);
  }
}

function presetOptionKeys(listName) {
  const list = presetText.match(new RegExp(`${listName}\\s*\\{([\\s\\S]*?)\\};`))?.[1];
  if (!list) throw new Error(`Could not find ${listName} in Preset.cpp.`);
  return stringsIn(list.replace(/\/\/.*$/gm, ''));
}

const printKeys = presetOptionKeys('s_Preset_print_options');
const filamentKeys = presetOptionKeys('s_Preset_filament_options');

const sorted = Object.fromEntries(
  [...definitions.entries()].sort(([left], [right]) => left.localeCompare(right)),
);

const contents = `/**
 * Generated by scripts/generate-prusa-profile-config.mjs.
 * Source: PrusaSlicer ${PRUSA_VERSION}
 * ${RAW_BASE}/PrintConfig.cpp
 * ${RAW_BASE}/Preset.cpp
 * Do not edit manually.
 */
export const PRUSA_PROFILE_CONFIG_SOURCE = {
  version: ${JSON.stringify(PRUSA_VERSION)},
  url: ${JSON.stringify(`${RAW_BASE}/PrintConfig.cpp`)},
} as const;

export type PrusaProfileConfigDef = {
  type: string;
  min?: number;
  max?: number;
  enumValues?: readonly string[];
  /** English UI label per enum key. */
  enumLabels?: Readonly<Record<string, string>>;
  label?: string;
  category?: string;
  tooltip?: string;
  sidetext?: string;
  /** Hidden in PrusaSlicer's Simple mode. */
  advanced?: boolean;
  /** Option a percentage value is computed from. */
  ratioOver?: string;
  /** Built-in default, written the way PrusaSlicer writes it to an INI file. */
  defaultValue?: string;
  /** Accepts \`nil\` (filament overrides: "use the printer's value"). */
  nullable?: boolean;
};

export const PRUSA_PROFILE_CONFIG_DEFS: Readonly<Record<string, PrusaProfileConfigDef>> = ${JSON.stringify(sorted, null, 2)};

/** Keys PrusaSlicer stores in a print preset (Preset::print_options). */
export const PRUSA_PRINT_OPTION_KEYS: readonly string[] = ${JSON.stringify(printKeys)};

/** Keys PrusaSlicer stores in a filament preset (Preset::filament_options). */
export const PRUSA_FILAMENT_OPTION_KEYS: readonly string[] = ${JSON.stringify(filamentKeys)};
`;

await writeFile(outputPath, contents, 'utf8');
// Same formatter the pre-commit hook runs, so regenerating leaves no diff.
execFileSync('vp', ['fmt', outputPath], { stdio: 'ignore' });
console.log(
  `Generated ${outputPath} with ${definitions.size} option definitions from PrusaSlicer ${PRUSA_VERSION}.`,
);
