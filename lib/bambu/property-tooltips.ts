/**
 * Short hover copy for process profile keys shown in the tree grid.
 * Locale-specific text lives under `localization/tooltips/`.
 */

import type { AppLocale } from "@/localization/types";
import type { ProfileKind } from "./resolver";
import type { SlicerSource } from "./slicer-source";
import {
  ORCA_PROFILE_CONFIG_DEFS,
  ORCA_PROFILE_CONFIG_SOURCE,
} from "./orca-profile-config.generated";
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

const FILAMENT_DEFAULT_BY_LOCALE: Record<AppLocale, BambuPropertyTooltip> = {
  en: {
    impact:
      "This filament parameter is carried through the inheritance chain. A value in a derived profile replaces the parent value for this key.",
  },
  nb: {
    impact:
      "Denne filamentparameteren følger arvekjeden. En verdi i en avledet profil erstatter forelderens verdi for denne nøkkelen.",
  },
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
  kind: ProfileKind = "process",
  slicer: SlicerSource = "bambu",
): BambuPropertyTooltip {
  if (slicer === "orca") {
    const tooltip = ORCA_PROFILE_CONFIG_DEFS[key]?.tooltip;
    return {
      impact:
        tooltip ??
        (locale === "nb"
          ? "Denne OrcaSlicer-innstillingen følger arvekjeden. En verdi i en avledet profil erstatter forelderens verdi for denne nøkkelen."
          : "This OrcaSlicer setting follows the inheritance chain. A value in a derived profile replaces the parent value for this key."),
      ...(tooltip
        ? {
            related:
              locale === "nb"
                ? `Beskrivelse fra OrcaSlicer ${ORCA_PROFILE_CONFIG_SOURCE.version}.`
                : `Description from OrcaSlicer ${ORCA_PROFILE_CONFIG_SOURCE.version}.`,
          }
        : {}),
    };
  }
  if (kind === "filament") return FILAMENT_DEFAULT_BY_LOCALE[locale];
  const table = TABLE_BY_LOCALE[locale];
  if (!Object.prototype.hasOwnProperty.call(table, key)) {
    return DEFAULT_BY_LOCALE[locale];
  }
  const entry = table[key];
  return entry ?? DEFAULT_BY_LOCALE[locale];
}
