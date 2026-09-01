'use client';

import * as React from 'react';

import { Tooltip } from '@base-ui/react/tooltip';
import { Copy, Download, Pencil } from 'lucide-react';

import {
  copyProfileColumnToClipboard,
  downloadProfileColumnJson,
  isCustomLeafColumn,
} from '@/components/profile-manager/profileTreeGrid/profileTable/exportMergedProfile';
import { fileLabel } from '@/components/profile-manager/profileTreeGrid/profileTable/fileLabel';
import { toast } from '@/components/ui/toast';
import type { InheritanceChainLevel } from '@/lib/bambu/resolver';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/localization';

const ICON_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground cursor-pointer rounded p-0.5';

function ColumnActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type='button'
        onClick={onClick}
        className={ICON_BUTTON_CLASS}
        aria-label={label}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side='top' sideOffset={8} className='z-50'>
          <Tooltip.Popup
            className={cn(
              'bg-popover text-popover-foreground border-border rounded-md border px-2.5 py-1.5 text-xs shadow-md',
              'leading-snug',
            )}
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

type ProfileColumnExportActionsProps = {
  chain: readonly InheritanceChainLevel[];
  /** Inheritance column index (root = 0 … selected profile = n − 1). */
  columnIndex: number;
  onEdit?: () => void;
};

export const ProfileColumnExportActions = ({
  chain,
  columnIndex,
  onEdit,
}: ProfileColumnExportActionsProps) => {
  const t = useTranslations();
  const level = chain[columnIndex];
  const filename = level ? fileLabel(level.relativePath) : '';
  const customLeaf = isCustomLeafColumn(chain, columnIndex);

  const onCopy = React.useCallback(() => {
    void (async () => {
      try {
        await copyProfileColumnToClipboard(chain, columnIndex);
        toast.add({
          type: 'success',
          title: customLeaf
            ? t('treeGrid.customFileCopied', { filename })
            : t('treeGrid.fileCopied', { filename }),
        });
      } catch (error) {
        toast.add({
          type: 'error',
          title: t('treeGrid.copyFailed'),
          description: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, [chain, columnIndex, customLeaf, filename, t]);

  const onDownload = React.useCallback(() => {
    downloadProfileColumnJson(chain, columnIndex);
    toast.add({
      type: 'success',
      title: customLeaf
        ? t('treeGrid.customFileDownloaded', { filename })
        : t('treeGrid.fileDownloaded', { filename }),
    });
  }, [chain, columnIndex, customLeaf, filename, t]);

  return (
    <span className='inline-flex shrink-0 items-center gap-0.5'>
      {onEdit ? (
        <ColumnActionButton label={t('treeGrid.editProfile')} onClick={onEdit}>
          <Pencil className='size-4' aria-hidden />
        </ColumnActionButton>
      ) : null}
      <ColumnActionButton label={t('treeGrid.copyToClipboard')} onClick={onCopy}>
        <Copy className='size-4' aria-hidden />
      </ColumnActionButton>
      <ColumnActionButton label={t('treeGrid.downloadProfile')} onClick={onDownload}>
        <Download className='size-4' aria-hidden />
      </ColumnActionButton>
    </span>
  );
};
