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
      "Appen leser bare filer på din maskin. Velg én av metodene under – du kan bytte senere fra topplinjen.",
    browserSectionTitle: "Mappe i nettleseren (uten Node hvis dette virker)",
    browserSectionBody:
      "Gi lesetilgang til datamappen til Bambu Studio. Ingenting lastes opp; filene blir på enheten. Siden må kjøre over HTTPS (f.eks. Vercel) eller localhost for at nettleseren tillater mappevelger — vanlig http://192.168… fungerer ikke.",
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
    profilesHeading: "Profiler",
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
      "Last en profil for å vise arvetreet (én kolonne per mal i kjeden).",
    showAdvanced: "Vis avanserte parametere",
    showOnlyChangedProcess: "Vis bare endrede prosessverdier",
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
    showOnlyChanged: "Vis bare endrede filamentverdier",
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
