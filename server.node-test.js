/* oxlint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const { createServer } = require('./server');

let temporary;
let bambuRoot;
let orcaRoot;
let prusaRoot;
let server;
let baseUrl;

async function writeJson(root, relativePath, data) {
  const full = path.join(root, ...relativePath.split('/'));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data));
}

async function writeText(root, relativePath, text) {
  const full = path.join(root, ...relativePath.split('/'));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, text);
}

async function getJson(route) {
  const response = await fetch(`${baseUrl}${route}`);
  return { status: response.status, body: await response.json() };
}

async function putJson(route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'bambu-browser-api-'));
  bambuRoot = path.join(temporary, 'BambuStudio');
  orcaRoot = path.join(temporary, 'OrcaSlicer');
  process.env.BAMBUSTUDIO_ROOT = bambuRoot;
  process.env.ORCASLICER_ROOT = orcaRoot;
  prusaRoot = path.join(temporary, 'PrusaSlicer');
  process.env.PRUSASLICER_ROOT = prusaRoot;

  await writeJson(bambuRoot, 'users/bambu-account/process/Bambu profile.json', {
    name: 'Bambu profile',
  });
  await writeJson(bambuRoot, 'system/BBL/process/fdm_process_common.json', {
    common: 'bambu',
  });

  await writeJson(orcaRoot, 'user/default/process/Orca child.json', {
    inherits: 'Shared parent',
    child: true,
  });
  await writeJson(orcaRoot, 'system/ZVendor/process/nested/Shared parent.json', { source: 'z' });
  await writeJson(orcaRoot, 'system/AVendor/process/Shared parent.json', {
    source: 'a',
  });
  await writeJson(orcaRoot, 'user/default/filament/base/My filament.json', {
    name: 'My filament',
  });
  await writeJson(orcaRoot, 'system/OrcaFilamentLibrary/filament/Generic PLA.json', {
    name: 'Generic PLA',
  });
  await writeJson(orcaRoot, 'system/Custom/filament/Custom PLA.json', {
    name: 'Custom PLA',
  });

  await writeText(
    prusaRoot,
    'vendor/Acme.ini',
    [
      '[vendor]',
      'name = Acme',
      '[print:*common*]',
      'layer_height = 0.2',
      '[print:Acme Normal]',
      'inherits = *common*',
      '[filament:*PLA*]',
      'temperature = 210',
      '[filament:Acme PLA]',
      'inherits = *PLA*',
      '[filament:Acme Hidden PLA]',
      'inherits = *PLA*',
      '',
    ].join('\n'),
  );
  await writeText(
    prusaRoot,
    'print/Grønn PLA #2.ini',
    'inherits = Acme Normal\nlayer_height = 0.3\n',
  );
  await writeText(prusaRoot, 'filament/F.ini', 'inherits = \ntemperature = 200\n');
  await writeText(prusaRoot, 'PrusaSlicer.ini', '[filaments]\nAcme PLA = 1\n');

  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await fs.rm(temporary, { recursive: true, force: true });
});

test('defaults every request to the Bambu root', async () => {
  const { status, body } = await getJson('/api/meta');
  assert.equal(status, 200);
  assert.equal(body.root, bambuRoot);
  assert.equal(body.layout, 'users');
});

test('identifies the API and protocol version in health responses', async () => {
  const { status, body } = await getJson('/api/health');
  assert.equal(status, 200);
  assert.equal(body.app, 'bambu-browser');
  assert.equal(body.apiVersion, 2);
  assert.equal(body.ok, true);
  assert.equal(body.root, bambuRoot);
});

test('selects Orca user/default profiles', async () => {
  const { status, body } = await getJson('/api/profiles?slicer=orca&account=default');
  assert.equal(status, 200);
  assert.deepEqual(
    body.profiles.map((profile) => profile.relativePath),
    ['user/default/filament/base/My filament.json', 'user/default/process/Orca child.json'],
  );
});

test('resolves Orca inheritance deterministically without BBL common', async () => {
  const { status, body } = await getJson(
    '/api/resolve?slicer=orca&path=user/default/process/Orca%20child.json',
  );
  assert.equal(status, 200);
  assert.deepEqual(
    body.chain.map((entry) => entry.relativePath),
    ['system/AVendor/process/Shared parent.json', 'user/default/process/Orca child.json'],
  );
});

test('writes profile edits only under the selected Orca root', async () => {
  const route = '/api/profile-file?slicer=orca&path=user/default/process/Orca%20child.json';
  const updated = {
    inherits: 'Shared parent',
    child: false,
    orca_only_setting: 'kept',
  };
  const result = await putJson(route, updated);

  assert.equal(result.status, 200);
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(path.join(orcaRoot, 'user/default/process/Orca child.json'), 'utf8'),
    ),
    updated,
  );
  assert.equal(
    await fs
      .access(path.join(bambuRoot, 'user/default/process/Orca child.json'))
      .then(() => true)
      .catch(() => false),
    false,
  );
});

test('lists Orca filament libraries and accepts compareWith', async () => {
  const listed = await getJson('/api/system-filaments?slicer=orca');
  assert.equal(listed.status, 200);
  assert.deepEqual(
    listed.body.entries.map((entry) => entry.relativePath),
    [
      'system/Custom/filament/Custom PLA.json',
      'system/OrcaFilamentLibrary/filament/Generic PLA.json',
    ],
  );

  const resolved = await getJson(
    '/api/resolve?slicer=orca&path=user/default/filament/base/My%20filament.json&compareWith=system/OrcaFilamentLibrary/filament/Generic%20PLA.json',
  );
  assert.equal(resolved.status, 200);
  assert.deepEqual(
    resolved.body.chain.map((entry) => entry.relativePath),
    [
      'system/OrcaFilamentLibrary/filament/Generic PLA.json',
      'user/default/filament/base/My filament.json',
    ],
  );
});

test('rejects unknown slicers', async () => {
  const { status, body } = await getJson('/health?slicer=other');
  assert.equal(status, 400);
  assert.match(body.error, /bambu.*orca.*prusa/);
});

test('lists the single PrusaSlicer account', async () => {
  const { status, body } = await getJson('/api/accounts?slicer=prusa');
  assert.equal(status, 200);
  assert.deepEqual(body, { layout: 'prusa', accounts: ['default'] });
});

test('lists PrusaSlicer print and filament presets', async () => {
  const { status, body } = await getJson('/api/profiles?slicer=prusa&account=default');
  assert.equal(status, 200);
  assert.deepEqual(body.profiles, [
    {
      userId: 'default',
      kind: 'filament',
      relativePath: 'filament/F.ini',
      fileName: 'F.ini',
      filamentCategory: 'standard',
    },
    {
      userId: 'default',
      kind: 'process',
      relativePath: 'print/Grønn PLA #2.ini',
      fileName: 'Grønn PLA #2.ini',
    },
  ]);
});

test('resolves a PrusaSlicer user preset through its vendor bundle', async () => {
  const { status, body } = await getJson(
    `/api/resolve?slicer=prusa&path=${encodeURIComponent('print/Grønn PLA #2.ini')}`,
  );
  assert.equal(status, 200);
  assert.deepEqual(
    body.chain.map((entry) => entry.relativePath),
    [
      'vendor/Acme.ini#print:*common*',
      'vendor/Acme.ini#print:Acme Normal',
      'print/Grønn PLA #2.ini',
    ],
  );
  assert.deepEqual(body.warnings, []);
});

test('rejects PrusaSlicer paths outside print, filament and vendor', async () => {
  for (const raw of ['vendor/../secret', 'print/../PrusaSlicer.ini', 'printer/x.ini']) {
    const { status } = await getJson(`/api/resolve?slicer=prusa&path=${encodeURIComponent(raw)}`);
    assert.equal(status, 400, raw);
  }
});

test('lists only the PrusaSlicer system filaments the user enabled', async () => {
  const { status, body } = await getJson('/api/system-filaments?slicer=prusa');
  assert.equal(status, 200);
  assert.deepEqual(body.entries, [
    { relativePath: 'vendor/Acme.ini#filament:Acme PLA', folder: 'Acme', fileName: 'Acme PLA' },
  ]);
});

test('compares a PrusaSlicer filament with a system filament', async () => {
  const { status, body } = await getJson(
    `/api/resolve?slicer=prusa&path=filament/F.ini&compareWith=${encodeURIComponent('vendor/Acme.ini#filament:Acme PLA')}`,
  );
  assert.equal(status, 200);
  assert.deepEqual(
    body.chain.map((entry) => entry.relativePath),
    ['vendor/Acme.ini#filament:*PLA*', 'vendor/Acme.ini#filament:Acme PLA', 'filament/F.ini'],
  );
});

test('reads a PrusaSlicer user preset file', async () => {
  const { status, body } = await getJson('/api/profile-file?slicer=prusa&path=filament/F.ini');
  assert.equal(status, 200);
  assert.deepEqual(body, {
    relativePath: 'filament/F.ini',
    data: { inherits: '', temperature: '200' },
  });
});
