"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  fetchApiAccounts,
  fetchApiHealth,
  fetchApiMeta,
  fetchApiProfilesForAccount,
  fetchApiProfileFile,
  fetchApiResolve,
  fetchApiSystemFilaments,
  getBambuApiBaseUrl,
  replaceApiProfileFile,
  type SystemFilamentEntry,
} from "@/lib/bambu/bambu-api-client";
import { buildMergedProfileData } from "@/lib/bambu/chain-display";
import { type UserProfileEntry } from "@/lib/bambu/list-user-profiles";
import {
  DEFAULT_SLICER_SOURCE,
  isSlicerSource,
  slicerDisplayName,
  type SlicerSource,
} from "@/lib/bambu/slicer-source";
import { type InheritanceChainLevel } from "@/lib/bambu/resolver";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import { isDesktopShell } from "@/lib/is-desktop-shell";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  HelpCircle,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";

import { Tooltip } from "@base-ui/react/tooltip";
import { LanguageSelect } from "@/components/language-select";
import { NativeSelectField } from "@/components/native-select-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from "@/localization/context";

import { CompareFilamentToolbar } from "./CompareFilamentToolbar";
import { DataSourceModal } from "./DataSourceModal";
import { ProfileLeafEditor } from "./ProfileLeafEditor";
import { ProfileTreeGrid } from "./ProfileTreeGrid";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "@/components/ui/toast";
import {
  flattenSidebarRows,
  type SidebarRow,
  type SidebarSection,
} from "./sidebarRows";

const SLICER_STORAGE_KEY = "bambu-browser-slicer";

type EditSession = {
  relativePath: string;
  kind: "process" | "filament";
  original: Record<string, unknown>;
  inherited: Record<string, unknown>;
};

const SECTION_ORDER: Record<SidebarSection, number> = {
  filament_custom: 0,
  filament_standard: 1,
  process: 2,
};

function sidebarSectionForProfile(p: UserProfileEntry): SidebarSection {
  if (p.kind === "process") return "process";
  if (p.filamentCategory === "custom") return "filament_custom";
  return "filament_standard";
}

