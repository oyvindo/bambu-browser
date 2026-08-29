import type {
  BambuMappedGroup,
  BambuPropertyRowDef,
  BambuValueUnit,
} from "./mapping";
import type { InheritanceChainLevel, ProfileKind } from "./resolver";

export const PROCESS_ROOT_KEYS = [
  "adaptive_layer_height",
  "avoid_crossing_wall_includes_support",
  "bottom_color_penetration_layers",
  "bottom_shell_layers",
  "bottom_shell_thickness",
  "bottom_surface_density",
  "bottom_surface_pattern",
  "bridge_flow",
  "bridge_no_support",
  "bridge_speed",
  "brim_object_gap",
  "brim_width",
  "circle_compensation_manual_offset",
  "compatible_printers_condition",
  "default_acceleration",
  "detect_floating_vertical_shell",
  "detect_overhang_wall",
  "detect_thin_wall",
  "draft_shield",
  "elefant_foot_compensation",
  "enable_arc_fitting",
  "enable_circle_compensation",
  "enable_prime_tower",
  "enable_support",
  "enable_support_ironing",
  "enable_tower_interface_features",
  "enable_wrapping_detection",
  "filename_format",
  "fill_multiline",
  "from",
  "fuzzy_skin",
  "fuzzy_skin_first_layer",
  "fuzzy_skin_mode",
  "fuzzy_skin_noise_type",
  "fuzzy_skin_octaves",
  "fuzzy_skin_persistence",
  "fuzzy_skin_point_distance",
  "fuzzy_skin_scale",
  "fuzzy_skin_thickness",
  "gap_infill_speed",
  "infill_combination",
  "infill_direction",
  "infill_instead_top_bottom_surfaces",
  "infill_lock_depth",
  "infill_rotate_step",
  "infill_shift_step",
  "infill_wall_overlap",
  "initial_layer_line_width",
  "initial_layer_print_height",
  "initial_layer_speed",
  "initial_layer_travel_acceleration",
  "inner_wall_line_width",
  "inner_wall_speed",
  "instantiation",
  "interface_shells",
  "internal_bridge_support_thickness",
  "internal_solid_infill_line_width",
  "internal_solid_infill_speed",
  "ironing_flow",
  "ironing_inset",
  "ironing_spacing",
  "ironing_speed",
  "ironing_type",
  "layer_height",
  "layer_time_smoothing",
  "layer_time_smoothing_threshold",
  "line_width",
  "locked_skeleton_infill_pattern",
  "locked_skin_infill_pattern",
  "max_bridge_length",
  "max_travel_detour_distance",
  "minimum_sparse_infill_area",
  "monotonic_travel_into_wall",
  "name",
  "only_one_wall_top",
  "outer_wall_line_width",
  "outer_wall_speed",
  "overhang_totally_speed",
  "override_filament_scarf_seam_setting",
  "pre_start_fan_time",
  "prime_tower_brim_width",
  "prime_tower_enable_framework",
  "prime_tower_flat_ironing",
  "prime_tower_lift_height",
  "prime_tower_lift_speed",
  "prime_tower_max_speed",
  "prime_tower_width",
  "print_sequence",
  "print_settings_id",
  "raft_layers",
  "reduce_crossing_wall",
  "reduce_infill_retraction_mode",
  "resolution",
  "scarf_angle_threshold",
  "seam_placement_away_from_overhangs",
  "seam_position",
  "seam_slope_gap",
  "seam_slope_min_length",
  "seam_slope_start_height",
  "seam_slope_type",
  "skeleton_infill_density",
  "skeleton_infill_line_width",
  "skin_infill_density",
  "skin_infill_depth",
  "skin_infill_line_width",
  "skirt_distance",
  "skirt_height",
  "skirt_loops",
  "skirt_per_object",
  "smooth_coefficient",
  "solid_infill_filament",
  "sparse_infill_density",
  "sparse_infill_filament",
  "sparse_infill_lattice_angle_1",
  "sparse_infill_lattice_angle_2",
  "sparse_infill_line_width",
  "sparse_infill_pattern",
  "sparse_infill_speed",
  "spiral_mode",
  "standby_temperature_delta",
  "support_base_pattern",
  "support_base_pattern_spacing",
  "support_bottom_z_distance",
  "support_expansion",
  "support_filament",
  "support_interface_bottom_layers",
  "support_interface_filament",
  "support_interface_loop_pattern",
  "support_interface_pattern",
  "support_interface_spacing",
  "support_interface_speed",
  "support_interface_top_layers",
  "support_ironing_direction",
  "support_ironing_flow",
  "support_ironing_inset",
  "support_ironing_pattern",
  "support_ironing_spacing",
  "support_ironing_speed",
  "support_line_width",
  "support_object_xy_distance",
  "support_on_build_plate_only",
  "support_speed",
  "support_style",
  "support_threshold_angle",
  "support_top_z_distance",
  "support_type",
  "symmetric_infill_y_axis",
  "top_color_penetration_layers",
  "top_shell_layers",
  "top_shell_thickness",
  "top_solid_infill_flow_ratio",
  "top_surface_density",
  "top_surface_line_width",
  "top_surface_pattern",
  "top_surface_speed",
  "travel_acceleration",
  "travel_short_distance_acceleration",
  "travel_speed",
  "tree_support_branch_angle",
  "tree_support_branch_diameter",
  "tree_support_wall_count",
  "type",
  "wall_filament",
  "wall_generator",
  "wall_infill_order",
  "wall_loops",
  "wipe_tower_no_sparse_layers",
  "xy_contour_compensation",
  "xy_hole_compensation",
  "z_direction_outwall_speed_continuous",
] as const;

