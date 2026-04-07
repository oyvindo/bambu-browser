import type { InheritanceChainLevel } from "./resolver";
import type { UserProfileEntry } from "./list-user-profiles";
import type { SystemFilamentEntry } from "./system-filament-filters";

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

export type ApiHealth = { ok: boolean; root: string; error?: string };

/** 200 even when root is missing; check `ok` for a readable BambuStudio path. */
export async function fetchApiHealth(): Promise<ApiHealth> {
  const base = getBambuApiBaseUrl();
  const res = await fetch(`${base}/api/health`, { cache: "no-store" });
  const data = (await res.json()) as ApiHealth;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return data;
}

export async function fetchApiMeta(): Promise<ApiMeta> {
  return apiGet("/api/meta");
}

export async function fetchApiAccounts(): Promise<ApiAccounts> {
  return apiGet("/api/accounts");
}

export async function fetchApiProfilesForAccount(account: string): Promise<{
  profiles: UserProfileEntry[];
  layout: string;
}> {
  const q = new URLSearchParams({ account });
  return apiGet(`/api/profiles?${q.toString()}`);
}

export type ApiSystemFilaments = { entries: SystemFilamentEntry[] };

export async function fetchApiSystemFilaments(): Promise<ApiSystemFilaments> {
  return apiGet("/api/system-filaments");
}

export type { SystemFilamentEntry } from "./system-filament-filters";

export async function fetchApiResolve(
  path: string,
  compareWith?: string | null,
): Promise<{ chain: InheritanceChainLevel[] }> {
  const q = new URLSearchParams({ path });
  if (compareWith && compareWith.trim()) {
    q.set("compareWith", compareWith.trim());
  }
  return apiGet(`/api/resolve?${q.toString()}`);
}
