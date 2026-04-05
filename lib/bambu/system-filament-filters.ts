/**
 * System preset filenames under BambuStudio/system/BBL/filament — material and brand filters for the compare picker.
 */

export type SystemFilamentEntry = {
  relativePath: string;
  /** Empty string = file at filament root; otherwise one subdirectory name (e.g. Polymaker). */
  folder: string;
  fileName: string;
};

export type BrandOption = {
  id: string;
  label: string;
  brandKey: string;
  /** Empty = preset at filament root; otherwise subfolder under system/BBL/filament. */
  folder: string;
};

const FDM_COMMON_RE = /^fdm_filament_common$/i;

/**
 * Bambu shared layer templates (`fdm_filament_*`) — excluded from compare picker.
 * (Also excluded when `isUnderscorePresetFileName` applies.)
 */
export function isFdmFilamentInternalPreset(fileName: string): boolean {
  const base = basenameNoJson(fileName);
  return /^fdm_filament(?:_|$)/i.test(base);
}

/** Support / soluble interface filaments — excluded from compare picker. */
export function isSupportPresetFileName(fileName: string): boolean {
  return fileName.toLowerCase().includes("support");
}

/** Any `'_'` in the filename — excluded from compare picker. */
export function isUnderscorePresetFileName(fileName: string): boolean {
  return fileName.includes("_");
}

function basenameNoJson(fileName: string): string {
  return fileName.replace(/\.json$/i, "");
}

/** First whitespace-delimited token (brand / line prefix in Bambu filenames). */
export function firstFilenameToken(fileName: string): string {
  const base = basenameNoJson(fileName).trim();
  if (!base) return "";
  return (base.split(/\s+/)[0] ?? "").trim();
}

/**
 * Material segment from a Bambu preset basename: text after the brand (first word) and
 * before ` @…` (printer suffix). Without ` @`, uses the part after the brand on the full basename.
 *
 * @example `Generic PLA High Speed @BBL P2S.json` → `PLA High Speed`
 */
export function extractPresetMaterialLine(fileName: string): string | null {
  const base = basenameNoJson(fileName).trim();
  if (!base) return null;

  const atExec = /\s+@/.exec(base);
  const beforeAt = atExec ? base.slice(0, atExec.index).trim() : base;

  const tokens = beforeAt.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  const material = tokens.slice(1).join(" ").trim();
  return material.length > 0 ? material : null;
}

