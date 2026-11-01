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
  if (raw.trim() === NIL) return null;
  if (COMMA_VECTOR_TYPES.has(type)) {
    return raw.split(',').map((item) => (item.trim() === NIL ? null : item.trim()));
  }
  return raw;
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

function parseLevel(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'string' ? parsePrusaValue(key, value) : value,
    ]),
  );
}

/** PrusaSlicer's compiled-in defaults for every key a preset of this kind holds. */
export function prusaDefaultsLevel(kind: ProfileKind): InheritanceChainLevel {
  const keys = kind === 'filament' ? PRUSA_FILAMENT_OPTION_KEYS : PRUSA_PRINT_OPTION_KEYS;
  const data: Record<string, string> = {};
  for (const key of keys) {
    const defaultValue = PRUSA_PROFILE_CONFIG_DEFS[key]?.defaultValue;
    if (key !== 'inherits' && defaultValue !== undefined) data[key] = defaultValue;
  }
  return { relativePath: PRUSA_DEFAULTS_PATH[kind], data };
}

/** `filament/x.ini` and `vendor/…#filament:…` are filament presets; the rest are print presets. */
export function prusaKindForPath(relativePath: string): ProfileKind {
  return /^filament\/|#filament:/.test(relativePath) ? 'filament' : 'process';
}

/** API chain (raw INI text) → grid chain: defaults root first, values parsed. */
export function toPrusaDisplayChain(
  kind: ProfileKind,
  chain: readonly InheritanceChainLevel[],
): InheritanceChainLevel[] {
  return [prusaDefaultsLevel(kind), ...chain].map((level) => ({
    relativePath: level.relativePath,
    data: parseLevel(level.data),
  }));
}

export type PrusaUnresolvedReason = 'nozzle_diameter' | 'auto' | 'cycle' | 'missing';

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

/** Widths without `ratio_over` are a percentage of the nozzle diameter. */
function isNozzleRelative(key: string, defs: ConfigDefs): boolean {
  return key.endsWith('extrusion_width') && !defs[key]?.ratioOver;
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
  if (isNozzleRelative(key, defs)) {
    return { basis: ['nozzle_diameter'], unresolved: 'nozzle_diameter' };
  }
  const def = defs[key];
  const unit = unitFromSidetext(def?.sidetext);
  if (!def?.ratioOver || !unit) return null;

  let factor = Number.parseFloat(raw) / 100;
  const basis: string[] = [];
  const seen = new Set([key]);
  let base: string | undefined = def.ratioOver;
  while (base) {
    basis.push(base);
    if (seen.has(base)) return { basis, unresolved: 'cycle' };
    seen.add(base);
    const text = textAt(merged[base], extruderIndex);
    if (text === undefined) return { basis, unresolved: 'missing' };
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) return { basis, unresolved: 'missing' };
    if (number === 0 && PRUSA_ZERO_MEANS[base] === 'auto') {
      return isNozzleRelative(base, defs)
        ? { basis: [...basis, 'nozzle_diameter'], unresolved: 'nozzle_diameter' }
        : { basis, unresolved: 'auto' };
    }
    if (!text.endsWith('%')) {
      return { value: Math.round(factor * number * 1e6) / 1e6, unit, basis };
    }
    factor *= number / 100;
    if (isNozzleRelative(base, defs)) {
      return { basis: [...basis, 'nozzle_diameter'], unresolved: 'nozzle_diameter' };
    }
    base = defs[base]?.ratioOver;
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