export function BambuProfileWorkbench() {
  const t = useTranslations();
  const [apiBase] = useState(() => getBambuApiBaseUrl());
  const [slicer, setSlicer] = useState<SlicerSource>(DEFAULT_SLICER_SOURCE);
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [studioRootLabel, setStudioRootLabel] = useState<string>("");
  const [layout, setLayout] = useState<"users" | "user" | null>(null);
  const [accountNames, setAccountNames] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<UserProfileEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [chain, setChain] = useState<InheritanceChainLevel[]>([]);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeExtruderIndex, setActiveExtruderIndex] = useState(0);
  // Keyed by profile so the comparison resets when another profile is selected.
  const [compareFilament, setCompareFilament] = useState<{
    profilePath: string | null;
    relativePath: string | null;
  }>({ profilePath: null, relativePath: null });
  const [showOnlyChanged, setShowOnlyChanged] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [openSidebarSections, setOpenSidebarSections] = useState<
    Record<SidebarSection, boolean>
  >({
    filament_custom: false,
    filament_standard: true,
    process: false,
  });
  const profileButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const sectionTriggerRefs = useRef(
    new Map<SidebarSection, HTMLButtonElement>(),
  );
  const [systemFilamentEntries, setSystemFilamentEntries] = useState<
    SystemFilamentEntry[]
  >([]);
  const [loadingSystemFilaments, setLoadingSystemFilaments] = useState(false);
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  const desktopShell = useIsHydrated() && isDesktopShell();

  const compareFilamentPath =
    compareFilament.profilePath === selectedPath
      ? compareFilament.relativePath
      : null;

  const setCompareFilamentPath = useCallback(
    (next: string | null) => {
      setCompareFilament({ profilePath: selectedPath, relativePath: next });
    },
    [selectedPath],
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.relativePath === selectedPath) ?? null,
    [profiles, selectedPath],
  );
  const isProcessProfile = selectedProfile?.kind === "process";
  const isFilamentProfile = selectedProfile?.kind === "filament";
  const isCustomFilamentProfile =
    isFilamentProfile && selectedProfile.filamentCategory === "custom";

  type ConnectionCheckResult =
    { ok: true; root: string } | { ok: false; error: string };

  const loadApiConnection = useCallback(
    async (source: SlicerSource = slicer): Promise<ConnectionCheckResult> => {
      setError(null);
      try {
        const health = await fetchApiHealth(source);
        if (!health.ok) {
          const error =
            health.error ||
            t("errors.serverCannotReadRoot", { root: health.root });
          setApiOk(false);
          setAccountNames([]);
          setStudioRootLabel(health.root);
          setLayout(null);
          setError(error);
          return { ok: false, error };
        }
        setApiOk(true);
        const meta = await fetchApiMeta(source);
        setStudioRootLabel(meta.root);
        setLayout(meta.layout);
        const { accounts } = await fetchApiAccounts(source);
        setAccountNames(accounts);
        setSelectedUsername((prev) =>
          source === "orca" && accounts.includes("default")
            ? "default"
            : prev && accounts.includes(prev)
              ? prev
              : (accounts[0] ?? null),
        );
        return { ok: true, root: meta.root };
      } catch (e) {
        const error =
          e instanceof Error ? e.message : t("errors.cannotReachApi");
        setApiOk(false);
        setAccountNames([]);
        setStudioRootLabel("");
        setLayout(null);
        setError(error);
        return { ok: false, error };
      }
    },
    [slicer, t],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedSlicer =
        typeof window !== "undefined"
          ? localStorage.getItem(SLICER_STORAGE_KEY)
          : null;
      const initialSlicer = isSlicerSource(storedSlicer)
        ? storedSlicer
        : DEFAULT_SLICER_SOURCE;
      setSlicer(initialSlicer);
      if (!cancelled) await loadApiConnection(initialSlicer);
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount; locale changes do not re-run bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (apiOk !== true) return;
    let cancelled = false;
    (async () => {
      setScanning(true);
      setError(null);
      try {
        if (!selectedUsername) {
          if (!cancelled) {
            setProfiles([]);
            setSelectedPath(null);
            setChain([]);
          }
          return;
        }
        const { profiles: list } = await fetchApiProfilesForAccount(
          selectedUsername,
          slicer,
        );
        if (!cancelled) {
          setProfiles(list);
          setSelectedPath(null);
          setChain([]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : t("errors.loadProfilesFailed"),
          );
          setProfiles([]);
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOk, selectedUsername, slicer, t]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (apiOk !== true || !isCustomFilamentProfile) {
        setSystemFilamentEntries([]);
        return;
      }
      setLoadingSystemFilaments(true);
      try {
        const { entries } = await fetchApiSystemFilaments(slicer);
        if (!cancelled) setSystemFilamentEntries(entries);
      } catch {
        if (!cancelled) setSystemFilamentEntries([]);
      } finally {
        if (!cancelled) setLoadingSystemFilaments(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [apiOk, isCustomFilamentProfile, slicer]);

  useEffect(() => {
    let cancelled = false;
    const compareArg =
      isCustomFilamentProfile && compareFilamentPath
        ? compareFilamentPath
        : null;
    const run = async () => {
      if (!selectedPath || apiOk !== true) {
        setChain([]);
        return;
      }
      setResolving(true);
      setError(null);
      try {
        const { chain: c } = await fetchApiResolve(
          selectedPath,
          slicer,
          compareArg,
        );
        if (!cancelled) setChain(c);
      } catch (e) {
        if (!cancelled) {
          setChain([]);
          setError(
            e instanceof Error
              ? e.message
              : t("errors.resolveInheritanceFailed"),
          );
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    selectedPath,
    apiOk,
    t,
    isCustomFilamentProfile,
    compareFilamentPath,
    slicer,
  ]);

  const grouped = useMemo(() => {
    const m = new Map<SidebarSection, UserProfileEntry[]>();
    for (const p of profiles) {
      const section = sidebarSectionForProfile(p);
      const arr = m.get(section) ?? [];
      arr.push(p);
      m.set(section, arr);
    }
    return Array.from(m.entries()).sort(
      ([a], [b]) => SECTION_ORDER[a] - SECTION_ORDER[b],
    );
  }, [profiles]);

  const sidebarRows = useMemo<SidebarRow[]>(
    () => flattenSidebarRows(grouped, openSidebarSections),
    [grouped, openSidebarSections],
  );

  const focusRow = useCallback((row: SidebarRow) => {
    requestAnimationFrame(() => {
      const button =
        row.kind === "section"
          ? sectionTriggerRefs.current.get(row.section)
          : profileButtonRefs.current.get(row.relativePath);
      button?.focus();
    });
  }, []);

  /** Moving onto a profile selects it; headings only take focus. */
  const moveFocus = useCallback(
    (fromIndex: number, offset: number) => {
      if (fromIndex < 0) return;
      const next = sidebarRows[fromIndex + offset];
      if (!next) return;
      if (next.kind === "profile") setSelectedPath(next.relativePath);
      focusRow(next);
    },
    [focusRow, sidebarRows],
  );

  const handleProfileKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLButtonElement>,
      section: SidebarSection,
      relativePath: string,
    ) => {
      const index = sidebarRows.findIndex(
        (row) => row.kind === "profile" && row.relativePath === relativePath,
      );
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setOpenSidebarSections((current) => ({ ...current, [section]: false }));
        focusRow({ kind: "section", section });
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(index, event.key === "ArrowUp" ? -1 : 1);
      }
    },
    [focusRow, moveFocus, sidebarRows],
  );

  const handleSectionKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, section: SidebarSection) => {
      const index = sidebarRows.findIndex(
        (row) => row.kind === "section" && row.section === section,
      );
      if (event.key === "ArrowRight") {
        event.preventDefault();
        // Finder: expand a collapsed group, otherwise step into its first child.
        if (openSidebarSections[section]) moveFocus(index, 1);
        else
          setOpenSidebarSections((current) => ({
            ...current,
            [section]: true,
          }));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setOpenSidebarSections((current) => ({ ...current, [section]: false }));
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(index, event.key === "ArrowUp" ? -1 : 1);
      }
    },
    [moveFocus, openSidebarSections, sidebarRows],
  );

  const firstProcessGroupIndex = useMemo(
    () => grouped.findIndex(([key]) => key === "process"),
    [grouped],
  );

  const sidebarGroupHeading = useCallback(
    (section: SidebarSection) => {
      return section === "filament_custom"
        ? t("sidebar.groupCustomFilaments")
        : section === "filament_standard"
          ? t("sidebar.groupFilament")
          : t("sidebar.groupProcess");
    },
    [t],
  );

  const handlePingOrRefresh = useCallback(async () => {
    setCheckingConnection(true);
    try {
      const result = await loadApiConnection();
      if (result.ok) {
        toast.add({
          type: "success",
          title: t("controls.connectionOk"),
          description: t("controls.connectionOkApiDescription", {
            slicer: slicerDisplayName(slicer),
            root: result.root,
          }),
        });
      } else {
        toast.add({
          type: "error",
          title: t("controls.connectionFailed"),
          description: result.error,
        });
      }
    } finally {
      setCheckingConnection(false);
    }
  }, [loadApiConnection, slicer, t]);

  const handleRefreshProfileList = useCallback(() => {
    setScanning(true);
    setError(null);
    const run = async () => {
      try {
        if (!selectedUsername) {
          setProfiles([]);
          return;
        }
        const { profiles: list } = await fetchApiProfilesForAccount(
          selectedUsername,
          slicer,
        );
        setProfiles(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.refreshFailed"));
      } finally {
        setScanning(false);
      }
    };
    void run();
  }, [selectedUsername, slicer, t]);

  const handleSlicerChange = useCallback(
    (next: SlicerSource) => {
      if (next === slicer) return;
      localStorage.setItem(SLICER_STORAGE_KEY, next);
      setSlicer(next);
      setApiOk(null);
      setAccountNames([]);
      setSelectedUsername(null);
      setProfiles([]);
      setSelectedPath(null);
      setChain([]);
      setCompareFilament({ profilePath: null, relativePath: null });
      setEditSession(null);
      void loadApiConnection(next);
    },
    [loadApiConnection, slicer],
  );

  const handleOpenEditor = useCallback(async () => {
    if (!selectedPath || !selectedProfile || chain.length === 0) return;
    try {
      const original = (await fetchApiProfileFile(selectedPath, slicer)).data;
      if (!original) throw new Error(t("errors.loadProfilesFailed"));
      setEditSession({
        relativePath: selectedPath,
        kind: selectedProfile.kind,
        original,
        inherited: buildMergedProfileData(chain, chain.length - 2),
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: t("errors.loadProfilesFailed"),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [chain, selectedPath, selectedProfile, slicer, t]);

  const handleSaveEditedProfile = useCallback(
    async (formattedJson: string) => {
      if (!editSession) return;
      await replaceApiProfileFile(
        editSession.relativePath,
        formattedJson,
        slicer,
      );

      const compareArg =
        editSession.kind === "filament" &&
        isCustomFilamentProfile &&
        compareFilamentPath
          ? compareFilamentPath
          : null;
      const refreshed = (
        await fetchApiResolve(editSession.relativePath, slicer, compareArg)
      ).chain;
      setChain(refreshed);
      setEditSession((current) =>
        current
          ? {
              ...current,
              original: JSON.parse(formattedJson) as Record<string, unknown>,
              inherited: buildMergedProfileData(
                refreshed,
                refreshed.length - 2,
              ),
            }
          : null,
      );
    },
    [compareFilamentPath, editSession, isCustomFilamentProfile, slicer],
  );

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      {!desktopShell ? (
        <DataSourceModal
          open={dataSourceModalOpen}
          onOpenChange={setDataSourceModalOpen}
          onCheckApi={() => void handlePingOrRefresh()}
          slicer={slicer}
        />
      ) : null}
      {editSession ? (
        <ProfileLeafEditor
          key={editSession.relativePath}
          relativePath={editSession.relativePath}
          kind={editSession.kind}
          slicer={slicer}
          original={editSession.original}
          inherited={editSession.inherited}
          onSave={handleSaveEditedProfile}
          onClose={() => setEditSession(null)}
        />
      ) : null}

      <header
        data-app-header
        className="border-border bg-background sticky top-0 z-50 shrink-0 space-y-2 border-b px-4 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-foreground text-lg font-semibold tracking-tight">
              {t("header.title")}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-xs">
              {t("header.subtitle")}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-[10px] break-all">
              {t("header.sourceLabel")} {t("header.apiPrefix")} {apiBase}
              {studioRootLabel ? ` · ${studioRootLabel}` : null}
              {layout ? ` · ${t("header.layoutLabel")} ${layout}` : null}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {!desktopShell ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setDataSourceModalOpen(true)}
              >
                <HelpCircle className="size-4" />
                {t("header.connectionHelp")}
              </Button>
            ) : null}
            <LanguageSelect />
            <ThemeToggle />
            <label className="text-muted-foreground flex flex-col items-start gap-1 text-xs whitespace-nowrap">
              {t("controls.extruderIndex")}
              <input
                type="number"
                min={0}
                max={7}
                value={activeExtruderIndex}
                onChange={(e) =>
                  setActiveExtruderIndex(Number(e.target.value) || 0)
                }
                className="border-input bg-background h-8 w-14 rounded-md border px-2 text-sm"
              />
            </label>
          </div>
        </div>
      </header>

      {error ? (
        <div className="bg-destructive/10 text-destructive border-destructive/20 mx-4 mt-3 shrink-0 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      {apiOk === false ? (
        <div className="text-muted-foreground mx-4 mt-3 shrink-0 rounded-md border border-dashed px-3 py-3 text-sm">
          <p className="text-foreground font-medium">
            {t(desktopShell ? "offline.desktopTitle" : "offline.webTitle")}
          </p>
          <p className="mt-2 text-xs">
            {t(desktopShell ? "offline.desktopBody" : "offline.webBody")}
          </p>
          {!desktopShell ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setDataSourceModalOpen(true)}
            >
              <HelpCircle className="size-4" />
              {t("header.connectionHelp")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <aside
          className={cn(
            "border-border bg-background flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b md:w-72 md:border-r md:border-b-0",
            "max-h-[40vh] md:h-full md:max-h-none",
            "md:shadow-[2px_0_18px_-4px_rgb(15_23_42_/0.09)] dark:md:shadow-[2px_0_20px_-4px_rgb(0_0_0/0.32)]",
          )}
        >
          <div className="space-y-3 px-2 py-3">
            <div className="flex flex-wrap gap-2">
              <Tooltip.Provider delay={400}>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-26 flex-1"
                        disabled={scanning || checkingConnection}
                        onClick={() => void handlePingOrRefresh()}
                      />
                    }
                  >
                    {checkingConnection ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Server className="size-4" />
                    )}
                    {apiOk === false
                      ? t("controls.retryApi")
                      : t("controls.checkConnection")}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner
                      side="bottom"
                      sideOffset={8}
                      className="z-50"
                    >
                      <Tooltip.Popup
                        className={cn(
                          "bg-popover text-popover-foreground border-border max-w-64 rounded-md border px-2.5 py-1.5 text-xs shadow-md",
                          "leading-snug",
                        )}
                      >
                        {apiOk === false
                          ? t("controls.retryApiTooltip")
                          : t("controls.checkConnectionTooltip")}
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-26 flex-1"
                onClick={() => void handleRefreshProfileList()}
                disabled={scanning || checkingConnection || apiOk !== true}
              >
                {scanning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t("controls.refreshList")}
              </Button>
            </div>

            <div
              className="border-input grid grid-cols-2 rounded-md border p-0.5"
              role="group"
              aria-label={t("controls.slicer")}
            >
              {(["bambu", "orca"] as const).map((source) => (
                <Button
                  key={source}
                  type="button"
                  variant={slicer === source ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={slicer === source}
                  onClick={() => handleSlicerChange(source)}
                >
                  {source === "bambu"
                    ? t("controls.slicerBambu")
                    : t("controls.slicerOrca")}
                </Button>
              ))}
            </div>

            <div className="space-y-1.5">
              {slicer === "bambu" ? (
                <>
                  <span className="text-muted-foreground block text-xs font-medium">
                    {t("controls.bambuAccount")}
                  </span>
                  <NativeSelectField className="w-full max-w-full">
                    <select
                      className="border-input bg-background h-9 w-full max-w-full appearance-none rounded-md border px-2 pr-8 text-sm"
                      value={selectedUsername ?? ""}
                      onChange={(e) =>
                        setSelectedUsername(e.target.value || null)
                      }
                      disabled={apiOk !== true || accountNames.length === 0}
                    >
                      {accountNames.length === 0 ? (
                        <option value="">{t("controls.noAccounts")}</option>
                      ) : (
                        accountNames.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))
                      )}
                    </select>
                  </NativeSelectField>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t("controls.orcaDefaultAccount")}
                </p>
              )}
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  checked={showOnlyChanged}
                  onChange={(e) => setShowOnlyChanged(e.target.checked)}
                />
                {t("controls.showOnlyChanged")}
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {apiOk !== true ? (
              <p className="text-muted-foreground px-2 py-4 text-sm">
                {t("sidebar.connectFirst")}
              </p>
            ) : scanning ? (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" />
                {t("sidebar.loading")}
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground px-2 py-4 text-sm">
                {t("sidebar.emptyProfiles")}
              </p>
            ) : (
              <ul className="flex flex-col">
                {grouped.map(([mapKey, items], index) => {
                  const sidebarSection = mapKey;
                  return (
                    <li
                      key={mapKey}
                      className="border-border border-b last:border-b-0"
                    >
                      {index === firstProcessGroupIndex &&
                      firstProcessGroupIndex > 0 ? (
                        <div
                          className="border-border w-full border-t shadow-[0_2px_5px_-2px_rgb(15_23_42/0.12)] dark:shadow-[0_2px_6px_-1px_rgb(0_0_0/0.35)]"
                          aria-hidden
                        />
                      ) : null}
                      <Collapsible
                        open={openSidebarSections[sidebarSection]}
                        onOpenChange={(open) =>
                          setOpenSidebarSections((current) => ({
                            ...current,
                            [sidebarSection]: open,
                          }))
                        }
                        className="w-full"
                      >
                        <CollapsibleTrigger
                          ref={(node) => {
                            if (node) {
                              sectionTriggerRefs.current.set(
                                sidebarSection,
                                node,
                              );
                            } else {
                              sectionTriggerRefs.current.delete(sidebarSection);
                            }
                          }}
                          type="button"
                          onKeyDown={(event) =>
                            handleSectionKeyDown(event, sidebarSection)
                          }
                          className={cn(
                            "text-foreground/80 bg-muted/80 dark:bg-muted/50 hover:bg-muted/90 dark:hover:bg-muted/90 flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[11px] font-semibold tracking-wide uppercase",
                            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            "[&[data-panel-open]>svg]:rotate-180",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {sidebarGroupHeading(mapKey)}
                          </span>
                          <ChevronDown
                            className="text-foreground/70 size-3.5 shrink-0 transition-transform duration-200"
                            aria-hidden
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ul className="flex flex-col gap-0.5 px-2 pb-2 pt-0.5">
                            {items.map((p) => (
                              <li key={p.relativePath}>
                                <button
                                  ref={(node) => {
                                    if (node) {
                                      profileButtonRefs.current.set(
                                        p.relativePath,
                                        node,
                                      );
                                    } else {
                                      profileButtonRefs.current.delete(
                                        p.relativePath,
                                      );
                                    }
                                  }}
                                  type="button"
                                  onClick={() =>
                                    setSelectedPath(p.relativePath)
                                  }
                                  onKeyDown={(event) =>
                                    handleProfileKeyDown(
                                      event,
                                      sidebarSection,
                                      p.relativePath,
                                    )
                                  }
                                  aria-current={
                                    selectedPath === p.relativePath
                                      ? "true"
                                      : undefined
                                  }
                                  className={cn(
                                    "hover:bg-profile-selected/85 hover:text-profile-selected-foreground w-full rounded-[calc(var(--radius-md)/2)] px-1.5 py-1.5 text-left text-sm",
                                    selectedPath === p.relativePath &&
                                      "bg-profile-selected text-profile-selected-foreground",
                                  )}
                                >
                                  {p.fileName}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background shadow-[0_2px_16px_-4px_rgb(15_23_42_/0.1),0_8px_28px_-12px_rgb(15_23_42_/0.06)] dark:shadow-[0_2px_18px_-3px_rgb(0_0_0/0.35),0_10px_32px_-14px_rgb(0_0_0/0.2)]">
          <div className="mt-2 min-h-0 flex-1 overflow-auto pb-4 pt-0">
            {resolving ? (
              <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" />
                {t("main.resolving")}
              </div>
            ) : (
              <ProfileTreeGrid
                chain={chain}
                slicer={slicer}
                activeExtruderIndex={activeExtruderIndex}
                propertyFilter={propertyFilter}
                onPropertyFilterChange={setPropertyFilter}
                onEditLeaf={() => void handleOpenEditor()}
                showOnlyChangedLeaf={
                  isProcessProfile || isFilamentProfile
                    ? showOnlyChanged
                    : false
                }
                compareAccordion={
                  isCustomFilamentProfile && selectedPath && apiOk === true ? (
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger
                        type="button"
                        className={cn(
                          "text-foreground hover:bg-muted/50 flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          "[&[data-panel-open]>svg]:rotate-180",
                        )}
                      >
                        <span>{t("compareFilament.label")}</span>
                        <ChevronDown
                          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200"
                          aria-hidden
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CompareFilamentToolbar
                          entries={systemFilamentEntries}
                          value={compareFilamentPath}
                          onChange={setCompareFilamentPath}
                          onClear={() => setCompareFilamentPath(null)}
                          disabled={resolving}
                          loadingList={loadingSystemFilaments}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  ) : undefined
                }
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
