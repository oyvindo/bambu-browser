import { describe, expect, it } from 'vite-plus/test';

import { ORCA_PROFILE_CONFIG_DEFS } from '@/lib/bambu/orca-profile-config.generated';
import { propertyTooltipForKey } from '@/lib/bambu/property-tooltips';
import {
  PRUSA_LAYOUT_TITLES_NB,
  hasCompleteNorwegianLabel,
  localizedEnumValue,
  localizedPropertyLabel,
} from '@/localization/profile-fields';

import { PRUSA_EQUIVALENT_KEYS } from './prusa-key-equivalents';
import {
  PRUSA_FILAMENT_OPTION_KEYS,
  PRUSA_PRINT_OPTION_KEYS,
  PRUSA_PROFILE_CONFIG_DEFS,
  PRUSA_UI_LAYOUT,
} from './prusa-profile-config.generated';

const allKeys = [...new Set([...PRUSA_PRINT_OPTION_KEYS, ...PRUSA_FILAMENT_OPTION_KEYS])].filter(
  (key) => PRUSA_PROFILE_CONFIG_DEFS[key],
);

const simpleKeys = [...new Set([...PRUSA_PRINT_OPTION_KEYS, ...PRUSA_FILAMENT_OPTION_KEYS])].filter(
  (key) => PRUSA_PROFILE_CONFIG_DEFS[key] && !PRUSA_PROFILE_CONFIG_DEFS[key].advanced,
);

describe('PrusaSlicer translation', () => {
  it('maps only to keys Bambu Studio and OrcaSlicer really have', () => {
    for (const [prusaKey, orcaKey] of Object.entries(PRUSA_EQUIVALENT_KEYS)) {
      expect(PRUSA_PROFILE_CONFIG_DEFS[prusaKey], prusaKey).toBeDefined();
      expect(ORCA_PROFILE_CONFIG_DEFS[orcaKey], orcaKey).toBeDefined();
    }
  });

  it('has a Norwegian label for every print and filament option', () => {
    const missing = allKeys.filter(
      (key) =>
        !hasCompleteNorwegianLabel(key) &&
        !(PRUSA_EQUIVALENT_KEYS[key] && hasCompleteNorwegianLabel(PRUSA_EQUIVALENT_KEYS[key])),
    );
    expect(missing).toEqual([]);
  });

  it('borrows the Norwegian label of the equivalent Bambu key', () => {
    expect(localizedPropertyLabel('perimeters', 'Perimeters', 'nb', 'prusa')).toBe(
      localizedPropertyLabel('wall_loops', 'Wall loops', 'nb'),
    );
  });

  it('has a Norwegian name for every enum value of a Simple-mode option', () => {
    const missing = simpleKeys.flatMap((key) =>
      (PRUSA_PROFILE_CONFIG_DEFS[key]?.enumValues ?? []).filter(
        (value) => localizedEnumValue(value, 'nb') === value && !/^[A-Z0-9]+$/.test(value),
      ),
    );
    expect(missing).toEqual([]);
  });

  it('has a Norwegian title for every PrusaSlicer page and option group', () => {
    const titles = Object.values(PRUSA_UI_LAYOUT).flatMap((pages) =>
      pages.flatMap((page) => [page.title, ...page.groups.map((group) => group.title)]),
    );
    expect(titles.filter((title) => !PRUSA_LAYOUT_TITLES_NB[title])).toEqual([]);
  });

  it('describes options with the PrusaSlicer tooltip', () => {
    const en = propertyTooltipForKey('fill_density', 'en', 'process', 'prusa');
    expect(en.impact).toBe(PRUSA_PROFILE_CONFIG_DEFS.fill_density?.tooltip);
    const nb = propertyTooltipForKey('travel_speed_z', 'nb', 'process', 'prusa');
    expect(nb.related).toMatch(/PrusaSlicer/);
  });
});