export const FILAMENT_ROOT_KEYS = [
  "activate_air_filtration",
  "additional_cooling_fan_speed",
  "additional_fan_full_speed_layer",
  "chamber_temperatures",
  "circle_compensation_speed",
  "close_additional_fan_first_x_layers",
  "close_fan_the_first_x_layers",
  "compatible_printers",
  "complete_print_exhaust_fan_speed",
  "cool_plate_temp",
  "cool_plate_temp_initial_layer",
  "cooling_perimeter_transition_distance",
  "cooling_slowdown_logic",
  "counter_coef_1",
  "counter_coef_2",
  "counter_coef_3",
  "counter_limit_max",
  "counter_limit_min",
  "diameter_limit",
  "during_print_exhaust_fan_speed",
  "eng_plate_temp",
  "eng_plate_temp_initial_layer",
  "fan_cooling_layer_time",
  "fan_max_speed",
  "fan_min_speed",
  "filament_adaptive_volumetric_speed",
  "filament_bridge_speed",
  "filament_change_length",
  "filament_contact_safe",
  "filament_cooling_before_tower",
  "filament_cost",
  "filament_density",
  "filament_deretraction_speed",
  "filament_dev_ams_drying_ams_limitations",
  "filament_dev_ams_drying_heat_distortion_temperature",
  "filament_dev_ams_drying_temperature",
  "filament_dev_ams_drying_time",
  "filament_dev_chamber_drying_bed_temperature",
  "filament_dev_chamber_drying_time",
  "filament_dev_drying_cooling_temperature",
  "filament_dev_drying_softening_temperature",
  "filament_diameter",
  "filament_emission_safe",
  "filament_enable_overhang_speed",
  "filament_end_gcode",
  "filament_extruder_compatibility",
  "filament_extruder_variant",
  "filament_flow_ratio",
  "filament_flush_temp",
  "filament_flush_temp_fast",
  "filament_flush_volumetric_speed",
  "filament_ingredients_safe",
  "filament_is_support",
  "filament_long_retractions_when_cut",
  "filament_long_retractions_when_ec",
  "filament_max_volumetric_speed",
  "filament_metal_stickiness",
  "filament_minimal_purge_on_wipe_tower",
  "filament_overhang_1_4_speed",
  "filament_overhang_2_4_speed",
  "filament_overhang_3_4_speed",
  "filament_overhang_4_4_speed",
  "filament_overhang_totally_speed",
  "filament_pre_cooling_temperature",
  "filament_pre_cooling_temperature_nc",
  "filament_preheat_temperature_delta",
  "filament_prime_volume",
  "filament_prime_volume_nc",
  "filament_printable",
  "filament_ramming_travel_time",
  "filament_ramming_travel_time_nc",
  "filament_ramming_volumetric_speed",
  "filament_ramming_volumetric_speed_nc",
  "filament_retract_before_wipe",
  "filament_retract_length_nc",
  "filament_retract_restart_extra",
  "filament_retract_when_changing_layer",
  "filament_retraction_distances_when_cut",
  "filament_retraction_distances_when_ec",
  "filament_retraction_length",
  "filament_retraction_minimum_travel",
  "filament_retraction_speed",
  "filament_scarf_gap",
  "filament_scarf_height",
  "filament_scarf_length",
  "filament_scarf_seam_type",
  "filament_settings_id",
  "filament_shrink",
  "filament_soluble",
  "filament_start_gcode",
  "filament_tower_interface_pre_extrusion_dist",
  "filament_tower_interface_pre_extrusion_length",
  "filament_tower_interface_print_temp",
  "filament_tower_interface_purge_volume",
  "filament_tower_ironing_area",
  "filament_type",
  "filament_velocity_adaptation_factor",
  "filament_vendor",
  "filament_wipe",
  "filament_wipe_distance",
  "filament_z_hop",
  "filament_z_hop_types",
  "from",
  "full_fan_speed_layer",
  "hole_coef_1",
  "hole_coef_2",
  "hole_coef_3",
  "hole_limit_max",
  "hole_limit_min",
  "hot_plate_temp",
  "hot_plate_temp_initial_layer",
  "impact_strength_z",
  "instantiation",
  "long_retractions_when_ec",
  "name",
  "no_slow_down_for_cooling_on_outwalls",
  "nozzle_temperature",
  "nozzle_temperature_initial_layer",
  "nozzle_temperature_range_high",
  "nozzle_temperature_range_low",
  "overhang_fan_speed",
  "overhang_fan_threshold",
  "override_process_overhang_speed",
  "reduce_fan_stop_start_freq",
  "required_nozzle_HRC",
  "retraction_distances_when_ec",
  "slow_down_for_layer_cooling",
  "slow_down_layer_time",
  "slow_down_min_speed",
  "supertack_plate_temp",
  "supertack_plate_temp_initial_layer",
  "temperature_vitrification",
  "textured_plate_temp",
  "textured_plate_temp_initial_layer",
  "type",
  "volumetric_speed_coefficients",
] as const;

