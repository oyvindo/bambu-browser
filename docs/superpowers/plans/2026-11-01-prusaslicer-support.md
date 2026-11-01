# PrusaSlicer Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browse, compare and edit PrusaSlicer print and filament profiles with the same inheritance grid, translation and validation the app already offers for Bambu Studio and OrcaSlicer.

**Architecture:** `server.js` gets a third slicer, `prusa`, backed by a small CommonJS module that parses PrusaSlicer INI files (user presets and vendor bundles) and linearises their multi-parent `inherits` into the chain format the UI already understands. Vendor-bundle sections are addressed with virtual paths (`vendor/Creality.ini#print:*0.20mm*`). Everything PrusaSlicer-specific in the browser (option definitions, built-in defaults, value parsing, percent calculations, labels) lives under `lib/prusa/`, generated from PrusaSlicer's `PrintConfig.cpp` the same way Orca's definitions are.

**Tech Stack:** Next.js 16 + React 19 (TypeScript), Node CommonJS API (`server.js`), Electron, Vite+ (`vp test run`, `vp check`), `node:test` for the API.

**Spec:** this document, section “Analysis” below (no separate spec exists).

---

## Analysis: how PrusaSlicer stores and inherits profiles

Data root: `~/Library/Application Support/PrusaSlicer` (macOS), `%APPDATA%\PrusaSlicer` (Windows), `~/.config/PrusaSlicer` (Linux).

| Path                                     | Content                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `print/<name>.ini`                       | User **print** presets (= “process” in Bambu/Orca).                                                                                                                                                           |
| `filament/<name>.ini`                    | User filament presets.                                                                                                                                                                                        |
| `printer/`, `physical_printer/`, `sla_*` | Out of scope (not shown by the app today).                                                                                                                                                                    |
| `vendor/<Vendor>.ini`                    | **Installed system bundles.** One INI file per vendor containing every system preset as a section: `[print:NAME]`, `[filament:NAME]`, `[printer:NAME]`, plus `[vendor]`, `[printer_model:…]` which we ignore. |
| `cache/`, `snapshots/`                   | Downloaded-but-not-installed bundles and backups. Ignore.                                                                                                                                                     |
| `PrusaSlicer.ini`                        | App settings. `[filaments]` = filaments the user has enabled; `[presets]` = currently selected print/filament/printer.                                                                                        |

Inheritance rules (from PrusaSlicer `PresetBundle::load_configbundle` / `flatten_configbundle_hierarchy`, confirmed against the files on this machine):

1. **Inside a bundle**, `inherits` is a `;`-separated list: `inherits = *0.20mm*; *0.4nozzle*; *speed*`. Parents are applied left to right, so **the last parent wins**, and the section's own keys win over all parents. Parents are looked up **in the same bundle only**.
2. Names wrapped in asterisks (`*common*`, `*PLA*`) are **abstract** presets: usable as parents, never shown in PrusaSlicer.
3. A bundle whose `[vendor]` section has `templates_profile = 1` (that is `Templates.ini`) gets **` @Template` appended to every filament name**. This is why the user file says `inherits = Esun PLA @Template` while `Templates.ini` only contains `[filament:Esun PLA]`.
4. `renamed_from = "Old name"; "Older name"` lets old user presets keep finding a renamed system preset.
5. **User presets** have exactly one parent (`inherits = <system preset name>`, looked up across all installed bundles) or none (`inherits =` empty → detached preset).
6. **User files are full snapshots**, not diffs: PrusaSlicer writes every key. When it loads a user preset it starts from the **built-in defaults** (from `PrintConfig.cpp`), not from the parent. Consequences: (a) a saved user file must always contain every key, (b) “what the user changed” = keys whose value differs from the resolved parent.
7. The chain root is PrusaSlicer's compiled-in defaults (no file). Keys never set by any bundle level come from there.
8. Values are strings. Vectors (one value per extruder) are comma-separated (`0.4,0.4`); string vectors are `;`-separated and quoted. `nil` in a filament override (`filament_retract_length = nil`) means “not set, use the printer's value”. `coFloatOrPercent` values like `support_material_interface_speed = 100%` are a percentage of another option named by `ratio_over` in `PrintConfig.cpp`.

Resolved example from this machine, `print/0.20 mm NORMAL SPEED (0.4 mm nozzle) @CREALITY - Updated.ini`:

