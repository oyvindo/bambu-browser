/* oxlint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const { buildPresetIndex, loadVendorBundles, parseIni } = require('./prusa-bundle');

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