export const PROFILE_METADATA_KEYS = new Set([
  "compatible_printers",
  "compatible_printers_condition",
  "filament_settings_id",
  "from",
  "inherits",
  "instantiation",
  "name",
  "print_settings_id",
  "setting_id",
  "type",
  "version",
]);

const BOOLEAN_KEY_RE =
  /^(activate_|avoid_|detect_|enable_|fill_|only_|override_|reduce_|spiral_|symmetric_|wipe_)|(_enable|_enabled|_safe|_support|_printable|_soluble|_when_|_only|_multiline|_framework|_ironing)$/;
const PERCENT_KEY_RE =
  /(_density|_fan_speed|fan_(min|max)_speed|_flow$|_overlap|_penetration|_shrink$)/;
const TEMPERATURE_KEY_RE = /(temperature|_temp($|_)|chamber_temperatures)/;
const SPEED_KEY_RE = /(_speed|speed_)/;
const ACCELERATION_KEY_RE = /acceleration/;
const DISTANCE_KEY_RE =
  /(distance|_gap$|_height$|_length$|_width$|_diameter$|_thickness$|_inset$|_spacing$|_offset$|_depth$|resolution|xy_.*compensation)/;
const ANGLE_KEY_RE = /(angle|direction$|_direction_|rotate_step)/;
const LAYER_COUNT_KEY_RE =
  /(layers?$|_layers_|layer$|_octaves$|wall_loops|skirt_loops|wall_count)/;
const ENUM_KEY_RE =
  /(pattern|type$|style$|mode$|position$|order$|logic$|sequence$|noise_type|z_hop_types)/;

export function inferUnitForKey(key: string, value?: unknown): BambuValueUnit {
  if (PROFILE_METADATA_KEYS.has(key)) return "string";
  if (BOOLEAN_KEY_RE.test(key)) return "boolean";
  if (TEMPERATURE_KEY_RE.test(key)) return "°C";
  if (ACCELERATION_KEY_RE.test(key)) return "mm/s²";
  if (SPEED_KEY_RE.test(key)) return "mm/s";
  if (PERCENT_KEY_RE.test(key)) return "%";
  if (ANGLE_KEY_RE.test(key)) return "°";
  if (LAYER_COUNT_KEY_RE.test(key)) return "layers";
  if (DISTANCE_KEY_RE.test(key)) return "mm";
  if (ENUM_KEY_RE.test(key)) return "enum";
  if (typeof value === "boolean" || value === "true" || value === "false") {
    return "boolean";
  }
  return "string";
}

