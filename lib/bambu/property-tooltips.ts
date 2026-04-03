/**
 * Short hover copy for process profile keys shown in the tree grid.
 * Explains practical impact and, when useful, how other props interact.
 */

export type BambuPropertyTooltip = {
  impact: string;
  related?: string;
};

export const BAMBU_PROPERTY_TOOLTIPS = {
  layer_height: {
    impact:
      "Sets how thick each printed layer is. Smaller values improve detail and surface finish but increase print time and the number of seams.",
    related:
      "Ties to speeds and line widths: very thin layers often need tuned extrusion and sometimes lower speeds to stay reliable.",
  },
  initial_layer_print_height: {
    impact:
      "First-layer thickness only. A slightly thicker first layer improves bed adhesion and forgives small bed unevenness; too thin risks failed first layers.",
    related:
      "Works with initial_layer_line_width and initial_layer_speed—those three together define first-layer squish and reliability.",
  },
  line_width: {
    impact:
      "Default target extrusion width for features that do not use a specific override. Raising it deposits more plastic per mm of path (stronger, faster) but can hurt fine detail.",
    related:
      "Region overrides (outer_wall_line_width, sparse_infill_line_width, etc.) take precedence where set.",
  },
  initial_layer_line_width: {
    impact:
      "Extrusion width on layer one only. A wider first layer increases contact area with the bed; narrower can help fine details on the bottom.",
    related:
      "Pair with initial_layer_print_height and initial_layer_speed for consistent first-layer flow.",
  },
  outer_wall_line_width: {
    impact:
      "Width of the outermost perimeter(s). Affects visible surface quality, seam appearance, and how much material forms the skin of the part.",
    related:
      "Compare with inner_wall_line_width and wall_loops—mismatched ratios can change how walls bond.",
  },
  inner_wall_line_width: {
    impact:
      "Width of internal perimeters. Thinner inner walls can save time and filament; too thin may weaken the shell or show gaps.",
    related:
      "outer_wall_line_width and wall_loops determine overall shell behavior with this setting.",
  },
  sparse_infill_line_width: {
    impact:
      "Line width used for sparse infill. Wider lines put down more plastic per pass, making infill behave more “solid” at the same density setting.",
    related:
      "sparse_infill_density and sparse_infill_speed should stay coherent with this to avoid under- or over-extrusion inside the part.",
  },
  internal_solid_infill_line_width: {
    impact:
      "Line width for solid infill between walls and under top surfaces. Influences how quickly large flat areas fill and whether small gaps appear.",
    related:
      "top_surface_line_width and top_shell_layers affect how the top skin finishes over this infill.",
  },
  top_surface_line_width: {
    impact:
      "Extrusion width on top visible surfaces. Slightly wider can hide nozzle lines; too wide can look ribbed or over-extruded.",
    related:
      "top_shell_layers and sparse infill below determine whether the top has enough support to look smooth.",
  },
  wall_generator: {
    impact:
      "Chooses how perimeter paths are generated (e.g. classic vs. variable-width approaches). Changes behavior on thin walls and detail features.",
    related:
      "Interacts with line width settings—some modes adapt width automatically where geometry is tight.",
  },
  seam_position: {
    impact:
      "Controls where layer start/stop points are placed on the surface. Affects visible zits versus hiding seams along corners or sharpest edges.",
    related:
      "outer_wall_speed and retraction (elsewhere in the profile) also influence seam appearance.",
  },
  detect_thin_wall: {
    impact:
      "Lets the slicer treat very thin regions specially so single walls or narrow features print instead of disappearing—can alter geometry slightly versus the raw model.",
    related:
      "wall_generator and perimeter line widths change when thin-wall handling kicks in.",
  },
  elefant_foot_compensation: {
    impact:
      "Shrinks early layers slightly in XY to counter “elephant foot” flare from first-layer squish. Too much can leave a visible step or gap at the base.",
    related:
      "initial_layer_print_height and first-layer line width set how much squish you are compensating for.",
  },
  enable_arc_fitting: {
    impact:
      "Converts short segments into arcs where possible for smoother motion and smaller G-code. Usually safe; disable if you hit firmware or motion issues with arcs.",
    related:
      "Printer capability for arc commands must match; otherwise the host may linearize paths.",
  },
  bridge_flow: {
    impact:
      "Flow multiplier in bridging regions. Too low breaks bridges; too high causes sag. Bridges print with little or no underlying support.",
    related:
      "Cooling and bridge speed (often in other profile sections) matter as much as flow for clean spans.",
  },
  wall_loops: {
    impact:
      "Number of perimeter shells. More loops increase strength, rigidity, and watertightness at the cost of time and material.",
    related:
      "outer_wall_line_width and inner_wall_line_width define how much plastic each loop deposits.",
  },
  top_shell_layers: {
    impact:
      "Solid layers forming the top skin over sparse infill. More layers improve top smoothness and strength; fewer can show infill pattern through the top.",
    related:
      "top_surface_line_width and sparse_infill_density decide how easy it is to get a clean closed top.",
  },
  bottom_shell_layers: {
    impact:
      "Solid layers on the bottom (and horizontal floors). More layers improve bottom finish and help span sparse infill below flat regions.",
    related:
      "First-layer settings and brim/skirt options affect the very bottom; this controls thickness above that.",
  },
  wall_infill_order: {
    impact:
      "Whether walls print before or after infill in a layer. Changes overhang behavior, internal stresses, and sometimes surface quality on complex parts.",
    related:
      "infill_wall_overlap and infill speeds affect how cleanly infill meets the walls.",
  },
  sparse_infill_density: {
    impact:
      "How much plastic fills the interior (for the chosen sparse pattern). Higher values increase weight, strength, and print time; lower values save material but weaken the part.",
    related:
      "sparse_infill_pattern, sparse_infill_line_width, and sparse_infill_speed should stay consistent with the density you want.",
  },
  sparse_infill_pattern: {
    impact:
      "The internal lattice (grid, gyroid, honeycomb, etc.). Patterns differ in strength along axes, flexibility, and how the nozzle accelerates.",
    related:
      "infill_direction rotates many patterns; density and line width change how the pattern looks in practice.",
  },
  infill_direction: {
    impact:
      "Rotates infill in the horizontal plane. Useful for biasing strength along a load direction or tweaking visible infill on translucent prints.",
    related:
      "Most meaningful with line-based patterns; some 3D patterns are less sensitive to angle.",
  },
  infill_wall_overlap: {
    impact:
      "How far infill overlaps into perimeter paths. More overlap improves wall–infill bonding; too much can show as blobs or rough walls.",
    related:
      "sparse_infill_density and line widths change how much overlap is “just right.”",
  },
  initial_layer_speed: {
    impact:
      "Caps how fast the first layer prints. Slower usually improves adhesion and tolerates imperfect leveling; too fast can drag or peel the line.",
    related:
      "initial_layer_print_height and initial_layer_line_width define how much plastic must land in that first layer.",
  },
  outer_wall_speed: {
    impact:
      "Speed of the outermost perimeter. Lower speeds typically improve surface quality and reduce ringing on visible walls; higher speeds save time.",
    related:
      "default_acceleration and outer_wall_line_width interact—thin outer walls at high acceleration show artifacts first.",
  },
  inner_wall_speed: {
    impact:
      "Speed of inner perimeters. Often set higher than the outer wall to save time while keeping the skin slower for cosmetics.",
    related:
      "wall_loops multiply how long perimeters take; balance with outer_wall_speed.",
  },
  sparse_infill_speed: {
    impact:
      "How fast sparse infill is printed. Higher values shorten prints but can cause missed lines or poor bonding if the hotend cannot keep up.",
    related:
      "sparse_infill_density and default_acceleration limit how aggressive this can be.",
  },
  travel_speed: {
    impact:
      "Speed of non-printing moves. Higher values reduce stringing length and print time but can increase ghosting or noise if mechanics are pushed hard.",
    related:
      "travel_acceleration is the paired limit for how quickly the toolhead changes direction between travels.",
  },
  default_acceleration: {
    impact:
      "Acceleration for most extrusion moves. Lower values reduce corner ringing and mechanical stress; higher values shorten print time on zig-zag paths.",
    related:
      "All print speeds (walls, infill) feel this limit—especially on small segments.",
  },
  travel_acceleration: {
    impact:
      "Acceleration for travel-only moves. Often higher than print acceleration; too high may cause noise, skipped steps, or poor accuracy on some machines.",
    related:
      "Works with travel_speed; both define how aggressively the head repositions between extrusions.",
  },
  enable_support: {
    impact:
      "Turns generated supports on or off. Disabling removes automatic support where overhangs need it unless you rely on orientation or manual structures.",
    related:
      "support_type, support_style, and threshold/Z-distance settings only matter when this is on.",
  },
  support_type: {
    impact:
      "Structure of supports (e.g. normal vs. tree). Changes reach into cavities, material use, removability, and scarring on the model.",
    related:
      "support_threshold_angle and Z distances decide where supports appear and how they separate from the part.",
  },
  support_style: {
    impact:
      "Preset that tweaks support gap, interface behavior, or density patterns depending on Bambu Studio version—aimed at balance of hold vs. release.",
    related:
      "support_top_z_distance and support_interface_pattern refine contact quality beyond the style preset.",
  },
  support_on_build_plate_only: {
    impact:
      "When enabled, supports only grow from the bed—simpler removal and less scarring on the model, but internal overhangs may be unsupported.",
    related:
      "support_type and part orientation determine whether build-plate-only is viable.",
  },
  support_threshold_angle: {
    impact:
      "Maximum overhang angle before the slicer adds support. Lower angles add more supports (safer bridges); higher angles reduce supports but risk droop.",
    related:
      "layer_height affects what counts as a steep overhang per layer; pair with support_top_z_distance.",
  },
  support_top_z_distance: {
    impact:
      "Vertical gap between support and the underside of the model. Larger gaps ease removal and reduce weld marks; too large lets supported surfaces sag.",
    related:
      "support_bottom_z_distance handles the opposite contact; filament shrinkage influences good gaps.",
  },
  support_bottom_z_distance: {
    impact:
      "Gap settings for support meeting the model from below (where applicable). Similar trade-off: adhesion vs. ease of separation.",
    related:
      "support_top_z_distance and support_interface_pattern define the full contact picture.",
  },
  support_interface_pattern: {
    impact:
      "Pattern for dense support interface layers touching the part. Changes how strongly support sticks and how cleanly it releases.",
    related:
      "Z distances and filament choice (often filament profiles) strongly affect real-world release.",
  },
  brim_type: {
    impact:
      "Adds extra first-layer area around the model to resist warping and improve adhesion on small or tall footprints.",
    related:
      "brim_width and brim_object_gap control how far it extends and how it detaches from the part outline.",
  },
  brim_width: {
    impact:
      "How far the brim extends from the model. Wider brims anchor better but use more filament and need more cleanup.",
    related:
      "brim_type selects whether a brim is used; brim_object_gap affects separation from the shell.",
  },
  brim_object_gap: {
    impact:
      "Spacing between brim and model outline. A small gap keeps the brim removable in one piece; zero can fuse the brim tightly to the shell.",
    related:
      "brim_width sets the outer extent; together they define brim usability.",
  },
  skirt_loops: {
    impact:
      "Number of outline loops printed away from the model to prime the nozzle before the job starts. More loops purge more material before the part begins.",
    related:
      "skirt_distance and skirt_height control placement and vertical extent of that priming path.",
  },
  skirt_distance: {
    impact:
      "How far the skirt sits from the model footprint. Too close can weld skirt plastic to the part if ooze spreads.",
    related: "skirt_loops sets how much priming you get at that distance.",
  },
  skirt_height: {
    impact:
      "How many layers tall the skirt is. Usually one; taller skirts are rare but can help stabilize ooze or draft in niche setups.",
    related:
      "Primarily interacts with skirt_loops for startup purging behavior.",
  },
  enable_prime_tower: {
    impact:
      "Adds a tower used to purge and stabilize flow when switching materials or colors. Important for multi-material prints to avoid bleed in the model.",
    related:
      "prime_tower_width sets cross-section; AMS wipe volumes and toolchange settings (elsewhere) complete the picture.",
  },
  prime_tower_width: {
    impact:
      "Width of the prime tower footprint. Wider towers are more stable and hold more purge per layer; too narrow can topple or clog.",
    related:
      "enable_prime_tower must be on; material volumes per swap should match tower capacity.",
  },
} as const satisfies Readonly<Record<string, BambuPropertyTooltip>>;

export function propertyTooltipForKey(key: string): BambuPropertyTooltip {
  if (Object.prototype.hasOwnProperty.call(BAMBU_PROPERTY_TOOLTIPS, key)) {
    return BAMBU_PROPERTY_TOOLTIPS[key as keyof typeof BAMBU_PROPERTY_TOOLTIPS];
  }
  return {
    impact:
      "This process parameter is carried through the inheritance chain. Overriding it in a derived profile replaces the parent value for this key only.",
  };
}
