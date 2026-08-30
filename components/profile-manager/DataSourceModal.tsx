"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlicerSource } from "@/lib/bambu/slicer-source";
import { useTranslations } from "@/localization/context";
import { Download, Server } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

const RELEASES_URL = "https://github.com/oyvindo/bambu-browser/releases";
const REPOSITORY_URL = "https://github.com/oyvindo/bambu-browser";
const WEB_APP_URL = "https://bambu-browser.vercel.app/";

export type DataSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckApi: () => void;
  slicer: SlicerSource;
};

export function DataSourceModal({
  open,
  onOpenChange,
  onCheckApi,
  slicer,
}: DataSourceModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const isOrca = slicer === "orca";
  const macPath = isOrca
    ? "~/Library/Application Support/OrcaSlicer"
    : "~/Library/Application Support/BambuStudio";
  const windowsPath = isOrca
    ? "%APPDATA%\\OrcaSlicer"
    : "%APPDATA%\\BambuStudio";

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-300 flex items-center justify-center p-4"
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
        className="border-border bg-background relative z-1 flex max-h-[min(42rem,90vh)] w-[min(44rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border shadow-lg"
      >
        <div className="border-border shrink-0 border-b px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {t("dataSource.modalTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {t("dataSource.modalIntro")}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <section className="border-primary/30 bg-primary/8 rounded-lg border p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-foreground font-semibold">
                  {t("dataSource.desktopTitle")}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {t("dataSource.desktopBody")}
                </p>
              </div>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "shrink-0",
                )}
              >
                <Download className="size-4" aria-hidden />
                {t("dataSource.downloadDesktop")}
              </a>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-foreground text-xs font-semibold tracking-wide uppercase">
                {t("dataSource.webTitle")}
              </h3>
              <p className="text-foreground mt-2 font-medium leading-relaxed">
                {t("dataSource.webApiRequired")}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {t("dataSource.webBody")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-muted/55 rounded-md border border-dashed p-3">
                <p className="text-foreground font-medium">macOS</p>
                <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
                  {macPath}
                </p>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {t("dataSource.macPathTip")}
                </p>
              </div>
              <div className="bg-muted/55 rounded-md border border-dashed p-3">
                <p className="text-foreground font-medium">Windows</p>
                <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
                  {windowsPath}
                </p>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {t("dataSource.windowsPathTip")}
                </p>
              </div>
            </div>

            <div className="border-border rounded-md border p-3">
              <h4 className="text-foreground text-xs font-semibold">
                {t("dataSource.developerTitle")}
              </h4>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {t("dataSource.developerBody")}{" "}
                <a
                  href={WEB_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-medium underline decoration-dotted underline-offset-2"
                >
                  bambu-browser.vercel.app
                </a>
                {" · "}
                <a
                  href={REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-medium underline decoration-dotted underline-offset-2"
                >
                  github.com/oyvindo/bambu-browser
                </a>
              </p>
              <pre className="bg-muted mt-3 overflow-x-auto rounded-md p-2 font-mono text-[11px]">
                git clone https://github.com/oyvindo/bambu-browser.git{"\n"}
                cd bambu-browser{"\n"}
                npm install{"\n"}
                npm run api
              </pre>
              <p className="text-muted-foreground mt-2 text-xs">
                {t("dataSource.apiOptionalEnv")}
              </p>
              <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-2 font-mono text-[11px]">
                {isOrca
                  ? 'ORCASLICER_ROOT="/path/to/OrcaSlicer"'
                  : 'BAMBUSTUDIO_ROOT="/path/to/BambuStudio"'}{" "}
                PORT=3847 npm run api
              </pre>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {t("dataSource.runUiLocally")}
              </p>
            </div>
          </section>
        </div>

        <div className="border-border flex shrink-0 justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="secondary" onClick={onCheckApi}>
            <Server className="size-4" aria-hidden />
            {t("dataSource.checkApi")}
          </Button>
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
