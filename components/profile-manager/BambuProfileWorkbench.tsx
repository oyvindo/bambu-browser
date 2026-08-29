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
import {
  readEditableProfileUnderRoot,
  writeEditableProfileUnderRoot,
} from "@/lib/bambu/fs-path-utils";
import {
  detectStudioLayoutFromRoot,
  listSystemFilamentEntriesFromStudioRoot,
  resolveChainFromStudioRoot,
} from "@/lib/bambu/fs-studio-data";
import type { UserProfileEntry } from "@/lib/bambu/list-user-profiles";
import { listUserProfileEntriesFromStudioRoot } from "@/lib/bambu/list-user-profiles";
import {
  ensureReadAccess,
  ensureWriteAccess,
  loadBambuStudioRootHandle,
  saveBambuStudioRootHandle,
} from "@/lib/bambu/persisted-root-handle";
import {
  isFileSystemAccessSupported,
  pickBambuStudioFolder,
  type InheritanceChainLevel,
} from "@/lib/bambu/resolver";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  HelpCircle,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";

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

const DATA_MODE_STORAGE_KEY = "bambu-browser-data-mode";

type DataMode = "api" | "browser";

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
  const [dataMode, setDataMode] = useState<DataMode>("api");
  const [studioRootHandle, setStudioRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [pickingFolder, setPickingFolder] = useState(false);

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [studioRootLabel, setStudioRootLabel] = useState<string>("");
  const [layout, setLayout] = useState<"users" | "user" | null>(null);
  const [accountNames, setAccountNames] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<UserProfileEntry[]>([]);
  const [scanning, setScanning] = useState(false);
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

  const fsSupported = useIsHydrated() && isFileSystemAccessSupported();

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

  const loadApiConnection = useCallback(async () => {
    setError(null);
    try {
      const health = await fetchApiHealth();
      if (!health.ok) {
        setApiOk(false);
        setAccountNames([]);
        setStudioRootLabel(health.root);
        setLayout(null);
        setError(
          health.error ||
            t("errors.serverCannotReadRoot", { root: health.root }),
        );
        return;
      }
      setApiOk(true);
      const meta = await fetchApiMeta();
      setStudioRootLabel(meta.root);
      setLayout(meta.layout);
      const { accounts } = await fetchApiAccounts();
      setAccountNames(accounts);
      setSelectedUsername((prev) =>
        prev && accounts.includes(prev) ? prev : (accounts[0] ?? null),
      );
    } catch (e) {
      setApiOk(false);
      setAccountNames([]);
      setStudioRootLabel("");
      setLayout(null);
      setError(e instanceof Error ? e.message : t("errors.cannotReachApi"));
    }
  }, [t]);

  const loadBrowserConnection = useCallback(
    async (root: FileSystemDirectoryHandle) => {
      setError(null);
      try {
        const { layout: detected, accounts } =
          await detectStudioLayoutFromRoot(root);
        if (!detected || accounts.length === 0) {
          setApiOk(false);
          setStudioRootLabel(root.name);
          setLayout(null);
          setAccountNames([]);
          setError(t("errors.browserNoLayout"));
          return;
        }
        setApiOk(true);
        setStudioRootLabel(root.name);
        setLayout(detected);
        setAccountNames(accounts);
        setSelectedUsername((prev) =>
          prev && accounts.includes(prev) ? prev : (accounts[0] ?? null),
        );
      } catch (e) {
        setApiOk(false);
        setAccountNames([]);
        setStudioRootLabel(root.name);
        setLayout(null);
        setError(
          e instanceof Error ? e.message : t("errors.loadProfilesFailed"),
        );
      }
    },
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const browserPreferred =
        typeof window !== "undefined" &&
        localStorage.getItem(DATA_MODE_STORAGE_KEY) === "browser";
      if (browserPreferred) {
        setDataMode("browser");
        const h = await loadBambuStudioRootHandle();
        if (cancelled) return;
        if (h && (await ensureReadAccess(h))) {
          setStudioRootHandle(h);
          await loadBrowserConnection(h);
        } else if (!cancelled) {
          setApiOk(false);
          setDataSourceModalOpen(true);
        }
      } else {
        setDataMode("api");
        if (!cancelled) await loadApiConnection();
      }
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
        if (dataMode === "browser") {
          if (!studioRootHandle) {
            if (!cancelled) {
              setProfiles([]);
              setSelectedPath(null);
              setChain([]);
            }
            return;
          }
          const all =
            await listUserProfileEntriesFromStudioRoot(studioRootHandle);
          let list = all;
          if (!selectedUsername) {
            list = [];
          } else {
            list = all.filter((p) => p.userId === selectedUsername);
          }
          if (!cancelled) {
            setProfiles(list);
            setSelectedPath(null);
            setChain([]);
          }
          return;
        }
        if (!selectedUsername) {
          if (!cancelled) {
            setProfiles([]);
            setSelectedPath(null);
            setChain([]);
          }
          return;
        }
        const { profiles: list } =
          await fetchApiProfilesForAccount(selectedUsername);
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
  }, [apiOk, dataMode, studioRootHandle, selectedUsername, t]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (apiOk !== true || !isCustomFilamentProfile) {
        setSystemFilamentEntries([]);
        return;
      }
      setLoadingSystemFilaments(true);
      try {
        if (dataMode === "browser" && studioRootHandle) {
          const entries =
            await listSystemFilamentEntriesFromStudioRoot(studioRootHandle);
          if (!cancelled) setSystemFilamentEntries(entries);
        } else if (dataMode === "api") {
          const { entries } = await fetchApiSystemFilaments();
          if (!cancelled) setSystemFilamentEntries(entries);
        } else if (!cancelled) {
          setSystemFilamentEntries([]);
        }
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
  }, [apiOk, isCustomFilamentProfile, dataMode, studioRootHandle]);

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
        if (dataMode === "browser" && studioRootHandle) {
          const c = await resolveChainFromStudioRoot(
            studioRootHandle,
            selectedPath,
            compareArg,
          );
          if (!cancelled) setChain(c);
        } else if (dataMode === "api") {
          const { chain: c } = await fetchApiResolve(selectedPath, compareArg);
          if (!cancelled) setChain(c);
        } else if (!cancelled) {
          setChain([]);
        }
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
    dataMode,
    studioRootHandle,
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

  const handlePingOrRefresh = useCallback(() => {
    if (dataMode === "browser") {
      if (studioRootHandle) void loadBrowserConnection(studioRootHandle);
      else setDataSourceModalOpen(true);
      return;
    }
    void loadApiConnection();
  }, [dataMode, studioRootHandle, loadApiConnection, loadBrowserConnection]);

  const handleRefreshProfileList = useCallback(() => {
    setScanning(true);
    setError(null);
    const run = async () => {
      try {
        if (dataMode === "browser") {
          if (!studioRootHandle) {
            setProfiles([]);
            return;
          }
          const all =
            await listUserProfileEntriesFromStudioRoot(studioRootHandle);
          let list = all;
          if (!selectedUsername) list = [];
          else list = all.filter((p) => p.userId === selectedUsername);
          setProfiles(list);
          return;
        }
        if (!selectedUsername) {
          setProfiles([]);
          return;
        }
        const { profiles: list } =
          await fetchApiProfilesForAccount(selectedUsername);
        setProfiles(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.refreshFailed"));
      } finally {
        setScanning(false);
      }
    };
    void run();
  }, [dataMode, studioRootHandle, selectedUsername, t]);

  const handleSwitchToApi = useCallback(() => {
    localStorage.setItem(DATA_MODE_STORAGE_KEY, "api");
    setDataMode("api");
    setStudioRootHandle(null);
    setDataSourceModalOpen(false);
    void loadApiConnection();
  }, [loadApiConnection]);

  const handleChooseBrowserFolder = useCallback(async () => {
    setError(null);
    setPickingFolder(true);
    try {
      const previous = await loadBambuStudioRootHandle();
      const startIn =
        previous && (await ensureReadAccess(previous)) ? previous : undefined;
      const dir = await pickBambuStudioFolder(
        startIn ? { startIn } : undefined,
      );
      if (!dir) {
        setError(t("errors.folderPickCancelled"));
        return;
      }
      await saveBambuStudioRootHandle(dir);
      localStorage.setItem(DATA_MODE_STORAGE_KEY, "browser");
      setDataMode("browser");
      setStudioRootHandle(dir);
      await loadBrowserConnection(dir);
      setDataSourceModalOpen(false);
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError") {
        setError(t("errors.folderPickCancelled"));
      } else if (name === "NotAllowedError") {
        setError(t("errors.folderPermissionDenied"));
      } else {
        setError(
          e instanceof Error ? e.message : t("errors.loadProfilesFailed"),
        );
      }
    } finally {
      setPickingFolder(false);
    }
  }, [loadBrowserConnection, t]);

  const handleOpenEditor = useCallback(async () => {
    if (!selectedPath || !selectedProfile || chain.length === 0) return;
    try {
      const original =
        dataMode === "api"
          ? (await fetchApiProfileFile(selectedPath)).data
          : studioRootHandle
            ? await readEditableProfileUnderRoot(studioRootHandle, selectedPath)
            : null;
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
  }, [chain, dataMode, selectedPath, selectedProfile, studioRootHandle, t]);

  const handleSaveEditedProfile = useCallback(
    async (formattedJson: string) => {
      if (!editSession) return;
      if (dataMode === "api") {
        await replaceApiProfileFile(editSession.relativePath, formattedJson);
      } else {
        if (!studioRootHandle) throw new Error(t("errors.browserNoLayout"));
        if (!(await ensureWriteAccess(studioRootHandle))) {
          throw new Error(t("profileEditor.writePermissionDenied"));
        }
        await writeEditableProfileUnderRoot(
          studioRootHandle,
          editSession.relativePath,
          formattedJson,
        );
      }

      const compareArg =
        editSession.kind === "filament" &&
        isCustomFilamentProfile &&
        compareFilamentPath
          ? compareFilamentPath
          : null;
      const refreshed =
        dataMode === "api"
          ? (await fetchApiResolve(editSession.relativePath, compareArg)).chain
          : studioRootHandle
            ? await resolveChainFromStudioRoot(
                studioRootHandle,
                editSession.relativePath,
                compareArg,
              )
            : [];
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
    [
      compareFilamentPath,
      dataMode,
      editSession,
      isCustomFilamentProfile,
      studioRootHandle,
      t,
    ],
  );

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <DataSourceModal
        open={dataSourceModalOpen}
        onOpenChange={setDataSourceModalOpen}
        fsSupported={fsSupported}
        pickingFolder={pickingFolder}
        onChooseBrowserFolder={() => void handleChooseBrowserFolder()}
        onSwitchToApi={handleSwitchToApi}
      />
      {editSession ? (
        <ProfileLeafEditor
          key={editSession.relativePath}
          relativePath={editSession.relativePath}
          kind={editSession.kind}
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
              {dataMode === "browser" ? (
                t("header.subtitleBrowser")
              ) : (
                <>
                  {t("header.subtitlePrefix")}
                  <code className="text-[11px]">server.js</code>
                  {t("header.subtitleMiddle")}
                  <code className="text-[11px]">fs</code>
                  {t("header.subtitleSuffix")}
                </>
              )}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-[10px] break-all">
              {t("header.sourceLabel")}{" "}
              {dataMode === "browser"
                ? `${studioRootLabel || t("dataSource.chooseFolder")} (browser)`
                : `${t("header.apiPrefix")} ${apiBase}`}
              {dataMode === "api" && studioRootLabel
                ? ` · ${studioRootLabel}`
                : null}
              {layout ? ` · ${t("header.layoutLabel")} ${layout}` : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            <LanguageSelect />
            <ThemeToggle />
            <label className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
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
          <p className="font-medium text-foreground">{t("offline.title")}</p>
          <p className="mt-2 text-xs">
            {t("dataSource.modalIntro")}{" "}
            <button
              type="button"
              className="text-foreground underline decoration-dotted underline-offset-2"
              onClick={() => setDataSourceModalOpen(true)}
            >
              {t("header.connectionHelp")}
            </button>
          </p>
          <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 font-mono text-xs">
            cd /path/to/bambu_browser{"\n"}
            npm run api
          </pre>
          <p className="mt-2 text-xs">
            {t("offline.optionalEnv")}{" "}
            <code className="text-foreground">
              BAMBUSTUDIO_ROOT=&quot;/path/to/BambuStudio&quot; PORT=3847 npm
              run api
            </code>
          </p>
          <p className="mt-1 text-xs">
            {t("offline.optionalNextEnv")}{" "}
            <code className="text-foreground">
              NEXT_PUBLIC_BAMBU_API_URL=http://127.0.0.1:3847
            </code>
          </p>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-26 flex-1"
                onClick={() => void handlePingOrRefresh()}
                disabled={scanning}
              >
                <Server className="size-4" />
                {dataMode === "browser"
                  ? studioRootHandle
                    ? t("controls.refreshConnection")
                    : t("dataSource.chooseFolder")
                  : apiOk === false
                    ? t("controls.retryApi")
                    : t("controls.pingApi")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-26 flex-1"
                onClick={() => void handleRefreshProfileList()}
                disabled={scanning || apiOk !== true}
              >
                {scanning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t("controls.refreshList")}
              </Button>
            </div>

            <div className="space-y-1.5">
              <span className="text-muted-foreground block text-xs font-medium">
                {t("controls.bambuAccount")}
              </span>
              <NativeSelectField className="w-full max-w-full">
                <select
                  className="border-input bg-background h-9 w-full max-w-full appearance-none rounded-md border px-2 pr-8 text-sm"
                  value={selectedUsername ?? ""}
                  onChange={(e) => setSelectedUsername(e.target.value || null)}
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
                                    "hover:bg-blue-300 hover:text-blue-50 w-full rounded-[calc(var(--radius-md)/2)] px-1.5 py-1.5 text-left text-sm",
                                    selectedPath === p.relativePath &&
                                      "bg-blue-400 text-blue-50",
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
