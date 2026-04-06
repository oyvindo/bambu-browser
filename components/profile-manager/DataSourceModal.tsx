"use client";

import { Button } from "@/components/ui/button";
import { getBambuStudioPathHints } from "@/lib/bambu/bambu-studio-path-hints";
import { getBambuApiBaseUrl } from "@/lib/bambu/bambu-api-client";
import { useTranslations } from "@/localization/context";
import { FolderOpen, Loader2, Server } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

/** Where users get server.js and run npm run api (clone or ZIP). */
const BAMBU_BROWSER_REPO_MAIN =
  "https://github.com/oyvindo/bambu-browser/tree/main";

export type DataSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fsSupported: boolean;
  pickingFolder: boolean;
  onChooseBrowserFolder: () => void;
  onSwitchToApi: () => void;
};

export function DataSourceModal({
  open,
  onOpenChange,
  fsSupported,
  pickingFolder,
  onChooseBrowserFolder,
  onSwitchToApi,
}: DataSourceModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const [hints] = useState(() => getBambuStudioPathHints());
  const apiBase = getBambuApiBaseUrl();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={t("dataSource.close")}
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="border-border bg-background relative z-[1] flex max-h-[min(32rem,85vh)] w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border shadow-lg"
      >
        <div className="border-border shrink-0 border-b px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {t("dataSource.modalTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            {t("dataSource.modalIntro")}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
          <section className="space-y-2">
            <h3 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              {t("dataSource.browserSectionTitle")}
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("dataSource.browserSectionBody")}
            </p>
            <div className="bg-muted/60 rounded-md border border-dashed px-3 py-2 text-xs">
              <p className="text-foreground font-medium">
                {hints.platformLabel}
              </p>
              <p className="text-muted-foreground mt-1 font-mono break-all">
                {hints.typicalPath}
              </p>
              <p className="text-muted-foreground mt-1">{hints.tip}</p>
            </div>
            {hints.platformLabel === "macOS" ? (
              <p className="border-amber-500/40 bg-amber-500/10 text-foreground rounded-md border px-3 py-2 text-xs leading-relaxed">
                {t("dataSource.browserMacLibraryWarning")}
              </p>
            ) : null}
            {!fsSupported ? (
              <p className="text-destructive text-xs">
                {t("dataSource.fsNotSupported")}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => onChooseBrowserFolder()}
              disabled={!fsSupported || pickingFolder}
            >
              {pickingFolder ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderOpen className="size-4" />
              )}
              {pickingFolder
                ? t("dataSource.pickingFolder")
                : t("dataSource.chooseFolder")}
            </Button>
          </section>

          <div className="border-border my-4 border-t" />

          <section className="space-y-2">
            <h3 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              {t("dataSource.apiSectionTitle")}
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("dataSource.apiSectionBody")}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <a
                href={BAMBU_BROWSER_REPO_MAIN}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                github.com/oyvindo/bambu-browser
              </a>
              {" — "}
              {t("dataSource.apiRepoCloneHint")}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("dataSource.apiReadmeHint")}
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-2 font-mono text-[11px]">
              cd bambu-browser{"\n"}
              npm install{"\n"}
              npm run api
            </pre>
            <p className="text-muted-foreground text-xs">
              {t("dataSource.apiOptionalEnv")}
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-2 font-mono text-[11px]">
              BAMBUSTUDIO_ROOT=&quot;/path/to/BambuStudio&quot; PORT=3847 npm
              run api
            </pre>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("dataSource.apiUrlLabel")}{" "}
              <code className="text-foreground">{apiBase}</code>
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-2 w-full sm:w-auto"
              onClick={() => onSwitchToApi()}
            >
              <Server className="size-4" />
              {t("dataSource.useLocalApi")}
            </Button>
          </section>
        </div>

        <div className="border-border flex shrink-0 justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("dataSource.close")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
