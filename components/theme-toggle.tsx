"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { NativeSelectField } from "@/components/native-select-field";
import { useTranslations } from "@/localization/context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <label className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
      {t("theme.label")}
      <NativeSelectField className="min-w-30">
        <select
          className="border-input bg-background h-8 w-full min-w-30 appearance-none rounded-md border px-2 pr-8 text-sm"
          value={mounted ? theme : "system"}
          onChange={(e) => setTheme(e.target.value)}
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
