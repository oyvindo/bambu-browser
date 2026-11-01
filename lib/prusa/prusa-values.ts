/**
 * PrusaSlicer INI values: parsing for display, writing back byte-for-byte,
 * the built-in defaults as the chain root, and percentage calculations.
 */

import { pickScalarValue } from '@/lib/bambu/mapping';
import type { InheritanceChainLevel, ProfileKind } from '@/lib/bambu/resolver';
import { stringifyUnknown } from '@/lib/utils';

import {
  PRUSA_FILAMENT_OPTION_KEYS,
  PRUSA_PRINT_OPTION_KEYS,
  PRUSA_PROFILE_CONFIG_DEFS,
  type PrusaProfileConfigDef,
} from './prusa-profile-config.generated';

type ConfigDefs = Readonly<Record<string, PrusaProfileConfigDef>>;

export const PRUSA_DEFAULTS_PATH: Readonly<Record<ProfileKind, string>> = {
  process: 'defaults/print',
  filament: 'defaults/filament',
};

/** Types PrusaSlicer writes as one comma-separated value per extruder. */
const COMMA_VECTOR_TYPES = new Set([
  'coFloats',
  'coInts',
  'coBools',
  'coPercents',
  'coFloatsOrPercents',
  'coEnums',
]);

const NIL = 'nil';

/** Slic3r::unescape_strings_cstyle */
function unescapeStrings(raw: string): string[] {
  const out: string[] = [];
  let index = 0;
  while (index < raw.length) {
    while (raw[index] === ' ' || raw[index] === '\t') index += 1;
    if (index >= raw.length) break;
    let value = '';
    if (raw[index] === '"') {
      index += 1;
      while (index < raw.length && raw[index] !== '"') {
        if (raw[index] === '\\' && index + 1 < raw.length) {
          const next = raw[index + 1]!;
          value += next === 'n' ? '\n' : next === 'r' ? '\r' : next;
          index += 2;
        } else {
          value += raw[index];
          index += 1;
        }
      }
      index += 1;
      while (index < raw.length && raw[index] !== ';') index += 1;
    } else {
      while (index < raw.length && raw[index] !== ';') {
        value += raw[index];
        index += 1;
      }
    }
    out.push(value);
    index += 1;
  }
  return out;
}

/** Slic3r::escape_strings_cstyle: quote only elements that need it. */
function escapeStrings(values: readonly string[]): string {
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

/** Value conversions of PrintConfigDef::handle_legacy for print and filament keys. */
function legacyValue(key: string, raw: string): string {
  if (key === 'ensure_vertical_shell_thickness') {
    if (raw === '1') return 'enabled';
    if (raw === '0') return 'partial';
  }
  if ((key === 'gcode_label_objects' || key === 'draft_shield') && (raw === '1' || raw === '0')) {
    if (key === 'draft_shield') return raw === '1' ? 'enabled' : 'disabled';
    return raw === '1' ? 'octoprint' : 'disabled';
  }
  if (key === 'fill_density' && !raw.includes('%')) {
    const fraction = Number(raw);
    if (Number.isFinite(fraction)) return `${fraction * 100}%`;
  }
  if (
    (key === 'perimeter_acceleration' && raw === '25') ||
    (key === 'infill_acceleration' && raw === '50')
  ) {
    return '0';
  }
  if (key === 'support_material_pattern' && raw === 'pillars') return 'rectilinear';
  if (raw === 'monotonous' && /^(top_|bottom_)?fill_pattern$/.test(key)) return 'monotonic';
  return raw;
}

const NUMERIC_TYPES = new Set([
  'coFloat',
  'coFloats',
  'coInt',
  'coInts',
  'coPercent',
  'coPercents',
  'coFloatOrPercent',
  'coFloatsOrPercents',
]);

/** `0.20` → `0.2`, `15.0%` → `15%`: the text PrusaSlicer writes for the same number. */
function canonicalNumber(text: string): string {
  const match = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(%?)$/i.exec(text.trim());
  if (!match) return text;
  return `${Number(match[1])}${match[2]}`;
}

/**
 * Display form of one INI value: vectors become arrays (one slot per
 * extruder), `nil` becomes null, everything else stays the written text.
 */
export function parsePrusaValue(
  key: string,
  raw: string,
  defs: ConfigDefs = PRUSA_PROFILE_CONFIG_DEFS,
): unknown {
  const type = defs[key]?.type;
  if (!type) return raw;
  if (type === 'coStrings') return unescapeStrings(raw);
  const value = legacyValue(key, raw);
  if (value.trim() === NIL) return null;
  const tidy = (item: string) => (NUMERIC_TYPES.has(type) ? canonicalNumber(item) : item);
  if (COMMA_VECTOR_TYPES.has(type)) {
    return value.split(',').map((item) => (item.trim() === NIL ? null : tidy(item.trim())));
  }
  return tidy(value);
}

/** Inverse of {@link parsePrusaValue}: the text PrusaSlicer would write. */
export function serializePrusaValue(
  key: string,
  value: unknown,
  defs: ConfigDefs = PRUSA_PROFILE_CONFIG_DEFS,
): string {
  if (value === null || value === undefined) return NIL;
  if (Array.isArray(value)) {
    if (defs[key]?.type === 'coStrings') {
      return escapeStrings(value.map((item) => stringifyUnknown(item)));
    }
    return value.map((item) => serializePrusaValue(key, item, defs)).join(',');
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  return stringifyUnknown(value);
}

const FILAMENT_VECTOR_KEYS = new Set(
  PRUSA_FILAMENT_OPTION_KEYS.filter(
    (key) => key !== 'compatible_prints' && key !== 'compatible_printers',
  ),
);

/**
 * Preset::normalize: a filament preset holds one value per filament, and an
 * empty vector is filled from FullPrintConfig's default.
 */
function normalizedFilamentValue(key: string, value: unknown): unknown {
  if (!Array.isArray(value) || value.length > 0 || !FILAMENT_VECTOR_KEYS.has(key)) return value;
  const defaultValue = PRUSA_PROFILE_CONFIG_DEFS[key]?.defaultValue;
  if (defaultValue === undefined) return value;
  const parsed = parsePrusaValue(key, defaultValue);
  return Array.isArray(parsed) ? parsed.slice(0, 1) : value;
}

function parseLevel(
  kind: ProfileKind,
  data: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const parsed = typeof value === 'string' ? parsePrusaValue(key, value) : value;
      return [key, kind === 'filament' ? normalizedFilamentValue(key, parsed) : parsed];
    }),
  );
}

