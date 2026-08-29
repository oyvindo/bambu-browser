"use client";
import * as React from "react";
import {
  getInheritanceColumns,
  type ColumnRoleLabels,
} from "@/lib/bambu/chain-display";
import { useTranslations } from "@/localization/context";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { ProfileTreeGridWrapper } from "@/components/profile-manager/profileTreeGrid/ProfileTreeGridWrapper";
import { ProfileTable } from "@/components/profile-manager/profileTreeGrid/ProfileTable";
import { useMemo } from "react";

export type ProfileTreeGridProps = {
  chain: readonly InheritanceChainLevel[];
  /** Used when a JSON value is an array (e.g. dual / quad tool). Default 0. */
  activeExtruderIndex?: number;
  className?: string;
  /** When true, hide rows where the leaf profile cell is not an override vs. parent. */
  showOnlyChangedLeaf?: boolean;
  propertyFilter: string;
  onPropertyFilterChange: (value: string) => void;
  /** Renders as the first row inside the sticky table header (e.g. compare-to-filament accordion). */
  compareAccordion?: React.ReactNode;
  onEditLeaf?: () => void;
};

export function ProfileTreeGrid({
  chain,
  activeExtruderIndex = 0,
  className,
  showOnlyChangedLeaf = false,
  propertyFilter,
  onPropertyFilterChange,
  compareAccordion,
  onEditLeaf,
}: ProfileTreeGridProps) {
  const t = useTranslations();

  const isFilamentProfile = useMemo(() => {
    const last = chain[chain.length - 1];
    if (!last) return false;
    return last.relativePath.includes("/filament/");
  }, [chain]);

  const roleLabels = useMemo<ColumnRoleLabels>(
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

  return (
    <ProfileTreeGridWrapper
      className={className}
      compareAccordion={compareAccordion}
    >
      {chain.length === 0 || columns.length === 0 ? (
        <div className="text-muted-foreground border-border m-3 rounded-md border border-dashed p-8 text-center text-sm">
          {t("treeGrid.emptyHint")}
        </div>
      ) : (
        <ProfileTable
          activeExtruderIndex={activeExtruderIndex}
          chain={chain}
          hasCompareAccordion={compareAccordion !== undefined}
          propertyFilter={propertyFilter}
          onPropertyFilterChange={onPropertyFilterChange}
          showOnlyChangedLeaf={showOnlyChangedLeaf}
          onEditLeaf={onEditLeaf}
        />
      )}
    </ProfileTreeGridWrapper>
  );
}
