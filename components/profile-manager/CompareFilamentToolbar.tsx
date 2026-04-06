"use client";

import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  buildBrandOptions,
  defaultBrandIds,
  defaultMaterialSelectionForDiscoveredList,
  discoverMaterialsForLocation,
  filterSystemFilamentEntries,
  groupEntriesByFolder,
  isFdmFilamentInternalPreset,
  isSupportPresetFileName,
  isUnderscorePresetFileName,
  orderedMaterialLocationKeys,
  SYSTEM_FILAMENT_ROOT_KEY,
  uniqueFilamentSubfolderNames,
  type SystemFilamentEntry,
} from "@/lib/bambu/system-filament-filters";
import { useTranslations } from "@/localization/context";
import { cn } from "@/lib/utils";

function fileLabel(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? relativePath;
}

export type CompareFilamentToolbarProps = {
  entries: readonly SystemFilamentEntry[];
  value: string | null;
  onChange: (relativePath: string) => void;
  onClear: () => void;
  disabled?: boolean;
  loadingList?: boolean;
};

export function CompareFilamentToolbar({
  entries,
  value,
  onChange,
  onClear,
  disabled = false,
  loadingList = false,
}: CompareFilamentToolbarProps) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [materialSelByFolder, setMaterialSelByFolder] = React.useState<
    Map<string, Set<string>>
  >(() => new Map());
  const [rootBrandSel, setRootBrandSel] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [locationSel, setLocationSel] = React.useState<Set<string>>(
    () => new Set([SYSTEM_FILAMENT_ROOT_KEY]),
  );
  const filtersInitRef = React.useRef(false);

  const listEntries = React.useMemo(
    () =>
      entries.filter(
        (e) =>
          !isFdmFilamentInternalPreset(e.fileName) &&
          !isSupportPresetFileName(e.fileName) &&
          !isUnderscorePresetFileName(e.fileName),
      ),
    [entries],
  );

  const materialLocationKeys = React.useMemo(
    () => orderedMaterialLocationKeys(listEntries),
    [listEntries],
  );

  const rootBrandOptions = React.useMemo(
    () => buildBrandOptions(listEntries).filter((b) => b.folder === ""),
    [listEntries],
  );

  const subfolderNames = React.useMemo(
    () => uniqueFilamentSubfolderNames(listEntries),
    [listEntries],
  );

  const hasRootEntries = React.useMemo(
    () => listEntries.some((e) => e.folder === ""),
    [listEntries],
  );

  React.useEffect(() => {
    if (listEntries.length === 0) {
      filtersInitRef.current = false;
      setMaterialSelByFolder(new Map());
      setLocationSel(new Set([SYSTEM_FILAMENT_ROOT_KEY]));
      return;
    }
    setMaterialSelByFolder((prev) => {
      const keys = orderedMaterialLocationKeys(listEntries);
      const next = new Map(prev);
      let changed = false;
      for (const key of keys) {
        if (next.has(key)) continue;
        const mats = discoverMaterialsForLocation(listEntries, key);
        next.set(key, defaultMaterialSelectionForDiscoveredList(mats));
        changed = true;
      }
      for (const k of [...next.keys()]) {
        if (!keys.includes(k)) {
          next.delete(k);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [listEntries]);

  React.useEffect(() => {
    if (listEntries.length === 0) return;
    if (filtersInitRef.current) return;
    filtersInitRef.current = true;

    let nextRootBrand = defaultBrandIds(rootBrandOptions);
    if (nextRootBrand.size === 0 && rootBrandOptions.length > 0) {
      nextRootBrand = new Set(rootBrandOptions.map((b) => b.id));
    }
    setRootBrandSel(nextRootBrand);
  }, [listEntries, rootBrandOptions]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filteredEntries = React.useMemo(
    () =>
      filterSystemFilamentEntries(
        listEntries,
        materialSelByFolder,
        rootBrandSel,
        locationSel,
        query,
      ),
    [listEntries, materialSelByFolder, rootBrandSel, locationSel, query],
  );

  const grouped = React.useMemo(
    () => groupEntriesByFolder(filteredEntries),
    [filteredEntries],
  );

  const displayLabel = value ? fileLabel(value) : "";

  const toggleMaterial = React.useCallback((folderKey: string, id: string) => {
    setMaterialSelByFolder((prev) => {
      const n = new Map(prev);
      const cur = new Set(n.get(folderKey) ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      n.set(folderKey, cur);
      return n;
    });
  }, []);

  const toggleRootBrand = React.useCallback((id: string) => {
    setRootBrandSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleLocation = React.useCallback((key: string) => {
    setLocationSel((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const rootLocationOn = locationSel.has(SYSTEM_FILAMENT_ROOT_KEY);

  return (
    <Tooltip.Provider delay={400}>
      <div className="border-border space-y-3 border-t px-4 py-3">
        {hasRootEntries || subfolderNames.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-muted-foreground block text-xs font-medium">
              {t("compareFilament.foldersHeading")}
            </span>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
              {hasRootEntries ? (
                <Button
                  type="button"
                  size="sm"
                  variant={
                    locationSel.has(SYSTEM_FILAMENT_ROOT_KEY)
                      ? "secondary"
                      : "outline"
                  }
                  aria-pressed={locationSel.has(SYSTEM_FILAMENT_ROOT_KEY)}
                  disabled={disabled || loadingList}
                  className="h-8 rounded-md text-xs font-medium"
                  onClick={() => toggleLocation(SYSTEM_FILAMENT_ROOT_KEY)}
                >
                  {t("compareFilament.rootToggle")}
                </Button>
              ) : null}
              {subfolderNames.map((name) => {
                const on = locationSel.has(name);
                return (
                  <Button
                    key={name}
                    type="button"
                    size="sm"
                    variant={on ? "secondary" : "outline"}
                    aria-pressed={on}
                    disabled={disabled || loadingList}
                    className="h-8 rounded-md text-xs font-medium"
                    onClick={() => toggleLocation(name)}
                  >
                    {name}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <span className="text-muted-foreground block text-xs font-medium">
            {t("compareFilament.brandsHeading")}
          </span>
          <div className="flex flex-col gap-2">
            {rootBrandOptions.length > 0 ? (
              <div className="flex max-h-32 flex-wrap gap-x-3 gap-y-1.5 overflow-y-auto pr-1">
                {rootBrandOptions.map((b) => (
                  <label
                    key={b.id}
                    className={cn(
                      "text-foreground flex max-w-full items-center gap-1.5 text-xs",
                      disabled || loadingList || !rootLocationOn
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={rootBrandSel.has(b.id)}
                      onChange={() => toggleRootBrand(b.id)}
                      disabled={disabled || loadingList || !rootLocationOn}
                    />
                    <span className="wrap-break-word">{b.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-muted-foreground block text-xs font-medium">
            {t("compareFilament.materialsHeading")}
          </span>
          {materialLocationKeys.map((folderKey) => {
            const mats = discoverMaterialsForLocation(listEntries, folderKey);
            if (mats.length === 0) return null;
            const sel = materialSelByFolder.get(folderKey);
            const locOn =
              folderKey === ""
                ? locationSel.has(SYSTEM_FILAMENT_ROOT_KEY)
                : locationSel.has(folderKey);
            return (
              <div
                key={folderKey || "root"}
                className={cn(
                  "space-y-1.5",
                  !locOn && "text-muted-foreground opacity-50",
                )}
              >
                {folderKey !== "" ? (
                  <span className="text-muted-foreground block text-[11px] font-medium">
                    {folderKey}
                  </span>
                ) : null}
                <div
                  className={cn(
                    "flex max-h-28 flex-wrap gap-x-3 gap-y-1.5 overflow-y-auto pr-1",
                    folderKey !== "" && "border-border ml-3 border-l pl-3",
                  )}
                >
                  {mats.map((id) => (
                    <label
                      key={`${folderKey}:${id}`}
                      className={cn(
                        "flex items-center gap-1.5 text-xs whitespace-nowrap",
                        disabled || loadingList || !locOn
                          ? "cursor-not-allowed"
                          : "text-foreground cursor-pointer",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={sel?.has(id) ?? false}
                        onChange={() => toggleMaterial(folderKey, id)}
                        disabled={disabled || loadingList || !locOn}
                      />
                      {id}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Popover.Root open={open} onOpenChange={setOpen}>
              <Popover.Trigger
                type="button"
                disabled={disabled || loadingList}
                className={cn(
                  "border-input bg-background text-foreground inline-flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border px-2 text-left text-sm",
                  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  {loadingList
                    ? t("compareFilament.loadingList")
                    : value
                      ? displayLabel
                      : t("compareFilament.placeholderClosed")}
                </span>
                <ChevronDown
                  className="text-muted-foreground size-4 shrink-0 opacity-70"
                  aria-hidden
                />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  className="z-50 min-w-[min(100vw-2rem,24rem)] max-w-[min(100vw-2rem,32rem)]"
                >
                  <Popover.Popup
                    className={cn(
                      "border-border bg-popover text-popover-foreground rounded-md border shadow-md outline-none",
                      "flex max-h-[min(22rem,calc(100vh-6rem))] flex-col overflow-hidden",
                    )}
                  >
                    <div className="border-border shrink-0 border-b p-2">
                      <input
                        type="search"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("compareFilament.searchPlaceholder")}
                        className="border-input bg-background placeholder:text-muted-foreground h-8 w-full rounded-md border px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label={t("compareFilament.searchPlaceholder")}
                      />
                    </div>
                    <ul
                      className="min-h-0 flex-1 overflow-y-auto p-1"
                      role="listbox"
                    >
                      {grouped.length === 0 ||
                      grouped.every((g) => g.entries.length === 0) ? (
                        <li className="text-muted-foreground list-none px-2 py-2 text-sm">
                          {t("compareFilament.noMatches")}
                        </li>
                      ) : (
                        grouped.flatMap((group, gi) => {
                          const nodes: React.ReactNode[] = [];
                          if (gi > 0) {
                            nodes.push(
                              <li
                                key={`sep-${group.folder}`}
                                role="separator"
                                className="border-border list-none border-t"
                                aria-hidden
                              />,
                            );
                          }
                          nodes.push(
                            <li
                              key={`h-${group.folder || "root"}`}
                              role="presentation"
                              className="list-none"
                            >
                              <div className="bg-muted/80 text-muted-foreground sticky top-0 z-[1] px-2 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
                                {group.folder
                                  ? group.folder
                                  : t("compareFilament.rootFolder")}
                              </div>
                            </li>,
                          );
                          for (const e of group.entries) {
                            nodes.push(
                              <li
                                key={e.relativePath}
                                role="presentation"
                                className="list-none"
                              >
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={value === e.relativePath}
                                  className={cn(
                                    "hover:bg-muted focus:bg-muted w-full rounded-sm px-2 py-1.5 text-left text-sm",
                                    value === e.relativePath &&
                                      "bg-muted font-medium",
                                  )}
                                  onClick={() => {
                                    onChange(e.relativePath);
                                    setOpen(false);
                                  }}
                                >
                                  <span className="block truncate font-medium">
                                    {e.fileName}
                                  </span>
                                  <span className="text-muted-foreground block truncate font-mono text-[10px]">
                                    {e.relativePath}
                                  </span>
                                </button>
                              </li>,
                            );
                          }
                          return nodes;
                        })
                      )}
                    </ul>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>

            {value ? (
              <Tooltip.Root>
                <Tooltip.Trigger
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon-lg" }),
                    "shrink-0",
                  )}
                  disabled={disabled}
                  onClick={() => onClear()}
                  aria-label={t("compareFilament.removeAria")}
                >
                  <X className="size-4" strokeWidth={2} aria-hidden />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner
                    side="top"
                    sideOffset={6}
                    className="z-50"
                  >
                    <Tooltip.Popup
                      className={cn(
                        "bg-popover text-popover-foreground border-border rounded-md border px-2 py-1 text-xs shadow-md",
                      )}
                    >
                      {t("compareFilament.removeTooltip")}
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : null}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
