import { describe, expect, it } from "vitest";

import { formatProfileJson, validateProfileJson } from "./profile-leaf-editor";

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

  it.each(["inherits", "name", "type"] as const)(
    "rejects changes to locked field %s",
    (key) => {
      const changed = { ...original, [key]: "changed" };
      const result = validateProfileJson(JSON.stringify(changed), {
        kind: "process",
        original,
      });
      expect(result.canSave).toBe(false);
      expect(result.findings.some((finding) => finding.key === key)).toBe(true);
    },
  );

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
