"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { Button, buttonVariants } from "@/components/ui/button";
import { PropertyHelpTooltipLazy } from "@/components/profile-manager/profileTreeGrid/PropertyHelpTooltipLazy";
import { toast } from "@/components/ui/toast";
import {
  diffProfileLines,
  hasProfileChanges,
  pairProfileDiffLines,
  type ProfileDiffLine,
  type ProfileDiffPair,
  type ProfileDiffSide,
} from "@/lib/bambu/profile-diff";
import {
  findProfileKeyRange,
  formatProfileJson,
  hasLockedFieldFinding,
  parseProfileJson,
  profileSettingKeys,
  restoreLockedProfileFields,
  validateProfileJson,
  type ProfileValidationFinding,
  type ProfileValidationSeverity,
} from "@/lib/bambu/profile-leaf-editor";
import type { ProfileKind } from "@/lib/bambu/resolver";
import type { SlicerSource } from "@/lib/bambu/slicer-source";
import { useLocale, useTranslations } from "@/localization";
import { localizedPropertyLabel } from "@/localization/profile-fields";
import { cn } from "@/lib/utils/index";
import { Columns2, List, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

type ProfileLeafEditorProps = {
  relativePath: string;
  kind: ProfileKind;
  slicer: SlicerSource;
  original: Record<string, unknown>;
  inherited: Record<string, unknown>;
  onSave: (formattedJson: string) => Promise<void>;
  onClose: () => void;
};

const SEVERITY_LABEL_KEY: Record<ProfileValidationSeverity, string> = {
  blocker: "profileEditor.severityBlocker",
  error: "profileEditor.severityError",
  warning: "profileEditor.severityWarning",
};

const SEVERITY_TEXT: Record<ProfileValidationSeverity, string> = {
  blocker: "text-destructive",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

type Translate = (
  path: string,
  vars?: Record<string, string | number>,
) => string;

function Finding({
  finding,
  kind,
  slicer,
  ordinal,
  t,
}: {
  finding: ProfileValidationFinding;
  kind: ProfileKind;
  slicer: SlicerSource;
  ordinal?: number;
  t: Translate;
}) {
  const { locale } = useLocale();
  return (
    <>
      <div>
        {ordinal === undefined ? null : (
          <span className="text-muted-foreground tabular-nums">
            {ordinal}.{" "}
          </span>
        )}
        <span className={cn("font-medium", SEVERITY_TEXT[finding.severity])}>
          {t(SEVERITY_LABEL_KEY[finding.severity])}
        </span>
      </div>
      {finding.key ? (
        <div className="flex items-center gap-1 pl-4">
          <PropertyHelpTooltipLazy
            label={localizedPropertyLabel(finding.key, finding.key, locale)}
            propertyKey={finding.key}
            profileKind={kind}
            slicer={slicer}
          />
          <span className="font-mono">{finding.key}:</span>
        </div>
      ) : null}
      <div className="pl-4">{finding.message}</div>
    </>
  );
}

/** A single finding reads better as a sentence; several need numbers and rules. */
function FindingsList({
  findings,
  kind,
  slicer,
  t,
}: {
  findings: ProfileValidationFinding[];
  kind: ProfileKind;
  slicer: SlicerSource;
  t: Translate;
}) {
  return (
    <Tooltip.Provider delay={200}>
      {findings.length === 1 ? (
        <Finding finding={findings[0]!} kind={kind} slicer={slicer} t={t} />
      ) : (
        <ol className="divide-border divide-y">
          {findings.map((finding, index) => (
            <li
              key={`${finding.severity}-${finding.key ?? ""}-${index}`}
              className="py-1.5 first:pt-0 last:pb-0"
            >
              <Finding
                finding={finding}
                kind={kind}
                slicer={slicer}
                ordinal={index + 1}
                t={t}
              />
            </li>
          ))}
        </ol>
      )}
    </Tooltip.Provider>
  );
}

/** Shared by the textarea and its highlight mirror so the two stay aligned. */
const EDITOR_TEXT_CLASS =
  "w-full p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap";

/** Context kept above/below a highlighted key when it is scrolled into view. */
const HIGHLIGHT_SCROLL_MARGIN = 32;

/** Grace period for moving the pointer off the tag list after clicking a tag. */
const TAG_HOVER_PAUSE_MS = 1500;

type DiffLayout = "inline" | "side-by-side";

function changeTone(kind: ProfileDiffSide["kind"]): string {
  if (kind === "added") return "bg-emerald-500/15";
  if (kind === "removed") return "bg-rose-500/15";
  if (kind === "empty") return "bg-muted/40";
  return "";
}

function DiffLine({
  kind,
  text,
  marker,
}: {
  kind: ProfileDiffSide["kind"];
  text: string;
  marker: string;
}) {
  return (
    <div
      data-change={kind}
      className={cn("flex gap-3 rounded-xs", changeTone(kind))}
    >
      <span
        aria-hidden
        className="text-muted-foreground w-3 shrink-0 select-none"
      >
        {marker}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 whitespace-pre",
          kind === "removed" && "text-muted-foreground line-through",
          kind === "empty" && "text-transparent",
        )}
      >
        {text || "\u00a0"}
      </span>
    </div>
  );
}