function firstDefinedValue(
  chain: readonly InheritanceChainLevel[],
  key: string,
): unknown {
  for (const level of chain) {
    if (Object.prototype.hasOwnProperty.call(level.data, key)) {
      return level.data[key];
    }
  }
  return undefined;
}

function additionalSectionId(kind: ProfileKind, key: string): string {
  if (PROFILE_METADATA_KEYS.has(key)) return "metadata";
  if (kind === "filament") {
    if (/fan|cool|temperature|_temp|filtration|exhaust/.test(key)) {
      return "thermal-cooling";
    }
    if (/retract|wipe|ramming|purge|flush|tower/.test(key)) {
      return "extrusion-change";
    }
    if (
      /dry|safe|compatib|printable|soluble|ingredient|stickiness|HRC/.test(key)
    ) {
      return "material-properties";
    }
    if (/hole|counter|circle|coef|limit|diameter/.test(key)) {
      return "dimensional-compensation";
    }
    return "other-settings";
  }
  if (/support|raft/.test(key)) return "support-additional";
  if (/infill|shell|surface|wall|bridge/.test(key))
    return "strength-additional";
  if (/speed|acceleration|travel/.test(key)) return "speed-additional";
  if (/seam|line_width|layer|resolution|compensation|fuzzy|ironing/.test(key)) {
    return "quality-additional";
  }
  if (/tower|brim|skirt|sequence|gcode|filename|draft/.test(key)) {
    return "output-additional";
  }
  return "other-settings";
}

const SECTION_LABELS: Readonly<Record<string, string>> = {
  "dimensional-compensation": "Dimensional compensation",
  "extrusion-change": "Extrusion and material changes",
  "material-properties": "Material properties",
  metadata: "Profile metadata",
  "other-settings": "Other settings",
  "output-additional": "Output and auxiliary structures",
  "quality-additional": "Additional quality settings",
  "speed-additional": "Additional speed settings",
  "strength-additional": "Additional strength settings",
  "support-additional": "Additional support settings",
  "thermal-cooling": "Temperature, drying and cooling",
};

export function collectChainKeys(
  chain: readonly InheritanceChainLevel[],
): string[] {
  const keys = new Set<string>();
  for (const level of chain) {
    for (const key of Object.keys(level.data)) keys.add(key);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function buildCompleteUiTree(
  kind: ProfileKind,
  chain: readonly InheritanceChainLevel[],
  curatedTree: readonly BambuMappedGroup[],
): readonly BambuMappedGroup[] {
  const mapped = new Set(
    curatedTree.flatMap((group) =>
      group.subgroups.flatMap((subgroup) =>
        subgroup.properties.map((property) => property.key),
      ),
    ),
  );
  const rootKeys = kind === "filament" ? FILAMENT_ROOT_KEYS : PROCESS_ROOT_KEYS;
  const allKeys = new Set<string>([...rootKeys, ...collectChainKeys(chain)]);
  const extras = [...allKeys].filter((key) => !mapped.has(key));
  const bySection = new Map<string, BambuPropertyRowDef[]>();

  for (const key of extras) {
    const sectionId = additionalSectionId(kind, key);
    const properties = bySection.get(sectionId) ?? [];
    properties.push({
      key,
      label: key,
      unit: inferUnitForKey(key, firstDefinedValue(chain, key)),
    });
    bySection.set(sectionId, properties);
  }

  const settingsSubgroups = [...bySection.entries()]
    .filter(([id]) => id !== "metadata")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, properties]) => ({
      id,
      label: SECTION_LABELS[id] ?? id,
      properties: properties.sort((a, b) => a.key.localeCompare(b.key)),
    }));
  const metadata = bySection.get("metadata");

  return [
    ...curatedTree,
    ...(settingsSubgroups.length
      ? [
          {
            id: "additional-settings",
            label: "Additional settings",
            subgroups: settingsSubgroups,
          },
        ]
      : []),
    ...(metadata?.length
      ? [
          {
            id: "metadata",
            label: "Metadata",
            subgroups: [
              {
                id: "metadata",
                label: SECTION_LABELS.metadata,
                properties: metadata.sort((a, b) => a.key.localeCompare(b.key)),
              },
            ],
          },
        ]
      : []),
  ];
}

export function flattenTreeKeys(tree: readonly BambuMappedGroup[]): string[] {
  return tree.flatMap((group) =>
    group.subgroups.flatMap((subgroup) =>
      subgroup.properties.map((property) => property.key),
    ),
  );
}
