export const SLICER_SOURCES = ['bambu', 'orca', 'prusa'] as const;

export type SlicerSource = (typeof SLICER_SOURCES)[number];

export const DEFAULT_SLICER_SOURCE: SlicerSource = 'bambu';

export function isSlicerSource(value: unknown): value is SlicerSource {
  return (SLICER_SOURCES as readonly unknown[]).includes(value);
}

const DISPLAY_NAMES: Record<SlicerSource, string> = {
  bambu: 'Bambu Studio',
  orca: 'OrcaSlicer',
  prusa: 'PrusaSlicer',
};

export function slicerDisplayName(source: SlicerSource): string {
  return DISPLAY_NAMES[source];
}
