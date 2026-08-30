import { describe, expect, it } from "vitest";

import {
  findProfileKeyRange,
  formatProfileJson,
  hasLockedFieldFinding,
  profileSettingKeys,
  restoreLockedProfileFields,
  validateProfileJson,
} from "./profile-leaf-editor";

const original = {
  type: "process",
  name: "My profile",
  inherits: "0.20mm Standard @BBL A1",
  layer_height: "0.2",
};

describe("profile leaf formatting", () => {
  it("sorts nested keys and uses four spaces", () => {
    expect(formatProfileJson({ z: { b: 1, a: 2 }, a: [2, 1] })).toBe(
      '{\n    "a": [\n        2,\n        1\n    ],\n    "z": {\n        "a": 2,\n        "b": 1\n    }\n}\n',
    );
  });

  it("lists leaf setting keys without profile metadata", () => {
    expect(
      profileSettingKeys({
        name: "My profile",
        inherits: "Parent",
        from: "User",
        version: "1.0",
        layer_height: "0.2",
        sparse_infill_density: "15%",
      }),
    ).toEqual(["layer_height", "sparse_infill_density"]);
  });
});

describe("locating a field in the editor buffer", () => {
  const text = formatProfileJson({
    filament_cost: ["249"],
    layer_height: "0.2",
    nested: { layer_height: "9" },
  });

  function slice(key: string): string | null {
    const range = findProfileKeyRange(text, key);
    return range ? text.slice(range.start, range.end) : null;
  }

  it("spans the key and a scalar value", () => {
    expect(slice("layer_height")).toBe('"layer_height": "0.2"');
  });

  it("spans a multi-line array value", () => {
    expect(slice("filament_cost")).toBe(
      '"filament_cost": [\n        "249"\n    ]',
    );
  });

  it("spans a nested object value rather than its inner key", () => {
    expect(slice("nested")).toBe(
      '"nested": {\n        "layer_height": "9"\n    }',
    );
  });

  it("returns null for a key that is not present at the top level", () => {
    expect(findProfileKeyRange(text, "missing")).toBeNull();
  });
});

