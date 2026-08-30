import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { STICKY_HEADER_SURFACE } from "@/components/profile-manager/profileTreeGrid/profileTreeGrid.constants";
import {
  BAMBU_FILAMENT_UI_TREE,
  BAMBU_PROCESS_UI_TREE,
  type BambuMappedGroup,
  buildCompleteUiTree,
  buildOrcaUiTree,
  type ColumnRoleLabels,
  formatBambuMappedValue,
  getInheritanceColumns,
  type InheritanceChainLevel,
  type SlicerSource,
  isLeafInheritanceOverride,
  mergedValueAt,
  propertyRowTitle,
} from "@/lib/bambu";
import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PropertyHelpTooltipLazy } from "@/components/profile-manager/profileTreeGrid/PropertyHelpTooltipLazy";
import { useLocale, useTranslations } from "@/localization";
import {
  localizedGroupLabel,
  localizedPropertyLabel,
  localizedSubgroupLabel,
} from "@/localization/profile-fields";
import { fileLabel } from "@/components/profile-manager/profileTreeGrid/profileTable/fileLabel";
import { ProfileColumnExportActions } from "@/components/profile-manager/profileTreeGrid/profileTable/ProfileColumnExportActions";
import { ProfilePathTooltip } from "@/components/profile-manager/profileTreeGrid/profileTable/ProfilePathTooltip";

type UiTree = readonly BambuMappedGroup[];

/** Long values (g-code, notes) are truncated, so keep the full text in a tooltip. */
const VALUE_TITLE_MIN_LENGTH = 24;

type CollapsedState = {
  tree: UiTree;
  groups: Record<string, boolean>;
  subgroups: Record<string, boolean>;
};

/** Collapsing applies to the tree it happened in; another tree starts expanded. */
function collapsedForTree(state: CollapsedState, tree: UiTree): CollapsedState {
  return state.tree === tree ? state : { tree, groups: {}, subgroups: {} };
}

type ProfileTableProps = {
  activeExtruderIndex?: number;
  chain: readonly InheritanceChainLevel[];
  hasCompareAccordion: boolean;
  propertyFilter?: string;
  onPropertyFilterChange?: (value: string) => void;
  showOnlyChangedLeaf?: boolean;
  onEditLeaf?: () => void;
  slicer?: SlicerSource;
};

