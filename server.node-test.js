/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const { createServer } = require("./server");

let temporary;
let bambuRoot;
let orcaRoot;
let server;
let baseUrl;

async function writeJson(root, relativePath, data) {
  const full = path.join(root, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data));
}

async function getJson(route) {
  const response = await fetch(`${baseUrl}${route}`);
  return { status: response.status, body: await response.json() };
}

async function putJson(route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bambu-browser-api-"));
  bambuRoot = path.join(temporary, "BambuStudio");
  orcaRoot = path.join(temporary, "OrcaSlicer");
  process.env.BAMBUSTUDIO_ROOT = bambuRoot;
  process.env.ORCASLICER_ROOT = orcaRoot;

  await writeJson(bambuRoot, "users/bambu-account/process/Bambu profile.json", {
    name: "Bambu profile",
  });
  await writeJson(bambuRoot, "system/BBL/process/fdm_process_common.json", {
    common: "bambu",
  });

  await writeJson(orcaRoot, "user/default/process/Orca child.json", {
    inherits: "Shared parent",
    child: true,
  });
  await writeJson(
    orcaRoot,
    "system/ZVendor/process/nested/Shared parent.json",
    { source: "z" },
  );
  await writeJson(orcaRoot, "system/AVendor/process/Shared parent.json", {
    source: "a",
  });
  await writeJson(orcaRoot, "user/default/filament/base/My filament.json", {
    name: "My filament",
  });
  await writeJson(
    orcaRoot,
    "system/OrcaFilamentLibrary/filament/Generic PLA.json",
    { name: "Generic PLA" },
  );
  await writeJson(orcaRoot, "system/Custom/filament/Custom PLA.json", {
    name: "Custom PLA",
  });

  server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await fs.rm(temporary, { recursive: true, force: true });
});

test("defaults every request to the Bambu root", async () => {
  const { status, body } = await getJson("/api/meta");
  assert.equal(status, 200);
  assert.equal(body.root, bambuRoot);
  assert.equal(body.layout, "users");
});

test("selects Orca user/default profiles", async () => {
  const { status, body } = await getJson(
    "/api/profiles?slicer=orca&account=default",
  );
  assert.equal(status, 200);
  assert.deepEqual(
    body.profiles.map((profile) => profile.relativePath),
    [
      "user/default/filament/base/My filament.json",
      "user/default/process/Orca child.json",
    ],
  );
});

test("resolves Orca inheritance deterministically without BBL common", async () => {
  const { status, body } = await getJson(
    "/api/resolve?slicer=orca&path=user/default/process/Orca%20child.json",
  );
  assert.equal(status, 200);
  assert.deepEqual(
    body.chain.map((entry) => entry.relativePath),
    [
      "system/AVendor/process/Shared parent.json",
      "user/default/process/Orca child.json",
    ],
  );
});

test("writes profile edits only under the selected Orca root", async () => {
  const route =
    "/api/profile-file?slicer=orca&path=user/default/process/Orca%20child.json";
  const updated = {
    inherits: "Shared parent",
    child: false,
    orca_only_setting: "kept",
  };
  const result = await putJson(route, updated);

  assert.equal(result.status, 200);
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(
        path.join(orcaRoot, "user/default/process/Orca child.json"),
        "utf8",
      ),
    ),
    updated,
  );
  assert.equal(
    await fs
      .access(path.join(bambuRoot, "user/default/process/Orca child.json"))
      .then(() => true)
      .catch(() => false),
    false,
  );
});

test("lists Orca filament libraries and accepts compareWith", async () => {
  const listed = await getJson("/api/system-filaments?slicer=orca");
  assert.equal(listed.status, 200);
  assert.deepEqual(
    listed.body.entries.map((entry) => entry.relativePath),
    [
      "system/Custom/filament/Custom PLA.json",
      "system/OrcaFilamentLibrary/filament/Generic PLA.json",
    ],
  );

  const resolved = await getJson(
    "/api/resolve?slicer=orca&path=user/default/filament/base/My%20filament.json&compareWith=system/OrcaFilamentLibrary/filament/Generic%20PLA.json",
  );
  assert.equal(resolved.status, 200);
  assert.deepEqual(
    resolved.body.chain.map((entry) => entry.relativePath),
    [
      "system/OrcaFilamentLibrary/filament/Generic PLA.json",
      "user/default/filament/base/My filament.json",
    ],
  );
});

test("rejects unknown slicers", async () => {
  const { status, body } = await getJson("/health?slicer=other");
  assert.equal(status, 400);
  assert.match(body.error, /bambu.*orca/);
});