/**
 * Keys a preset of this kind holds: Preset::print_options / filament_options
 * plus the preset id PrusaSlicer writes into every saved preset.
 */
function presetKeys(kind: ProfileKind): readonly string[] {
  return kind === 'filament'
    ? [...PRUSA_FILAMENT_OPTION_KEYS, 'filament_settings_id']
    : [...PRUSA_PRINT_OPTION_KEYS, 'print_settings_id'];
}

/** PrusaSlicer's compiled-in defaults for every key a preset of this kind holds. */
export function prusaDefaultsLevel(kind: ProfileKind): InheritanceChainLevel {
  const keys = presetKeys(kind);
  const data: Record<string, string> = {};
  for (const key of keys) {
    const def = PRUSA_PROFILE_CONFIG_DEFS[key];
    if (key === 'inherits' || def?.defaultValue === undefined) continue;
    // PresetBundle sets every nullable filament option to nil in the default preset.
    data[key] = kind === 'filament' && def.nullable ? NIL : def.defaultValue;
  }
  return { relativePath: PRUSA_DEFAULTS_PATH[kind], data };
}

function isUserPresetPath(relativePath: string): boolean {
  return /^(print|filament)\/[^/]+\.ini$/.test(relativePath);
}

/** `filament/x.ini` and `vendor/…#filament:…` are filament presets; the rest are print presets. */
export function prusaKindForPath(relativePath: string): ProfileKind {
  return /^filament\/|^vendor\/[^/#]+#filament:/.test(relativePath) ? 'filament' : 'process';
}

/** API chain (raw INI text) → grid chain: defaults root first, values parsed. */
export function toPrusaDisplayChain(
  kind: ProfileKind,
  chain: readonly InheritanceChainLevel[],
): InheritanceChainLevel[] {
  const optionKeys = new Set(presetKeys(kind));
  const defaults = prusaDefaultsLevel(kind);
  return [defaults, ...chain].map((level) => {
    // A user preset is loaded on top of the defaults, not its parent, so a key
    // an older PrusaSlicer did not write takes the default value.
    if (isUserPresetPath(level.relativePath)) {
      return {
        relativePath: level.relativePath,
        data: parseLevel(kind, { ...defaults.data, ...level.data }),
      };
    }
    // A preset only keeps the options of its kind; obsolete or printer-level
    // keys in a bundle section are dropped when PrusaSlicer loads it.
    const data = level.relativePath.startsWith('vendor/')
      ? Object.fromEntries(Object.entries(level.data).filter(([key]) => optionKeys.has(key)))
      : level.data;
    return { relativePath: level.relativePath, data: parseLevel(kind, data) };
  });
}

export type PrusaUnresolvedReason = 'auto_width' | 'auto' | 'cycle' | 'missing';

export type PrusaEffectiveValue =
  | { value: number; unit: 'mm' | 'mm/s' | 'mm/s²'; basis: string[] }
  | { basis: string[]; unresolved: PrusaUnresolvedReason };

function textAt(value: unknown, extruderIndex: number): string | undefined {
  const picked = pickScalarValue(value, extruderIndex);
  if (picked === null || picked === undefined) return undefined;
  const text = stringifyUnknown(picked).trim();
  return text === '' ? undefined : text;
}

function unitFromSidetext(sidetext: string | undefined): 'mm' | 'mm/s' | 'mm/s²' | null {
  const unit = sidetext?.split(' or ')[0]?.trim();
  return unit === 'mm' || unit === 'mm/s' || unit === 'mm/s²' ? unit : null;
}

/**
 * Option a percentage is computed over. Extrusion widths without `ratio_over`
 * are computed over the layer height (Flow::new_from_config_width).
 */
function ratioBase(key: string, defs: ConfigDefs): string | undefined {
  return defs[key]?.ratioOver ?? (key.endsWith('extrusion_width') ? 'layer_height' : undefined);
}

/**
 * Absolute value of a percentage setting, following `ratio_over` through
 * further percentages (`top_solid_infill_speed` → `solid_infill_speed` →
 * `infill_speed`). Null when the value is not a percentage of another option.
 */
export function effectivePrusaValue(
  key: string,
  merged: Readonly<Record<string, unknown>>,
  extruderIndex: number,
  defs: ConfigDefs = PRUSA_PROFILE_CONFIG_DEFS,
): PrusaEffectiveValue | null {
  const raw = textAt(merged[key], extruderIndex);
  if (!raw?.endsWith('%')) return null;
  const unit = unitFromSidetext(defs[key]?.sidetext);
  let base = ratioBase(key, defs);
  if (!base || !unit) return null;

  let factor = Number.parseFloat(raw) / 100;
  const basis: string[] = [];
  const seen = new Set([key]);
  while (base) {
    basis.push(base);
    if (seen.has(base)) return { basis, unresolved: 'cycle' };
    seen.add(base);
    const text = textAt(merged[base], extruderIndex);
    if (text === undefined) return { basis, unresolved: 'missing' };
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) return { basis, unresolved: 'missing' };
    if (number === 0 && PRUSA_ZERO_MEANS[base] === 'auto') {
      // Automatic widths come from the nozzle diameter, a printer setting.
      return { basis, unresolved: base.endsWith('extrusion_width') ? 'auto_width' : 'auto' };
    }
    if (!text.endsWith('%')) {
      return { value: Math.round(factor * number * 1e6) / 1e6, unit, basis };
    }
    factor *= number / 100;
    base = ratioBase(base, defs);
  }
  return { basis, unresolved: 'missing' };
}

