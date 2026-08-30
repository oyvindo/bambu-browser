/**
 * English UI strings (default). Shape is the source of truth for other locales.
 */
export const messagesEn = {
  meta: {
    title: "Slicer profile browser",
    description:
      "Browse Bambu Studio and OrcaSlicer process/filament profile inheritance",
  },
  header: {
    title: "Slicer profile browser",
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
    modalTitleOrca: "How to load your OrcaSlicer files",
    modalIntro:
      "This app reads files on your computer and only replaces a user profile when you explicitly save it in the editor. Pick one of the two ways below — you can switch later from the header.",
    modalIntroOrca:
      "This app reads OrcaSlicer files through the local API and only replaces a user profile when you explicitly save it in the editor.",
    browserSectionTitle: "Browser folder (no Node if this works)",
    browserSectionBody:
      "Grant access to your Bambu Studio data folder. Nothing is uploaded; files stay on your device. Write permission is requested only when saving an edited user profile. The page must be served over HTTPS (e.g. Vercel) or localhost so the browser allows the folder picker — plain http://192.168… will not.",
    browserMacLibraryWarning:
      "On macOS, Chrome often blocks that Library path (“can’t open this folder … contains system files”). Use Local API below to read the real folder with Node, or copy your BambuStudio folder to Desktop or Documents and choose the copy here.",
    chooseFolder: "Choose Bambu Studio folder…",
    pickingFolder: "Opening picker…",
    fsNotSupported:
      "Your browser does not support choosing a folder this way (often because the site is not on HTTPS or localhost). Use the local API section instead, or open the app at https://… or http://localhost.",
    apiSectionTitle: "Local API (Node)",
    apiSectionBody:
      "This mode uses a small HTTP server from the open-source bambu-browser project. Run it on the same computer that has your Bambu Studio files.",
    apiSectionBodyOrca:
      "This mode uses the same local HTTP server to read OrcaSlicer profiles. Run it on the computer that has your OrcaSlicer files.",
    apiRepoCloneHint:
      "Clone the repository or download the ZIP from the link below, then use a terminal in that project folder (where package.json and server.js live).",
    apiReadmeHint:
      "The README in that repository covers prerequisites (including Node.js), npm install, BAMBUSTUDIO_ROOT, ports, and security — read it when you set this up.",
    apiReadmeHintOrca:
      "The README covers prerequisites, npm install, ORCASLICER_ROOT, ports, and security.",
    apiOptionalEnv: "Optional: custom folder or port:",
    apiUrlLabel: "This page expects the API at",
    useLocalApi: "Use local API (ping server)",
    close: "Close",
    orcaApiOnly:
      "OrcaSlicer is currently supported through the local API. Browser folder access remains available for Bambu Studio.",
  },
  controls: {
    extruderIndex: "Extruder index",
    pingApi: "Ping API",
    refreshConnection: "Refresh connection",
    retryApi: "Retry API",
    refreshList: "Refresh list",
    bambuAccount: "Bambu Lab Account",
    noAccounts: "No accounts",
    showOnlyChanged: "Show only changed values",
    slicer: "Slicer",
    slicerBambu: "Bambu",
    slicerOrca: "Orca",
    orcaDefaultAccount: "OrcaSlicer profiles use the default account.",
  },
  errors: {
    serverCannotReadRoot:
      "Server cannot read the selected slicer root: {root}. Check BAMBUSTUDIO_ROOT or ORCASLICER_ROOT.",
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
    connectFirst:
      "Connect first: open “How to connect” in the header, or use Ping API / choose a folder.",
    loading: "Loading…",
    emptyProfiles:
      "No JSON profiles found. Check the selected slicer path and account folders.",
    groupCustomFilaments: "Custom filaments",
    groupFilament: "Filaments",
    groupProcess: "Process",
  },
  main: {
    resolving: "Resolving inheritance…",
  },
  treeGrid: {
    emptyHint:
      "Load a filament or process to show the inheritance tree (one column per template in the chain).",
    columnProperty: "Property",
    filterLabel: "Filter",
    propertySearchPlaceholder: "Filter by property name…",
    copyToClipboard: "Copy to clipboard",
    downloadProfile: "Download profile",
    editProfile: "Edit profile",
    fileNameCopied: "File name {filename} copied to clipboard",
    fileCopied: "File {filename} copied to clipboard",
    fileDownloaded: "File {filename} downloaded",
    customFileCopied: "Custom file {filename} copied to clipboard",
    customFileDownloaded: "Custom file {filename} downloaded",
    copyFailed: "Could not copy to clipboard",
  },
  profileEditor: {
    title: "Edit profile file",
    intro:
      "Edit the original leaf JSON. Inherits, type, name, and from cannot be changed.",
    format: "Format",
    validate: "Validate",
    save: "Save",
    showChanges: "Show changes",
    backToEditing: "Back to editing",
    noChanges: "No changes compared to the file on disk.",
    diffLayout: "Diff layout",
    diffInline: "Inline diff",
    diffSideBySide: "Side-by-side diff",
    changedFields: "Changed fields in this leaf profile",
    discard: "Discard changes",
    cancel: "Cancel",
    minimize: "Minimize",
    maximize: "Maximize",
    keepEditing: "Keep editing",
    confirmDiscard: "Discard unsaved changes?",
    confirmDiscardBody:
      "Your edits have not been saved. This action cannot be undone.",
    loading: "Loading profile file…",
    validationPassed: "Validation passed",
    validationWarnings: "Validation passed with warnings ({count})",
    validationFailed: "Validation failed",
    revertLockedFields: "Revert",
    revertLockedFailed: "Could not restore locked fields",
    noValidationFindings: "No validation issues found.",
    severityBlocker: "Blocker",
    severityError: "Error",
    severityWarning: "Warning",
    formatFailed: "Could not format JSON",
    saveFailed: "Could not save profile",
    saved: "Profile updated and reloaded",
    savedDescription:
      "The leaf file was replaced and the profile was reloaded.",
    writePermissionDenied:
      "Write access to the Bambu Studio folder was denied.",
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
    frostedAura: "Frosted Aura",
    inked: "Inked",
    slate: "Slate",
    frozenMist: "Frozen Mist",
    sapphireNightfall: "Sapphire Nightfall",
    amethystDawnHaze: "Amethyst Dawn Haze",
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
