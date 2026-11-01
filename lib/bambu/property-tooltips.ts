/**
 * Short hover copy for process profile keys shown in the tree grid.
 * Locale-specific text lives under `localization/tooltips/`.
 */

import { PRUSA_EQUIVALENT_KEYS } from '@/lib/prusa/prusa-key-equivalents';
import {
  PRUSA_PROFILE_CONFIG_DEFS,
  PRUSA_PROFILE_CONFIG_SOURCE,
} from '@/lib/prusa/prusa-profile-config.generated';
import {
  PROCESS_TOOLTIP_DEFAULT_EN,
  PROCESS_TOOLTIPS_EN,
  type ProcessTooltipEntry,
} from '@/localization/tooltips/process-en';
import {
  PROCESS_TOOLTIP_DEFAULT_NB,
  PROCESS_TOOLTIPS_NB,
} from '@/localization/tooltips/process-nb';
import type { AppLocale } from '@/localization/types';

import {
  ORCA_PROFILE_CONFIG_DEFS,
  ORCA_PROFILE_CONFIG_SOURCE,
} from './orca-profile-config.generated';
import type { ProfileKind } from './resolver';
import type { SlicerSource } from './slicer-source';

export type BambuPropertyTooltip = ProcessTooltipEntry;

const DEFAULT_BY_LOCALE: Record<AppLocale, BambuPropertyTooltip> = {
  en: PROCESS_TOOLTIP_DEFAULT_EN,
  nb: PROCESS_TOOLTIP_DEFAULT_NB,
};

const FILAMENT_DEFAULT_BY_LOCALE: Record<AppLocale, BambuPropertyTooltip> = {
  en: {
    impact:
      'This filament parameter is carried through the inheritance chain. A value in a derived profile replaces the parent value for this key.',
  },
  nb: {
    impact:
      'Denne filamentparameteren følger arvekjeden. En verdi i en avledet profil erstatter forelderens verdi for denne nøkkelen.',
  },
};

const TABLE_BY_LOCALE: Record<
  AppLocale,
  Readonly<Partial<Record<string, BambuPropertyTooltip>>>
> = {
  en: PROCESS_TOOLTIPS_EN,
  nb: PROCESS_TOOLTIPS_NB,
};

const PRUSA_VERSION = PRUSA_PROFILE_CONFIG_SOURCE.version.replace(/^version_/, '');

/**
 * PrusaSlicer's own tooltip. In Norwegian, the meaning written for the
 * equivalent Bambu key is reused (without its Bambu-specific advice).
 */
function prusaTooltip(key: string, locale: AppLocale): BambuPropertyTooltip {
  const tooltip = PRUSA_PROFILE_CONFIG_DEFS[key]?.tooltip;
  if (locale === 'en') {
    return {
      impact:
        tooltip ??
        'This PrusaSlicer setting follows the inheritance chain. A value in a derived profile replaces the parent value for this key.',
      ...(tooltip ? { related: `Description from PrusaSlicer ${PRUSA_VERSION}.` } : {}),
    };
  }
  const equivalent = PRUSA_EQUIVALENT_KEYS[key];
  const translated = equivalent ? PROCESS_TOOLTIPS_NB[equivalent] : undefined;
  if (translated) {
    return {
      impact: translated.impact,
      related: `Tilsvarer «${equivalent}» i Bambu Studio. Original beskrivelse fra PrusaSlicer ${PRUSA_VERSION} (engelsk): ${tooltip ?? '—'}`,
    };
  }
  return {
    impact:
      tooltip ??
      'Denne PrusaSlicer-innstillingen følger arvekjeden. En verdi i en avledet profil erstatter forelderens verdi for denne nøkkelen.',
    ...(tooltip ? { related: `Beskrivelse fra PrusaSlicer ${PRUSA_VERSION} (engelsk).` } : {}),
  };
}

export function propertyTooltipForKey(
  key: string,
  locale: AppLocale,
  kind: ProfileKind = 'process',
  slicer: SlicerSource = 'bambu',
): BambuPropertyTooltip {
  if (slicer === 'prusa') return prusaTooltip(key, locale);
  if (slicer === 'orca') {
    const tooltip = ORCA_PROFILE_CONFIG_DEFS[key]?.tooltip;
    return {
      impact:
        tooltip ??
        (locale === 'nb'
          ? 'Denne OrcaSlicer-innstillingen følger arvekjeden. En verdi i en avledet profil erstatter forelderens verdi for denne nøkkelen.'
          : 'This OrcaSlicer setting follows the inheritance chain. A value in a derived profile replaces the parent value for this key.'),
      ...(tooltip
        ? {
            related:
              locale === 'nb'
                ? `Beskrivelse fra OrcaSlicer ${ORCA_PROFILE_CONFIG_SOURCE.version}.`
                : `Description from OrcaSlicer ${ORCA_PROFILE_CONFIG_SOURCE.version}.`,
          }
        : {}),
    };
  }
  if (kind === 'filament') return FILAMENT_DEFAULT_BY_LOCALE[locale];
  const table = TABLE_BY_LOCALE[locale];
  if (!Object.prototype.hasOwnProperty.call(table, key)) {
    return DEFAULT_BY_LOCALE[locale];
  }
  const entry = table[key];
  return entry ?? DEFAULT_BY_LOCALE[locale];
}
