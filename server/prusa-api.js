/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Øyvind Øyen
 *
 * `slicer=prusa` routes. User presets live in `print/` and `filament/`;
 * system presets are sections of `vendor/*.ini`, addressed as
 * `vendor/<file>#<print|filament>:<section>`.
 */

const fs = require('fs/promises');
const path = require('path');

const {
  loadVendorBundles,
  parseIni,
  resolvePrusaChain,
  vendorPresetPath,
} = require('./prusa-bundle');

const USER_PATH = /^(print|filament)\/[^/]+\.ini$/;
const VENDOR_PATH = /^vendor\/([^/#]+\.ini)#(print|filament):(.+)$/;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizePath(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '');
}

function hasParentSegment(relativePath) {
  const filePart = relativePath.split('#')[0];
  return filePart.split('/').some((part) => part === '..' || part === '.');
}

/** Validated user preset path (`print/x.ini` or `filament/x.ini`). */
function prusaUserPath(raw) {
  const normalized = normalizePath(raw);
  if (!USER_PATH.test(normalized) || hasParentSegment(normalized)) {
    throw badRequest('Only print/*.ini and filament/*.ini presets can be opened.');
  }
  return normalized;
}

/** Validated user or vendor path, with its preset kind. */
function prusaProfilePath(raw) {
  const normalized = normalizePath(raw);
  if (hasParentSegment(normalized)) throw badRequest('Invalid path segment');
  const vendor = VENDOR_PATH.exec(normalized);
  if (vendor) return { relativePath: normalized, kind: vendor[2], isVendor: true };
  const relativePath = prusaUserPath(normalized);
  return { relativePath, kind: relativePath.split('/')[0], isVendor: false };
}

async function listIniFiles(dirAbs) {
  try {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.ini'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function directoryExists(dirAbs) {
  try {
    return (await fs.stat(dirAbs)).isDirectory();
  } catch {
    return false;
  }
}

async function prusaAccounts(rootAbs) {
  const hasPresets =
    (await directoryExists(path.join(rootAbs, 'print'))) ||
    (await directoryExists(path.join(rootAbs, 'filament')));
  return hasPresets ? { layout: 'prusa', accounts: ['default'] } : { layout: null, accounts: [] };
}

async function listPrusaProfiles(rootAbs) {
  const out = [];
  for (const dir of ['print', 'filament']) {
    for (const fileName of await listIniFiles(path.join(rootAbs, dir))) {
      out.push({
        userId: 'default',
        kind: dir === 'print' ? 'process' : 'filament',
        relativePath: `${dir}/${fileName}`,
        fileName,
        ...(dir === 'filament' ? { filamentCategory: 'standard' } : {}),
      });
    }
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/** Names under `[filaments]` in PrusaSlicer.ini, or null when the section is absent. */
async function enabledFilamentNames(rootAbs) {
  let text;
  try {
    text = await fs.readFile(path.join(rootAbs, 'PrusaSlicer.ini'), 'utf8');
  } catch {
    return null;
  }
  const section = parseIni(text).sections.find((candidate) => candidate.header === 'filaments');
  return section ? new Set(Object.keys(section.data)) : null;
}

async function listPrusaSystemFilaments(rootAbs) {
  const bundles = await loadVendorBundles(rootAbs);
  const enabled = await enabledFilamentNames(rootAbs);
  const out = [];
  for (const bundle of bundles) {
    for (const preset of bundle.presets.filament.values()) {
      if (preset.abstract) continue;
      if (enabled && !enabled.has(preset.name)) continue;
      out.push({
        relativePath: vendorPresetPath(bundle, 'filament', preset),
        folder: bundle.vendor,
        fileName: preset.name,
      });
    }
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function readUserPreset(rootAbs, relativePath) {
  const text = await fs.readFile(path.join(rootAbs, ...relativePath.split('/')), 'utf8');
  return parseIni(text).root;
}

async function resolvePrusa(rootAbs, rawPath, rawCompareWith) {
  const target = prusaProfilePath(rawPath);
  const bundles = await loadVendorBundles(rootAbs);
  if (!rawCompareWith) {
    return resolvePrusaChain(rootAbs, target.relativePath, target.kind, bundles);
  }
  const compare = prusaProfilePath(rawCompareWith);
  if (!compare.isVendor || compare.kind !== 'filament' || target.kind !== 'filament') {
    throw badRequest('compareWith must be a PrusaSlicer system filament path');
  }
  const resolved = await resolvePrusaChain(rootAbs, compare.relativePath, 'filament', bundles);
  return {
    chain: [
      ...resolved.chain,
      {
        relativePath: target.relativePath,
        data: await readUserPreset(rootAbs, target.relativePath),
      },
    ],
    warnings: resolved.warnings,
  };
}

function statusFor(error) {
  if (typeof error?.statusCode === 'number') return error.statusCode;
  if (error?.code === 'ENOENT') return 404;
  return 500;
}

/**
 * Handles one Prusa route. Returns `{ status, body }`, or null when the route
 * is not a Prusa route so the caller can answer 404.
 */
async function handlePrusaRoute(method, route, url, rootAbs) {
  try {
    if (route === '/api/meta') {
      const { layout, accounts } = await prusaAccounts(rootAbs);
      return { status: 200, body: { root: rootAbs, layout, accountCount: accounts.length } };
    }
    if (route === '/api/accounts') {
      return { status: 200, body: await prusaAccounts(rootAbs) };
    }
    if (route === '/api/profiles') {
      return { status: 200, body: { profiles: await listPrusaProfiles(rootAbs), layout: 'prusa' } };
    }
    if (route === '/api/system-filaments') {
      return { status: 200, body: { entries: await listPrusaSystemFilaments(rootAbs) } };
    }
    if (route === '/api/resolve') {
      const rawPath = url.searchParams.get('path');
      if (!rawPath) throw badRequest('Missing path query (e.g. print/My profile.ini)');
      const compareWith = url.searchParams.get('compareWith')?.trim() || null;
      return { status: 200, body: await resolvePrusa(rootAbs, rawPath, compareWith) };
    }
    if (route === '/api/profile-file') {
      if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
      const relativePath = prusaUserPath(url.searchParams.get('path'));
      return {
        status: 200,
        body: { relativePath, data: await readUserPreset(rootAbs, relativePath) },
      };
    }
    return null;
  } catch (error) {
    return {
      status: statusFor(error),
      body: { error: error instanceof Error ? error.message : 'PrusaSlicer request failed' },
    };
  }
}

module.exports = {
  handlePrusaRoute,
  prusaUserPath,
};
