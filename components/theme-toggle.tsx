"use client";

import * as React from "react";
import { useTheme } from "@wrksz/themes/client";

import { NativeSelectField } from "@/components/native-select-field";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import { useTranslations } from "@/localization/context";

type ThemeChoice = "light" | "dark" | "system";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme<ThemeChoice>();
  const t = useTranslations();
  const mounted = useIsHydrated();

  return (
    <label className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
      {t("theme.label")}
      <NativeSelectField className="min-w-30">
        <select
          className="border-input bg-background h-8 w-full min-w-30 appearance-none rounded-md border px-2 pr-8 text-sm"
          value={mounted ? theme : "system"}
          onChange={(e) => setTheme(e.target.value as ThemeChoice)}
          disabled={!mounted}
          aria-label={t("theme.aria")}
        >
          <option value="light">{t("theme.light")}</option>
          <option value="dark">{t("theme.dark")}</option>
          <option value="system">{t("theme.system")}</option>
        </select>
      </NativeSelectField>
    </label>
  );
}
