"use client";

import * as React from "react";

import { useLocale, useTranslations } from "@/localization/context";
import type { AppLocale } from "@/localization/types";
import { APP_LOCALES, DEFAULT_LOCALE } from "@/localization/types";
import { NativeSelectField } from "@/components/native-select-field";
import { messagesEn } from "@/localization/en";
import { messagesNb } from "@/localization/nb";

/** Native names so each option stays recognizable in any UI language. */
const OPTION_LABEL: Record<AppLocale, string> = {
  en: messagesEn.language.en,
  nb: messagesNb.language.nb,
};

export function LanguageSelect() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <label className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
      {t("language.label")}
      <NativeSelectField className="min-w-32">
        <select
          className="border-input bg-background h-8 w-full min-w-32 appearance-none rounded-md border px-2 pr-8 text-sm"
          value={mounted ? locale : DEFAULT_LOCALE}
          onChange={(e) => setLocale(e.target.value as AppLocale)}
          disabled={!mounted}
          aria-label={t("language.aria")}
        >
          {APP_LOCALES.map((code) => (
            <option key={code} value={code}>
              {OPTION_LABEL[code]}
            </option>
          ))}
        </select>
      </NativeSelectField>
    </label>
  );
}
