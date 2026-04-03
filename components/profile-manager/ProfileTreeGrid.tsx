"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getInheritanceColumns,
  mergedValueAt,
} from "@/lib/bambu/chain-display";
import {
  BAMBU_PROCESS_UI_TREE,
  formatBambuMappedValue,
  mappedFormattedValuesEqual,
  propertyRowTitle,
} from "@/lib/bambu/mapping";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { cn } from "@/lib/utils/index";

function fileLabel(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? relativePath;
}

export type ProfileTreeGridProps = {
  chain: readonly InheritanceChainLevel[];
  /** Used when a JSON value is an array (e.g. dual / quad tool). Default 0. */
  activeExtruderIndex?: number;
  className?: string;
};

export function ProfileTreeGrid({
  chain,
  activeExtruderIndex = 0,
  className,
}: ProfileTreeGridProps) {
  const columns = React.useMemo(() => getInheritanceColumns(chain), [chain]);
  const colCount = 1 + columns.length;

  const [showAdvanced, setShowAdvanced] = React.useState(true);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const g of BAMBU_PROCESS_UI_TREE) init[g.id] = true;
      return init;
    },
  );

  const [openSubgroups, setOpenSubgroups] = React.useState<
    Record<string, boolean>
  >(() => {
    const init: Record<string, boolean> = {};
    for (const g of BAMBU_PROCESS_UI_TREE) {
      for (const sg of g.subgroups) init[sg.id] = true;
    }
    return init;
  });

  const toggleGroup = React.useCallback((id: string) => {
    setOpenGroups((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const toggleSubgroup = React.useCallback((id: string) => {
    setOpenSubgroups((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  if (chain.length === 0 || columns.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm",
          className,
        )}
      >
        Load a profile to show the inheritance tree (one column per template in
        the chain).
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={showAdvanced}
          onChange={(e) => setShowAdvanced(e.target.checked)}
        />
        Show advanced parameters
      </label>

      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[200px] bg-background">
                Property
              </TableHead>
              {columns.map((col) => {
                const name = fileLabel(col.level.relativePath);
                return (
                  <TableHead
                    key={col.index}
                    className="min-w-[110px] max-w-[180px] bg-background"
                    title={col.level.relativePath}
                  >
                    <span className="text-muted-foreground block text-[10px] font-medium tracking-wide uppercase">
                      {col.roleLabel}
                    </span>
                    <span className="block truncate text-xs font-normal leading-tight">
                      {name}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {BAMBU_PROCESS_UI_TREE.map((group) => {
              const groupOpen = openGroups[group.id] !== false;
              return (
                <React.Fragment key={group.id}>
                  <TableRow className="bg-muted/40 hover:bg-muted/50">
                    <TableCell colSpan={colCount} className="p-0">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="text-foreground flex w-full items-center gap-2 px-2 py-2 text-left text-sm font-bold"
                      >
                        {groupOpen ? (
                          <ChevronDown
                            className="size-4 shrink-0 opacity-70"
                            aria-hidden
                          />
                        ) : (
                          <ChevronRight
                            className="size-4 shrink-0 opacity-70"
                            aria-hidden
                          />
                        )}
                        {group.label}
                      </button>
                    </TableCell>
                  </TableRow>
                  {groupOpen &&
                    group.subgroups.map((subgroup) => {
                      const subOpen = openSubgroups[subgroup.id] !== false;
                      const visibleProps = subgroup.properties.filter(
                        (p) => showAdvanced || !p.advanced,
                      );
                      if (visibleProps.length === 0) return null;
                      return (
                        <React.Fragment key={subgroup.id}>
                          <TableRow className="bg-muted/20 hover:bg-muted/30">
                            <TableCell colSpan={colCount} className="p-0 pl-8">
                              <button
                                type="button"
                                onClick={() => toggleSubgroup(subgroup.id)}
                                className="text-foreground flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-semibold"
                              >
                                {subOpen ? (
                                  <ChevronDown
                                    className="size-3.5 shrink-0 opacity-70"
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronRight
                                    className="size-3.5 shrink-0 opacity-70"
                                    aria-hidden
                                  />
                                )}
                                {subgroup.label}
                              </button>
                            </TableCell>
                          </TableRow>
                          {subOpen &&
                            visibleProps.map((prop) => {
                              const key = prop.key;
                              const unit = prop.unit;
                              const title = propertyRowTitle(prop);

                              const effectiveValues = columns.map((col) =>
                                mergedValueAt(chain, col.index, key),
                              );

                              const cellTexts = effectiveValues.map((v) =>
                                formatBambuMappedValue(
                                  v,
                                  unit,
                                  activeExtruderIndex,
                                ),
                              );

                              const overridesParent = effectiveValues.map(
                                (_, i) => {
                                  if (i === 0) return false;
                                  return !mappedFormattedValuesEqual(
                                    effectiveValues[i],
                                    effectiveValues[i - 1],
                                    unit,
                                    activeExtruderIndex,
                                  );
                                },
                              );

                              return (
                                <TableRow
                                  key={key}
                                  className="hover:bg-muted/30"
                                >
                                  <TableCell className="bg-background sticky left-0 z-10 whitespace-normal pl-18 text-muted-foreground shadow-[1px_0_0_var(--border)]">
                                    <span className="text-foreground">
                                      {title}
                                    </span>
                                    <span className="ml-2 font-mono text-[10px] opacity-50">
                                      {key}
                                    </span>
                                  </TableCell>
                                  {columns.map((col, i) => (
                                    <TableCell
                                      key={col.index}
                                      className={cn(
                                        "font-mono text-xs tabular-nums",
                                        overridesParent[i] &&
                                          "bg-emerald-100 dark:bg-emerald-950/40",
                                      )}
                                      title={col.level.relativePath}
                                    >
                                      {cellTexts[i]}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
