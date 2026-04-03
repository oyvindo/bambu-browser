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
import { getThreeColumnSlice, mergedValueAt } from "@/lib/bambu/chain-display";
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
  const slice = React.useMemo(() => getThreeColumnSlice(chain), [chain]);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

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

  if (chain.length === 0 || !slice.root || !slice.system || !slice.user) {
    return (
      <div
        className={cn(
          "text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm",
          className,
        )}
      >
        Load a profile to show the inheritance tree (Root → System → User).
      </div>
    );
  }

  const rootTitle = fileLabel(slice.root.relativePath);
  const systemTitle = fileLabel(slice.system.relativePath);
  const userTitle = fileLabel(slice.user.relativePath);

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] bg-background">
              Property
            </TableHead>
            <TableHead
              className="min-w-[120px] bg-background"
              title={slice.root.relativePath}
            >
              Root
              <span className="text-muted-foreground block truncate text-xs font-normal">
                {rootTitle}
              </span>
            </TableHead>
            <TableHead
              className="min-w-[120px] bg-background"
              title={slice.system.relativePath}
            >
              System
              <span className="text-muted-foreground block truncate text-xs font-normal">
                {systemTitle}
              </span>
            </TableHead>
            <TableHead
              className="min-w-[120px] bg-background"
              title={slice.user.relativePath}
            >
              User
              <span className="text-muted-foreground block truncate text-xs font-normal">
                {userTitle}
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BAMBU_PROCESS_UI_TREE.map((group) => {
            const groupOpen = openGroups[group.id] !== false;
            return (
              <React.Fragment key={group.id}>
                <TableRow className="bg-muted/40 hover:bg-muted/50">
                  <TableCell colSpan={4} className="p-0">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm font-semibold"
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
                          <TableCell colSpan={4} className="p-0 pl-8">
                            <button
                              type="button"
                              onClick={() => toggleSubgroup(subgroup.id)}
                              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-medium"
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
                            const effRoot = mergedValueAt(
                              chain,
                              slice.rootIndex,
                              key,
                            );
                            const effSystem = mergedValueAt(
                              chain,
                              slice.systemIndex,
                              key,
                            );
                            const effUser = mergedValueAt(
                              chain,
                              slice.userIndex,
                              key,
                            );

                            const systemOverridesRoot =
                              !mappedFormattedValuesEqual(
                                effSystem,
                                effRoot,
                                unit,
                                activeExtruderIndex,
                              );
                            const userOverridesSystem =
                              !mappedFormattedValuesEqual(
                                effUser,
                                effSystem,
                                unit,
                                activeExtruderIndex,
                              );

                            const rootText = formatBambuMappedValue(
                              effRoot,
                              unit,
                              activeExtruderIndex,
                            );
                            const systemText = formatBambuMappedValue(
                              effSystem,
                              unit,
                              activeExtruderIndex,
                            );
                            const userText = formatBambuMappedValue(
                              effUser,
                              unit,
                              activeExtruderIndex,
                            );

                            const title = propertyRowTitle(prop);

                            return (
                              <TableRow key={key} className="hover:bg-muted/30">
                                <TableCell className="whitespace-normal pl-12 text-muted-foreground">
                                  <span className="text-foreground">
                                    {title}
                                  </span>
                                  <span className="ml-2 font-mono text-[10px] opacity-50">
                                    {key}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs tabular-nums">
                                  {rootText}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "font-mono text-xs tabular-nums",
                                    systemOverridesRoot &&
                                      "bg-emerald-100 dark:bg-emerald-950/40",
                                  )}
                                >
                                  {systemText}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "font-mono text-xs tabular-nums",
                                    userOverridesSystem &&
                                      "bg-emerald-100 dark:bg-emerald-950/40",
                                  )}
                                >
                                  {userText}
                                </TableCell>
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
  );
}
