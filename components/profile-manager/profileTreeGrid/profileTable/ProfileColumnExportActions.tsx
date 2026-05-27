"use client";

import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { useTranslations } from "@/localization";
import { Copy, Download } from "lucide-react";
import * as React from "react";
import {
  copyMergedProfileToClipboard,
  downloadMergedProfileJson,
} from "@/components/profile-manager/profileTreeGrid/profileTable/exportMergedProfile";

type ProfileColumnExportActionsProps = {
  chain: readonly InheritanceChainLevel[];
};

export const ProfileColumnExportActions = ({
  chain,
}: ProfileColumnExportActionsProps) => {
  const t = useTranslations();

  const onCopy = React.useCallback(() => {
    void copyMergedProfileToClipboard(chain);
  }, [chain]);

  const onDownload = React.useCallback(() => {
    downloadMergedProfileJson(chain);
  }, [chain]);

  const iconClass =
    "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200";

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onCopy}
        className={`cursor-pointer rounded p-0.5 ${iconClass}`}
        title={t("treeGrid.copyToClipboard")}
        aria-label={t("treeGrid.copyToClipboard")}
      >
        <Copy className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDownload}
        className={`cursor-pointer rounded p-0.5 ${iconClass}`}
        title={t("treeGrid.downloadProfile")}
        aria-label={t("treeGrid.downloadProfile")}
      >
        <Download className="size-4" aria-hidden />
      </button>
    </span>
  );
};
