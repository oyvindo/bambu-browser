import { describe, expect, it } from 'vite-plus/test';

import { fileLabel } from '@/components/profile-manager/profileTreeGrid/profileTable/fileLabel';
import { profileKindForChain } from '@/lib/bambu/chain-display';
import type { InheritanceChainLevel } from '@/lib/bambu/resolver';

import { buildPrusaUiTree, formatPrusaCell } from './mapping-prusa';

const chain: InheritanceChainLevel[] = [
  {
    relativePath: 'print/U.ini',
    data: { perimeters: '3', fill_density: '15%', inherits: 'P', mystery_key: 'x' },
  },
];

describe('buildPrusaUiTree', () => {
  it('groups keys like the PrusaSlicer settings tabs', () => {
    const tree = buildPrusaUiTree('process', chain);
    expect(tree.map((group) => group.id)).toEqual([
      'prusa-layers-and-perimeters',
      'prusa-infill',
      'others',
      'metadata',
    ]);
    expect(tree[0]?.subgroups[0]).toMatchObject({
      id: 'prusa-layers-and-perimeters-vertical-shells',
      label: 'Vertical shells',
      properties: [{ key: 'perimeters', label: 'Perimeters', unit: 'count' }],
    });
    expect(tree[2]?.subgroups[0]?.properties.map((property) => property.key)).toEqual([
      'mystery_key',
    ]);
    expect(tree[3]?.subgroups[0]?.properties.map((property) => property.key)).toEqual(['inherits']);
  });

  it('marks options PrusaSlicer hides in Simple mode as advanced', () => {
    const tree = buildPrusaUiTree('process', [
      { relativePath: 'print/U.ini', data: { support_material_interface_speed: '100%' } },
    ]);
    expect(tree[0]?.subgroups[0]?.properties[0]).toMatchObject({
      key: 'support_material_interface_speed',
      advanced: true,
    });
  });
});

describe('formatPrusaCell', () => {
  const merged = { top_solid_infill_speed: '50%', solid_infill_speed: '80%', infill_speed: '60' };

  it('shows the computed value next to a percentage', () => {
    expect(formatPrusaCell('top_solid_infill_speed', '50%', merged, 'mm/s', 0, 'en')).toBe(
      '50% → 24 mm/s',
    );
  });

  it('explains percentages of the nozzle diameter', () => {
    expect(formatPrusaCell('extrusion_width', '105%', {}, 'mm', 0, 'en')).toBe(
      '105% of nozzle diameter',
    );
    expect(formatPrusaCell('extrusion_width', '105%', {}, 'mm', 0, 'nb')).toBe(
      '105% av dysediameteren',
    );
  });

  it('explains what zero means', () => {
    expect(formatPrusaCell('extrusion_width', '0', {}, 'mm', 0, 'en')).toBe('0 mm (auto)');
    expect(formatPrusaCell('travel_acceleration', '0', {}, 'mm/s²', 0, 'nb')).toBe('0 mm/s² (av)');
    expect(formatPrusaCell('external_perimeter_acceleration', '0', {}, 'mm/s²', 0, 'en')).toMatch(
      /^0 mm\/s² \(uses .+\)$/,
    );
  });

  it('shows nil extruder slots as not set', () => {
    expect(formatPrusaCell('filament_retract_length', ['0.8', null], {}, 'mm', 1, 'en')).toBe('—');
    expect(formatPrusaCell('filament_retract_length', null, {}, 'mm', 0, 'en')).toBe('—');
  });

  it('uses PrusaSlicer enum labels in English and Norwegian names in Norwegian', () => {
    expect(formatPrusaCell('fill_pattern', 'gyroid', {}, 'enum', 0, 'en')).toBe('Gyroid');
    expect(formatPrusaCell('seam_position', 'rear', {}, 'enum', 0, 'nb')).toBe('Bak');
  });
});

describe('profileKindForChain', () => {
  it('detects PrusaSlicer filament paths without a leading folder', () => {
    expect(profileKindForChain([{ relativePath: 'filament/F.ini', data: {} }], 'prusa')).toBe(
      'filament',
    );
    expect(profileKindForChain([{ relativePath: 'print/P.ini', data: {} }], 'prusa')).toBe(
      'process',
    );
    expect(
      profileKindForChain([{ relativePath: 'user/default/filament/x.json', data: {} }], 'orca'),
    ).toBe('filament');
  });
});

describe('fileLabel', () => {
  it('shows the preset name of a vendor bundle section', () => {
    expect(fileLabel('vendor/Creality.ini#print:*0.20mm*')).toBe('*0.20mm*');
    expect(fileLabel('print/My profile.ini')).toBe('My profile.ini');
  });
});