export const ProfileTable = ({
  activeExtruderIndex = 0,
  chain,
  hasCompareAccordion,
  propertyFilter = "",
  onPropertyFilterChange = () => {},
  showOnlyChangedLeaf = false,
  onEditLeaf,
  slicer = "bambu",
}: ProfileTableProps) => {
  const t = useTranslations();
  const { locale } = useLocale();

  const propertySearchTrim = propertyFilter.trim().toLowerCase();
  const propertySearchActive = propertySearchTrim.length > 0;

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

  const profileKind = isFilamentProfile ? "filament" : "process";
  const uiTree = React.useMemo(
    () =>
      slicer === "orca"
        ? buildOrcaUiTree(profileKind, chain)
        : buildCompleteUiTree(
            profileKind,
            chain,
            isFilamentProfile ? BAMBU_FILAMENT_UI_TREE : BAMBU_PROCESS_UI_TREE,
            slicer,
          ),
    [chain, isFilamentProfile, profileKind, slicer],
  );

  // Everything starts expanded, so only the collapsed ones are tracked. The
  // tree is part of the state so switching profile kind expands everything again.
  const [collapsed, setCollapsed] = React.useState<CollapsedState>(() => ({
    tree: uiTree,
    groups: {},
    subgroups: {},
  }));

  const collapsedInTree = collapsedForTree(collapsed, uiTree);

  const toggleGroup = React.useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const base = collapsedForTree(prev, uiTree);
        return { ...base, groups: { ...base.groups, [id]: !base.groups[id] } };
      });
    },
    [uiTree],
  );

  const toggleSubgroup = React.useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const base = collapsedForTree(prev, uiTree);
        return {
          ...base,
          subgroups: { ...base.subgroups, [id]: !base.subgroups[id] },
        };
      });
    },
    [uiTree],
  );

  let zebraDataRow = 0;

  return (
    <table className="w-full min-w-max caption-bottom border-separate border-spacing-0 text-sm">
      <TableHeader
        className={cn(
          "sticky top-0 z-30 isolate [&_tr]:border-0",
          STICKY_HEADER_SURFACE,
        )}
      >
        <TableRow className="border-0 bg-background hover:bg-transparent">
          <TableHead
            className={cn(
              "min-w-0 border-b border-slate-100/50 bg-background p-4 align-bottom dark:border-slate-800/40",
              hasCompareAccordion ? "" : "rounded-tl-lg",
            )}
          >
            <div className="flex w-full min-w-0 items-end justify-between gap-4">
              <span className="shrink-0 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("treeGrid.columnProperty")}
              </span>
              <div className="flex min-w-0 shrink flex-col items-start gap-1.5">
                <span className="text-muted-foreground block text-xs font-medium">
                  {t("treeGrid.filterLabel")}
                </span>
                <input
                  type="search"
                  value={propertyFilter}
                  onChange={(e) => onPropertyFilterChange(e.target.value)}
                  placeholder={t("treeGrid.propertySearchPlaceholder")}
                  className="border-input bg-background placeholder:text-muted-foreground h-8 w-full min-w-40 max-w-56 rounded-md border px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={t("treeGrid.propertySearchPlaceholder")}
                />
              </div>
            </div>
          </TableHead>
          {columns.map((col, colIdx) => {
            const name = fileLabel(col.level.relativePath);
            const isLastHead = colIdx === columns.length - 1;
            return (
              <TableHead
                key={col.index}
                className={cn(
                  "min-w-30 max-w-50 border-b border-slate-100/50 bg-background py-5 align-bottom dark:border-slate-800/40",
                  isLastHead && "rounded-tr-lg",
                )}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <ProfileColumnExportActions
                    chain={chain}
                    columnIndex={col.index}
                    onEdit={
                      colIdx === columns.length - 1 &&
                      onEditLeaf &&
                      (col.level.relativePath.startsWith("user/") ||
                        col.level.relativePath.startsWith("users/")) &&
                      String(col.level.data.from).toLowerCase() !== "system"
                        ? onEditLeaf
                        : undefined
                    }
                  />
                  <span className="text-xl font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    {col.roleLabel}
                  </span>
                </div>
                <ProfilePathTooltip
                  filename={name}
                  relativePath={col.level.relativePath}
                />
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr]:border-0">
        {uiTree.map((group, groupIndex) => {
          const groupLabel = localizedGroupLabel(group.id, group.label, locale);
          const groupOpen = propertySearchActive
            ? true
            : !collapsedInTree.groups[group.id];
          const isLastGroup = groupIndex === uiTree.length - 1;
          const visibleSubgroups = group.subgroups
            .map((subgroup) => {
              const visibleProps = subgroup.properties.filter((p) => {
                const label = localizedPropertyLabel(p.key, p.label, locale);
                const searchable = [
                  propertyRowTitle({ ...p, label }),
                  p.key,
                  groupLabel,
                  localizedSubgroupLabel(subgroup.id, subgroup.label, locale),
                ]
                  .join(" ")
                  .toLowerCase();
                if (
                  propertySearchTrim &&
                  !searchable.includes(propertySearchTrim)
                ) {
                  return false;
                }
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
              <TableRow className="border-0 bg-transparent hover:bg-transparent dark:hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  <div className="mx-2 rounded-md bg-slate-100/90 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800/65">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex w-full items-center gap-2 px-2 py-3 text-left text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100"
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
                      {groupLabel}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
              {groupOpen &&
                visibleSubgroups.map(({ subgroup, visibleProps }) => {
                  const subgroupLabel = localizedSubgroupLabel(
                    subgroup.id,
                    subgroup.label,
                    locale,
                  );
                  const subOpen = propertySearchActive
                    ? true
                    : !collapsedInTree.subgroups[subgroup.id];
                  return (
                    <React.Fragment key={subgroup.id}>
                      <TableRow className="border-0 bg-transparent hover:bg-transparent dark:hover:bg-transparent">
                        <TableCell colSpan={colCount} className="p-0">
                          <div className="mx-2 rounded-md bg-slate-50/90 hover:bg-slate-100/70 dark:bg-slate-900/35 dark:hover:bg-slate-900/50">
                            <button
                              type="button"
                              onClick={() => toggleSubgroup(subgroup.id)}
                              className="flex w-full items-center gap-2 py-2.5 pl-10 pr-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400"
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
                              {subgroupLabel}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {subOpen &&
                        visibleProps.map((prop) => {
                          const key = prop.key;
                          const unit = prop.unit;
                          const propertyLabel = localizedPropertyLabel(
                            key,
                            prop.label,
                            locale,
                          );
                          const title = propertyRowTitle({
                            ...prop,
                            label: propertyLabel,
                          });

                          const effectiveValues = columns.map((col) =>
                            mergedValueAt(chain, col.index, key),
                          );

                          const cellTexts = effectiveValues.map((v) =>
                            formatBambuMappedValue(
                              v,
                              unit,
                              activeExtruderIndex,
                              locale,
                            ),
                          );

                          const overridesParent = cellTexts.map(
                            (text, i) => i > 0 && text !== cellTexts[i - 1],
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
                                  "w-px max-w-fit whitespace-nowrap border-b border-slate-100/50 py-3 pl-28 align-middle dark:border-slate-800/40",
                                  rowStripe,
                                )}
                              >
                                <div className="flex max-w-max flex-nowrap items-baseline gap-x-1.5">
                                  <span className="text-sm font-normal whitespace-nowrap text-slate-700 dark:text-slate-300">
                                    {title}
                                  </span>
                                  <PropertyHelpTooltipLazy
                                    label={title}
                                    propertyKey={key}
                                    profileKind={profileKind}
                                    slicer={slicer}
                                  />
                                </div>
                                <span
                                  className="mt-0.5 block max-w-max font-mono text-[10px] whitespace-nowrap text-slate-400 dark:text-slate-500"
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
                                      "inline-flex min-h-6.5 max-w-full items-center font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100",
                                      overridesParent[i] &&
                                        "rounded-[calc(var(--radius-md)/2)] bg-emerald-100/85 px-3 py-1 text-slate-900 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-100",
                                    )}
                                  >
                                    <span
                                      className="block max-w-50 truncate"
                                      title={
                                        cellTexts[i].length >
                                        VALUE_TITLE_MIN_LENGTH
                                          ? cellTexts[i]
                                          : undefined
                                      }
                                    >
                                      {cellTexts[i]}
                                    </span>
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
    </table>
  );
};
