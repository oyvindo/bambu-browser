"use client";

import { Tooltip } from "@base-ui/react/tooltip";
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
  isLeafInheritanceOverride,
  mergedValueAt,
  type ColumnRoleLabels,
} from "@/lib/bambu/chain-display";
import { useTranslations } from "@/localization/context";
import {
  BAMBU_FILAMENT_UI_TREE,
  BAMBU_PROCESS_UI_TREE,
  formatBambuMappedValue,
  propertyRowTitle,
} from "@/lib/bambu/mapping";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { cn } from "@/lib/utils/index";

const LazyPropertyHelpTooltip = React.lazy(async () => {
  const mod = await import("./PropertyHelpTooltip");
  return { default: mod.PropertyHelpTooltip };
});

function PropertyHelpTooltipLazy(props: {
  label: string;
  propertyKey: string;
}) {
  return (
    <React.Suspense
      fallback={
        <span className="-mt-0.5 inline-block size-5 shrink-0" aria-hidden />
      }
    >
      <LazyPropertyHelpTooltip {...props} />
    </React.Suspense>
  );
}

function fileLabel(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? relativePath;
}

export type ProfileTreeGridProps = {
  chain: readonly InheritanceChainLevel[];
  /** Used when a JSON value is an array (e.g. dual / quad tool). Default 0. */
  activeExtruderIndex?: number;
  className?: string;
  /** When true, hide rows where the leaf profile cell is not an override vs. parent. */
  showOnlyChangedLeaf?: boolean;
};