describe("profile leaf validation", () => {
  it("blocks invalid JSON and non-object JSON", () => {
    expect(
      validateProfileJson("{", { kind: "process", original }).canSave,
    ).toBe(false);
    expect(
      validateProfileJson("[]", { kind: "process", original }).canSave,
    ).toBe(false);
  });

  it.each(["inherits", "name", "type", "from"] as const)(
    "rejects changes to locked field %s",
    (key) => {
      const changed = { ...original, [key]: "changed" };
      const result = validateProfileJson(JSON.stringify(changed), {
        kind: "process",
        original,
      });
      expect(result.canSave).toBe(false);
      expect(result.findings.some((finding) => finding.key === key)).toBe(true);
      expect(hasLockedFieldFinding(result.findings)).toBe(true);
    },
  );

  it("restores every locked field from the original leaf", () => {
    expect(
      restoreLockedProfileFields(
        {
          ...original,
          from: "system",
          name: "Renamed",
          layer_height: "0.3",
        },
        { ...original, from: "User" },
      ),
    ).toEqual({
      ...original,
      from: "User",
      layer_height: "0.3",
    });
  });

  it("accepts a leaf that inherits type, and rejects a conflicting one", () => {
    const inheritsType = {
      filament_extruder_variant: ["Direct Drive Standard"],
      filament_prime_volume: ["45"],
      filament_settings_id: ["Bambu PLA Basic @BBL A1M - Copy"],
      from: "User",
      inherits: "Bambu PLA Basic @BBL A1M",
      name: "Bambu PLA Basic @BBL A1M - Copy",
      version: "2.5.0.14",
    };
    const result = validateProfileJson(JSON.stringify(inheritsType), {
      kind: "filament",
      original: inheritsType,
    });
    expect(result.findings).toEqual([]);
    expect(result.canSave).toBe(true);

    expect(
      validateProfileJson(
        JSON.stringify({ ...inheritsType, type: "filament" }),
        { kind: "filament", original: inheritsType },
      ).canSave,
    ).toBe(true);
    expect(
      validateProfileJson(
        JSON.stringify({ ...inheritsType, type: "process" }),
        {
          kind: "filament",
          original: inheritsType,
        },
      ).canSave,
    ).toBe(false);
  });

  it("accepts any filament_cost, since the currency is unknown", () => {
    const leaf = {
      from: "User",
      inherits: "Bambu PLA Basic @BBL A1M",
      name: "Bambu PLA Basic @BBL A1M - Copy",
      filament_cost: ["99999"],
    };
    const result = validateProfileJson(JSON.stringify(leaf), {
      kind: "filament",
      original: leaf,
      inherited: { filament_cost: ["24.99"] },
    });
    expect(result.findings).toEqual([]);
    expect(result.canSave).toBe(true);
  });

  it("stays quiet on discrete values that Studio allows", () => {
    const leaf = {
      from: "User",
      inherits: "Bambu PLA Basic @BBL A1M",
      name: "Bambu PLA Basic @BBL A1M - Copy",
      filament_extruder_compatibility: ["1"],
      filament_extruder_variant: [
        "Direct Drive Standard",
        "Direct Drive High Flow",
        "Bowden Standard",
        "Bowden High Flow",
      ],
      filament_is_support: ["1"],
      full_fan_speed_layer: ["3"],
    };
    const result = validateProfileJson(JSON.stringify(leaf), {
      kind: "filament",
      original: leaf,
      inherited: {
        filament_extruder_compatibility: ["0"],
        filament_extruder_variant: ["Direct Drive Standard"],
        filament_is_support: ["0"],
        full_fan_speed_layer: ["0"],
      },
    });
    expect(result.findings).toEqual([]);
    expect(result.canSave).toBe(true);
  });

  it("warns only outside the limits Studio declares", () => {
    const leaf = {
      from: "User",
      inherits: "Bambu PLA Basic @BBL A1M",
      name: "Bambu PLA Basic @BBL A1M - Copy",
      filament_max_volumetric_speed: ["500"],
      nozzle_temperature: ["260"],
    };
    const result = validateProfileJson(JSON.stringify(leaf), {
      kind: "filament",
      original: leaf,
    });
    expect(result.findings).toEqual([
      {
        severity: "warning",
        key: "filament_max_volumetric_speed",
        message: "Value 500 is above the supported maximum 200.",
      },
    ]);
    expect(result.canSave).toBe(true);
  });

  it("rejects unknown fields", () => {
    const result = validateProfileJson(
      JSON.stringify({ ...original, definitely_not_a_bambu_field: "1" }),
      { kind: "process", original },
    );
    expect(result.canSave).toBe(false);
    expect(result.findings).toContainEqual({
      severity: "error",
      key: "definitely_not_a_bambu_field",
      message: "Unknown profile field.",
    });
  });

  it("uses Orca schema checks without applying Bambu-only unknown-key rules", () => {
    const orcaDraft = {
      ...original,
      orca_only_setting: "enabled",
      outer_wall_speed: "45",
    };
    const result = validateProfileJson(JSON.stringify(orcaDraft), {
      kind: "process",
      slicer: "orca",
      original,
    });

    expect(result.canSave).toBe(true);
    expect(result.findings).toEqual([]);

    const locked = validateProfileJson(
      JSON.stringify({ ...orcaDraft, inherits: "another profile" }),
      { kind: "process", slicer: "orca", original },
    );
    expect(locked.canSave).toBe(false);
    expect(hasLockedFieldFinding(locked.findings)).toBe(true);
  });

  it("validates Orca bounds, enums, booleans, and value shapes", () => {
    const orcaDraft = {
      ...original,
      accel_to_decel_factor: "101",
      adaptive_pressure_advance: "yes",
      layer_height: "-0.1",
      seam_slope_type: "not-an-orca-mode",
    };
    const result = validateProfileJson(JSON.stringify(orcaDraft), {
      kind: "process",
      slicer: "orca",
      original,
    });

    expect(result.canSave).toBe(true);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "accel_to_decel_factor",
          message: "Value 101 is above the supported maximum 100.",
        }),
        expect.objectContaining({
          key: "adaptive_pressure_advance",
          message: "Expected an array value.",
        }),
        expect.objectContaining({
          key: "adaptive_pressure_advance",
          message: "Expected a boolean value (0/1 or true/false).",
        }),
        expect.objectContaining({
          key: "layer_height",
          message: "Value -0.1 is below the supported minimum 0.",
        }),
        expect.objectContaining({
          key: "seam_slope_type",
          message: expect.stringContaining(
            'Unrecognized value "not-an-orca-mode"',
          ),
        }),
      ]),
    );
  });

  it("allows saving with warnings", () => {
    const result = validateProfileJson(
      JSON.stringify({ ...original, layer_height: "9" }),
      {
        kind: "process",
        original,
        inherited: { layer_height: "0.2" },
      },
    );
    expect(result.canSave).toBe(true);
    expect(
      result.findings.every(({ severity }) => severity === "warning"),
    ).toBe(true);
  });

  it("accepts an unchanged valid leaf", () => {
    const result = validateProfileJson(JSON.stringify(original), {
      kind: "process",
      original,
      inherited: { layer_height: "0.2" },
    });
    expect(result.canSave).toBe(true);
    expect(result.findings).toEqual([]);
  });
});
