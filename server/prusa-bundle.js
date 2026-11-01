/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Øyvind Øyen
 *
 * PrusaSlicer INI profiles: user presets (`print/*.ini`, `filament/*.ini`) and
 * installed vendor bundles (`vendor/*.ini`, one section per system preset).
 */

const fs = require('fs/promises');
const path = require('path');

const PRESET_KINDS = ['print', 'filament'];

/**
 * Splits a PrusaSlicer INI file into the keys before the first section
 * (a user preset file has no sections) and the ordered sections.
 */
function parseIni(text) {
  const root = {};
  const sections = [];
  let current = root;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const header = trimmed.match(/^\[(.+)\]$/);
    if (header) {
      const section = { header: header[1].trim(), data: {} };
      sections.push(section);
      current = section.data;
      continue;
    }
    const spaced = line.indexOf(' = ');
    const separator = spaced >= 0 ? spaced : line.indexOf('=');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + (spaced >= 0 ? 3 : 1)).replace(/^ /, '');
    if (key) current[key] = spaced >= 0 ? value : value.trim();
  }
  return { root, sections };
}

/** `a; "b c"; *d*` → ['a', 'b c', '*d*'] */
function splitNameList(raw) {
  if (typeof raw !== 'string') return [];
  return raw
    .split(';')
    .map((part) =>
      part
        .trim()
        .replace(/^"(.*)"$/, '$1')
        .trim(),
    )
    .filter(Boolean);
}

function isAbstractName(name) {
  return name.length > 1 && name.startsWith('*') && name.endsWith('*');
}

function bundleFromText(fileName, text) {
  const { sections } = parseIni(text);
  const vendorSection = sections.find((section) => section.header === 'vendor');
  const templatesProfile = vendorSection?.data.templates_profile === '1';
  const presets = { print: new Map(), filament: new Map() };
  for (const section of sections) {
    const colon = section.header.indexOf(':');
    if (colon < 0) continue;
    const kind = section.header.slice(0, colon);
    if (!PRESET_KINDS.includes(kind)) continue;
    const sectionName = section.header.slice(colon + 1).trim();
    const abstract = isAbstractName(sectionName);
    // PrusaSlicer names every filament of a templates bundle "<name> @Template".
    const name =
      templatesProfile && kind === 'filament' && !abstract
        ? `${sectionName} @Template`
        : sectionName;
    const { inherits, renamed_from: renamedFrom, ...data } = section.data;
    presets[kind].set(name, {
      name,
      sectionName,
      abstract,
      inherits: splitNameList(inherits),
      renamedFrom: splitNameList(renamedFrom),
      data,
    });
  }
  return {
    vendor: vendorSection?.data.name?.trim() || fileName.replace(/\.ini$/i, ''),
    fileName,
    templatesProfile,
    presets,
  };
}

async function loadVendorBundles(rootAbs) {
  let entries;
  try {
    entries = await fs.readdir(path.join(rootAbs, 'vendor'), { withFileTypes: true });
  } catch {
    return [];
  }
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.ini'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const bundles = [];
  for (const fileName of fileNames) {
    const text = await fs.readFile(path.join(rootAbs, 'vendor', fileName), 'utf8');
    bundles.push(bundleFromText(fileName, text));
  }
  return bundles;
}

/** Preset name (and `renamed_from` alias) → its bundle; the first bundle wins a clash. */
function buildPresetIndex(bundles, kind) {
  const index = new Map();
  for (const bundle of bundles) {
    for (const preset of bundle.presets[kind].values()) {
      if (!index.has(preset.name)) index.set(preset.name, { bundle, preset });
    }
  }
  for (const bundle of bundles) {
    for (const preset of bundle.presets[kind].values()) {
      for (const alias of preset.renamedFrom) {
        if (!index.has(alias)) index.set(alias, { bundle, preset });
      }
    }
  }
  return index;
}

module.exports = {
  buildPresetIndex,
  loadVendorBundles,
  parseIni,
};
