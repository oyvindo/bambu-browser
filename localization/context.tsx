"use client";

import * as React from "react";

import type { Messages } from "./en";
import { messagesEn } from "./en";
import { messagesNb } from "./nb";
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from "./types";

const LOCALE_MESSAGES: Record<AppLocale, Messages> = {
  en: messagesEn,
  nb: messagesNb,
};

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v !== undefined ? String(v) : `{${key}}`;
  });
}

function readPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur !== null && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  messages: Messages;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (raw && (APP_LOCALES as readonly string[]).includes(raw)) {
        setLocaleState(raw as AppLocale);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setLocale = React.useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const messages = LOCALE_MESSAGES[locale];

  const t = React.useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const fromLocale = readPath(messages, path);
      if (fromLocale !== undefined) return interpolate(fromLocale, vars);
      const fallback = readPath(messagesEn, path);
      if (fallback !== undefined) return interpolate(fallback, vars);
      return path;
    },
    [messages],
  );

  React.useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale === "nb" ? "nb" : "en";
    document.title = messages.meta.title;
  }, [locale, messages.meta.title, ready]);

  const value = React.useMemo(
    () => ({ locale, setLocale, messages, t }),
    [locale, setLocale, messages, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }
  return ctx;
}

/** UI strings for the active locale. */
export function useTranslations() {
  return useLocaleContext().t;
}

export function useLocale() {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale };
}
