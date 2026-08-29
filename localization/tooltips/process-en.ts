/**
 * English hover copy for process profile keys (TreeGrid).
 *
 * Setting semantics are based on Bambu Studio's current PrintConfig.cpp and,
 * where available, the official Bambu Lab Wiki:
 * https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/PrintConfig.cpp
 * https://wiki.bambulab.com/en/software/bambu-studio/
 *
 * Keep practical guidance conservative: do not infer behavior from preset
 * values, and distinguish prime-tower priming from filament flushing.
 */

export type ProcessTooltipEntry = {
  impact: string;
  related?: string;
};

export const PROCESS_TOOLTIP_DEFAULT_EN: ProcessTooltipEntry = {
  impact:
    "This process parameter is carried through the inheritance chain. Overriding it in a derived profile replaces the parent value for this key only.",
};

export const PROCESS_TOOLTIPS_EN: Readonly<
  Partial<Record<string, ProcessTooltipEntry>>
> = {
  layer_height: {
    impact:
      "Sets the thickness of each printed layer. Smaller values can improve detail and surface finish but require more layers and usually increase print time.",
    related:
      "Bambu recommends a normal layer height of roughly 20–70% of nozzle diameter; the configured extruder limits are the final constraint.",
  },
  initial_layer_print_height: {
    impact:
      "First-layer thickness only. A slightly thicker first layer improves bed adhesion and forgives small bed unevenness; too thin risks failed first layers.",
    related:
      "Works with initial_layer_line_width and initial_layer_speed—those three together define first-layer squish and reliability.",
  },
  line_width: {
    impact:
      "Default extrusion width used when a feature-specific line width is set to zero. Feature-specific widths override it where applicable.",
    related:
      "Outer wall, inner wall, top surface, solid infill, and sparse infill can each define their own line width.",
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
      "Sets the extrusion width of inner walls. It changes the geometry used to generate internal perimeter paths.",
    related:
      "Use it together with outer_wall_line_width and wall_loops; changing width does not by itself guarantee a faster or stronger print.",
  },
  sparse_infill_line_width: {
    impact:
      "Sets the extrusion width of sparse-infill paths. The requested infill density remains controlled separately.",
    related:
      "This width is also the reference used by percentage-based settings such as infill/wall overlap.",
  },
  internal_solid_infill_line_width: {
    impact:
      "Line width for solid infill between walls and under top surfaces. Influences how quickly large flat areas fill and whether small gaps appear.",
    related:
      "top_surface_line_width and top_shell_layers affect how the top skin finishes over this infill.",
  },
  top_surface_line_width: {
    impact: "Sets the extrusion width used on the model's top surfaces.",
    related:
      "Top shell layers, flow calibration, and support from the infill below also affect top-surface quality.",
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
      "Fits suitable toolpath segments to G2/G3 arc moves using the same tolerance as the configured resolution.",
    related:
      "Enable it only when the printer firmware supports G2/G3 arc commands correctly.",
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
      "Sets the number of solid layers in the bottom shell, including the bottom surface layer.",
    related:
      "If that layer count is thinner than the configured bottom-shell thickness, Bambu Studio increases the number of layers.",
  },
  wall_infill_order: {
    impact:
      "Legacy setting that selected the order of inner walls, outer walls, and infill within a layer.",
    related:
      "Current Bambu Studio migrates this key to wall_sequence; new profiles should use the current setting.",
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
      "Sets the speed of non-extruding travel moves. Higher values reduce travel time but may increase noise or motion errors if the machine is pushed too hard.",
    related:
      "Travel acceleration determines how quickly the requested travel speed can be reached; path length itself does not change.",
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
      "Selects the shape and construction strategy of the support. Normal styles trade a regular, stable grid against snug material-saving towers; tree styles change branch merging and strength.",
    related:
      "Available styles depend on support_type. Contact gaps and interface patterns are configured separately.",
  },
  support_on_build_plate_only: {
    impact:
      "When enabled, supports only grow from the bed—simpler removal and less scarring on the model, but internal overhangs may be unsupported.",
    related:
      "support_type and part orientation determine whether build-plate-only is viable.",
  },
  support_threshold_angle: {
    impact:
      "Generates automatic support for surfaces whose slope to the horizontal is below this threshold. A larger threshold generally generates more support.",
    related:
      "Bambu Studio measures this angle from the horizontal, which is the opposite convention from some overhang test models.",
  },
  support_top_z_distance: {
    impact:
      "Vertical gap between support and the underside of the model. Larger gaps ease removal and reduce weld marks; too large lets supported surfaces sag.",
    related:
      "support_bottom_z_distance handles the opposite contact; filament shrinkage influences good gaps.",
  },
  support_bottom_z_distance: {
    impact:
      "Sets the vertical gap between a bottom support interface and the object beneath it.",
    related:
      "This applies where support starts on an object surface; support_top_z_distance controls the gap below a supported object surface.",
  },
  support_interface_pattern: {
    impact:
      "Pattern for dense support interface layers touching the part. Changes how strongly support sticks and how cleanly it releases.",
    related:
      "Z distances and filament choice (often filament profiles) strongly affect real-world release.",
  },
  brim_type: {
    impact:
      "Controls whether Bambu Studio generates a brim on the outer side, inner side, both sides, automatically, or not at all.",
    related:
      "A brim increases first-layer contact area. In automatic mode, Bambu Studio calculates the required brim for each object.",
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
      "Adds a tower that removes residual material from the nozzle and stabilizes nozzle pressure before printing the object after a filament change or smooth timelapse move.",
    related:
      "The prime tower is not the filament flush: flushing removes the previous material, while the tower restores consistent flow and wipes the nozzle.",
  },
  prime_tower_width: {
    impact: "Sets the width of the prime-tower footprint.",
    related:
      "Prime volume controls how much is printed on the tower for each switch. It is separate from the filament flushing volume.",
  },
};
