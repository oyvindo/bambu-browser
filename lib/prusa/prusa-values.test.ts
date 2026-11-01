import { describe, expect, it } from 'vite-plus/test';

import type { InheritanceChainLevel } from '@/lib/bambu/resolver';

import type { PrusaProfileConfigDef } from './prusa-profile-config.generated';
import {
  PRUSA_DEFAULTS_PATH,
  PRUSA_ZERO_MEANS,
  effectivePrusaValue,
  parsePrusaValue,
  prusaKindForPath,
  serializePrusaValue,
  toPrusaDisplayChain,
} from './prusa-values';

describe('parsePrusaValue', () => {
  it('reads nil as "not set"', () => {
    expect(parsePrusaValue('filament_retract_length', 'nil')).toBeNull();
    expect(parsePrusaValue('retract_length', '0.8,nil')).toEqual(['0.8', null]);
  });

  it('splits number vectors on commas and keeps scalars as text', () => {
    expect(parsePrusaValue('temperature', '215,210')).toEqual(['215', '210']);
    expect(parsePrusaValue('fill_density', '15%')).toBe('15%');
  });

  it('unquotes string vectors', () => {
    expect(parsePrusaValue('start_filament_gcode', '"; Filament gcode\\n"')).toEqual([
      '; Filament gcode\n',
    ]);
    expect(parsePrusaValue('filament_colour', '#FF8000')).toEqual(['#FF8000']);
    expect(parsePrusaValue('compatible_printers', '')).toEqual([]);
  });

  it('converts legacy values like PrintConfigDef::handle_legacy', () => {
    expect(parsePrusaValue('ensure_vertical_shell_thickness', '1')).toBe('enabled');
    expect(parsePrusaValue('ensure_vertical_shell_thickness', '0')).toBe('partial');
    expect(parsePrusaValue('gcode_label_objects', '1')).toBe('octoprint');
    expect(parsePrusaValue('draft_shield', '0')).toBe('disabled');
    expect(parsePrusaValue('fill_density', '0.15')).toBe('15%');
    expect(parsePrusaValue('fill_pattern', 'monotonous')).toBe('monotonic');
    expect(parsePrusaValue('perimeter_acceleration', '25')).toBe('0');
    expect(parsePrusaValue('support_material_pattern', 'pillars')).toBe('rectilinear');
  });

  it('writes numbers the way PrusaSlicer does, so 0.20 equals 0.2', () => {
    expect(parsePrusaValue('layer_height', '0.20')).toBe('0.2');
    expect(parsePrusaValue('top_infill_extrusion_width', '0.40')).toBe('0.4');
    expect(parsePrusaValue('fill_density', '15.0%')).toBe('15%');
    expect(parsePrusaValue('temperature', '215,210.0')).toEqual(['215', '210']);
    expect(parsePrusaValue('first_layer_height', '0.2')).toBe('0.2');
  });

  it('keeps unknown keys as raw text', () => {
    expect(parsePrusaValue('not_a_prusa_key', 'a,b')).toBe('a,b');
  });
});

describe('serializePrusaValue', () => {
  it.each([
    ['start_filament_gcode', '"; Filament gcode\\n"'],
    ['end_filament_gcode', '"; Filament-specific end gcode"'],
    ['filament_ramming_parameters', '"130 120 2.70968 2.93548| 0.05 2.66451 0.45 3.05805"'],
    ['filament_colour', '#FF8000'],
    ['filament_notes', '""'],
    ['compatible_printers', ''],
    ['retract_length', '0.8,nil'],
    ['filament_retract_length', 'nil'],
    ['output_filename_format', '{input_filename_base}_{print_time}.gcode'],
    ['compatible_printers_condition', 'printer_notes=~/.*MK4IS.*/ and nozzle_diameter[0]==0.4'],
  ])('writes %s back exactly as PrusaSlicer wrote it', (key, raw) => {
    expect(serializePrusaValue(key, parsePrusaValue(key, raw))).toBe(raw);
  });
});

