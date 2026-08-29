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
    subtitleBrowser:
      "Data hentes fra en Bambu Studio-mappe du valgte i nettleseren (File System Access). Du trenger ikke lokal server i denne modusen.",
    apiPrefix: "API:",
    sourceLabel: "Kilde:",
    layoutLabel: "layout:",
    connectionHelp: "Slik kobler du til",
  },
  dataSource: {
    modalTitle: "Slik laster du Bambu Studio-filene",
    modalIntro:
      "Appen leser filer på maskinen og erstatter bare en brukerprofil når du uttrykkelig lagrer den i redigeringsprogrammet. Velg én av metodene under – du kan bytte senere fra topplinjen.",
    browserSectionTitle: "Mappe i nettleseren (uten Node hvis dette virker)",
    browserSectionBody:
      "Gi tilgang til datamappen til Bambu Studio. Ingenting lastes opp; filene blir på enheten. Skrivetilgang blir bare forespurt når en redigert brukerprofil lagres. Siden må kjøre over HTTPS (f.eks. Vercel) eller localhost for at nettleseren tillater mappevelger — vanlig http://192.168… fungerer ikke.",
    browserMacLibraryWarning:
      "På macOS blokkerer Chrome ofte Library-stien («kan ikke åpne denne mappen … inneholder systemfiler»). Bruk Lokalt API under for å lese den ekte mappa med Node, eller kopier BambuStudio-mappa til Skrivebord eller Dokumenter og velg kopien her.",
    chooseFolder: "Velg Bambu Studio-mappe…",
    pickingFolder: "Åpner filvelger…",
    fsNotSupported:
      "Nettleseren støtter ikke å velge mappe på denne måten (ofte fordi siden ikke er på HTTPS eller localhost). Bruk lokalt API, eller åpne appen på https://… eller http://localhost.",
    apiSectionTitle: "Lokalt API (Node)",
    apiSectionBody:
      "Denne modusen bruker en liten HTTP-server fra det åpne prosjektet bambu-browser. Kjør den på samme maskin som Bambu Studio-dataene dine ligger på.",
    apiRepoCloneHint:
      "Klon repoet eller last ned ZIP fra lenken under, og bruk terminal i prosjektmappa (der package.json og server.js ligger).",
    apiReadmeHint:
      "README i repoet beskriver forutsetninger (inkl. Node.js), npm install, BAMBUSTUDIO_ROOT, porter og sikkerhet — les den når du setter opp.",
    apiOptionalEnv: "Valgfritt: annen mappe eller port:",
    apiUrlLabel: "Siden forventer API på",
    useLocalApi: "Bruk lokalt API (ping server)",
    close: "Lukk",
  },
  controls: {
    extruderIndex: "Ekstruderindeks",
    pingApi: "Ping API",
    refreshConnection: "Oppdater tilkobling",
    retryApi: "Prøv API på nytt",
    refreshList: "Oppdater liste",
    bambuAccount: "Bambu Lab-konto",
    noAccounts: "Ingen kontoer",
    showOnlyChanged: "Vis bare endrede verdier",
  },
  errors: {
    serverCannotReadRoot:
      "Serveren kan ikke lese BambuStudio-roten: {root}. Sett BAMBUSTUDIO_ROOT når du starter server.js.",
    cannotReachApi:
      "Får ikke kontakt med det lokale API-et. Kjør: node server.js (se terminal).",
    browserNoLayout:
      "Den valgte mappen ser ikke ut som en Bambu Studio-rot (mangler users/ eller user/). Velg mappen som inneholder disse katalogene.",
    folderPickCancelled: "Mappevalg ble avbrutt.",
    folderPermissionDenied:
      "Lesetilgang til mappen ble nektet. Prøv igjen, eller bruk lokalt API.",
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
    connectFirst:
      "Koble til først: åpne «Slik kobler du til» i topplinjen, eller bruk Ping API / velg mappe.",
    loading: "Laster…",
    emptyProfiles:
      "Ingen JSON-profiler funnet. Sjekk BambuStudio-sti på serveren og kontomapper.",
    groupCustomFilaments: "Egendefinerte filament",
    groupFilament: "Filamenter",
    groupProcess: "Prosess",
  },
  main: {
    resolving: "Løser arv…",
  },
  treeGrid: {
    emptyHint:
      "Last et filament eller en prosess for å vise arvetreet (én kolonne per mal i kjeden).",
    columnProperty: "Parameter",
    filterLabel: "Filter",
    propertySearchPlaceholder: "Filtrer på parameternavn…",
    copyToClipboard: "Kopier til utklippstavle",
    downloadProfile: "Last ned profil",
    editProfile: "Rediger profil",
    fileNameCopied: "Filnavnet {filename} er kopiert til utklippstavlen",
    fileCopied: "Filen {filename} er kopiert til utklippstavlen",
    fileDownloaded: "Filen {filename} er lastet ned",
    customFileCopied:
      "Den egendefinerte filen {filename} er kopiert til utklippstavlen",
    customFileDownloaded: "Den egendefinerte filen {filename} er lastet ned",
    copyFailed: "Kunne ikke kopiere til utklippstavlen",
  },
  profileEditor: {
    title: "Rediger profilfil",
    intro:
      "Rediger den opprinnelige leaf-JSON-filen. Inherits, type og name kan ikke endres.",
    format: "Formater",
    validate: "Valider",
    save: "Lagre",
    showChanges: "Vis endringer",
    backToEditing: "Tilbake til redigering",
    noChanges: "Ingen endringer sammenlignet med filen på disk.",
    diffLayout: "Diff-visning",
    diffInline: "Innebygd diff",
    diffSideBySide: "Side-om-side-diff",
    discard: "Forkast endringer",
    cancel: "Avbryt",
    keepEditing: "Fortsett å redigere",
    confirmDiscard: "Forkaste ulagrede endringer?",
    confirmDiscardBody:
      "Endringene er ikke lagret. Denne handlingen kan ikke angres.",
    loading: "Laster profilfil…",
    validationPassed: "Validering bestått",
    validationWarnings: "Validering bestått med advarsler ({count})",
    validationFailed: "Validering mislyktes",
    noValidationFindings: "Ingen valideringsproblemer funnet.",
    severityBlocker: "Blokkering",
    severityError: "Feil",
    severityWarning: "Advarsel",
    formatFailed: "Kunne ikke formatere JSON",
    saveFailed: "Kunne ikke lagre profilen",
    saved: "Profilen er oppdatert og lastet på nytt",
    savedDescription:
      "Leaf-filen ble erstattet og profilen ble lastet på nytt.",
    writePermissionDenied: "Skrivetilgang til Bambu Studio-mappen ble avslått.",
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
    profileFilament: "Filamentprofil",
    profileProcess: "Prosessprofil",
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
