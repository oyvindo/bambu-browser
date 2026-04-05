import type { Messages } from "./en";

/**
 * Norwegian (Bokmål) UI strings — same keys as {@link messagesEn}.
 */
export const messagesNb = {
  meta: {
    title: "Bambu-profilutforsker",
    description:
      "Utforsk prosess- og filamentprofiler fra Bambu Studio og arvekeder",
  },
  header: {
    title: "Bambu-profilutforsker",
    subtitlePrefix: "Data hentes fra det lokale Node-API-et (",
    subtitleMiddle: "), slik at macOS Library-mapper leses med ",
    subtitleSuffix: " – ikke nettleserens filvelger.",
    apiPrefix: "API:",
    layoutLabel: "layout:",
  },
  controls: {
    extruderIndex: "Ekstruderindeks",
    pingApi: "Ping API",
    retryApi: "Prøv API på nytt",
    refreshList: "Oppdater liste",
    allAccounts: "Alle kontoer",
    bambuAccount: "Bambu Lab-konto",
    noAccounts: "Ingen kontoer",
    allAccountsHint: "Viser alle profiler under users/ eller user/",
  },
  errors: {
    serverCannotReadRoot:
      "Serveren kan ikke lese BambuStudio-roten: {root}. Sett BAMBUSTUDIO_ROOT når du starter server.js.",
    cannotReachApi:
      "Får ikke kontakt med det lokale API-et. Kjør: node server.js (se terminal).",
    loadProfilesFailed: "Kunne ikke laste profiler",
    refreshFailed: "Oppdatering mislyktes",
    resolveInheritanceFailed: "Kunne ikke løse arv",
  },
  offline: {
    title: "Start den lokale serveren i en annen terminal:",
    optionalEnv: "Valgfritt:",
    optionalNextEnv: "Valgfri miljøvariabel for Next:",
  },
  sidebar: {
    profilesHeading: "Profiler",
    connectFirst: "Koble til API-et først (Ping API).",
    loading: "Laster…",
    emptyProfiles:
      "Ingen JSON-profiler funnet. Sjekk BambuStudio-sti på serveren og kontomapper.",
    groupCustomFilaments: "Egendefinerte filament",
    groupFilament: "Filament",
    groupProcess: "Prosess",
  },
  main: {
    resolving: "Løser arv…",
  },
  treeGrid: {
    emptyHint:
      "Last en profil for å vise arvetreet (én kolonne per mal i kjeden).",
    showAdvanced: "Vis avanserte parametere",
    columnProperty: "Parameter",
  },
  compareFilament: {
    materialsHeading: "Materiale",
    brandsHeading: "Merke / serie",
    foldersHeading: "Mapper",
    rootToggle: "Rot",
    rootFolder: "Rotmappe",
    label: "Sammenlign med et filament",
    placeholderClosed: "Velg et systemfilament…",
    searchPlaceholder: "Søk i filament…",
    loadingList: "Laster liste…",
    noMatches: "Ingen treff",
    removeAria: "Fjern",
    removeTooltip: "Fjern",
  },
  chainColumn: {
    profile: "Profil",
    root: "Rot",
    parent: "Forelder",
    level: "Nivå {n}",
  },
  propertyTooltip: {
    aboutAria: "Om {label}",
  },
  theme: {
    label: "Tema",
    light: "Lyst",
    dark: "Mørkt",
    system: "System",
    aria: "Fargetema",
  },
  language: {
    label: "Språk",
    en: "Engelsk",
    nb: "Norsk",
    aria: "Grensesnittspråk",
  },
} as const satisfies Messages;
