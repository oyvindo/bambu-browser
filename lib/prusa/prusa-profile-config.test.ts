import { describe, expect, it } from 'vite-plus/test';

import {
  PRUSA_FILAMENT_OPTION_KEYS,
  PRUSA_PRINT_OPTION_KEYS,
  PRUSA_PROFILE_CONFIG_DEFS,
  PRUSA_PROFILE_CONFIG_SOURCE,
  PRUSA_UI_LAYOUT,
} from './prusa-profile-config.generated';

describe('generated PrusaSlicer option definitions', () => {
  it('pins the PrusaSlicer version they were read from', () => {
    expect(PRUSA_PROFILE_CONFIG_SOURCE.version).toBe('version_2.9.6');
  });

  it('reads type, category and a percent default for fill_density', () => {
    const def = PRUSA_PROFILE_CONFIG_DEFS.fill_density;
    expect(def?.type).toBe('coPercent');
    expect(def?.category).toBe('Infill');
    expect(def?.defaultValue).toMatch(/^\d+%$/);
  });

  it('reads ratio_over for percentage speeds', () => {
    expect(PRUSA_PROFILE_CONFIG_DEFS.support_material_interface_speed?.ratioOver).toBe(
      'support_material_speed',
    );
    expect(PRUSA_PROFILE_CONFIG_DEFS.support_material_interface_speed?.defaultValue).toBe('100%');
  });

  it('expands the filament retract overrides declared in a loop', () => {
    const override = PRUSA_PROFILE_CONFIG_DEFS.filament_retract_length;
    expect(override?.nullable).toBe(true);
    expect(override?.type).toBe('coFloats');
    expect(override?.label).toBe(PRUSA_PROFILE_CONFIG_DEFS.retract_length?.label);
    expect(PRUSA_PROFILE_CONFIG_DEFS.filament_seam_gap_distance?.type).toBe('coFloatsOrPercents');
  });

  it('reads enum keys, labels and enum defaults', () => {
    const def = PRUSA_PROFILE_CONFIG_DEFS.fill_pattern;
    expect(def?.enumValues).toContain('gyroid');
    expect(def?.enumLabels?.gyroid).toBe('Gyroid');
    expect(def?.enumValues).toContain(def?.defaultValue);
  });

  it('reads defaults of scoped C++ enums', () => {
    for (const key of ['ensure_vertical_shell_thickness', 'perimeter_generator', 'brim_type']) {
      const def = PRUSA_PROFILE_CONFIG_DEFS[key];
      expect(def?.enumValues, key).toContain(def?.defaultValue);
    }
  });

  it('reads the first string of L_CONTEXT labels and keeps the full label', () => {
    expect(PRUSA_PROFILE_CONFIG_DEFS.top_solid_layers?.label).toBe('Top');
    expect(PRUSA_PROFILE_CONFIG_DEFS.top_solid_layers?.fullLabel).toBe('Top solid layers');
  });

  it('marks only comSimple options as not advanced', () => {
    expect(PRUSA_PROFILE_CONFIG_DEFS.layer_height?.advanced).toBeUndefined();
    expect(PRUSA_PROFILE_CONFIG_DEFS.support_material_interface_speed?.advanced).toBe(true);
  });

  it('writes string vector defaults the way PrusaSlicer writes them', () => {
    expect(PRUSA_PROFILE_CONFIG_DEFS.filament_notes?.defaultValue).toBe('""');
    expect(PRUSA_PROFILE_CONFIG_DEFS.filament_colour?.defaultValue).toBe('#29B2B2');
    expect(PRUSA_PROFILE_CONFIG_DEFS.start_filament_gcode?.defaultValue).toBe(
      '"; Filament gcode\\n"',
    );
    expect(PRUSA_PROFILE_CONFIG_DEFS.compatible_printers?.defaultValue).toBe('');
  });

  it('lists which keys belong to print and filament presets', () => {
    expect(PRUSA_PRINT_OPTION_KEYS).toContain('fill_density');
    expect(PRUSA_PRINT_OPTION_KEYS).not.toContain('temperature');
    expect(PRUSA_FILAMENT_OPTION_KEYS).toContain('temperature');
    expect(PRUSA_FILAMENT_OPTION_KEYS).toContain('filament_retract_length');
  });

  it('copies the page and group layout of the PrusaSlicer settings tabs', () => {
    const print = PRUSA_UI_LAYOUT.print;
    expect(print[0]?.title).toBe('Layers and perimeters');
    expect(print[0]?.groups[0]).toEqual({
      title: 'Layer height',
      keys: ['layer_height', 'first_layer_height'],
    });
    const horizontal = print[0]?.groups.find((group) => group.title === 'Horizontal shells');
    expect(horizontal?.keys).toContain('top_solid_layers');
    expect(PRUSA_UI_LAYOUT.filament[0]?.title).toBe('Filament');
    const overrides = PRUSA_UI_LAYOUT.filament.find((page) => page.title === 'Filament Overrides');
    expect(overrides?.groups.map((group) => group.title)).toContain('Retraction');
  });

  it('places almost every print and filament key on a page', () => {
    const placed = (pages: typeof PRUSA_UI_LAYOUT.print) =>
      new Set(pages.flatMap((page) => page.groups.flatMap((group) => group.keys)));
    const print = placed(PRUSA_UI_LAYOUT.print);
    const filament = placed(PRUSA_UI_LAYOUT.filament);
    const unplacedPrint = PRUSA_PRINT_OPTION_KEYS.filter((key) => !print.has(key));
    const unplacedFilament = PRUSA_FILAMENT_OPTION_KEYS.filter((key) => !filament.has(key));
    expect(unplacedPrint.length).toBeLessThan(10);
    expect(unplacedFilament.length).toBeLessThan(10);
  });
});
