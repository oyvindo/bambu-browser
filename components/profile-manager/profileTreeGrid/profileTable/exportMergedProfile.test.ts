import { describe, expect, it } from 'vite-plus/test';

import { profileColumnJson } from './exportMergedProfile';

const chain = [
  {
    relativePath: 'system/BBL/filament/fdm_filament_common.json',
    data: { type: 'filament', inherited_value: 'root' },
  },
  {
    relativePath: 'system/BBL/filament/Bambu PLA Basic.json',
    data: { inherited_value: 'parent', parent_only: 'yes' },
  },
  {
    relativePath: 'user/123/filament/Bambu PLA Basic - Copy.json',
    data: {
      from: 'User',
      inherits: 'Bambu PLA Basic',
      name: 'Bambu PLA Basic - Copy',
      leaf_only: 'yes',
    },
  },
];

describe('profile column export', () => {
  it('exports merged JSON for inherited columns', () => {
    expect(JSON.parse(profileColumnJson(chain, 1))).toEqual({
      inherited_value: 'parent',
      parent_only: 'yes',
      type: 'filament',
    });
  });

  it('exports only raw delta JSON for a custom leaf', () => {
    expect(JSON.parse(profileColumnJson(chain, 2))).toEqual(chain[2]!.data);
    expect(profileColumnJson(chain, 2)).not.toContain('parent_only');
  });
});
