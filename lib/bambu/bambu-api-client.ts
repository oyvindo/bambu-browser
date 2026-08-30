import type { InheritanceChainLevel } from "./resolver";
import type { UserProfileEntry } from "./list-user-profiles";
import type { SystemFilamentEntry } from "./system-filament-filters";
import type { SlicerSource } from "./slicer-source";

export function getBambuApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BAMBU_API_URL;
  return (
    fromEnv && fromEnv.length > 0 ? fromEnv : "http://127.0.0.1:3847"
  ).replace(/\/+$/, "");
}

export type ApiMeta = {
  root: string;
  layout: "users" | "user" | null;
  accountCount: number;
};

export type ApiAccounts = {
  layout: "users" | "user" | null;
  accounts: string[];
};

function withSlicer(path: string, slicer: SlicerSource): string {
  const [pathname, rawQuery = ""] = path.split("?", 2);
  const query = new URLSearchParams(rawQuery);
  query.set("slicer", slicer);
  return `${pathname}?${query.toString()}`;
}

async function apiGet<T>(path: string, slicer: SlicerSource): Promise<T> {
  const base = getBambuApiBaseUrl();
  const res = await fetch(`${base}${withSlicer(path, slicer)}`, {
    cache: "no-store",
  });
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

async function apiPut<T>(
  path: string,
  body: string,
  slicer: SlicerSource,
): Promise<T> {
  const base = getBambuApiBaseUrl();
  const res = await fetch(`${base}${withSlicer(path, slicer)}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    const hasError =
      data !== null && typeof data === "object" && "error" in data;
    throw new Error(
      hasError
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`,
    );
  }
  return data as T;
}

export type ApiHealth = { ok: boolean; root: string; error?: string };

/** 200 even when root is missing; check `ok` for a readable BambuStudio path. */
export async function fetchApiHealth(slicer: SlicerSource): Promise<ApiHealth> {
  const base = getBambuApiBaseUrl();
  const res = await fetch(`${base}${withSlicer("/api/health", slicer)}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as ApiHealth;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return data;
}

export async function fetchApiMeta(slicer: SlicerSource): Promise<ApiMeta> {
  return apiGet("/api/meta", slicer);
}

export async function fetchApiAccounts(
  slicer: SlicerSource,
): Promise<ApiAccounts> {
  return apiGet("/api/accounts", slicer);
}

export async function fetchApiProfilesForAccount(
  account: string,
  slicer: SlicerSource,
): Promise<{
  profiles: UserProfileEntry[];
  layout: string;
}> {
  const q = new URLSearchParams({ account });
  return apiGet(`/api/profiles?${q.toString()}`, slicer);
}

export type ApiSystemFilaments = { entries: SystemFilamentEntry[] };

export async function fetchApiSystemFilaments(
  slicer: SlicerSource,
): Promise<ApiSystemFilaments> {
  return apiGet("/api/system-filaments", slicer);
}

export type { SystemFilamentEntry } from "./system-filament-filters";

export async function fetchApiResolve(
  path: string,
  slicer: SlicerSource,
  compareWith?: string | null,
): Promise<{ chain: InheritanceChainLevel[] }> {
  const q = new URLSearchParams({ path });
  if (compareWith && compareWith.trim()) {
    q.set("compareWith", compareWith.trim());
  }
  return apiGet(`/api/resolve?${q.toString()}`, slicer);
}

export async function fetchApiProfileFile(
  path: string,
  slicer: SlicerSource,
): Promise<{
  relativePath: string;
  data: Record<string, unknown>;
}> {
  const q = new URLSearchParams({ path });
  return apiGet(`/api/profile-file?${q.toString()}`, slicer);
}

export async function replaceApiProfileFile(
  path: string,
  formattedJson: string,
  slicer: SlicerSource,
): Promise<{ ok: true; relativePath: string }> {
  const q = new URLSearchParams({ path });
  return apiPut(`/api/profile-file?${q.toString()}`, formattedJson, slicer);
}
