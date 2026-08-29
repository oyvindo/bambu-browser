/**
 * Norwegian hover copy for process profile keys (TreeGrid).
 *
 * Betydningen av innstillingene er kontrollert mot Bambu Studios gjeldende
 * PrintConfig.cpp og, der det finnes, den offisielle Bambu Lab-wikien:
 * https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/PrintConfig.cpp
 * https://wiki.bambulab.com/en/software/bambu-studio/
 *
 * Praktiske råd skal være konservative: Ikke utled oppførsel fra verdier i
 * profilene, og skill priming i prime tower fra spyling ved filamentbytte.
 */

import type { ProcessTooltipEntry } from "./process-en";

export const PROCESS_TOOLTIP_DEFAULT_NB: ProcessTooltipEntry = {
  impact:
    "Denne prosessparameteren følger arvekjeden. Hvis du overstyrer den i en avledet profil, erstatter den kun foreldrens verdi for akkurat denne nøkkelen.",
};

export const PROCESS_TOOLTIPS_NB: Readonly<
  Partial<Record<string, ProcessTooltipEntry>>
> = {
  layer_height: {
    impact:
      "Angir tykkelsen på hvert printlag. Mindre verdier kan gi bedre detaljer og overflate, men krever flere lag og øker vanligvis printtiden.",
    related:
      "Bambu anbefaler normalt en laghøyde på omtrent 20–70 % av dysediameteren. De konfigurerte ekstrudergrensene er endelig begrensning.",
  },
  initial_layer_print_height: {
    impact:
      "Kun tykkelse på første lag. Litt tykkere første lag gir bedre feste mot byggflate og tilgir ujevnheter; for tynt øker risiko for feilet første lag.",
    related:
      "Samspiller med initial_layer_line_width og initial_layer_speed – de tre definerer «squish» og pålitelighet på første lag.",
  },
  line_width: {
    impact:
      "Standard ekstruderingsbredde som brukes når en egenskapsspesifikk linjebredde er satt til null. Spesifikke bredder overstyrer den der de gjelder.",
    related:
      "Yttervegg, innervegg, toppflate, solid infill og sparsom infill kan ha hver sin linjebredde.",
  },
  initial_layer_line_width: {
    impact:
      "Ekstruderingsbredde kun på lag 1. Bredere første lag øker kontaktflate mot platen; smalere kan hjelpe fine detaljer på undersiden.",
    related:
      "Kombiner med initial_layer_print_height og initial_layer_speed for jevn flyt på første lag.",
  },
  outer_wall_line_width: {
    impact:
      "Bredde på ytterste omkrets(er). Påvirker synlig overflatekvalitet, søm og hvor mye materiale som danner skallet.",
    related:
      "Sammenlign med inner_wall_line_width og wall_loops – ubalanse kan endre hvordan vegger binder.",
  },
  inner_wall_line_width: {
    impact:
      "Angir ekstruderingsbredden for innervegger. Den endrer geometrien som brukes til å generere indre veggbaner.",
    related:
      "Bruk den sammen med outer_wall_line_width og wall_loops. En breddeendring garanterer ikke i seg selv raskere eller sterkere utskrift.",
  },
  sparse_infill_line_width: {
    impact:
      "Angir ekstruderingsbredden for banene i sparsom infill. Ønsket infilltetthet styres separat.",
    related:
      "Bredden brukes også som referanse for prosentbaserte innstillinger som overlapping mellom infill og vegg.",
  },
  internal_solid_infill_line_width: {
    impact:
      "Linjebredde for solid infill mellom vegger og under topper. Påvirker hvor raskt store flater fylles og om små glipper oppstår.",
    related:
      "top_surface_line_width og top_shell_layers påvirker hvordan toppen blir over denne infillen.",
  },
  top_surface_line_width: {
    impact: "Angir ekstruderingsbredden som brukes på modellens toppflater.",
    related:
      "Antall topplag, flytkalibrering og støtten fra infill under påvirker også kvaliteten på toppflaten.",
  },
  wall_generator: {
    impact:
      "Velger hvordan omkretsbaner genereres (klassisk vs. variabel bredde osv.). Endrer oppførsel på tynne vegger og detaljer.",
    related:
      "Påvirkes av linjebredder – noen moduser tilpasser bredde automatisk der geometrien er trang.",
  },
  seam_position: {
    impact:
      "Styrer hvor lag start/stopp plasseres på overflaten. Påvirker synlige «zits» versus å gjemme søm langs hjørner eller skarpe kanter.",
    related:
      "outer_wall_speed og retraksjon (andre steder i profilen) påvirker også sømmen.",
  },
  detect_thin_wall: {
    impact:
      "Lar sliceren behandle svært tynne soner spesielt slik at enkeltvegger eller smale detaljer printes i stedet for å forsvinne – kan avvike litt fra rå modell.",
    related:
      "wall_generator og omkrets-linjebredder avgjør når tynn-vegg-logikk aktiveres.",
  },
  elefant_foot_compensation: {
    impact:
      "Krymper tidlige lag litt i XY for å motvirke «elephant foot» fra første-lags-squish. For mye kan gi synlig trinn eller glippe ved sokkelen.",
    related:
      "initial_layer_print_height og første-lags linjebredde bestemmer hvor mye squish du kompenserer for.",
  },
  enable_arc_fitting: {
    impact:
      "Tilpasser egnede segmenter i verktøybanen til G2/G3-buebevegelser med samme toleranse som den konfigurerte oppløsningen.",
    related:
      "Aktiver bare når skriverens firmware støtter G2/G3-buekommandoer korrekt.",
  },
  bridge_flow: {
    impact:
      "Flyt-multiplikator i brosoner. For lavt knekker broer; for høyt gir heng. Broer printes med lite eller ingen støtte under.",
    related:
      "Kjøling og brohastighet (ofte andre steder i profilen) betyr minst like mye som flyt for rene spenn.",
  },
  wall_loops: {
    impact:
      "Antall omkretslag. Flere øker styrke, stivhet og tett skall på bekostning av tid og materiale.",
    related:
      "outer_wall_line_width og inner_wall_line_width bestemmer hvor mye plast hver runde legger.",
  },
  top_shell_layers: {
    impact:
      "Solide lag som danner toppskinn over sparsom infill. Flere lag gir jevnere topp og styrke; færre kan vise infillmønster gjennom toppen.",
    related:
      "top_surface_line_width og sparse_infill_density avgjør hvor lett det er å få en pen, lukket topp.",
  },
  bottom_shell_layers: {
    impact:
      "Angir antall solide lag i bunnskallet, inkludert laget på selve bunnflaten.",
    related:
      "Hvis antallet gir et tynnere skall enn konfigurert bunnskalltykkelse, øker Bambu Studio antall lag.",
  },
  wall_infill_order: {
    impact:
      "Eldre innstilling som valgte rekkefølgen på innervegger, yttervegger og infill i et lag.",
    related:
      "Gjeldende Bambu Studio flytter denne nøkkelen til wall_sequence. Nye profiler bør bruke den gjeldende innstillingen.",
  },
  sparse_infill_density: {
    impact:
      "Hvor mye plast som fyller innvendig (for valgt sparsomt mønster). Høyere øker vekt, styrke og tid; lavere sparer materiale men svekker delen.",
    related:
      "sparse_infill_pattern, sparse_infill_line_width og sparse_infill_speed bør stemme med ønsket tetthet.",
  },
  sparse_infill_pattern: {
    impact:
      "Indre rutenett (grid, gyroid, honeycomb osv.). Mønstre varierer i styrkeretning, fleksibilitet og hvordan dysa akselererer.",
    related:
      "infill_direction roterer mange mønstre; tetthet og linjebredde endrer hvordan mønsteret ser ut.",
  },
  infill_direction: {
    impact:
      "Roterer infill i horisontalplanet. Nyttig for å biasere styrke langs en lastretning eller justere synlig infill i gjennomsiktige print.",
    related:
      "Mest relevant for linjebaserte mønstre; noen 3D-mønstre er mindre følsomme for vinkel.",
  },
  infill_wall_overlap: {
    impact:
      "Hvor langt infill overlapper inn i omkretsbaner. Mer overlap gir bedre binding vegg–infill; for mye kan gi klumper eller ru vegger.",
    related:
      "sparse_infill_density og linjebredder endrer hva som er «akkurat passe» overlap.",
  },
  initial_layer_speed: {
    impact:
      "Begrenser hvor fort første lag printes. Saktere gir ofte bedre feste og tåler ujevn utjevning; for fort kan dra eller løfte linjen.",
    related:
      "initial_layer_print_height og initial_layer_line_width bestemmer hvor mye plast som skal lande på første lag.",
  },
  outer_wall_speed: {
    impact:
      "Hastighet på ytterste omkrets. Lavere hastighet gir ofte bedre overflate og mindre ringing; høyere sparer tid.",
    related:
      "default_acceleration og outer_wall_line_width samvirker – tynn yttervegg ved høy akselerasjon viser artefakter først.",
  },
  inner_wall_speed: {
    impact:
      "Hastighet på indre omkretser. Ofte høyere enn yttervegg for å spare tid mens huden holdes saktere for utseende.",
    related:
      "wall_loops multipliserer omkretstid; balanser med outer_wall_speed.",
  },
  sparse_infill_speed: {
    impact:
      "Hvor fort sparsom infill printes. Høyere forkorter print, men kan gi hopp i linjer eller dårlig binding hvis hotenden ikke henger med.",
    related:
      "sparse_infill_density og default_acceleration begrenser hvor aggressivt dette kan være.",
  },
  travel_speed: {
    impact:
      "Angir hastigheten for forflytninger uten ekstrudering. Høyere verdi reduserer forflytningstiden, men kan gi mer støy eller bevegelsesfeil hvis maskinen presses for hardt.",
    related:
      "Travel acceleration bestemmer hvor raskt ønsket forflytningshastighet kan nås. Selve banelengden endres ikke.",
  },
  default_acceleration: {
    impact:
      "Akselerasjon for de fleste ekstruderingsbevegelser. Lavere reduserer ringing og mekanisk stress; høyere forkorter tid på sik-sak-baner.",
    related:
      "Alle print-hastigheter (vegger, infill) merker denne grensen – spesielt på korte segmenter.",
  },
  travel_acceleration: {
    impact:
      "Akselerasjon kun for travel-bevegelser. Ofte høyere enn print-akselerasjon; for høyt kan gi støy, hopp i steg eller dårlig nøyaktighet.",
    related:
      "Samspiller med travel_speed for hvor aggressivt hodet flyttes mellom ekstruderinger.",
  },
  enable_support: {
    impact:
      "Slår generert støtte av eller på. Av fjerner automatisk støtte der overheng trenger det med mindre du bruker orientering eller manuelle strukturer.",
    related:
      "support_type, support_style og terskel/Z-avstand gjelder bare når dette er på.",
  },
  support_type: {
    impact:
      "Støttestruktur (f.eks. normal vs. tre). Endrer rekkevidde i hulrom, materialbruk, løsbarhet og merker på modellen.",
    related:
      "support_threshold_angle og Z-avstander bestemmer hvor støtte kommer og hvordan den løsner fra delen.",
  },
  support_style: {
    impact:
      "Velger form og oppbygning for støtten. Normalstiler balanserer et regelmessig, stabilt rutenett mot materialbesparende snug-tårn; trestiler endrer sammenslåing og styrke på grener.",
    related:
      "Tilgjengelige stiler avhenger av support_type. Kontaktavstand og grensesjiktmønster konfigureres separat.",
  },
  support_on_build_plate_only: {
    impact:
      "Når på, vokser støtte kun fra platen – enklere fjerning og færre merker på modellen, men indre overheng kan mangle støtte.",
    related:
      "support_type og delorientering avgjør om kun-plate er realistisk.",
  },
  support_threshold_angle: {
    impact:
      "Genererer automatisk støtte for flater med helning mot horisontalplanet under denne terskelen. En større terskel gir vanligvis mer støtte.",
    related:
      "Bambu Studio måler vinkelen fra horisontalplanet, som er motsatt konvensjon av enkelte testmodeller for overheng.",
  },
  support_top_z_distance: {
    impact:
      "Vertikal glipp mellom støtte og undersiden av modellen. Større glipp gjør fjerning enklere og reduserer sveisemerker; for stor lar overflater synke.",
    related:
      "support_bottom_z_distance håndterer motsatt kontakt; krymp i filament påvirker gode glipper.",
  },
  support_bottom_z_distance: {
    impact:
      "Angir den vertikale avstanden mellom et nedre støttegrensesjikt og objektet under.",
    related:
      "Dette gjelder der støtte starter på en objektflate. support_top_z_distance styrer avstanden under en støttet objektflate.",
  },
  support_interface_pattern: {
    impact:
      "Mønster for tette grensesjikt mot delen. Endrer hvor hardt støtten sitter og hvor rent den løsner.",
    related:
      "Z-avstander og filamentvalg (ofte filamentprofiler) påvirker løsning i praksis sterkt.",
  },
  brim_type: {
    impact:
      "Styrer om Bambu Studio lager brim på utsiden, innsiden, begge sider, automatisk eller ikke i det hele tatt.",
    related:
      "Brim øker kontaktflaten på første lag. I automatisk modus beregner Bambu Studio nødvendig brim for hvert objekt.",
  },
  brim_width: {
    impact:
      "Hvor langt brim strekker seg fra modellen. Bredere brim fester bedre, men bruker mer filament og krever mer opprydding.",
    related:
      "brim_type velger om brim brukes; brim_object_gap påvirker løsning fra skallet.",
  },
  brim_object_gap: {
    impact:
      "Avstand mellom brim og modellomriss. Liten glipp gjør brim enklere å fjerne i ett stykke; null kan smelte brim tett mot skallet.",
    related:
      "brim_width setter yttergrensen; sammen definerer de brukervennligheten.",
  },
  skirt_loops: {
    impact:
      "Antall omrissløkker unna modellen for å prime dysen før jobben starter. Flere løkker spyler mer materiale før delen begynner.",
    related:
      "skirt_distance og skirt_height styrer plassering og vertikal utstrekning for priming-banen.",
  },
  skirt_distance: {
    impact:
      "Hvor langt skjørtet ligger fra modellavtrykket. For nært kan smelte skjørtplast til delen ved oozing.",
    related: "skirt_loops bestemmer hvor mye priming du får på den avstanden.",
  },
  skirt_height: {
    impact:
      "Hvor mange lag høyt skjørtet er. Vanligvis ett; høyere skjørt er sjeldent, men kan hjelpe oozing eller trekk i nisjeoppsett.",
    related: "Samspiller primært med skirt_loops for oppstarts-priming.",
  },
  enable_prime_tower: {
    impact:
      "Legger til et tårn som fjerner materialrester fra dysen og stabiliserer dysetrykket før objektet printes etter et filamentbytte eller en bevegelse for jevn timelapse.",
    related:
      "Prime tower er ikke filamentspylingen: Spyling fjerner det forrige materialet, mens tårnet gjenoppretter jevn flyt og tørker av dysen.",
  },
  prime_tower_width: {
    impact: "Angir bredden på fotavtrykket til prime tower.",
    related:
      "Prime volume styrer hvor mye som printes på tårnet ved hvert bytte. Det er separat fra volumet for filamentspyling.",
  },
};
