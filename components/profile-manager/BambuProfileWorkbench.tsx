"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  fetchApiAccounts,
  fetchApiHealth,
  fetchApiMeta,
  fetchApiProfilesForAccount,
  fetchApiProfilesFull,
  fetchApiResolve,
  getBambuApiBaseUrl,
} from "@/lib/bambu/bambu-api-client";
import type { UserProfileEntry } from "@/lib/bambu/list-user-profiles";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { cn } from "@/lib/utils/index";
import { Loader2, RefreshCw, Server } from "lucide-react";

import { LanguageSelect } from "@/components/language-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from "@/localization/context";

import { ProfileTreeGrid } from "./ProfileTreeGrid";

export function BambuProfileWorkbench() {
  const t = useTranslations();
  const [apiBase] = React.useState(() => getBambuApiBaseUrl());
  const [apiOk, setApiOk] = React.useState<boolean | null>(null);
  const [studioRootLabel, setStudioRootLabel] = React.useState<string>("");
  const [layout, setLayout] = React.useState<"users" | "user" | null>(null);
  const [accountNames, setAccountNames] = React.useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = React.useState<string | null>(
    null,
  );
  const [showAllAccounts, setShowAllAccounts] = React.useState(false);

  const [profiles, setProfiles] = React.useState<UserProfileEntry[]>([]);
  const [scanning, setScanning] = React.useState(false);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [chain, setChain] = React.useState<InheritanceChainLevel[]>([]);
  const [resolving, setResolving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeExtruderIndex, setActiveExtruderIndex] = React.useState(0);

  const loadAccounts = React.useCallback(async () => {
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

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  React.useEffect(() => {
    if (apiOk !== true) return;
    let cancelled = false;
    setScanning(true);
    setError(null);
    (async () => {
      try {
        if (showAllAccounts) {
          const { profiles: list } = await fetchApiProfilesFull();
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
  }, [apiOk, selectedUsername, showAllAccounts, t]);

  React.useEffect(() => {
    if (!selectedPath || apiOk !== true) {
      setChain([]);
      return;
    }
    let cancelled = false;
    setResolving(true);
    setError(null);
    fetchApiResolve(selectedPath)
      .then(({ chain: c }) => {
        if (!cancelled) setChain(c);
      })
      .catch((e) => {
        if (!cancelled) {
          setChain([]);
          setError(
            e instanceof Error
              ? e.message
              : t("errors.resolveInheritanceFailed"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath, apiOk, t]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, UserProfileEntry[]>();
    for (const p of profiles) {
      const key = showAllAccounts ? `${p.userId} · ${p.kind}` : `${p.kind}`;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [profiles, showAllAccounts]);

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col">
      <header className="border-border space-y-2 border-b px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-foreground text-lg font-semibold tracking-tight">
              {t("header.title")}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-xs">
              {t("header.subtitlePrefix")}
              <code className="text-[11px]">server.js</code>
              {t("header.subtitleMiddle")}
              <code className="text-[11px]">fs</code>
              {t("header.subtitleSuffix")}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-[10px] break-all">
              {t("header.apiPrefix")} {apiBase}
              {studioRootLabel ? ` · ${studioRootLabel}` : null}
              {layout ? ` · ${t("header.layoutLabel")} ${layout}` : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadAccounts()}
            disabled={scanning}
          >
            <Server className="size-4" />
            {apiOk === false ? t("controls.retryApi") : t("controls.pingApi")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setScanning(true);
              const p = showAllAccounts
                ? fetchApiProfilesFull()
                : selectedUsername
                  ? fetchApiProfilesForAccount(selectedUsername)
                  : Promise.resolve({ profiles: [] });
              p.then((r) => setProfiles(r.profiles))
                .catch((e) =>
                  setError(
                    e instanceof Error ? e.message : t("errors.refreshFailed"),
                  ),
                )
                .finally(() => setScanning(false));
            }}
            disabled={scanning || apiOk !== true}
          >
            {scanning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {t("controls.refreshList")}
          </Button>
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showAllAccounts}
              onChange={(e) => setShowAllAccounts(e.target.checked)}
              disabled={apiOk !== true}
            />
            {t("controls.allAccounts")}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("controls.bambuAccount")}
          </span>
          {!showAllAccounts ? (
            <select
              className="border-input bg-background h-9 max-w-xs min-w-40 rounded-md border px-2 text-sm"
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
          ) : (
            <span className="text-muted-foreground text-xs">
              {t("controls.allAccountsHint")}
            </span>
          )}
        </div>
      </header>

      {error ? (
        <div className="bg-destructive/10 text-destructive border-destructive/20 mx-4 mt-3 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      {apiOk === false ? (
        <div className="text-muted-foreground mx-4 mt-3 rounded-md border border-dashed px-3 py-3 text-sm">
          <p className="font-medium text-foreground">{t("offline.title")}</p>
          <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 font-mono text-xs">
            cd /path/to/bambu_browser{"\n"}
            node server.js
          </pre>
          <p className="mt-2 text-xs">
            {t("offline.optionalEnv")}{" "}
            <code className="text-foreground">
              BAMBUSTUDIO_ROOT=&quot;/path/to/BambuStudio&quot; PORT=3847 node
              server.js
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

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={cn(
            "border-border flex w-full shrink-0 flex-col border-b md:w-72 md:border-r md:border-b-0",
            "max-h-[40vh] md:max-h-none",
          )}
        >
          <div className="text-muted-foreground border-border border-b px-3 py-2 text-xs font-medium">
            {t("sidebar.profilesHeading")}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
              <ul className="flex flex-col gap-3">
                {grouped.map(([label, items]) => (
                  <li key={label}>
                    <div className="text-muted-foreground mb-1 px-2 text-[11px] font-semibold tracking-wide uppercase">
                      {label}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {items.map((p) => (
                        <li key={p.relativePath}>
                          <button
                            type="button"
                            onClick={() => setSelectedPath(p.relativePath)}
                            className={cn(
                              "hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-sm",
                              selectedPath === p.relativePath &&
                                "bg-muted font-medium",
                            )}
                          >
                            {p.fileName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
          {resolving ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("main.resolving")}
            </div>
          ) : (
            <ProfileTreeGrid
              chain={chain}
              activeExtruderIndex={activeExtruderIndex}
            />
          )}
        </main>
      </div>
    </div>
  );
}
