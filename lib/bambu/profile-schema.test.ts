import { describe, expect, it } from 'vite-plus/test';

import {
  hasCompleteNorwegianLabel,
  localizedBoolean,
  localizedEnumValue,
  localizedPropertyLabel,
} from '@/localization/profile-fields';

import { BAMBU_PROCESS_UI_TREE } from './mapping';
import { BAMBU_FILAMENT_UI_TREE } from './mapping-filament';
import { buildOrcaUiTree } from './mapping-orca';
import {
  ORCA_PROFILE_CONFIG_DEFS,
  ORCA_PROFILE_CONFIG_SOURCE,
} from './orca-profile-config.generated';
import {
  buildCompleteUiTree,
  FILAMENT_ROOT_KEYS,
  flattenTreeKeys,
  inferUnitForKey,
  PROCESS_ROOT_KEYS,
  PROFILE_METADATA_KEYS,
} from './profile-schema';

describe('Bambu root schema manifests', () => {
  it.each([
    ['process', PROCESS_ROOT_KEYS, 170],
    ['filament', FILAMENT_ROOT_KEYS, 136],
  ] as const)('%s keys are complete and unique', (_kind, keys, count) => {
    expect(keys).toHaveLength(count);
    expect(new Set(keys).size).toBe(count);
  });

  it('classifies structural fields as metadata', () => {
    for (const key of [
      'name',
      'type',
      'from',
      'instantiation',
      'inherits',
      'print_settings_id',
      'filament_settings_id',
      'compatible_printers',
      'compatible_printers_condition',
    ]) {
      expect(PROFILE_METADATA_KEYS.has(key)).toBe(true);
    }
  });
});

describe('complete profile tree', () => {
  it.each([
    ['process', PROCESS_ROOT_KEYS, BAMBU_PROCESS_UI_TREE],
    ['filament', FILAMENT_ROOT_KEYS, BAMBU_FILAMENT_UI_TREE],
  ] as const)('shows every known %s root key exactly once', (kind, keys, curated) => {
    const tree = buildCompleteUiTree(kind, [], curated);
    const renderedKeys = flattenTreeKeys(tree);

    for (const key of keys) expect(renderedKeys).toContain(key);
    expect(new Set(renderedKeys).size).toBe(renderedKeys.length);
  });

  it('shows future and descendant-only keys in Other settings', () => {
    const tree = buildCompleteUiTree(
      'process',
      [
        {
          relativePath: 'users/example/process/future.json',
          data: { future_bambu_option: '42' },
        },
      ],
      BAMBU_PROCESS_UI_TREE,
    );

    expect(flattenTreeKeys(tree)).toContain('future_bambu_option');
    expect(
      tree
        .find((group) => group.id === 'additional-settings')
        ?.subgroups.find((subgroup) => subgroup.id === 'other-settings')
        ?.properties.some((property) => property.key === 'future_bambu_option'),
    ).toBe(true);
  });

  it('uses actual chain keys instead of empty Bambu root keys for Orca', () => {
    const tree = buildCompleteUiTree(
      'process',
      [
        {
          relativePath: 'user/default/process/orca.json',
          data: { orca_only_option: '42' },
        },
      ],
      BAMBU_PROCESS_UI_TREE,
      'orca',
    );
    const keys = flattenTreeKeys(tree);

    expect(keys).toContain('orca_only_option');
    expect(keys).not.toContain('bottom_color_penetration_layers');
  });

  it('maps Orca fields using its pinned PrintConfig metadata', () => {
    const tree = buildOrcaUiTree('process', [
      {
        relativePath: 'user/default/process/orca.json',
        data: {
          layer_height: '0.2',
          seam_slope_type: 'external',
          future_orca_option: '42',
        },
      },
    ]);
    const layerHeight = tree
      .flatMap((group) => group.subgroups)
      .flatMap((subgroup) => subgroup.properties)
      .find((property) => property.key === 'layer_height');

    expect(ORCA_PROFILE_CONFIG_SOURCE.version).toBe('v2.4.2');
    expect(ORCA_PROFILE_CONFIG_DEFS).toHaveProperty('seam_slope_type');
    expect(ORCA_PROFILE_CONFIG_DEFS.bottom_surface_pattern?.enumValues).toContain('rectilinear');
    expect(ORCA_PROFILE_CONFIG_DEFS.input_shaping_type?.enumValues).toContain('Disable');
    expect(ORCA_PROFILE_CONFIG_DEFS.filament_retraction_length).toEqual(
      expect.objectContaining({
        type: 'coFloats',
        label: 'Length',
      }),
    );
    expect(layerHeight).toEqual(
      expect.objectContaining({
        label: 'Layer height',
        unit: 'mm',
      }),
    );
    expect(tree.find((group) => group.id === 'quality')?.subgroups[0]?.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'layer_height' }),
        expect.objectContaining({ key: 'seam_slope_type' }),
      ]),
    );
    expect(flattenTreeKeys(tree)).toContain('future_orca_option');
  });

  it('puts future structural keys in Metadata', () => {
    const tree = buildCompleteUiTree(
      'filament',
      [
        {
          relativePath: 'users/example/filament/example.json',
          data: { inherits: 'base', version: '1.0' },
        },
      ],
      BAMBU_FILAMENT_UI_TREE,
    );
    const metadataKeys =
      tree
        .find((group) => group.id === 'metadata')
        ?.subgroups.flatMap((subgroup) => subgroup.properties.map((property) => property.key)) ??
      [];

    expect(metadataKeys).toEqual(expect.arrayContaining(['inherits', 'version']));
  });
});

describe('profile field localization', () => {
  it.each([
    ['process', PROCESS_ROOT_KEYS],
    ['filament', FILAMENT_ROOT_KEYS],
  ] as const)('provides readable EN and NB labels for every %s key', (_kind, keys) => {
    for (const key of keys) {
      const en = localizedPropertyLabel(key, key, 'en');
      const nb = localizedPropertyLabel(key, key, 'nb');
      expect(en).not.toBe('');
      expect(nb).not.toBe('');
      expect(en).not.toContain('_');
      expect(nb).not.toContain('_');
      expect(hasCompleteNorwegianLabel(key), key).toBe(true);
    }
  });

  it('localizes booleans and known enum values', () => {
    expect(localizedBoolean(true, 'en')).toBe('Yes');
    expect(localizedBoolean(false, 'nb')).toBe('Nei');
    expect(localizedEnumValue('auto', 'nb')).toBe('Automatisk');
    expect(localizedEnumValue('vendor-specific', 'nb')).toBe('vendor-specific');
  });

  it('does not mistake arbitrary numeric coefficients for booleans', () => {
    expect(inferUnitForKey('counter_coef_1', '0')).toBe('string');
    expect(inferUnitForKey('enable_support', '0')).toBe('boolean');
  });
});
