import type { Messages } from "./en";

/**
 * Norwegian (Bokmål) UI strings — same keys as {@link messagesEn}.
 */
export const messagesNb = {
  meta: {
    title: "Profilutforsker for slicere",
    description:
      "Utforsk arv i prosess- og filamentprofiler fra Bambu Studio og OrcaSlicer",
  },
  header: {
    title: "Profilutforsker for slicere",
    subtitle:
      "Profiler leses fra denne maskinen gjennom det lokale API-et. Ingenting lastes opp.",
    apiPrefix: "API:",
    sourceLabel: "Kilde:",
    layoutLabel: "layout:",
    connectionHelp: "Slik kobler du til",
  },
  dataSource: {
    modalTitle: "Installer eller koble til profilutforskeren",
    modalIntro:
      "Skrivebordsappen er det enkleste alternativet. Nettstedet krever alltid at det lokale API-et kjører på samme maskin.",
    desktopTitle: "Anbefalt: last ned skrivebordsappen",
    desktopBody:
      "Tilgjengelig for macOS og Windows. Den starter det lokale API-et automatisk, så terminal og utvikleroppsett er ikke nødvendig.",
    downloadDesktop: "Last ned skrivebordsappen",
    webTitle: "Bruk av nettstedet",
    webApiRequired:
      "Nettstedet kan ikke lese slicer-profiler på egen hånd. Det lokale API-et må kjøre på denne maskinen på både macOS og Windows.",
    webBody:
      "Du kan bruke Vercel-nettstedet med et lokalt API, eller klone repoet og kjøre både API-et og grensesnittet selv.",
    macPathTip:
      "Velg Gå → Gå til mappe… (⇧⌘G) i Finder. Library-mappen er vanligvis skjult.",
    windowsPathTip:
      "Lim inn stien i adressefeltet i Filutforsker. Den peker til den vanlige Roaming AppData-mappen.",
    developerTitle: "Utvikleroppsett",
    developerBody:
      "Kjør kommandoene nedenfor, og bruk deretter nettstedet. Start npm run dev i en annen terminal for også å kjøre grensesnittet lokalt.",
    apiOptionalEnv: "Valgfritt: annen mappe eller port:",
    runUiLocally:
      "For et helt lokalt nettoppsett, kjør npm run dev i en annen terminal og åpne http://localhost:3000.",
    checkApi: "Sjekk lokalt API",
    close: "Lukk",
  },
  controls: {
    extruderIndex: "Ekstruderindeks",
    checkConnection: "Sjekk tilkobling",
    retryApi: "Prøv API på nytt",
    checkConnectionTooltip:
      "Sjekker at det lokale API-et svarer og at datamappen til valgt slicer kan leses. Laster ikke profilisten på nytt.",
    retryApiTooltip:
      "Prøver å koble til det lokale API-et igjen og lese datamappen til valgt slicer.",
    connectionOk: "Tilkoblet",
    connectionOkApiDescription: "Nådde {slicer}-API-et på {root}.",
    connectionFailed: "Tilkoblingssjekk mislyktes",
    refreshList: "Oppdater liste",
    bambuAccount: "Bambu Lab-konto",
    noAccounts: "Ingen kontoer",
    showOnlyChanged: "Vis bare endrede verdier",
    slicer: "Slicer",
    slicerBambu: "Bambu",
    slicerOrca: "Orca",
    orcaDefaultAccount: "OrcaSlicer-profiler bruker standardkontoen.",
  },
  errors: {
    serverCannotReadRoot:
      "Serveren kan ikke lese roten til valgt slicer: {root}. Sjekk BAMBUSTUDIO_ROOT eller ORCASLICER_ROOT.",
    cannotReachApi:
      "Får ikke kontakt med det lokale API-et. Kjør: node server.js (se terminal).",
    loadProfilesFailed: "Kunne ikke laste profiler",
    refreshFailed: "Oppdatering mislyktes",
    resolveInheritanceFailed: "Kunne ikke løse arv",
  },
  offline: {
    webTitle: "Det lokale API-et kjører ikke",
    webBody:
      "Nettstedet kan ikke laste profiler uten det lokale API-et. Åpne «Slik kobler du til» for nedlasting av skrivebordsappen og utviklerinstruksjoner.",
    desktopTitle: "Det innebygde lokale API-et svarer ikke",
    desktopBody:
      "Start skrivebordsappen på nytt. Hvis problemet fortsetter, lukk andre prosesser som bruker port 3847, og prøv igjen.",
  },
  sidebar: {
    connectFirst:
      "Koble til først: åpne «Slik kobler du til» i topplinjen, eller sjekk tilkoblingen.",
    loading: "Laster…",
    emptyProfiles:
      "Ingen JSON-profiler funnet. Sjekk stien til valgt slicer og kontomappene.",
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
      "Rediger den opprinnelige leaf-JSON-filen. Inherits, type, name og from kan ikke endres.",
    format: "Formater",
    validate: "Valider",
    save: "Lagre",
    showChanges: "Vis endringer",
    backToEditing: "Tilbake til redigering",
    noChanges: "Ingen endringer sammenlignet med filen på disk.",
    diffLayout: "Diff-visning",
    diffInline: "Innebygd diff",
    diffSideBySide: "Side-om-side-diff",
    changedFields: "Endrede felt i denne leaf-profilen",
    discard: "Forkast endringer",
    cancel: "Avbryt",
    minimize: "Minimer",
    maximize: "Maksimer",
    keepEditing: "Fortsett å redigere",
    confirmDiscard: "Forkaste ulagrede endringer?",
    confirmDiscardBody:
      "Endringene er ikke lagret. Denne handlingen kan ikke angres.",
    loading: "Laster profilfil…",
    validationPassed: "Validering bestått",
    validationWarnings: "Validering bestått med advarsler ({count})",
    validationFailed: "Validering mislyktes",
    revertLockedFields: "Tilbakestill",
    revertLockedFailed: "Kunne ikke gjenopprette låste felt",
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
    frostedAura: "Frostet aura",
    inked: "Blekk",
    slate: "Skifer",
    frozenMist: "Frossen tåke",
    sapphireNightfall: "Safir-nattfall",
    amethystDawnHaze: "Ametyst-daggry",
    aria: "Fargetema",
  },
  language: {
    label: "Språk",
    en: "Engelsk",
    nb: "Norsk",
    aria: "Grensesnittspråk",
  },
} as const satisfies Messages;
