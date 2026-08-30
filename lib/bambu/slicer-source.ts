export const SLICER_SOURCES = ["bambu", "orca"] as const;

export type SlicerSource = (typeof SLICER_SOURCES)[number];

export const DEFAULT_SLICER_SOURCE: SlicerSource = "bambu";

export function isSlicerSource(value: unknown): value is SlicerSource {
  return value === "bambu" || value === "orca";
}

export function slicerDisplayName(source: SlicerSource): string {
  return source === "orca" ? "OrcaSlicer" : "Bambu Studio";
}