describe('toPrusaDisplayChain', () => {
  const leaf: InheritanceChainLevel = {
    relativePath: 'print/U.ini',
    data: { inherits: 'P', temperature: '215,210', fill_density: '20%' },
  };

  it('puts PrusaSlicer defaults first', () => {
    const chain = toPrusaDisplayChain('process', [leaf]);
    expect(chain[0]?.relativePath).toBe(PRUSA_DEFAULTS_PATH.process);
    expect(chain[0]?.data.fill_density).toMatch(/%$/);
    expect(chain[0]?.data).not.toHaveProperty('temperature');
    expect(chain[0]?.data).not.toHaveProperty('inherits');
  });

  it('uses the filament key set for filament chains', () => {
    const chain = toPrusaDisplayChain('filament', [leaf]);
    expect(chain[0]?.relativePath).toBe(PRUSA_DEFAULTS_PATH.filament);
    expect(chain[0]?.data).toHaveProperty('temperature');
    expect(chain[0]?.data).not.toHaveProperty('fill_density');
  });

  it('starts filament overrides as nil, like PresetBundle::null_nullables', () => {
    const chain = toPrusaDisplayChain('filament', [leaf]);
    expect(chain[0]?.data.filament_retract_length).toBeNull();
    expect(chain[0]?.data.idle_temperature).toBeNull();
    expect(chain[0]?.data.temperature).toEqual(['200']);
  });

  it('fills empty filament vectors with the default, like Preset::normalize', () => {
    const bundle: InheritanceChainLevel = {
      relativePath: 'vendor/Templates.ini#filament:*common*',
      data: { start_filament_gcode: '', compatible_printers: '' },
    };
    const chain = toPrusaDisplayChain('filament', [bundle]);
    expect(chain[1]?.data.start_filament_gcode).toEqual(['; Filament gcode\n']);
    expect(chain[1]?.data.compatible_printers).toEqual([]);
  });

  it('parses every level', () => {
    const chain = toPrusaDisplayChain('process', [leaf]);
    expect(chain[1]?.data.temperature).toEqual(['215', '210']);
    expect(chain[1]?.data.inherits).toBe('P');
  });
});

describe('effectivePrusaValue', () => {
  it('follows a chain of percentages to an absolute speed', () => {
    expect(
      effectivePrusaValue(
        'top_solid_infill_speed',
        { top_solid_infill_speed: '50%', solid_infill_speed: '80%', infill_speed: '60' },
        0,
      ),
    ).toEqual({ value: 24, unit: 'mm/s', basis: ['solid_infill_speed', 'infill_speed'] });
  });

  it('uses the active extruder slot of vector values', () => {
    expect(
      effectivePrusaValue(
        'support_material_interface_speed',
        { support_material_interface_speed: '50%', support_material_speed: '40' },
        1,
      ),
    ).toEqual({ value: 20, unit: 'mm/s', basis: ['support_material_speed'] });
  });

  it('stops at a cycle instead of guessing', () => {
    const defs: Record<string, PrusaProfileConfigDef> = {
      a: { type: 'coFloatOrPercent', ratioOver: 'b', sidetext: 'mm/s or %' },
      b: { type: 'coFloatOrPercent', ratioOver: 'a', sidetext: 'mm/s or %' },
    };
    expect(effectivePrusaValue('a', { a: '50%', b: '50%' }, 0, defs)).toEqual({
      basis: ['b', 'a'],
      unresolved: 'cycle',
    });
  });

  it('reports a missing base value', () => {
    expect(effectivePrusaValue('solid_infill_speed', { solid_infill_speed: '80%' }, 0)).toEqual({
      basis: ['infill_speed'],
      unresolved: 'missing',
    });
  });

  it('cannot compute widths relative to the nozzle without a printer', () => {
    expect(effectivePrusaValue('extrusion_width', { extrusion_width: '105%' }, 0)).toEqual({
      basis: ['nozzle_diameter'],
      unresolved: 'nozzle_diameter',
    });
  });

  it('returns null for absolute values and plain percentages', () => {
    expect(effectivePrusaValue('infill_speed', { infill_speed: '60' }, 0)).toBeNull();
    expect(effectivePrusaValue('fill_density', { fill_density: '15%' }, 0)).toBeNull();
  });
});

describe('PRUSA_ZERO_MEANS', () => {
  it('follows what PrusaSlicer says a zero does', () => {
    expect(PRUSA_ZERO_MEANS.perimeter_extrusion_width).toBe('auto');
    expect(PRUSA_ZERO_MEANS.infill_speed).toBe('auto');
    expect(PRUSA_ZERO_MEANS.travel_acceleration).toBe('disabled');
    expect(PRUSA_ZERO_MEANS.filament_max_volumetric_speed).toBe('no-limit');
    expect(PRUSA_ZERO_MEANS.external_perimeter_acceleration).toEqual({
      uses: 'perimeter_acceleration',
    });
  });
});

describe('prusaKindForPath', () => {
  it.each([
    ['print/U.ini', 'process'],
    ['filament/F.ini', 'filament'],
    ['vendor/Templates.ini#filament:Esun PLA', 'filament'],
    ['vendor/Creality.ini#print:*common*', 'process'],
  ] as const)('%s is a %s preset', (path, kind) => {
    expect(prusaKindForPath(path)).toBe(kind);
  });
});
