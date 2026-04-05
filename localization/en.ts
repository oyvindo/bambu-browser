/**
 * English UI strings (default). Shape is the source of truth for other locales.
 */
export const messagesEn = {
  meta: {
    title: "Bambu profile browser",
    description:
      "Browse Bambu Studio process/filament profiles and inheritance chains",
  },
  header: {
    title: "Bambu profile browser",
    subtitlePrefix: "Data comes from the local Node API (",
    subtitleMiddle: ") so macOS Library folders are read with ",
    subtitleSuffix: ", not the browser picker.",
    apiPrefix: "API:",
    layoutLabel: "layout:",
  },
  controls: {
    extruderIndex: "Extruder index",
    pingApi: "Ping API",
    retryApi: "Retry API",
    refreshList: "Refresh list",
    allAccounts: "All accounts",
    bambuAccount: "Bambu Lab Account",
    noAccounts: "No accounts",
    allAccountsHint: "Showing every profile under users/ or user/",
  },
  errors: {
    serverCannotReadRoot:
      "Server cannot read BambuStudio root: {root}. Set BAMBUSTUDIO_ROOT when starting server.js.",
    cannotReachApi:
      "Cannot reach the local API. Run: node server.js (see terminal).",
    loadProfilesFailed: "Failed to load profiles",
    refreshFailed: "Refresh failed",
    resolveInheritanceFailed: "Failed to resolve inheritance",
  },
  offline: {
    title: "Start the local server in another terminal:",
    optionalEnv: "Optional:",
    optionalNextEnv: "Optional env for Next:",
  },
  sidebar: {
    profilesHeading: "Profiles",
    connectFirst: "Connect to the API first (Ping API).",
    loading: "Loading…",
    emptyProfiles:
      "No JSON profiles found. Check BambuStudio path on the server and account folders.",
    groupCustomFilaments: "Custom filaments",
    groupFilament: "Filament",
    groupProcess: "Process",
  },
  main: {
    resolving: "Resolving inheritance…",
  },
  treeGrid: {
    emptyHint:
      "Load a profile to show the inheritance tree (one column per template in the chain).",
    showAdvanced: "Show advanced parameters",
    columnProperty: "Property",
  },
  compareFilament: {
    materialsHeading: "Material",
    brandsHeading: "Brand / line",
    foldersHeading: "Folders",
    rootToggle: "Root",
    rootFolder: "Root folder",
    label: "Compare to a filament",
    placeholderClosed: "Select a system filament…",
    searchPlaceholder: "Search filaments…",
    loadingList: "Loading list…",
    noMatches: "No matching filaments",
    removeAria: "Remove",
    removeTooltip: "Remove",
  },
  chainColumn: {
    profile: "Profile",
    root: "Root",
    parent: "Parent",
    level: "Level {n}",
  },
  propertyTooltip: {
    aboutAria: "About {label}",
  },
  theme: {
    label: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    aria: "Color theme",
  },
  language: {
    label: "Language",
    en: "English",
    nb: "Norwegian",
    aria: "Interface language",
  },
};

export type Messages = typeof messagesEn;
