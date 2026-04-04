/**
 * Short hover copy for process profile keys shown in the tree grid.
 * Locale-specific text lives under `localization/tooltips/`.
 */

import type { AppLocale } from "@/localization/types";
import {
  PROCESS_TOOLTIP_DEFAULT_EN,
  PROCESS_TOOLTIPS_EN,
  type ProcessTooltipEntry,
} from "@/localization/tooltips/process-en";
import {
  PROCESS_TOOLTIP_DEFAULT_NB,
  PROCESS_TOOLTIPS_NB,
} from "@/localization/tooltips/process-nb";

export type BambuPropertyTooltip = ProcessTooltipEntry;

const DEFAULT_BY_LOCALE: Record<AppLocale, BambuPropertyTooltip> = {
  en: PROCESS_TOOLTIP_DEFAULT_EN,
  nb: PROCESS_TOOLTIP_DEFAULT_NB,
};

const TABLE_BY_LOCALE: Record<
  AppLocale,
  Readonly<Partial<Record<string, BambuPropertyTooltip>>>
> = {
  en: PROCESS_TOOLTIPS_EN,
  nb: PROCESS_TOOLTIPS_NB,
};

export function propertyTooltipForKey(
  key: string,
  locale: AppLocale,
): BambuPropertyTooltip {
  const table = TABLE_BY_LOCALE[locale];
  if (!Object.prototype.hasOwnProperty.call(table, key)) {
    return DEFAULT_BY_LOCALE[locale];
  }
  const entry = table[key];
  return entry ?? DEFAULT_BY_LOCALE[locale];
}