function InlineDiff({ lines }: { lines: ProfileDiffLine[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <DiffLine
          key={index}
          kind={line.kind}
          text={line.text}
          marker={
            line.kind === "added" ? "+" : line.kind === "removed" ? "-" : ""
          }
        />
      ))}
    </>
  );
}

function SideBySideDiff({ pairs }: { pairs: ProfileDiffPair[] }) {
  return (
    <div className="grid min-w-0 grid-cols-2">
      <div className="border-border min-w-0 border-r pr-2">
        {pairs.map((pair, index) => (
          <DiffLine
            key={`left-${index}`}
            kind={pair.left.kind}
            text={pair.left.text}
            marker={pair.left.kind === "removed" ? "-" : ""}
          />
        ))}
      </div>
      <div className="min-w-0 pl-2">
        {pairs.map((pair, index) => (
          <DiffLine
            key={`right-${index}`}
            kind={pair.right.kind}
            text={pair.right.text}
            marker={pair.right.kind === "added" ? "+" : ""}
          />
        ))}
      </div>
    </div>
  );
}

function DiffView({
  lines,
  emptyLabel,
  layout,
  onLayoutChange,
  layoutLabel,
  inlineLabel,
  sideBySideLabel,
}: {
  lines: ProfileDiffLine[];
  emptyLabel: string;
  layout: DiffLayout;
  onLayoutChange: (layout: DiffLayout) => void;
  layoutLabel: string;
  inlineLabel: string;
  sideBySideLabel: string;
}) {
  const pairs = React.useMemo(() => pairProfileDiffLines(lines), [lines]);
  const changed = hasProfileChanges(lines);
  return (
    <div className="bg-muted/20 relative min-h-0 flex-1">
      <div
        className="border-border bg-background/90 absolute top-2 right-2 z-1 flex rounded-lg border p-0.5 shadow-xs backdrop-blur-sm"
        role="group"
        aria-label={layoutLabel}
      >
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-pressed={layout === "inline"}
          aria-label={inlineLabel}
          className={cn(layout === "inline" && "bg-muted")}
          onClick={() => onLayoutChange("inline")}
        >
          <List aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-pressed={layout === "side-by-side"}
          aria-label={sideBySideLabel}
          className={cn(layout === "side-by-side" && "bg-muted")}
          onClick={() => onLayoutChange("side-by-side")}
        >
          <Columns2 aria-hidden />
        </Button>
      </div>
      {changed ? (
        <div className="h-full overflow-auto p-4 pt-11 font-mono text-xs leading-relaxed">
          {layout === "side-by-side" ? (
            <SideBySideDiff pairs={pairs} />
          ) : (
            <InlineDiff lines={lines} />
          )}
        </div>
      ) : (
        <div className="text-muted-foreground h-full overflow-auto p-4 pt-11 text-sm">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export function ProfileLeafEditor({
  relativePath,
  kind,
  slicer,
  original,
  inherited,
  onSave,
  onClose,
}: ProfileLeafEditorProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const initial = React.useMemo(() => formatProfileJson(original), [original]);
  const [baseline, setBaseline] = React.useState(initial);
  const [draft, setDraft] = React.useState(initial);
  const draftRef = React.useRef(draft);
  React.useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const [validatedDraft, setValidatedDraft] = React.useState<string | null>(
    null,
  );
  const [validationCanSave, setValidationCanSave] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const [showingChanges, setShowingChanges] = React.useState(false);
  const [diffLayout, setDiffLayout] = React.useState<DiffLayout>("inline");
  const [maximized, setMaximized] = React.useState(false);
  const [appHeaderBottom, setAppHeaderBottom] = React.useState(0);
  const titleId = React.useId();
  const dirty = draft !== baseline;
  const diffLines = React.useMemo(
    () => (showingChanges ? diffProfileLines(baseline, draft) : []),
    [baseline, draft, showingChanges],
  );
  const changedFieldKeys = React.useMemo(() => {
    try {
      return profileSettingKeys(parseProfileJson(draft));
    } catch {
      return profileSettingKeys(original);
    }
  }, [draft, original]);
  const [highlightedKey, setHighlightedKey] = React.useState<string | null>(
    null,
  );
  const highlightRange = React.useMemo(
    () => (highlightedKey ? findProfileKeyRange(draft, highlightedKey) : null),
    [draft, highlightedKey],
  );
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);
  const markRef = React.useRef<HTMLElement>(null);

  // A textarea cannot scroll to an arbitrary offset on its own, so the mirror
  // layer's <mark> is measured instead and both boxes are scrolled together.
  React.useEffect(() => {
    if (!highlightRange) return;
    const textarea = textareaRef.current;
    const layer = highlightRef.current;
    const mark = markRef.current;
    if (!textarea || !layer || !mark) return;
    const rects = mark.getClientRects();
    if (rects.length === 0) return;
    const layerTop = layer.getBoundingClientRect().top;
    const top = rects[0].top - layerTop + layer.scrollTop;
    const bottom = rects[rects.length - 1].bottom - layerTop + layer.scrollTop;
    const view = textarea.clientHeight;
    const margin = HIGHLIGHT_SCROLL_MARGIN;
    const current = textarea.scrollTop;
    let next = current;
    if (top - margin < current || bottom - top > view) {
      next = top - margin;
    } else if (bottom + margin > current + view) {
      next = bottom + margin - view;
    }
    next = Math.max(0, Math.min(next, textarea.scrollHeight - view));
    if (next === current) return;
    textarea.scrollTop = next;
    layer.scrollTop = next;
  }, [highlightRange]);

  // After a click the selection is what matters, so hovering the other tags on
  // the way out of the list must not steal the highlight.
  const hoverPausedRef = React.useRef(false);
  const hoverPauseTimerRef = React.useRef<number | null>(null);
  const hoverPaused = () => hoverPausedRef.current;
  const resumeTagHover = () => {
    hoverPausedRef.current = false;
    if (hoverPauseTimerRef.current === null) return;
    window.clearTimeout(hoverPauseTimerRef.current);
    hoverPauseTimerRef.current = null;
  };
  React.useEffect(() => resumeTagHover, []);

  const revealKey = (key: string) => {
    hoverPausedRef.current = true;
    if (hoverPauseTimerRef.current !== null) {
      window.clearTimeout(hoverPauseTimerRef.current);
    }
    hoverPauseTimerRef.current = window.setTimeout(
      resumeTagHover,
      TAG_HOVER_PAUSE_MS,
    );
    setHighlightedKey(key);
    const range = findProfileKeyRange(draft, key);
    const textarea = textareaRef.current;
    if (!range || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(range.start, range.end);
  };

  const requestClose = React.useCallback(() => {
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }, [dirty, onClose]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmingDiscard) setConfirmingDiscard(false);
      else requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmingDiscard, requestClose]);

  // Maximized means "everything below the app header", which is a wrapping
  // element with no fixed height, so its bottom edge has to be measured.
  React.useEffect(() => {
    if (!maximized) return;
    const appHeader = document.querySelector<HTMLElement>("[data-app-header]");
    if (!appHeader) return;
    const measure = () =>
      setAppHeaderBottom(appHeader.getBoundingClientRect().bottom);
    const observer = new ResizeObserver(measure);
    observer.observe(appHeader);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [maximized]);

  React.useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const setMaximizedState = (next: boolean) => {
    if (next) {
      const appHeader =
        document.querySelector<HTMLElement>("[data-app-header]");
      setAppHeaderBottom(appHeader?.getBoundingClientRect().bottom ?? 0);
    }
    setMaximized(next);
  };

  const toggleMaximized = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    setMaximizedState(!maximized);
  };

  const updateDraft = (next: string) => {
    setDraft(next);
    setValidatedDraft(null);
    setValidationCanSave(false);
  };

  const revertLockedFields = (toastId: string | undefined) => {
    try {
      const source = textareaRef.current?.value ?? draftRef.current;
      updateDraft(
        formatProfileJson(
          restoreLockedProfileFields(parseProfileJson(source), original),
        ),
      );
    } catch (error) {
      // Keep the validation toast open so the action stays reachable on retry.
      toast.add({
        type: "error",
        title: t("profileEditor.revertLockedFailed"),
        description: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    if (toastId !== undefined) toast.close(toastId);
  };

  const handleFormat = () => {
    try {
      updateDraft(formatProfileJson(parseProfileJson(draft)));
    } catch (error) {
      toast.add({
        type: "error",
        title: t("profileEditor.formatFailed"),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleValidate = () => {
    const result = validateProfileJson(draft, {
      kind,
      slicer,
      original,
      inherited,
    });
    setValidatedDraft(draft);
    setValidationCanSave(result.canSave);
    const description =
      result.findings.length > 0 ? (
        <FindingsList
          findings={result.findings}
          kind={kind}
          slicer={slicer}
          t={t}
        />
      ) : (
        t("profileEditor.noValidationFindings")
      );
    const toastId: string = toast.add({
      type: result.canSave
        ? result.findings.length > 0
          ? "warning"
          : "success"
        : "error",
      title: result.canSave
        ? result.findings.length > 0
          ? t("profileEditor.validationWarnings", {
              count: result.findings.length,
            })
          : t("profileEditor.validationPassed")
        : t("profileEditor.validationFailed"),
      description,
      ...(hasLockedFieldFinding(result.findings)
        ? {
            timeout: 0,
            actionProps: {
              children: t("profileEditor.revertLockedFields"),
              onClick: () => revertLockedFields(toastId),
            },
          }
        : {}),
    });
  };

  const handleSave = async () => {
    if (validatedDraft !== draft || !validationCanSave) return;
    setSaving(true);
    try {
      const formatted = formatProfileJson(parseProfileJson(draft));
      await onSave(formatted);
      setDraft(formatted);
      setBaseline(formatted);
      setValidatedDraft(formatted);
      setValidationCanSave(true);
      toast.add({
        type: "success",
        title: t("profileEditor.saved"),
        description: t("profileEditor.savedDescription"),
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: t("profileEditor.saveFailed"),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-300 flex items-center justify-center",
        maximized ? "p-0" : "p-4",
      )}
      style={maximized ? { top: appHeaderBottom } : undefined}
      role="presentation"
    >
      {/* Inert on purpose: only Escape and the footer buttons close the editor. */}
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "border-border bg-background relative z-1 flex flex-col overflow-hidden border shadow-2xl",
          maximized
            ? "h-full w-full rounded-none border-x-0 border-b-0"
            : "h-[min(52rem,92vh)] w-[min(64rem,calc(100vw-2rem))] rounded-lg",
        )}
      >
        <header
          className="border-border flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3 select-none"
          onDoubleClick={toggleMaximized}
        >
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {t("profileEditor.title")}
            </h2>
            <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
              {relativePath}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("profileEditor.intro")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip.Provider delay={200}>
              <Tooltip.Root>
                <Tooltip.Trigger
                  type="button"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon-sm",
                  })}
                  onClick={() => setMaximizedState(!maximized)}
                  aria-label={
                    maximized
                      ? t("profileEditor.minimize")
                      : t("profileEditor.maximize")
                  }
                >
                  {maximized ? (
                    <Minimize2 aria-hidden />
                  ) : (
                    <Maximize2 aria-hidden />
                  )}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner
                    side="bottom"
                    sideOffset={8}
                    className="z-500"
                  >
                    <Tooltip.Popup
                      className={cn(
                        "bg-popover text-popover-foreground border-border rounded-md border px-2.5 py-1.5 text-xs shadow-md",
                        "leading-snug",
                      )}
                    >
                      {maximized
                        ? t("profileEditor.minimize")
                        : t("profileEditor.maximize")}
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={requestClose}
              aria-label={t("profileEditor.cancel")}
            >
              <X aria-hidden />
            </Button>
          </div>
        </header>

        {changedFieldKeys.length > 0 ? (
          <section
            className="border-border bg-muted/40 flex shrink-0 flex-wrap gap-2 border-b px-4 py-3"
            aria-label={t("profileEditor.changedFields")}
            onMouseLeave={resumeTagHover}
          >
            {changedFieldKeys.map((key) => (
              <button
                key={key}
                type="button"
                title={key}
                className={cn(
                  "bg-secondary text-secondary-foreground rounded-md px-2.5 py-1 text-xs font-medium",
                  "focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
                  highlightedKey === key && "ring-ring ring-2",
                )}
                onMouseEnter={() => {
                  if (hoverPaused()) return;
                  setHighlightedKey(key);
                }}
                onMouseLeave={() => {
                  if (hoverPaused()) return;
                  setHighlightedKey((current) =>
                    current === key ? null : current,
                  );
                }}
                onFocus={() => setHighlightedKey(key)}
                onBlur={() => {
                  // Clicking moves focus to the textarea; keep the tint there.
                  if (hoverPaused()) return;
                  setHighlightedKey((current) =>
                    current === key ? null : current,
                  );
                }}
                onClick={() => revealKey(key)}
              >
                {localizedPropertyLabel(key, key, locale)}
              </button>
            ))}
          </section>
        ) : null}

        {showingChanges ? (
          <DiffView
            lines={diffLines}
            emptyLabel={t("profileEditor.noChanges")}
            layout={diffLayout}
            onLayoutChange={setDiffLayout}
            layoutLabel={t("profileEditor.diffLayout")}
            inlineLabel={t("profileEditor.diffInline")}
            sideBySideLabel={t("profileEditor.diffSideBySide")}
          />
        ) : (
          <div className="bg-muted/20 relative min-h-0 flex-1">
            {/* Mirrors the textarea so a hovered tag can tint its lines. */}
            <div
              ref={highlightRef}
              aria-hidden
              className={cn(
                EDITOR_TEXT_CLASS,
                "pointer-events-none absolute inset-0 overflow-hidden text-transparent",
              )}
            >
              {highlightRange ? (
                <>
                  {draft.slice(0, highlightRange.start)}
                  <mark
                    ref={markRef}
                    className="bg-primary/25 rounded-xs text-transparent"
                  >
                    {draft.slice(highlightRange.start, highlightRange.end)}
                  </mark>
                  {draft.slice(highlightRange.end)}
                </>
              ) : (
                draft
              )}
              {"\n"}
            </div>
            <textarea
              ref={textareaRef}
              className={cn(
                EDITOR_TEXT_CLASS,
                "focus-visible:ring-ring absolute inset-0 resize-none overflow-auto bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset",
              )}
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onScroll={(event) => {
                const layer = highlightRef.current;
                if (!layer) return;
                layer.scrollTop = event.currentTarget.scrollTop;
                layer.scrollLeft = event.currentTarget.scrollLeft;
              }}
              spellCheck={false}
              aria-label={t("profileEditor.title")}
              autoFocus
            />
          </div>
        )}

        <footer className="border-border flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={showingChanges}
              onClick={() => setShowingChanges((current) => !current)}
            >
              {showingChanges
                ? t("profileEditor.backToEditing")
                : t("profileEditor.showChanges")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleFormat}
              disabled={showingChanges}
            >
              {t("profileEditor.format")}
            </Button>
            <Button type="button" variant="outline" onClick={handleValidate}>
              {t("profileEditor.validate")}
            </Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                saving || validatedDraft !== draft || !validationCanSave
              }
            >
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("profileEditor.save")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!dirty || saving}
              onClick={() => {
                updateDraft(baseline);
                setConfirmingDiscard(false);
                setShowingChanges(false);
              }}
            >
              {t("profileEditor.discard")}
            </Button>
            <Button type="button" variant="outline" onClick={requestClose}>
              {t("profileEditor.cancel")}
            </Button>
          </div>
        </footer>
      </div>

      {confirmingDiscard ? (
        <div
          className="absolute inset-0 z-2 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${titleId}-discard`}
        >
          <div className="border-border bg-background w-full max-w-md rounded-lg border p-4 shadow-2xl">
            <h3 id={`${titleId}-discard`} className="font-semibold">
              {t("profileEditor.confirmDiscard")}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("profileEditor.confirmDiscardBody")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDiscard(false)}
              >
                {t("profileEditor.keepEditing")}
              </Button>
              <Button type="button" variant="destructive" onClick={onClose}>
                {t("profileEditor.discard")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
