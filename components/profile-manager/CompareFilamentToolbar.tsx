"use client";

import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "@/localization/context";
import { cn } from "@/lib/utils/index";

function fileLabel(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? relativePath;
}

export type CompareFilamentToolbarProps = {
  systemFilamentPaths: readonly string[];
  value: string | null;
  onChange: (relativePath: string) => void;
  onClear: () => void;
  disabled?: boolean;
  loadingList?: boolean;
};

export function CompareFilamentToolbar({
  systemFilamentPaths,
  value,
  onChange,
  onClear,
  disabled = false,
  loadingList = false,
}: CompareFilamentToolbarProps) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...systemFilamentPaths];
    return systemFilamentPaths.filter((p) => {
      const name = fileLabel(p).toLowerCase();
      return name.includes(q) || p.toLowerCase().includes(q);
    });
  }, [systemFilamentPaths, query]);

  const displayLabel = value ? fileLabel(value) : "";

  return (
    <Tooltip.Provider delay={400}>
      <div className="border-border space-y-1.5 border-b px-4 py-3">
        <span className="text-muted-foreground block text-xs font-medium">
          {t("compareFilament.label")}
        </span>
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
                    "flex max-h-[min(20rem,calc(100vh-6rem))] flex-col overflow-hidden",
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
                    {filtered.length === 0 ? (
                      <li className="text-muted-foreground px-2 py-2 text-sm">
                        {t("compareFilament.noMatches")}
                      </li>
                    ) : (
                      filtered.map((p) => (
                        <li key={p} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={value === p}
                            className={cn(
                              "hover:bg-muted focus:bg-muted w-full rounded-sm px-2 py-1.5 text-left text-sm",
                              value === p && "bg-muted font-medium",
                            )}
                            onClick={() => {
                              onChange(p);
                              setOpen(false);
                            }}
                          >
                            <span className="block truncate font-medium">
                              {fileLabel(p)}
                            </span>
                            <span className="text-muted-foreground block truncate font-mono text-[10px]">
                              {p}
                            </span>
                          </button>
                        </li>
                      ))
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
                <Tooltip.Positioner side="top" sideOffset={6} className="z-50">
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
    </Tooltip.Provider>
  );
}