```
PrusaSlicer defaults (root)
  vendor/Creality.ini#print:*common*
  vendor/Creality.ini#print:*0.20mm*      (inherits *common*)
  vendor/Creality.ini#print:*0.4nozzle*   (…)
  vendor/Creality.ini#print:*speed*       (…)
  vendor/Creality.ini#print:0.20 mm NORMAL SPEED (0.4 mm nozzle) @CREALITY
print/0.20 mm NORMAL SPEED (0.4 mm nozzle) @CREALITY - Updated.ini
```

**Linearisation.** The grid needs one ordered list where “later level wins”. Expand parents depth-first in declared order (each parent's own ancestors first, then the parent), then the section itself; if a level appears more than once (a diamond on `*common*`), keep only its **last** occurrence. Duplicates carry identical data, so dropping earlier copies gives exactly PrusaSlicer's merge result.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before touching Next.js code (AGENTS.md).
- `slicer` query parameter keeps defaulting to `bambu`; Bambu and Orca behaviour must not change (existing tests stay green).
- The API never writes under `vendor/`; Prusa writes are limited to `print/*.ini` and `filament/*.ini` directly under the PrusaSlicer root.
- New env var `PRUSASLICER_ROOT`, app directory name `PrusaSlicer`.
- Bump `API_VERSION` in `server.js` and `REQUIRED_API_VERSION` in `electron/main.js` from `1` to `2` (an old API rejects `slicer=prusa`).
- Generated files are never edited by hand; regenerate with the script.
- All user-visible strings exist in both `en` and `nb`.
- Verification commands: `vp test run`, `node --test server.node-test.js server/*.node-test.js`, `vp check`.

## Review Focus

1. **User preset whose parent no longer exists** (vendor update renamed or removed it): expect `renamed_from` to be tried, and if still missing the chain `[defaults, leaf]` plus a warning, not an HTTP 500. Test in Task 2.
2. **Unicode and odd characters in preset names** (`Grønn PLA #2.ini`): must list, resolve and save. Only paths starting with `vendor/` are split on `#`. Test in Task 3.
3. **Round-trip fidelity**: G-code values with `=`, quotes and `\n` escapes, and multi-extruder vectors, must be written back byte-identical when unchanged. Test in Task 7.
4. **`nil` and per-extruder `nil`** (`0.8,nil`) in filament overrides: shown as “—” (printer value), never as the string `nil` or `0`. Test in Task 5.
5. **Chained percentages** (`top_solid_infill_speed = 50%` → of `solid_infill_speed`, which is itself `%` of `infill_speed`): computed to the end of the chain, and a cycle or unknown base gives no number instead of a wrong one. Test in Task 5.

---

## File structure

| File                                                                                                                                                                   | Responsibility                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `server/prusa-bundle.js` (new, CommonJS)                                                                                                                               | INI parsing, vendor bundle loading, preset name index, chain linearisation, INI serialisation. No HTTP. |
| `server/prusa-bundle.node-test.js` (new)                                                                                                                               | `node:test` unit tests with synthetic bundles.                                                          |
| `server.js`                                                                                                                                                            | `prusa` slicer entry, route branches that call `prusa-bundle.js`.                                       |
| `scripts/lib/print-config-cpp.mjs` (new)                                                                                                                               | Shared `PrintConfig.cpp` parsing extracted from the Orca generator.                                     |
| `scripts/generate-prusa-profile-config.mjs` (new)                                                                                                                      | Writes `lib/prusa/prusa-profile-config.generated.ts`.                                                   |
| `lib/prusa/prusa-values.ts` (new)                                                                                                                                      | Parse/serialise INI values, defaults root level, `ratio_over` and zero-means calculations.              |
| `lib/prusa/mapping-prusa.ts` (new)                                                                                                                                     | `buildPrusaUiTree` grouped by PrusaSlicer's own pages.                                                  |
| `lib/prusa/prusa-key-equivalents.ts` (new)                                                                                                                             | Prusa key → Bambu/Orca key map, used for Norwegian labels/tooltips.                                     |
| `lib/prusa/prusa-leaf.ts` (new)                                                                                                                                        | Diff-vs-parent for the editor; full-config rebuild for saving.                                          |
| `localization/profile-fields.ts`, `localization/tooltips/*`, `localization/en.ts`, `localization/nb.ts`                                                                | Norwegian labels, enum values, page names, UI copy.                                                     |
| `lib/bambu/slicer-source.ts`, `profile-leaf-editor.ts`, `property-tooltips.ts`, `ProfileTable.tsx`, `BambuProfileWorkbench.tsx`, `DataSourceModal.tsx`, `fileLabel.ts` | Wire the third slicer through.                                                                          |
| `electron/main.js`, `electron-builder.yml`, `package.json`, `README.md`                                                                                                | Version bump, packaging of `server/`, test script, docs.                                                |

---

### Task 1: INI parser and vendor bundle index

**Files:**

- Create: `server/prusa-bundle.js`, `server/prusa-bundle.node-test.js`
- Modify: `package.json` (`test` script → `vp test run && node --test server.node-test.js server/*.node-test.js`)

**Interfaces:**

- Produces:
  - `parseIni(text: string): { root: Record<string,string>, sections: Array<{ header: string, data: Record<string,string> }> }` — keys before the first `[section]` go to `root`; lines starting with `#` or `;` are comments; split each line on the **first** `=` (fall back to first `=`), trim key, keep value verbatim except trailing whitespace.
  - `loadVendorBundles(rootAbs: string): Promise<VendorBundle[]>` — every `vendor/*.ini`, sorted by file name.
  - `type VendorBundle = { vendor: string; fileName: string; templatesProfile: boolean; presets: { print: Map<string, RawPreset>; filament: Map<string, RawPreset> } }`
  - `type RawPreset = { name: string; sectionName: string; abstract: boolean; inherits: string[]; renamedFrom: string[]; data: Record<string,string> }` — `name` includes the ` @Template` suffix for filaments in a templates bundle; `sectionName` is the raw header text after `filament:`; `inherits` split on `;`, trimmed, surrounding quotes removed, empties dropped.
  - `buildPresetIndex(bundles: VendorBundle[], kind: 'print'|'filament'): Map<string, { bundle: VendorBundle; preset: RawPreset }>` — first bundle (by file name) wins on a duplicate name; `renamed_from` names are added only if not already taken.

- [ ] **Step 1: Write failing tests** in `server/prusa-bundle.node-test.js`, using a temp dir with `vendor/Acme.ini` and `vendor/Templates.ini`:
  - `parseIni` of `start_gcode = G1 X=1 ; "a\nb"` gives value `G1 X=1 ; "a\nb"`.
  - `[print:*common*]` → `abstract === true`; `inherits = *0.20mm*; *0.4nozzle*` → `['*0.20mm*', '*0.4nozzle*']`.
  - `Templates.ini` with `templates_profile = 1` and `[filament:Esun PLA]` → index has `Esun PLA @Template`, not `Esun PLA`.
  - `renamed_from = "Old PLA"` → index lookup `Old PLA` returns the renamed preset.
  - `[printer:X]`, `[printer_model:Y]`, `[vendor]` never appear in `presets`.
- [ ] **Step 2: Run** `node --test server/prusa-bundle.node-test.js` → FAIL (module missing).
- [ ] **Step 3: Implement** the four exports in `server/prusa-bundle.js`.
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit** `feat(prusa): parse PrusaSlicer INI files and vendor bundles`.

### Task 2: Chain resolver (multi-parent linearisation)

**Files:**

- Modify: `server/prusa-bundle.js`, `server/prusa-bundle.node-test.js`

**Interfaces:**

- Consumes: Task 1 exports.
- Produces:
  - `vendorPresetPath(bundle: VendorBundle, kind: 'print'|'filament', preset: RawPreset): string` → `vendor/<fileName>#<kind>:<sectionName>`.
  - `resolvePrusaChain(rootAbs: string, relativePath: string, kind: 'print'|'filament', bundles: VendorBundle[]): Promise<{ chain: Array<{ relativePath: string; data: Record<string,string> }>; warnings: string[] }>` — `relativePath` is either a user file (`print/x.ini`) or a vendor path. The chain does **not** include the defaults root (added client-side in Task 5). Each level's `data` excludes `inherits`, except the user leaf which keeps it (the editor locks it).

- [ ] **Step 1: Write failing tests:**
  - Diamond: `*common*` sets `a=1,b=1`; `*x*` inherits `*common*`, sets `a=2`; `*y*` inherits `*common*`, sets `c=3`; `P` inherits `*x*; *y*`. Expected chain paths, exactly: `['…#print:*x*', '…#print:*common*', '…#print:*y*', '…#print:P']`, and folding the chain last-wins gives `a=1` (because `*y*` brings `*common*` back after `*x*`), `b=1`, `c=3`. Add a comment in the test that this is PrusaSlicer's “last parent wins” rule.
  - User file `print/U.ini` with `inherits = P` → chain ends `['…#print:P', 'print/U.ini']`.
  - User file with `inherits =` → chain `['print/U.ini']`, no warnings.
  - User file with `inherits = Gone` → chain `['print/U.ini']`, `warnings` contains `Gone` (Review Focus 1). Same with a name only found via `renamed_from` → resolves, no warning.
  - Cycle `*a*` ↔ `*b*` → throws `Inheritance cycle`.
  - Bundle parents are only looked up in the same bundle: a parent name existing only in another bundle → warning, not a cross-bundle match.
- [ ] **Step 2: Run** `node --test server/prusa-bundle.node-test.js` → new tests FAIL.
- [ ] **Step 3: Implement** with this linearisation:

```js
// Depth-first, parents in declared order, then self; keep the LAST occurrence.
function linearize(preset, lookupInBundle, stack = new Set()) {
  if (stack.has(preset.name)) throw new Error(`Inheritance cycle detected at "${preset.name}"`);
  stack.add(preset.name);
  const out = [];
  for (const parentName of preset.inherits) {
    const parent = lookupInBundle(parentName); // null → warning, skip
    if (parent) out.push(...linearize(parent, lookupInBundle, stack));
  }
  stack.delete(preset.name);
  out.push(preset);
  return out.filter((p, i) => out.findLastIndex((q) => q.name === p.name) === i);
}
```

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(prusa): resolve multi-parent inherits into an ordered chain`.

### Task 3: API routes for `slicer=prusa`

**Files:**

- Modify: `server.js` (SLICERS, `selectedSlicer` error text, `/api/health`, `/api/meta`, `/api/accounts`, `/api/profiles`, `/api/system-filaments`, `/api/resolve`, `/api/profile-file` GET), `server.node-test.js`, `electron/main.js:25`, `electron-builder.yml` (`extraResources: - from: server, to: server`), `lib/bambu/slicer-source.ts`, `lib/bambu/bambu-api-client.ts` (resolve response gains optional `warnings: string[]`)

**Interfaces:**

- Consumes: Task 1–2 exports.
- Produces (HTTP, all with `?slicer=prusa`):
  - `/api/accounts` → `{ layout: 'prusa', accounts: ['default'] }` when `print/` or `filament/` exists, else `{ layout: null, accounts: [] }`.
  - `/api/profiles?account=default` → entries `{ userId: 'default', kind: 'process' | 'filament', relativePath: 'print/<f>.ini' | 'filament/<f>.ini', fileName, filamentCategory?: 'standard' }`. The UI keeps saying `process`; only paths say `print`.
  - `/api/system-filaments` → non-abstract filaments from all bundles: `{ relativePath: vendorPresetPath(...), folder: bundle.vendor, fileName: preset.name }`. If `PrusaSlicer.ini` has a `[filaments]` section, only names listed there.
  - `/api/resolve?path=…&compareWith=…` → `{ chain, warnings }` from `resolvePrusaChain`; `compareWith` must be a `vendor/…#filament:` path.
  - `/api/profile-file` GET → `{ relativePath, data }` for user files only (Task 7 adds PUT).
  - `slicer-source.ts`: `SLICER_SOURCES = ['bambu', 'orca', 'prusa']`, `isSlicerSource` derived from the array, `slicerDisplayName('prusa') === 'PrusaSlicer'`.
  - `API_VERSION = 2`, `REQUIRED_API_VERSION = 2`.

- [ ] **Step 1: Write failing tests** in `server.node-test.js` (set `PRUSASLICER_ROOT` in `before`, write `vendor/Acme.ini`, `print/Grønn PLA #2.ini`, `filament/F.ini`, `PrusaSlicer.ini`):
  - `GET /api/accounts?slicer=prusa` → `accounts: ['default']`.
  - `GET /api/profiles?slicer=prusa&account=default` lists `print/Grønn PLA #2.ini` with `kind: 'process'` (Review Focus 2).
  - `GET /api/resolve?slicer=prusa&path=print/Grønn%20PLA%20%232.ini` → last chain item is that path, previous is `vendor/Acme.ini#print:…`.
  - `GET /api/resolve?slicer=prusa&path=vendor/../secret` → 400.
  - `GET /api/system-filaments?slicer=prusa` → only names enabled in `PrusaSlicer.ini [filaments]`, no `*abstract*`.
  - `GET /api/health?slicer=prusa` → `apiVersion: 2`.
  - Existing “rejects unknown slicers” test updated to the new message.
- [ ] **Step 2: Run** `node --test server.node-test.js` → new tests FAIL.
- [ ] **Step 3: Implement** the branches; reuse `safeFsPath` for user files, and validate vendor paths against `^vendor/[^/]+\.ini#(print|filament):.+$`. Load bundles per request (files are read in a few ms; no cache — YAGNI).
- [ ] **Step 4: Run** `node --test server.node-test.js server/*.node-test.js` → PASS; then `vp test run` → PASS.
- [ ] **Step 5: Commit** `feat(prusa): serve PrusaSlicer profiles from the local API`.

### Task 4: Generated PrusaSlicer option definitions and defaults

**Files:**

- Create: `scripts/lib/print-config-cpp.mjs`, `scripts/generate-prusa-profile-config.mjs`, `lib/prusa/prusa-profile-config.generated.ts`, `lib/prusa/prusa-profile-config.test.ts`
- Modify: `scripts/generate-orca-profile-config.mjs` (import the shared helpers), `package.json` (`"generate:prusa-config": "node scripts/generate-prusa-profile-config.mjs"`)

**Interfaces:**

- Produces:
  - `PRUSA_PROFILE_CONFIG_SOURCE = { version, url }` pinned to the PrusaSlicer tag matching the installed version (2.9.6 here; confirm the tag with `git ls-remote --tags https://github.com/prusa3d/PrusaSlicer | grep 2.9`).
  - `type PrusaProfileConfigDef = OrcaProfileConfigDef & { ratioOver?: string; defaultValue?: string; nullable?: boolean }` (`advanced` = mode is not `comSimple`; `defaultValue` already in INI text form, e.g. `15%`, `0.4,0.4`, `stars`; omitted when the C++ expression cannot be read).
  - `PRUSA_PROFILE_CONFIG_DEFS: Readonly<Record<string, PrusaProfileConfigDef>>`.

- [ ] **Step 1: Move** `decodeCppString`, `stringsIn`, `assignment`, `assignedText`, constants and enum-map parsing from the Orca generator into `scripts/lib/print-config-cpp.mjs`; run `vp run generate:orca-config` and check `git diff --exit-code lib/bambu/orca-profile-config.generated.ts` → no changes.
- [ ] **Step 2: Write failing tests** in `lib/prusa/prusa-profile-config.test.ts`:
  - `fill_density` → `type 'coPercent'`, `defaultValue` ends with `%`, `category 'Infill'`.
  - `support_material_interface_speed.ratioOver === 'support_material_speed'`.
  - `filament_retract_length` exists, `nullable: true`, label equals `retract_length`'s label (filament overrides are created in a loop in `PrintConfig.cpp`; the generator must expand that loop).
  - `fill_pattern.enumValues` contains `gyroid`.
- [ ] **Step 3: Run** `vp test run lib/prusa/prusa-profile-config.test.ts` → FAIL.
- [ ] **Step 4: Write the generator** (also parse `def->ratio_over`, `def->mode`, `set_default_value(new ConfigOption…(…))` incl. enum defaults via `enum_keys_map`, and the filament-override loop), run `vp run generate:prusa-config`.
- [ ] **Step 5: Run** the test → PASS. **Commit** `feat(prusa): generate option definitions from PrusaSlicer PrintConfig.cpp`.

### Task 5: Values, defaults root and calculations

**Files:**

- Create: `lib/prusa/prusa-values.ts`, `lib/prusa/prusa-values.test.ts`

**Interfaces:**

- Consumes: `PRUSA_PROFILE_CONFIG_DEFS`, `InheritanceChainLevel`.
- Produces:
  - `PRUSA_DEFAULTS_PATH = { process: 'defaults/print', filament: 'defaults/filament' }`.
  - `parsePrusaValue(key: string, raw: string): unknown` — vector types (`coFloats`, `coInts`, `coBools`, `coPercents`, `coFloatsOrPercents`) → `string[]` split on `,`; `coStrings` → split on `;` with quotes removed; `nil` (whole or per element) → `null`; everything else stays the raw string.
  - `serializePrusaValue(key: string, value: unknown): string` — inverse; `serializePrusaValue(k, parsePrusaValue(k, s)) === s` for every value PrusaSlicer writes.
  - `toPrusaDisplayChain(kind: ProfileKind, chain: InheritanceChainLevel[]): InheritanceChainLevel[]` — prepends the defaults level (all defs whose key belongs to the kind, `defaultValue` parsed) and parses every level's values.
  - `effectivePrusaValue(key: string, merged: Readonly<Record<string, unknown>>, extruderIndex: number): { value: number; unit: 'mm' | 'mm/s' | 'mm/s²'; basis: string[] } | { basis: string[]; unresolved: 'nozzle_diameter' | 'cycle' | 'missing' } | null` — `null` when the value is not a percentage of something. Follows `ratioOver` repeatedly (`basis` lists the keys walked).
  - `PRUSA_ZERO_MEANS: Readonly<Record<string, 'auto' | 'default_acceleration' | 'disabled'>>` — curated: every `*_extrusion_width` → `auto`; every `*_acceleration` except `default_acceleration` → `default_acceleration`; `max_print_speed`, `max_volumetric_speed`, `filament_max_volumetric_speed` → `disabled`.

- [ ] **Step 1: Write failing tests:**
  - `parsePrusaValue('filament_retract_length', 'nil') === null`; `parsePrusaValue('retract_length', '0.8,nil')` → `['0.8', null]` (Review Focus 4).
  - Round-trip for `start_filament_gcode = "; Filament gcode\n"` and `filament_ramming_parameters` from the real file.
  - `effectivePrusaValue('top_solid_infill_speed', { top_solid_infill_speed: '50%', solid_infill_speed: '80%', infill_speed: '60' }, 0)` → `{ value: 24, unit: 'mm/s', basis: ['solid_infill_speed', 'infill_speed'] }` (Review Focus 5).
  - Cycle (`a: '50%'` over `b`, `b: '50%'` over `a`, with test defs) → `unresolved: 'cycle'`.
  - `effectivePrusaValue('extrusion_width', { extrusion_width: '105%' }, 0)` → `unresolved: 'nozzle_diameter'`.
  - `toPrusaDisplayChain('process', [userLevel])[0].relativePath === 'defaults/print'`.
- [ ] **Step 2: Run** `vp test run lib/prusa/prusa-values.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Call `toPrusaDisplayChain` once in `BambuProfileWorkbench.tsx` right after `fetchApiResolve` when `slicer === 'prusa'`, so table, compare and “export merged” all see the same chain.
- [ ] **Step 4: Run** → PASS. **Commit** `feat(prusa): parse values, add defaults root, compute percentage values`.

### Task 6: Grid, translation and tooltips

**Files:**

- Create: `lib/prusa/mapping-prusa.ts`, `lib/prusa/mapping-prusa.test.ts`, `lib/prusa/prusa-key-equivalents.ts`, `lib/prusa/prusa-translation.test.ts`
- Modify: `lib/bambu/mapping-orca.ts` (export the unit helper as `unitFromConfigDef(key, def, value)`), `components/profile-manager/profileTreeGrid/ProfileTable.tsx:101-112`, `components/profile-manager/profileTreeGrid/profileTable/fileLabel.ts`, `lib/bambu/property-tooltips.ts`, `localization/profile-fields.ts`, `localization/en.ts`, `localization/nb.ts`, `components/profile-manager/BambuProfileWorkbench.tsx` (slicer buttons from `SLICER_SOURCES`, `default` account auto-select for Orca **and** Prusa), `components/profile-manager/DataSourceModal.tsx`

**Interfaces:**

- Consumes: Task 4 defs, Task 5 `effectivePrusaValue`, `PRUSA_ZERO_MEANS`.
- Produces:
  - `buildPrusaUiTree(kind: ProfileKind, chain: readonly InheritanceChainLevel[]): readonly BambuMappedGroup[]` — one group per PrusaSlicer `category` (`Layers and perimeters`, `Infill`, `Skirt and brim`, `Support material`, `Speed`, `Multiple Extruders`, `Advanced`, `Output options`, `Filament`, `Cooling`, …) in PrusaSlicer's tab order, group id `prusa-<slug>`; uncategorised keys → `others`; `PROFILE_METADATA_KEYS` plus `inherits`, `print_settings_id`, `filament_settings_id`, `compatible_*` → `metadata`.
  - `PRUSA_EQUIVALENT_KEYS: Readonly<Record<string, string>>` — Prusa key → Bambu/Orca key with the same meaning, e.g. `perimeters→wall_loops`, `fill_density→sparse_infill_density`, `fill_pattern→sparse_infill_pattern`, `top_solid_layers→top_shell_layers`, `bottom_solid_layers→bottom_shell_layers`, `first_layer_height→initial_layer_print_height`, `extrusion_width→line_width`, `external_perimeter_extrusion_width→outer_wall_line_width`, `perimeter_speed→inner_wall_speed`, `external_perimeter_speed→outer_wall_speed`, `infill_speed→sparse_infill_speed`, `solid_infill_speed→internal_solid_infill_speed`, `top_solid_infill_speed→top_surface_speed`, `temperature→nozzle_temperature`, `first_layer_temperature→nozzle_temperature_initial_layer`, `extrusion_multiplier→filament_flow_ratio`, `max_fan_speed→fan_max_speed`, `min_fan_speed→fan_min_speed`, `disable_fan_first_layers→close_fan_the_first_x_layers`, `slowdown_below_layer_time→slow_down_layer_time`, `fan_below_layer_time→fan_cooling_layer_time`, `min_print_speed→slow_down_min_speed`, `skirts→skirt_loops`, `infill_overlap→infill_wall_overlap`, `support_material→enable_support`. Only add pairs whose meaning really matches; leave others unmapped.
  - Column cell text for a percentage row: `"50% → 24 mm/s"`; for `0` with a `PRUSA_ZERO_MEANS` entry: `"0 (auto)"` / `"0 (bruker standardakselerasjon)"` etc. Put the composition in a pure function `formatPrusaCell(key, value, merged, extruderIndex, locale): string` in `mapping-prusa.ts`.
  - `fileLabel('vendor/Creality.ini#print:*0.20mm*') === '*0.20mm*'`, `fileLabel('defaults/print') === 'PrusaSlicer defaults'` (localized via the caller).
  - `propertyTooltipForKey(key, locale, kind, 'prusa')`: `nb` → Norwegian tooltip of `PRUSA_EQUIVALENT_KEYS[key]` when one exists, else the PrusaSlicer English tooltip with `related: 'Beskrivelse fra PrusaSlicer 2.9.6 (engelsk).'`; `en` → PrusaSlicer tooltip.
  - `localizedPropertyLabel` for `nb`: `SPECIAL_NB_LABELS[key] ?? SPECIAL_NB_LABELS[PRUSA_EQUIVALENT_KEYS[key]] ?? humanize`.
  - New strings (`en` / `nb`): `controls.slicerPrusa` (`PrusaSlicer`), `columns.prusaDefaults` (`PrusaSlicer defaults` / `PrusaSlicer-standarder`), `profiles.printKind` (`Print` / `Utskrift`), `resolve.warningMissingParent` (`Parent profile “{name}” is not installed; showing the file on its own.` / `Foreldreprofilen «{name}» er ikke installert; viser filen alene.`), DataSourceModal paths `~/Library/Application Support/PrusaSlicer` and `%APPDATA%\PrusaSlicer`, env `PRUSASLICER_ROOT`.

- [ ] **Step 1: Write failing tests:**
  - `mapping-prusa.test.ts`: a chain with `perimeters`, `fill_density`, `inherits` → groups `prusa-layers-and-perimeters`, `prusa-infill`, `metadata`; `formatPrusaCell` gives `50% → 24 mm/s` for the Task 5 example and `0 (auto)` for `extrusion_width: '0'`.
  - `prusa-translation.test.ts`: every value in `PRUSA_EQUIVALENT_KEYS` exists in `ORCA_PROFILE_CONFIG_DEFS`; every key in `PRUSA_PROFILE_CONFIG_DEFS` with `advanced !== true` and a print/filament category satisfies `hasCompleteNorwegianLabel(key) || key in PRUSA_EQUIVALENT_KEYS`; every `enumValues` entry of those keys has an `nb` value in `localizedEnumValue` that differs from the raw key or is listed as identical on purpose; every group id from `buildPrusaUiTree` has an `nb` label in `GROUP_LABELS`.
- [ ] **Step 2: Run** `vp test run lib/prusa` → FAIL.
- [ ] **Step 3: Implement**, filling `NB_WORDS`, `SPECIAL_NB_LABELS`, `ENUM_VALUES` (e.g. `nearest→Nærmeste`, `rear→Bak`, `random→Tilfeldig`, `stars→Stjerner`, `gyroid→Gyroide`, `honeycomb→Bikube`, `concentric→Konsentrisk`, `arachne→Arachne`, `outer_only→Kun ytre`) until the coverage tests pass. Wire `ProfileTable.tsx` to `buildPrusaUiTree` for `slicer === 'prusa'`.
- [ ] **Step 4: Run** `vp test run` → PASS, `vp check` → clean. Start `vp run api` + `vp run dev`, switch to PrusaSlicer, open both user print profiles and the user filament: chain columns match the Analysis example, no `nil` text, Norwegian labels in `nb`.
- [ ] **Step 5: Commit** `feat(prusa): show PrusaSlicer profiles with labels, translations and computed values`.

### Task 7: Editing and saving user presets

**Files:**

- Create: `lib/prusa/prusa-leaf.ts`, `lib/prusa/prusa-leaf.test.ts`
- Modify: `server/prusa-bundle.js` (`serializeUserPreset`), `server/prusa-bundle.node-test.js`, `server.js` (`/api/profile-file` PUT for prusa), `server.node-test.js`, `lib/bambu/profile-leaf-editor.ts` (`configDef` and shape checks for `prusa`; locked field for prusa is only `inherits`), `components/profile-manager/BambuProfileWorkbench.tsx` (edit/save branch)

**Interfaces:**

- Consumes: Task 5 `parsePrusaValue`/`serializePrusaValue`, display chain.
- Produces:
  - `prusaLeafOverrides(chain: readonly InheritanceChainLevel[]): Record<string, unknown>` — keys of the leaf whose formatted value differs from the merged parent value, plus `inherits`. This is what the editor shows (same UX as Bambu: a user file lists only what it changes).
  - `buildPrusaFullConfig(chain: readonly InheritanceChainLevel[], edited: Record<string, unknown>): Record<string, string>` — merged parent (defaults included) ⊕ original leaf keys unknown to the parent ⊕ `edited`, every value serialised. A key deleted in the editor falls back to the parent value.
  - PUT `/api/profile-file?slicer=prusa&path=print/x.ini`, body `{ values: Record<string,string> }` → server rejects non-string values and values containing a raw newline (400), then writes `# generated by Bambu Browser <version> on <ISO date>` + sorted `key = value` lines via the existing atomic `replaceProfileFile`.
  - `serializeUserPreset(values: Record<string,string>, header: string): string`.

- [ ] **Step 1: Write failing tests:**
  - `prusa-leaf.test.ts`: real-format leaf where only `temperature` differs from parent → overrides `{ inherits, temperature }`; `buildPrusaFullConfig` with `temperature` removed from `edited` → output `temperature` equals parent value; untouched `start_filament_gcode` value is byte-identical (Review Focus 3).
  - `server.node-test.js`: PUT to `vendor/Acme.ini#print:X` → 403; PUT to `print/../x.ini` → 400; PUT with `{ values: { a: 'x\ny' } }` → 400; successful PUT then GET returns the written values; file starts with `# generated by Bambu Browser`.
- [ ] **Step 2: Run** `vp test run lib/prusa/prusa-leaf.test.ts` and `node --test server.node-test.js` → FAIL.
- [ ] **Step 3: Implement.** Add a note in the editor for Prusa (`en`/`nb`): “Restart PrusaSlicer or reselect the preset to see the change.” / “Start PrusaSlicer på nytt eller velg profilen igjen for å se endringen.”
- [ ] **Step 4: Run** both suites → PASS. Manually: edit `temperature` in the user filament, save, open it in PrusaSlicer and confirm the value and that the preset is still attached to `Esun PLA @Template`.
- [ ] **Step 5: Commit** `feat(prusa): edit and save PrusaSlicer user presets`.

### Task 8: Golden check against PrusaSlicer, docs and packaging

**Files:**

- Create: `lib/prusa/prusa-resolve.local.test.ts` (skips unless `PRUSA_EXPORTED_CONFIG` is set, like `profile-schema.local.test.ts`)
- Modify: `README.md`, `server.js` header comment

- [ ] **Step 1: Export reference values:** in PrusaSlicer select the user print + filament, File → Export → Export Config → save as `~/prusa-export.ini`.
- [ ] **Step 2: Write the local test:** resolve both user presets through `resolvePrusaChain` + `toPrusaDisplayChain`, fold last-wins, and assert every print/filament key in the export equals the folded value (string compare after `serializePrusaValue`). Run `PRUSA_EXPORTED_CONFIG=~/prusa-export.ini PRUSASLICER_ROOT="$HOME/Library/Application Support/PrusaSlicer" vp test run lib/prusa/prusa-resolve.local.test.ts` → PASS. A failure here means the inheritance rule or a default is wrong; fix the resolver or generator, not the test.
- [ ] **Step 3: Docs:** README intro and env-var list mention PrusaSlicer and `PRUSASLICER_ROOT`; explain virtual `vendor/…#…` paths in one paragraph.
- [ ] **Step 4: Packaging:** `vp run electron:preview`; confirm the app starts its own API (port 3847, `apiVersion: 2`) and the PrusaSlicer toggle lists profiles. This checks that `server/` is in `extraResources`.
- [ ] **Step 5: Commit** `docs(prusa): document PrusaSlicer support and add golden check`.

---

## Out of scope (possible follow-ups)

- Printer profiles and the active printer's `nozzle_diameter` (would turn “105% of nozzle diameter” into millimetres; read `PrusaSlicer.ini [presets] printer` and resolve `[printer:…]`).
- Cross-slicer comparison (Prusa ↔ Orca) using `PRUSA_EQUIVALENT_KEYS`.
- SLA presets, physical printers, browsing `cache/` bundles that are not installed.