export type PrusaZeroMeaning = 'auto' | 'disabled' | 'no-limit' | { uses: string };

/** What a value of 0 means, taken from PrusaSlicer's own tooltips. */
export const PRUSA_ZERO_MEANS: Readonly<Record<string, PrusaZeroMeaning>> = {
  // "Set to zero for auto." / "Set this to a non-zero value to allow a manual extrusion width."
  perimeter_speed: 'auto',
  small_perimeter_speed: 'auto',
  external_perimeter_speed: 'auto',
  infill_speed: 'auto',
  solid_infill_speed: 'auto',
  top_solid_infill_speed: 'auto',
  extrusion_width: 'auto',
  first_layer_extrusion_width: 'auto',
  perimeter_extrusion_width: 'auto',
  external_perimeter_extrusion_width: 'auto',
  infill_extrusion_width: 'auto',
  solid_infill_extrusion_width: 'auto',
  top_infill_extrusion_width: 'auto',
  support_material_extrusion_width: 'auto',
  // "Set zero to disable …"
  gap_fill_speed: 'disabled',
  default_acceleration: 'disabled',
  perimeter_acceleration: 'disabled',
  infill_acceleration: 'disabled',
  travel_acceleration: 'disabled',
  bridge_acceleration: 'disabled',
  wipe_tower_acceleration: 'disabled',
  first_layer_acceleration: 'disabled',
  first_layer_acceleration_over_raft: 'disabled',
  mmu_segmented_region_max_width: 'disabled',
  // "Set to zero for no limit."
  filament_max_volumetric_speed: 'no-limit',
  filament_infill_max_speed: 'no-limit',
  filament_infill_max_crossing_speed: 'no-limit',
  // "Set zero to use the value for …"
  external_perimeter_acceleration: { uses: 'perimeter_acceleration' },
  solid_infill_acceleration: { uses: 'infill_acceleration' },
  top_solid_infill_acceleration: { uses: 'solid_infill_acceleration' },
  over_bridge_speed: { uses: 'solid_infill_speed' },
  first_layer_infill_speed: { uses: 'first_layer_speed' },
  travel_speed_z: { uses: 'travel_speed' },
  filament_deretract_speed: { uses: 'filament_retract_speed' },
};
