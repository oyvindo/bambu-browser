/**
 * PrusaSlicer grid: rows laid out like PrusaSlicer's Print Settings and
 * Filament Settings tabs, and cell text that explains percentages and zeros.
 */

import type { BambuMappedGroup, BambuPropertyRowDef, BambuValueUnit } from '@/lib/bambu/mapping';
import { formatBambuMappedValue, pickScalarValue } from '@/lib/bambu/mapping';
import { unitFromConfigDef } from '@/lib/bambu/mapping-orca';
import { PROFILE_METADATA_KEYS } from '@/lib/bambu/profile-schema';
import type { InheritanceChainLevel, ProfileKind } from '@/lib/bambu/resolver';
import { stringifyUnknown } from '@/lib/utils';
import { localizedEnumValue, localizedPropertyLabel } from '@/localization/profile-fields';
import type { AppLocale } from '@/localization/types';

import { PRUSA_PROFILE_CONFIG_DEFS, PRUSA_UI_LAYOUT } from './prusa-profile-config.generated';
import { effectivePrusaValue, PRUSA_ZERO_MEANS } from './prusa-values';

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function firstDefinedValue(chain: readonly InheritanceChainLevel[], key: string): unknown {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const value = chain[index]?.data[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

function propertyRow(key: string, chain: readonly InheritanceChainLevel[]): BambuPropertyRowDef {
  const def = PRUSA_PROFILE_CONFIG_DEFS[key];
  // "mm or %" options hold either; percentages are rendered by formatPrusaCell.
  const sidetext = def?.sidetext?.split(' or ')[0];
  const unit = unitFromConfigDef(
    key,
    def ? { ...def, sidetext } : undefined,
    firstDefinedValue(chain, key),
  );
  return {
    key,
    label: def?.fullLabel ?? def?.label ?? key,
    // Integer options without a physical unit ("(minimum)", "layers") are counts.
    unit: unit === 'string' && def?.type.startsWith('coInt') ? 'count' : unit,
    ...(def?.advanced ? { advanced: true } : {}),
  };
}

/**
 * Groups = PrusaSlicer pages, subgroups = its option groups, both in
 * PrusaSlicer's order. Keys the tabs do not show go to Others or Metadata.
 */
export function buildPrusaUiTree(
  kind: ProfileKind,
  chain: readonly InheritanceChainLevel[],
): readonly BambuMappedGroup[] {
  const present = new Set(chain.flatMap((level) => Object.keys(level.data)));
  const placed = new Set<string>();
  const groups: BambuMappedGroup[] = [];

  for (const page of PRUSA_UI_LAYOUT[kind === 'filament' ? 'filament' : 'print']) {
    const groupId = `prusa-${slug(page.title)}`;
    const subgroups = page.groups.flatMap((group) => {
      const keys = group.keys.filter((key) => present.has(key) && !placed.has(key));
      for (const key of keys) placed.add(key);
      if (keys.length === 0) return [];
      return [
        {
          id: `${groupId}-${slug(group.title)}`,
          label: group.title,
          properties: keys.map((key) => propertyRow(key, chain)),
        },
      ];
    });
    if (subgroups.length > 0) groups.push({ id: groupId, label: page.title, subgroups });
  }

  const rest = [...present].filter((key) => !placed.has(key)).sort((a, b) => a.localeCompare(b));
  const others = rest.filter((key) => !PROFILE_METADATA_KEYS.has(key));
  const metadata = rest.filter((key) => PROFILE_METADATA_KEYS.has(key));
  if (others.length > 0) {
    groups.push({
      id: 'others',
      label: 'Others',
      subgroups: [
        {
          id: 'other-settings',
          label: 'Other settings',
          properties: others.map((key) => propertyRow(key, chain)),
        },
      ],
    });
  }
  if (metadata.length > 0) {
    groups.push({
      id: 'metadata',
      label: 'Metadata',
      subgroups: [
        {
          id: 'metadata',
          label: 'Profile metadata',
          properties: metadata.map((key) => propertyRow(key, chain)),
        },
      ],
    });
  }
  return groups;
}

const CELL_TEXT = {
  ofNozzle: ['of nozzle diameter', 'av dysediameteren'],
  auto: ['auto', 'auto'],
  disabled: ['off', 'av'],
  noLimit: ['no limit', 'ingen grense'],
  uses: ['uses', 'bruker'],
} as const;

function text(entry: keyof typeof CELL_TEXT, locale: AppLocale): string {
  return CELL_TEXT[entry][locale === 'nb' ? 1 : 0];
}

function enumLabel(key: string, value: string, locale: AppLocale): string {
  const english = PRUSA_PROFILE_CONFIG_DEFS[key]?.enumLabels?.[value];
  if (locale === 'nb') {
    const norwegian = localizedEnumValue(value, 'nb');
    return norwegian !== value ? norwegian : (english ?? value);
  }
  return english ?? localizedEnumValue(value, 'en');
}

function zeroMeaning(key: string, locale: AppLocale): string | null {
  const meaning = PRUSA_ZERO_MEANS[key];
  if (!meaning) return null;
  if (meaning === 'auto') return text('auto', locale);
  if (meaning === 'disabled') return text('disabled', locale);
  if (meaning === 'no-limit') return text('noLimit', locale);
  const label = localizedPropertyLabel(
    meaning.uses,
    PRUSA_PROFILE_CONFIG_DEFS[meaning.uses]?.fullLabel ??
      PRUSA_PROFILE_CONFIG_DEFS[meaning.uses]?.label ??
      meaning.uses,
    locale,
    'prusa',
  );
  return `${text('uses', locale)} ${label}`;
}

/**
 * Cell text for one PrusaSlicer value. `merged` is the effective profile at
 * this column, used to turn percentages into absolute values.
 */
export function formatPrusaCell(
  key: string,
  value: unknown,
  merged: Readonly<Record<string, unknown>>,
  unit: BambuValueUnit,
  extruderIndex: number,
  locale: AppLocale,
): string {
  // pickScalarValue falls back to slot 0 for a nil slot; nil means "not set".
  if (
    Array.isArray(value) &&
    value[Math.min(Math.max(0, extruderIndex), value.length - 1)] === null
  ) {
    return '—';
  }
  const picked = pickScalarValue(value, extruderIndex);
  if (picked === null || picked === undefined) return '—';
  const raw = stringifyUnknown(picked).trim();

  if (PRUSA_PROFILE_CONFIG_DEFS[key]?.enumValues?.includes(raw)) {
    return enumLabel(key, raw, locale);
  }
  if (raw.endsWith('%')) {
    const effective = effectivePrusaValue(key, { ...merged, [key]: value }, extruderIndex);
    if (effective && 'value' in effective) {
      return `${raw} → ${effective.value} ${effective.unit}`;
    }
    if (effective?.unresolved === 'nozzle_diameter') return `${raw} ${text('ofNozzle', locale)}`;
    if (effective?.unresolved === 'auto') return `${raw} (${text('auto', locale)})`;
    return raw;
  }

  const base = formatBambuMappedValue(value, unit, extruderIndex, locale);
  if (Number(raw) === 0 && raw !== '') {
    const meaning = zeroMeaning(key, locale);
    if (meaning) return `${base} (${meaning})`;
  }
  return base;
}
