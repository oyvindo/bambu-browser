import type { BambuMappedGroup, BambuPropertyRowDef, BambuValueUnit } from './mapping';
import {
  ORCA_PROFILE_CONFIG_DEFS,
  type OrcaProfileConfigDef,
} from './orca-profile-config.generated';
import { inferUnitForKey, PROFILE_METADATA_KEYS } from './profile-schema';
import type { InheritanceChainLevel, ProfileKind } from './resolver';

const GROUPS = {
  quality: {
    label: 'Quality',
    subgroupId: 'quality-additional',
    subgroupLabel: 'Quality settings',
  },
  strength: {
    label: 'Strength',
    subgroupId: 'strength-additional',
    subgroupLabel: 'Strength settings',
  },
  speed: {
    label: 'Speed',
    subgroupId: 'speed-additional',
    subgroupLabel: 'Speed settings',
  },
  support: {
    label: 'Support',
    subgroupId: 'support-additional',
    subgroupLabel: 'Support settings',
  },
  filament: {
    label: 'Filament',
    subgroupId: 'filament-basic',
    subgroupLabel: 'Filament settings',
  },
  cooling: {
    label: 'Cooling',
    subgroupId: 'cooling-part-fan',
    subgroupLabel: 'Cooling settings',
  },
  'setting-overrides': {
    label: 'Setting Overrides',
    subgroupId: 'overrides-speed',
    subgroupLabel: 'Setting overrides',
  },
  others: {
    label: 'Others',
    subgroupId: 'other-settings',
    subgroupLabel: 'Other settings',
  },
  metadata: {
    label: 'Metadata',
    subgroupId: 'metadata',
    subgroupLabel: 'Profile metadata',
  },
} as const;

type GroupId = keyof typeof GROUPS;

const GROUP_ORDER: readonly GroupId[] = [
  'quality',
  'strength',
  'speed',
  'support',
  'filament',
  'cooling',
  'setting-overrides',
  'others',
  'metadata',
];

function firstDefinedValue(chain: readonly InheritanceChainLevel[], key: string): unknown {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const value = chain[index]?.data[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizedUnit(
  key: string,
  def: OrcaProfileConfigDef | undefined,
  value: unknown,
): BambuValueUnit {
  if (def?.type.startsWith('coBool')) return 'boolean';
  if (def?.type.startsWith('coEnum')) return 'enum';

  const sidetext = def?.sidetext?.trim();
  if (
    sidetext === 'mm' ||
    sidetext === 'mm/s' ||
    sidetext === 'mm/s²' ||
    sidetext === 'mm³' ||
    sidetext === 'mm³/s' ||
    sidetext === '%' ||
    sidetext === '°' ||
    sidetext === '°C' ||
    sidetext === 's' ||
    sidetext === 'g/cm³'
  ) {
    return sidetext;
  }
  if (def?.type.startsWith('coString')) return 'string';
  return inferUnitForKey(key, value);
}

function processGroup(key: string, category: string | undefined): GroupId {
  const normalized = category?.trim().toLowerCase();
  if (
    normalized === 'quality' ||
    normalized === 'strength' ||
    normalized === 'speed' ||
    normalized === 'support'
  ) {
    return normalized;
  }

  if (/support|raft/.test(key)) return 'support';
  if (/speed|acceleration|jerk|travel/.test(key)) return 'speed';
  if (/infill|wall|shell|perimeter|bridge/.test(key)) return 'strength';
  if (/layer|line_width|seam|precision|resolution/.test(key)) return 'quality';
  return 'others';
}

function filamentGroup(key: string): GroupId {
  if (/fan|cooling|slow_down|layer_time|overhang_fan|air_filtration/.test(key)) {
    return 'cooling';
  }
  if (/retract|override|pressure_advance/.test(key)) {
    return 'setting-overrides';
  }
  return 'filament';
}

function groupFor(kind: ProfileKind, key: string, def: OrcaProfileConfigDef | undefined): GroupId {
  if (PROFILE_METADATA_KEYS.has(key)) return 'metadata';
  return kind === 'filament' ? filamentGroup(key) : processGroup(key, def?.category);
}

/**
 * Builds Orca's visible field map from the selected profile chain and the
 * labels, categories, units, and modes declared by OrcaSlicer's PrintConfig.
 */
export function buildOrcaUiTree(
  kind: ProfileKind,
  chain: readonly InheritanceChainLevel[],
): readonly BambuMappedGroup[] {
  const byGroup = new Map<GroupId, BambuPropertyRowDef[]>();
  const keys = new Set(chain.flatMap((level) => Object.keys(level.data)));

  for (const key of [...keys].sort((left, right) => left.localeCompare(right))) {
    const def = ORCA_PROFILE_CONFIG_DEFS[key];
    const group = groupFor(kind, key, def);
    const properties = byGroup.get(group) ?? [];
    properties.push({
      key,
      label: def?.label ?? key,
      unit: normalizedUnit(key, def, firstDefinedValue(chain, key)),
      ...(def?.advanced ? { advanced: true } : {}),
    });
    byGroup.set(group, properties);
  }

  return GROUP_ORDER.flatMap((id) => {
    const properties = byGroup.get(id);
    if (!properties?.length) return [];
    const group = GROUPS[id];
    return [
      {
        id,
        label: group.label,
        subgroups: [
          {
            id: group.subgroupId,
            label: group.subgroupLabel,
            properties,
          },
        ],
      },
    ];
  });
}
