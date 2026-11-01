/* oxlint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const {
  buildPresetIndex,
  loadVendorBundles,
  parseIni,
  resolvePrusaChain,
  vendorPresetPath,
} = require('./prusa-bundle');

let root;

async function writeFile(relativePath, text) {
  const full = path.join(root, ...relativePath.split('/'));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, text);
}

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'prusa-bundle-'));
  await writeFile(
    'vendor/Acme.ini',
    [
      '# Acme profiles',
      '[vendor]',
      'name = Acme',
      '',
      '[printer_model:MK1]',
      'name = Acme MK1',
      '',
      '[print:*common*]',
      'layer_height = 0.2',
      '',
      '[print:*0.20mm*]',
      'inherits = *common*',
      '',
      '[print:Normal]',
      'inherits = *0.20mm*; *0.4nozzle*',
      'renamed_from = "Old PLA"; "Older"',
      '',
      '[printer:Acme MK1]',
      'nozzle_diameter = 0.4',
      '',
    ].join('\n'),
  );
  await writeFile(
    'vendor/Templates.ini',
    [
      '[vendor]',
      'name = Templates',
      'templates_profile = 1',
      '',
      '[filament:*PLA*]',
      'temperature = 210',
      '',
      '[filament:Esun PLA]',
      'inherits = *PLA*',
      '',
    ].join('\n'),
  );
  await writeFile(
    'vendor/Diamond.ini',
    [
      '[print:*common*]',
      'a = 1',
      'b = 1',
      '[print:*x*]',
      'inherits = *common*',
      'a = 2',
      '[print:*y*]',
      'inherits = *common*',
      'c = 3',
      '[print:P]',
      'inherits = *x*; *y*',
      'renamed_from = "Old P"',
      '',
    ].join('\n'),
  );
  await writeFile(
    'vendor/Loop.ini',
    [
      '[print:*a*]',
      'inherits = *b*',
      '[print:*b*]',
      'inherits = *a*',
      '[print:Q]',
      'inherits = *a*',
    ].join('\n'),
  );
  await writeFile('vendor/Other.ini', ['[print:Z]', 'inherits = *common*', 'z = 1'].join('\n'));
  await writeFile('print/U.ini', 'a = 9\ninherits = P\n');
  await writeFile('print/Detached.ini', 'a = 9\ninherits = \n');
  await writeFile('print/Gone.ini', 'a = 9\ninherits = Gone\n');
  await writeFile('print/Renamed.ini', 'a = 9\ninherits = Old P\n');
});

after(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

test('parseIni keeps everything after the first " = " verbatim', () => {
  const parsed = parseIni('start_gcode = G1 X=1 ; "a\\nb"\n');
  assert.equal(parsed.root.start_gcode, 'G1 X=1 ; "a\\nb"');
});

test('parseIni puts keys before the first section in root and skips comments', () => {
  const parsed = parseIni('# generated\na = 1\n[print:X]\nb = 2\n; note\n');
  assert.deepEqual(parsed.root, { a: '1' });
  assert.deepEqual(parsed.sections, [{ header: 'print:X', data: { b: '2' } }]);
});

test('parseIni keeps empty values', () => {
  assert.equal(parseIni('inherits = \n').root.inherits, '');
});

test('loadVendorBundles marks abstract presets and splits inherits', async () => {
  const bundles = await loadVendorBundles(root);
  const acme = bundles.find((bundle) => bundle.vendor === 'Acme');
  assert.equal(acme.presets.print.get('*common*').abstract, true);
  assert.equal(acme.presets.print.get('Normal').abstract, false);
  assert.deepEqual(acme.presets.print.get('Normal').inherits, ['*0.20mm*', '*0.4nozzle*']);
  assert.deepEqual(acme.presets.print.get('Normal').renamedFrom, ['Old PLA', 'Older']);
});

test('loadVendorBundles ignores printer, printer_model and vendor sections', async () => {
  const bundles = await loadVendorBundles(root);
  const acme = bundles.find((bundle) => bundle.vendor === 'Acme');
  assert.deepEqual([...acme.presets.print.keys()], ['*common*', '*0.20mm*', 'Normal']);
  assert.equal(acme.presets.filament.size, 0);
});

test('templates bundles append " @Template" to filament names', async () => {
  const bundles = await loadVendorBundles(root);
  const index = buildPresetIndex(bundles, 'filament');
  assert.equal(index.has('Esun PLA'), false);
  const hit = index.get('Esun PLA @Template');
  assert.equal(hit.bundle.vendor, 'Templates');
  assert.equal(hit.preset.sectionName, 'Esun PLA');
});

test('buildPresetIndex resolves renamed_from aliases', async () => {
  const bundles = await loadVendorBundles(root);
  const index = buildPresetIndex(bundles, 'print');
  assert.equal(index.get('Old PLA').preset.name, 'Normal');
});

function fold(chain) {
  return Object.assign({}, ...chain.map((level) => level.data));
}

test('multi-parent inherits: the last parent wins, as in PrusaSlicer', async () => {
  const bundles = await loadVendorBundles(root);
  const { chain, warnings } = await resolvePrusaChain(
    root,
    'vendor/Diamond.ini#print:P',
    'print',
    bundles,
  );
  assert.deepEqual(
    chain.map((level) => level.relativePath),
    [
      'vendor/Diamond.ini#print:*x*',
      'vendor/Diamond.ini#print:*common*',
      'vendor/Diamond.ini#print:*y*',
      'vendor/Diamond.ini#print:P',
    ],
  );
  // *y* brings *common* back after *x*, so *common*'s a=1 beats *x*'s a=2.
  assert.deepEqual(fold(chain), { a: '1', b: '1', c: '3' });
  assert.deepEqual(warnings, []);
});

test('a user preset ends the chain below its system parent', async () => {
  const bundles = await loadVendorBundles(root);
  const { chain } = await resolvePrusaChain(root, 'print/U.ini', 'print', bundles);
  assert.deepEqual(
    chain.slice(-2).map((level) => level.relativePath),
    ['vendor/Diamond.ini#print:P', 'print/U.ini'],
  );
  assert.equal(chain.at(-1).data.inherits, 'P');
  assert.equal(chain.at(-2).data.inherits, undefined);
});

test('a detached user preset is a chain of one', async () => {
  const bundles = await loadVendorBundles(root);
  const result = await resolvePrusaChain(root, 'print/Detached.ini', 'print', bundles);
  assert.deepEqual(
    result.chain.map((level) => level.relativePath),
    ['print/Detached.ini'],
  );
  assert.deepEqual(result.warnings, []);
});

test('a missing parent degrades to the file alone with a warning', async () => {
  const bundles = await loadVendorBundles(root);
  const result = await resolvePrusaChain(root, 'print/Gone.ini', 'print', bundles);
  assert.deepEqual(
    result.chain.map((level) => level.relativePath),
    ['print/Gone.ini'],
  );
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Gone/);
});

test('a renamed parent is found through renamed_from', async () => {
  const bundles = await loadVendorBundles(root);
  const result = await resolvePrusaChain(root, 'print/Renamed.ini', 'print', bundles);
  assert.equal(result.chain.at(-2).relativePath, 'vendor/Diamond.ini#print:P');
  assert.deepEqual(result.warnings, []);
});

test('an inheritance cycle is an error', async () => {
  const bundles = await loadVendorBundles(root);
  await assert.rejects(
    resolvePrusaChain(root, 'vendor/Loop.ini#print:Q', 'print', bundles),
    /Inheritance cycle/,
  );
});

test('bundle parents are looked up in the same bundle only', async () => {
  const bundles = await loadVendorBundles(root);
  const result = await resolvePrusaChain(root, 'vendor/Other.ini#print:Z', 'print', bundles);
  assert.deepEqual(
    result.chain.map((level) => level.relativePath),
    ['vendor/Other.ini#print:Z'],
  );
  assert.match(result.warnings[0], /\*common\*/);
});

test('vendorPresetPath uses the raw section name', async () => {
  const bundles = await loadVendorBundles(root);
  const templates = bundles.find((bundle) => bundle.vendor === 'Templates');
  const preset = templates.presets.filament.get('Esun PLA @Template');
  assert.equal(
    vendorPresetPath(templates, 'filament', preset),
    'vendor/Templates.ini#filament:Esun PLA',
  );
});