export function ProfileTreeGrid({
  chain,
  activeExtruderIndex = 0,
  className,
  showOnlyChangedLeaf = false,
}: ProfileTreeGridProps) {
  const t = useTranslations();

  const isFilamentProfile = React.useMemo(() => {
    const last = chain[chain.length - 1];
    if (!last) return false;
    return last.relativePath.includes("/filament/");
  }, [chain]);

  const roleLabels = React.useMemo<ColumnRoleLabels>(
    () => ({
      profile: isFilamentProfile
        ? t("chainColumn.profileFilament")
        : t("chainColumn.profileProcess"),
      root: t("chainColumn.root"),
      parent: t("chainColumn.parent"),
      level: (levelIndex: number) => t("chainColumn.level", { n: levelIndex }),
    }),
    [t, isFilamentProfile],
  );

  const columns = React.useMemo(
    () => getInheritanceColumns(chain, roleLabels),
    [chain, roleLabels],
  );
  const colCount = 1 + columns.length;

  const uiTree = isFilamentProfile
    ? BAMBU_FILAMENT_UI_TREE
    : BAMBU_PROCESS_UI_TREE;

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {},
  );

  const [openSubgroups, setOpenSubgroups] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    const initG: Record<string, boolean> = {};
    const initSg: Record<string, boolean> = {};
    for (const g of uiTree) {
      initG[g.id] = true;
      for (const sg of g.subgroups) initSg[sg.id] = true;
    }
    setOpenGroups(initG);
    setOpenSubgroups(initSg);
  }, [isFilamentProfile, uiTree]);

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
        {t("treeGrid.emptyHint")}
      </div>
    );
  }

  let zebraDataRow = 0;

  return (
    <Tooltip.Provider delay={400}>
      <div className={cn("w-full space-y-3", className)}>
        <div className="w-full overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="min-w-[220px] border-b-2 border-slate-200/90 bg-background py-5 align-bottom dark:border-slate-600/60">
                  <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {t("treeGrid.columnProperty")}
                  </span>
                </TableHead>
                {columns.map((col) => {
                  const name = fileLabel(col.level.relativePath);
                  return (
                    <TableHead
                      key={col.index}
                      className="min-w-[120px] max-w-[200px] border-b-2 border-slate-200/90 bg-background py-5 align-bottom dark:border-slate-600/60"
                      title={col.level.relativePath}
                    >
                      <span className="mb-1 block text-xl font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        {col.roleLabel}
                      </span>
                      <span className="block truncate font-mono text-xs font-bold tabular-nums leading-snug text-slate-900 dark:text-slate-100">
                        {name}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-0">
              {uiTree.map((group, groupIndex) => {
                const groupOpen = openGroups[group.id] !== false;
                const isLastGroup = groupIndex === uiTree.length - 1;
                const visibleSubgroups = group.subgroups
                  .map((subgroup) => {
                    const visibleProps = subgroup.properties.filter((p) => {
                      if (!showOnlyChangedLeaf) return true;
                      return isLeafInheritanceOverride(
                        chain,
                        p.key,
                        p.unit,
                        activeExtruderIndex,
                      );
                    });
                    return { subgroup, visibleProps };
                  })
                  .filter((x) => x.visibleProps.length > 0);
                if (visibleSubgroups.length === 0) return null;
                return (
                  <React.Fragment key={group.id}>
                    <TableRow className="border-0 bg-slate-100/90 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800/65">
                      <TableCell colSpan={colCount} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="flex w-full items-center gap-2 py-3 text-left text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100"
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
                      visibleSubgroups.map(({ subgroup, visibleProps }) => {
                        const subOpen = openSubgroups[subgroup.id] !== false;
                        return (
                          <React.Fragment key={subgroup.id}>
                            <TableRow className="border-0 bg-slate-50/90 hover:bg-slate-100/70 dark:bg-slate-900/35 dark:hover:bg-slate-900/50">
                              <TableCell
                                colSpan={colCount}
                                className="p-0 pl-10"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSubgroup(subgroup.id)}
                                  className="flex w-full items-center gap-2 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400"
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

                                const overridesParent = cellTexts.map(
                                  (text, i) =>
                                    i > 0 && text !== cellTexts[i - 1],
                                );

                                const isOddStripe = zebraDataRow % 2 === 1;
                                zebraDataRow += 1;
                                const rowStripe = isOddStripe
                                  ? "bg-slate-50/50 dark:bg-slate-900/15"
                                  : "bg-background";

                                return (
                                  <TableRow
                                    key={key}
                                    className={cn(
                                      "border-0 border-slate-100/60 transition-colors dark:border-slate-800/50",
                                      rowStripe,
                                      "hover:bg-slate-100/35 dark:hover:bg-slate-800/25",
                                    )}
                                  >
                                    <TableCell
                                      className={cn(
                                        "whitespace-normal border-b border-slate-100/50 py-3 pl-28 align-middle dark:border-slate-800/40",
                                        rowStripe,
                                      )}
                                    >
                                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                        <span className="text-sm font-normal text-slate-700 dark:text-slate-300">
                                          {title}
                                        </span>
                                        <PropertyHelpTooltipLazy
                                          label={title}
                                          propertyKey={key}
                                        />
                                      </div>
                                      <span
                                        className="mt-0.5 block font-mono text-[10px] text-slate-400 dark:text-slate-500"
                                        title={key}
                                      >
                                        {key}
                                      </span>
                                    </TableCell>
                                    {columns.map((col, i) => (
                                      <TableCell
                                        key={col.index}
                                        className={cn(
                                          "border-b border-slate-100/50 py-3 align-middle dark:border-slate-800/40",
                                          rowStripe,
                                        )}
                                        title={col.level.relativePath}
                                      >
                                        <span
                                          className={cn(
                                            "inline-flex min-h-[1.625rem] items-center font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100",
                                            overridesParent[i] &&
                                              "rounded-[calc(var(--radius-md)/2)] bg-emerald-100/85 px-3 py-1 text-slate-900 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-100",
                                          )}
                                        >
                                          {cellTexts[i]}
                                        </span>
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                    {!isLastGroup ? (
                      <TableRow className="h-5 border-0 bg-transparent hover:bg-transparent">
                        <TableCell
                          colSpan={colCount}
                          className="h-5 border-0 p-0"
                          aria-hidden
                        />
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
