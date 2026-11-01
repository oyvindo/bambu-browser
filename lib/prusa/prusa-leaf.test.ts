import { describe, expect, it } from 'vite-plus/test';

import { validateProfileJson } from '@/lib/bambu/profile-leaf-editor';
import type { InheritanceChainLevel } from '@/lib/bambu/resolver';

import { buildPrusaFullConfig, prusaLeafOverrides } from './prusa-leaf';
import { toPrusaDisplayChain } from './prusa-values';

const GCODE = '"; Filament gcode\\n"';

// The shape PrusaSlicer writes: a full snapshot, only `temperature` changed.
const chain = toPrusaDisplayChain('filament', [
  {
    relativePath: 'vendor/Templates.ini#filament:Esun PLA',
    data: { temperature: '210', start_filament_gcode: GCODE, filament_colour: '#FF8000' },
  },
  {
    relativePath: 'filament/Esun PLA @Template - Modified.ini',
    data: {
      inherits: 'Esun PLA @Template',
      temperature: '212',
      start_filament_gcode: GCODE,
      filament_colour: '#FF8000',
      filament_retract_length: 'nil',
      some_future_key: 'kept',
    },
  },
] satisfies InheritanceChainLevel[]);

describe('prusaLeafOverrides', () => {
  it('lists only what the user preset changes, plus inherits', () => {
    expect(prusaLeafOverrides(chain)).toEqual({
      inherits: 'Esun PLA @Template',
      temperature: ['212'],
      some_future_key: 'kept',
    });
  });
});

describe('buildPrusaFullConfig', () => {
  it('writes every key, with edits on top of the parent', () => {
    const values = buildPrusaFullConfig(chain, {
      inherits: 'Esun PLA @Template',
      temperature: ['215'],
    });
    expect(values.temperature).toBe('215');
    expect(values.inherits).toBe('Esun PLA @Template');
    expect(values.filament_retract_length).toBe('nil');
    expect(values.bed_temperature).toBeDefined();
  });

  it('falls back to the parent value for a key removed in the editor', () => {
    const values = buildPrusaFullConfig(chain, { inherits: 'Esun PLA @Template' });
    expect(values.temperature).toBe('210');
  });

  it('keeps untouched values byte-identical', () => {
    const values = buildPrusaFullConfig(chain, prusaLeafOverrides(chain));
    expect(values.start_filament_gcode).toBe(GCODE);
    expect(values.filament_colour).toBe('#FF8000');
    expect(values.some_future_key).toBe('kept');
  });
});

describe('validateProfileJson for PrusaSlicer', () => {
  const original = { inherits: 'P', temperature: ['212'] };

  it('accepts a valid edit', () => {
    const result = validateProfileJson('{"inherits":"P","temperature":["215"]}', {
      kind: 'filament',
      slicer: 'prusa',
      original,
    });
    expect(result.findings).toEqual([]);
    expect(result.canSave).toBe(true);
  });

  it('rejects unknown keys and a changed parent', () => {
    const unknown = validateProfileJson('{"inherits":"P","not_a_prusa_key":1}', {
      kind: 'filament',
      slicer: 'prusa',
      original,
    });
    expect(unknown.canSave).toBe(false);
    const moved = validateProfileJson('{"inherits":"Q"}', {
      kind: 'filament',
      slicer: 'prusa',
      original,
    });
    expect(moved.findings.some((finding) => finding.severity === 'blocker')).toBe(true);
  });

  it('warns about values PrusaSlicer does not know', () => {
    const result = validateProfileJson('{"inherits":"P","fill_pattern":"banana"}', {
      kind: 'process',
      slicer: 'prusa',
      original: { inherits: 'P' },
    });
    expect(result.findings).toEqual([
      expect.objectContaining({ severity: 'warning', key: 'fill_pattern' }),
    ]);
  });

  it('accepts nil slots in filament overrides', () => {
    const result = validateProfileJson(
      '{"inherits":"P","filament_retract_length":[null],"filament_wipe":[null]}',
      {
        kind: 'filament',
        slicer: 'prusa',
        original,
      },
    );
    expect(result.findings).toEqual([]);
  });
});
