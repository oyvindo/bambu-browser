'use client';
import * as React from 'react';
import { useMemo } from 'react';

import { ProfileTable } from '@/components/profile-manager/profileTreeGrid/ProfileTable';
import { ProfileTreeGridWrapper } from '@/components/profile-manager/profileTreeGrid/ProfileTreeGridWrapper';
import {
  getInheritanceColumns,
  profileKindForChain,
  type ColumnRoleLabels,
} from '@/lib/bambu/chain-display';
import type { InheritanceChainLevel } from '@/lib/bambu/resolver';
import type { SlicerSource } from '@/lib/bambu/slicer-source';
import { useTranslations } from '@/localization/context';

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
  slicer?: SlicerSource;
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
  slicer = 'bambu',
}: ProfileTreeGridProps) {
  const t = useTranslations();

  const isFilamentProfile = useMemo(
    () => profileKindForChain(chain, slicer) === 'filament',
    [chain, slicer],
  );

  const roleLabels = useMemo<ColumnRoleLabels>(
    () => ({
      profile: isFilamentProfile
        ? t('chainColumn.profileFilament')
        : slicer === 'prusa'
          ? t('chainColumn.profilePrint')
          : t('chainColumn.profileProcess'),
      root: t('chainColumn.root'),
      parent: t('chainColumn.parent'),
      level: (levelIndex: number) => t('chainColumn.level', { n: levelIndex }),
    }),
    [t, isFilamentProfile, slicer],
  );

  const columns = React.useMemo(
    () => getInheritanceColumns(chain, roleLabels),
    [chain, roleLabels],
  );

  return (
    <ProfileTreeGridWrapper className={className} compareAccordion={compareAccordion}>
      {chain.length === 0 || columns.length === 0 ? (
        <div className='text-muted-foreground border-border m-3 rounded-md border border-dashed p-8 text-center text-sm'>
          {t('treeGrid.emptyHint')}
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
          slicer={slicer}
        />
      )}
    </ProfileTreeGridWrapper>
  );
}
