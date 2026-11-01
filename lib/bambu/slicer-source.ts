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

const DATA_DIRECTORIES: Record<SlicerSource, { directory: string; envName: string }> = {
  bambu: { directory: 'BambuStudio', envName: 'BAMBUSTUDIO_ROOT' },
  orca: { directory: 'OrcaSlicer', envName: 'ORCASLICER_ROOT' },
  prusa: { directory: 'PrusaSlicer', envName: 'PRUSASLICER_ROOT' },
};

/** Where the local API looks for a slicer's data folder by default. */
export function slicerDataLocation(source: SlicerSource): {
  macPath: string;
  windowsPath: string;
  envName: string;
} {
  const { directory, envName } = DATA_DIRECTORIES[source];
  return {
    macPath: `~/Library/Application Support/${directory}`,
    windowsPath: `%APPDATA%\\${directory}`,
    envName,
  };
}
