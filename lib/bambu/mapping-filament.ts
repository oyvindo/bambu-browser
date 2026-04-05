/**
 * Bambu Studio filament profile: Filament / Cooling / Setting Overrides tabs only.
 * JSON keys align with fdm_filament_common.json and user base presets (e.g. filament/base).
 */

import type { BambuMappedGroup } from "./mapping";

export const BAMBU_FILAMENT_UI_TREE: readonly BambuMappedGroup[] = [
  {
    id: "filament",
    label: "Filament",
    subgroups: [
      {
        id: "filament-basic",
        label: "Basic information",
        properties: [
          { key: "filament_type", label: "Type", unit: "string" },
          { key: "filament_vendor", label: "Vendor", unit: "string" },
          {
            key: "default_filament_colour",
            label: "Default color",
            unit: "string",
          },
          { key: "filament_diameter", label: "Diameter", unit: "mm" },
          { key: "filament_flow_ratio", label: "Flow ratio", unit: "count" },
          { key: "filament_density", label: "Density", unit: "g/cm³" },
          { key: "filament_shrink", label: "Shrinkage", unit: "%" },
          {
            key: "filament_velocity_adaptation_factor",
            label: "Velocity adaptation factor",
            unit: "count",
          },
          { key: "filament_cost", label: "Price", unit: "money/kg" },
          {
            key: "temperature_vitrification",
            label: "Softening temperature",
            unit: "°C",
          },
          {
            key: "filament_prime_volume",
            label: "Filament prime volume (filament change)",
            unit: "mm³",
          },
          {
            key: "filament_prime_volume_nc",
            label: "Filament prime volume (hotend change)",
            unit: "mm³",
          },
          {
            key: "filament_change_length",
            label: "Filament ramming length (extruder change)",
            unit: "mm",
          },
          {
            key: "filament_change_length_nc",
            label: "Filament ramming length (hotend change)",
            unit: "mm",
          },
          {
            key: "filament_ramming_travel_time",
            label: "Travel time after ramming (extruder change)",
            unit: "s",
          },
          {
            key: "filament_ramming_travel_time_nc",
            label: "Travel time after ramming (hotend change)",
            unit: "s",
          },
          {
            key: "filament_pre_cooling_temperature",
            label: "Precooling target temperature (extruder change)",
            unit: "°C",
          },
          {
            key: "filament_pre_cooling_temperature_nc",
            label: "Precooling target temperature (hotend change)",
            unit: "°C",
          },
          {
            key: "nozzle_temperature_range_low",
            label: "Recommended nozzle temperature (min)",
            unit: "°C",
          },
          {
            key: "nozzle_temperature_range_high",
            label: "Recommended nozzle temperature (max)",
            unit: "°C",
          },
        ],
      },
      {
        id: "filament-print-temp",
        label: "Print temperature",
        properties: [
          {
            key: "supertack_plate_temp_initial_layer",
            label: "Cool Plate SuperTack — initial layer",
            unit: "°C",
          },
          {
            key: "supertack_plate_temp",
            label: "Cool Plate SuperTack — other layers",
            unit: "°C",
          },
          {
            key: "cool_plate_temp_initial_layer",
            label: "Cool Plate — initial layer",
            unit: "°C",
          },
          {
            key: "cool_plate_temp",
            label: "Cool Plate — other layers",
            unit: "°C",
          },
          {
            key: "eng_plate_temp_initial_layer",
            label: "Engineering Plate — initial layer",
            unit: "°C",
          },
          {
            key: "eng_plate_temp",
            label: "Engineering Plate — other layers",
            unit: "°C",
          },
          {
            key: "hot_plate_temp_initial_layer",
            label: "Smooth PEI / High Temp Plate — initial layer",
            unit: "°C",
          },
          {
            key: "hot_plate_temp",
            label: "Smooth PEI / High Temp Plate — other layers",
            unit: "°C",
          },
          {
            key: "textured_plate_temp_initial_layer",
            label: "Textured PEI Plate — initial layer",
            unit: "°C",
          },
          {
            key: "textured_plate_temp",
            label: "Textured PEI Plate — other layers",
            unit: "°C",
          },
          {
            key: "nozzle_temperature_initial_layer",
            label: "Nozzle — initial layer",
            unit: "°C",
          },
          {
            key: "nozzle_temperature",
            label: "Nozzle — other layers",
            unit: "°C",
          },
        ],
      },
      {
        id: "filament-volumetric",
        label: "Volumetric speed limitation",
        properties: [
          {
            key: "filament_adaptive_volumetric_speed",
            label: "Adaptive volumetric speed",
            unit: "boolean",
          },
          {
            key: "filament_max_volumetric_speed",
            label: "Max volumetric speed",
            unit: "mm³/s",
          },
          {
            key: "filament_ramming_volumetric_speed",
            label: "Ramming volumetric speed (extruder change)",
            unit: "mm³/s",
          },
          {
            key: "filament_ramming_volumetric_speed_nc",
            label: "Ramming volumetric speed (hotend change)",
            unit: "mm³/s",
          },
        ],
      },
      {
        id: "filament-scarf",
        label: "Filament scarf seam settings",
        properties: [
          {
            key: "filament_scarf_seam_type",
            label: "Scarf seam type",
            unit: "enum",
          },
          {
            key: "filament_scarf_height",
            label: "Scarf start height",
            unit: "mm/%",
          },
          {
            key: "filament_scarf_gap",
            label: "Scarf slope gap",
            unit: "mm/%",
          },
          {
            key: "filament_scarf_length",
            label: "Scarf length",
            unit: "mm",
          },
        ],
      },
    ],
  },
  {
    id: "cooling",
    label: "Cooling",
    subgroups: [
      {
        id: "cooling-specific-layer",
        label: "Cooling for specific layer",
        properties: [
          {
            key: "close_fan_the_first_x_layers",
            label: "Special cooling — for the first (layers)",
            unit: "layers",
          },
          {
            key: "first_x_layer_fan_speed",
            label: "Special cooling — fan speed (first layers)",
            unit: "%",
          },
        ],
      },
      {
        id: "cooling-part-fan",
        label: "Part cooling fan",
        properties: [
          {
            key: "fan_min_speed",
            label: "Min fan speed threshold — fan speed",
            unit: "%",
          },
          {
            key: "fan_cooling_layer_time",
            label: "Min fan speed threshold — layer time",
            unit: "s",
          },
          {
            key: "fan_max_speed",
            label: "Max fan speed threshold — fan speed",
            unit: "%",
          },
          {
            key: "slow_down_layer_time",
            label: "Max fan speed threshold — layer time",
            unit: "s",
          },
          {
            key: "reduce_fan_stop_start_freq",
            label: "Keep fan always on",
            unit: "boolean",
          },
          {
            key: "slow_down_for_layer_cooling",
            label: "Slow printing down for better layer cooling",
            unit: "boolean",
          },
          {
            key: "no_slow_down_for_cooling_on_outwalls",
            label: "Don't slow down outer walls",
            unit: "boolean",
          },
          {
            key: "slow_down_min_speed",
            label: "Min print speed",
            unit: "mm/s",
          },
          {
            key: "enable_overhang_bridge_fan",
            label: "Force cooling for overhangs and bridges",
            unit: "boolean",
          },
          {
            key: "overhang_fan_threshold",
            label: "Cooling overhang threshold",
            unit: "enum",
          },
          {
            key: "overhang_threshold_participating_cooling",
            label: "Overhang threshold for participating cooling",
            unit: "enum",
          },
          {
            key: "overhang_fan_speed",
            label: "Fan speed for overhangs",
            unit: "%",
          },
          {
            key: "pre_start_fan_time",
            label: "Pre start fan time",
            unit: "s",
          },
        ],
      },
      {
        id: "cooling-aux",
        label: "Auxiliary part cooling fan",
        properties: [
          {
            key: "additional_cooling_fan_speed",
            label: "Fan speed",
            unit: "%",
          },
        ],
      },
    ],
  },
  {
    id: "setting-overrides",
    label: "Setting Overrides",
    subgroups: [
      {
        id: "overrides-retraction",
        label: "Retraction",
        properties: [
          {
            key: "filament_retraction_length",
            label: "Length",
            unit: "mm",
          },
          { key: "filament_z_hop", label: "Z hop when retract", unit: "mm" },
          { key: "filament_z_hop_types", label: "Z hop type", unit: "enum" },
          {
            key: "filament_retraction_speed",
            label: "Retraction speed",
            unit: "mm/s",
          },
          {
            key: "filament_deretraction_speed",
            label: "Deretraction speed",
            unit: "mm/s",
          },
          {
            key: "filament_retract_restart_extra",
            label: "Extra length on restart",
            unit: "mm",
          },
          {
            key: "filament_retraction_minimum_travel",
            label: "Travel distance threshold",
            unit: "mm",
          },
          {
            key: "filament_retract_when_changing_layer",
            label: "Retract when change layer",
            unit: "boolean",
          },
          {
            key: "filament_wipe",
            label: "Wipe while retracting",
            unit: "boolean",
          },
          {
            key: "filament_wipe_distance",
            label: "Wipe distance",
            unit: "mm",
          },
          {
            key: "filament_retract_before_wipe",
            label: "Retract amount before wipe",
            unit: "%",
          },
          {
            key: "filament_long_retractions_when_cut",
            label: "Long retraction when cut",
            unit: "boolean",
          },
          {
            key: "filament_retraction_distances_when_cut",
            label: "Retraction distance when cut",
            unit: "mm",
          },
          {
            key: "filament_long_retractions_when_ec",
            label: "Long retraction when cut (extruder change)",
            unit: "boolean",
          },
          {
            key: "filament_retraction_distances_when_ec",
            label: "Retraction distance when cut (extruder change)",
            unit: "mm",
          },
          {
            key: "long_retractions_when_ec",
            label: "Long retraction when cut (hotend, legacy)",
            unit: "boolean",
            advanced: true,
          },
          {
            key: "retraction_distances_when_ec",
            label: "Retraction distance when cut (hotend, legacy)",
            unit: "mm",
            advanced: true,
          },
        ],
      },
      {
        id: "overrides-speed",
        label: "Speed",
        properties: [
          {
            key: "override_process_overhang_speed",
            label: "Override overhang speed",
            unit: "boolean",
          },
          {
            key: "filament_enable_overhang_speed",
            label: "Enable overhang speed limits",
            unit: "boolean",
          },
          {
            key: "filament_overhang_1_4_speed",
            label: "Overhang speed (1/4)",
            unit: "mm/s",
          },
          {
            key: "filament_overhang_2_4_speed",
            label: "Overhang speed (2/4)",
            unit: "mm/s",
          },
          {
            key: "filament_overhang_3_4_speed",
            label: "Overhang speed (3/4)",
            unit: "mm/s",
          },
          {
            key: "filament_overhang_4_4_speed",
            label: "Overhang speed (4/4)",
            unit: "mm/s",
          },
          {
            key: "filament_overhang_totally_speed",
            label: "Overhang speed (full overhang)",
            unit: "mm/s",
          },
          {
            key: "filament_bridge_speed",
            label: "Bridge speed",
            unit: "mm/s",
          },
        ],
      },
    ],
  },
];
