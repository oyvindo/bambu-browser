import { describe, expect, it } from 'vite-plus/test';

import { propertyTooltipForKey } from './property-tooltips';

describe('profile property tooltips', () => {
  it("uses Orca's PrintConfig description for known Orca fields", () => {
    const tooltip = propertyTooltipForKey('seam_slope_type', 'en', 'process', 'orca');

    expect(tooltip.impact).toContain('scarf joint');
    expect(tooltip.related).toContain('OrcaSlicer v2.4.2');
  });

  it('uses an Orca-specific fallback for fields absent from PrintConfig', () => {
    const tooltip = propertyTooltipForKey('future_orca_option', 'en', 'process', 'orca');

    expect(tooltip.impact).toContain('OrcaSlicer setting');
    expect(tooltip.related).toBeUndefined();
  });
});
