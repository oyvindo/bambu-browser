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
    subtitleBrowser:
      "Data comes from a Bambu Studio folder you selected in the browser (File System Access). No local server is required for this mode.",
    apiPrefix: "API:",
    sourceLabel: "Source:",
    layoutLabel: "layout:",
    connectionHelp: "How to connect",
  },
  dataSource: {
    modalTitle: "How to load your Bambu Studio files",
    modalIntro:
      "This app only reads files on your computer. Pick one of the two ways below — you can switch later from the header.",
    browserSectionTitle: "Browser folder (recommended on first try)",
    browserSectionBody:
      "Grant read access to your Bambu Studio data folder. Nothing is uploaded; files stay on your device. You may need to use “Go to folder” to reach the path shown below.",
    chooseFolder: "Choose Bambu Studio folder…",
    pickingFolder: "Opening picker…",
    fsNotSupported:
      "Your browser does not support choosing a folder this way. Use the local API section instead (Chrome or Edge on desktop usually work).",
    apiSectionTitle: "Local API (Node)",
    apiSectionBody:
      "This mode uses a small HTTP server from the open-source bambu-browser project. Run it on the same computer that has your Bambu Studio files.",
    apiRepoCloneHint:
      "Clone the repository or download the ZIP from the link below, then use a terminal in that project folder (where package.json and server.js live).",
    apiReadmeHint:
      "The README in that repository covers prerequisites (including Node.js), npm install, BAMBUSTUDIO_ROOT, ports, and security — read it when you set this up.",
    apiOptionalEnv: "Optional: custom folder or port:",
    apiUrlLabel: "This page expects the API at",
    useLocalApi: "Use local API (ping server)",
    close: "Close",
  },
  controls: {
    extruderIndex: "Extruder index",
    pingApi: "Ping API",
    refreshConnection: "Refresh connection",
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
    browserNoLayout:
      "The chosen folder does not look like a Bambu Studio root (missing users/ or user/). Pick the folder that contains those directories.",
    folderPickCancelled: "Folder selection was cancelled.",
    folderPermissionDenied:
      "Read access to the folder was denied. Try again or use the local API.",
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
    connectFirst:
      "Connect first: open “How to connect” in the header, or use Ping API / choose a folder.",
    loading: "Loading…",
    emptyProfiles:
      "No JSON profiles found. Check BambuStudio path on the server and account folders.",
    groupCustomFilaments: "Custom filaments",
    groupFilament: "Filaments",
    groupProcess: "Process",
  },
  main: {
    resolving: "Resolving inheritance…",
  },
  treeGrid: {
    emptyHint:
      "Load a profile to show the inheritance tree (one column per template in the chain).",
    showAdvanced: "Show advanced parameters",
    showOnlyChangedProcess: "Show only changed process values",
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
    showOnlyChanged: "Show only changed filament values",
  },
  chainColumn: {
    profileFilament: "Filament profile",
    profileProcess: "Process profile",
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
