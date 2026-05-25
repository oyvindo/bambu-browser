import type { InheritanceChainLevel } from "./resolver";
import type { UserProfileEntry } from "./list-user-profiles";
import type { SystemFilamentEntry } from "./system-filament-filters";

export function getBambuApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BAMBU_API_URL;
  return (
    fromEnv && fromEnv.length > 0 ? fromEnv : "http://127.0.0.1:3847"
  ).replace(/\/+$/, "");
}

/** Which slicer's data root the server.js process should read from. */
export type SlicerKind = "bambu" | "orca";

function withSlicer(
  pathAndQuery: string,
  slicer: SlicerKind | undefined,
): string {
  if (!slicer || slicer === "bambu") return pathAndQuery;
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  return `${pathAndQuery}${sep}slicer=${encodeURIComponent(slicer)}`;
}

export type ApiMeta = {
  root: string;
  layout: "users" | "user" | null;
  accountCount: number;
  slicer?: SlicerKind;
};

export type ApiAccounts = {
  layout: "users" | "user" | null;
  accounts: string[];
  slicer?: SlicerKind;
};

async function apiGet<T>(path: string): Promise<T> {
  const base = getBambuApiBaseUrl();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    const err = data && typeof data === "object" && true && "error" in data;
    const msg = err
      ? String((data as { error: string }).error)
      : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type ApiHealth = {
  ok: boolean;
  root: string;
  slicer?: SlicerKind;
  error?: string;
};

/** 200 even when root is missing; check `ok` for a readable slicer path. */
export async function fetchApiHealth(slicer?: SlicerKind): Promise<ApiHealth> {
  const base = getBambuApiBaseUrl();
  const url = `${base}${withSlicer("/api/health", slicer)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as ApiHealth;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return data;
}

export async function fetchApiMeta(slicer?: SlicerKind): Promise<ApiMeta> {
  return apiGet(withSlicer("/api/meta", slicer));
}

export async function fetchApiAccounts(
  slicer?: SlicerKind,
): Promise<ApiAccounts> {
  return apiGet(withSlicer("/api/accounts", slicer));
}

export async function fetchApiProfilesForAccount(
  account: string,
  slicer?: SlicerKind,
): Promise<{
  profiles: UserProfileEntry[];
  layout: string;
  slicer?: SlicerKind;
}> {
  const q = new URLSearchParams({ account });
  return apiGet(withSlicer(`/api/profiles?${q.toString()}`, slicer));
}

export type ApiSystemFilaments = {
  entries: SystemFilamentEntry[];
  slicer?: SlicerKind;
};

export async function fetchApiSystemFilaments(
  slicer?: SlicerKind,
): Promise<ApiSystemFilaments> {
  return apiGet(withSlicer("/api/system-filaments", slicer));
}

export type { SystemFilamentEntry } from "./system-filament-filters";

export async function fetchApiResolve(
  path: string,
  compareWith?: string | null,
  slicer?: SlicerKind,
): Promise<{ chain: InheritanceChainLevel[]; slicer?: SlicerKind }> {
  const q = new URLSearchParams({ path });
  if (compareWith && compareWith.trim()) {
    q.set("compareWith", compareWith.trim());
  }
  return apiGet(withSlicer(`/api/resolve?${q.toString()}`, slicer));
}