export function discoverMaterialsFromFileNames(
  fileNames: readonly string[],
): string[] {
  const byLower = new Map<string, string>();
  for (const fn of fileNames) {
    const line = extractPresetMaterialLine(fn);
    if (!line) continue;
    const key = line.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, line);
  }
  return [...byLower.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/** Materials present in presets under one location (`""` = root). */
export function discoverMaterialsForLocation(
  entries: readonly SystemFilamentEntry[],
  folder: string,
): string[] {
  const names = entries
    .filter((e) => e.folder === folder)
    .map((e) => e.fileName);
  return discoverMaterialsFromFileNames(names);
}

export function entryMatchesMaterialSelection(
  fileName: string,
  selectedMaterials: ReadonlySet<string>,
): boolean {
  if (selectedMaterials.size === 0) return false;
  const line = extractPresetMaterialLine(fileName);
  if (!line) return false;
  const lineLower = line.toLowerCase();
  for (const id of selectedMaterials) {
    if (id.toLowerCase() === lineLower) return true;
  }
  return false;
}

export function buildBrandOptions(
  entries: readonly SystemFilamentEntry[],
): BrandOption[] {
  const map = new Map<string, BrandOption>();
  for (const e of entries) {
    const base = basenameNoJson(e.fileName);
    if (FDM_COMMON_RE.test(base)) continue;
    const first = firstFilenameToken(e.fileName);
    if (!first) continue;
    const brandKey = first.toLowerCase();
    const id = `${e.folder}|||${brandKey}`;
    if (!map.has(id)) {
      const label = e.folder ? `${e.folder} ${first}` : first;
      map.set(id, { id, label, brandKey, folder: e.folder });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export function brandIdForEntry(entry: SystemFilamentEntry): string | null {
  const base = basenameNoJson(entry.fileName);
  if (FDM_COMMON_RE.test(base)) return null;
  const first = firstFilenameToken(entry.fileName);
  if (!first) return null;
  return `${entry.folder}|||${first.toLowerCase()}`;
}

export function entryMatchesBrandSelection(
  entry: SystemFilamentEntry,
  selectedBrandIds: ReadonlySet<string>,
): boolean {
  if (selectedBrandIds.size === 0) return false;
  const id = brandIdForEntry(entry);
  if (!id) return false;
  return selectedBrandIds.has(id);
}

/**
 * Which locations are included in the picker. Use `SYSTEM_FILAMENT_ROOT_KEY` ("") for
 * root-level JSON; subfolder name for nested presets.
 */
export const SYSTEM_FILAMENT_ROOT_KEY = "";

/** Root presets: require root key + brand checkboxes. Subfolder presets: folder name in set. */
export function entryMatchesRootBrandOrFolderSelection(
  entry: SystemFilamentEntry,
  selectedRootBrandIds: ReadonlySet<string>,
  includedLocationKeys: ReadonlySet<string>,
): boolean {
  if (entry.folder === "") {
    if (!includedLocationKeys.has(SYSTEM_FILAMENT_ROOT_KEY)) return false;
    return entryMatchesBrandSelection(entry, selectedRootBrandIds);
  }
  return includedLocationKeys.has(entry.folder);
}

/** Exact material-line labels checked by default (`defaultMaterialSelectionForDiscoveredList`). */
export const DEFAULT_MATERIAL_SELECTION = new Set<string>(["PLA", "PETG"]);

export function defaultMaterialSelectionForDiscoveredList(
  discoveredMaterialIds: readonly string[],
): Set<string> {
  const allowed = new Set(
    [...DEFAULT_MATERIAL_SELECTION].map((s) => s.toLowerCase()),
  );
  const sel = new Set<string>();
  for (const d of discoveredMaterialIds) {
    if (allowed.has(d.trim().toLowerCase())) sel.add(d);
  }
  return sel;
}

export function defaultBrandIds(
  brandOptions: readonly BrandOption[],
): Set<string> {
  const out = new Set<string>();
  for (const b of brandOptions) {
    if (b.brandKey === "esun" || b.brandKey === "generic") {
      out.add(b.id);
    }
  }
  return out;
}

export function entryMatchesLocationMaterialSelection(
  entry: SystemFilamentEntry,
  materialSelByFolder: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  const key = entry.folder;
  const sel = materialSelByFolder.get(key);
  if (!sel || sel.size === 0) return false;
  return entryMatchesMaterialSelection(entry.fileName, sel);
}

export function filterSystemFilamentEntries(
  entries: readonly SystemFilamentEntry[],
  materialSelByFolder: ReadonlyMap<string, ReadonlySet<string>>,
  selectedRootBrandIds: ReadonlySet<string>,
  includedLocationKeys: ReadonlySet<string>,
  searchQuery: string,
): SystemFilamentEntry[] {
  const q = searchQuery.trim().toLowerCase();
  return entries.filter((e) => {
    if (!entryMatchesLocationMaterialSelection(e, materialSelByFolder)) {
      return false;
    }
    if (
      !entryMatchesRootBrandOrFolderSelection(
        e,
        selectedRootBrandIds,
        includedLocationKeys,
      )
    ) {
      return false;
    }
    if (!q) return true;
    const name = e.fileName.toLowerCase();
    return name.includes(q) || e.relativePath.toLowerCase().includes(q);
  });
}

export function uniqueFilamentSubfolderNames(
  entries: readonly SystemFilamentEntry[],
): string[] {
  const s = new Set<string>();
  for (const e of entries) {
    if (e.folder) s.add(e.folder);
  }
  return [...s].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/** Root (`""`) first, then subfolder names alphabetically — only keys that have entries. */
export function orderedMaterialLocationKeys(
  entries: readonly SystemFilamentEntry[],
): string[] {
  const out: string[] = [];
  if (entries.some((e) => e.folder === "")) {
    out.push(SYSTEM_FILAMENT_ROOT_KEY);
  }
  out.push(...uniqueFilamentSubfolderNames(entries));
  return out;
}

export type FolderGroup = {
  folder: string;
  entries: SystemFilamentEntry[];
};

export function groupEntriesByFolder(
  entries: readonly SystemFilamentEntry[],
): FolderGroup[] {
  const m = new Map<string, SystemFilamentEntry[]>();
  for (const e of entries) {
    const key = e.folder;
    const arr = m.get(key) ?? [];
    arr.push(e);
    m.set(key, arr);
  }
  const folders = [...m.keys()].sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
  return folders.map((folder) => ({
    folder,
    entries: (m.get(folder) ?? []).sort((x, y) =>
      x.fileName.localeCompare(y.fileName, undefined, { sensitivity: "base" }),
    ),
  }));
}
