/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Øyvind Øyen
 *
 * Electron shell: starts server.js on 127.0.0.1:3847 and loads the Next UI.
 * Dev: ELECTRON_DEV=1 → http://127.0.0.1:3000 (next dev).
 * Preview / packaged: static files from `out/` on http://127.0.0.1:3848.
 */

const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_PORT = Number(process.env.PORT || 3847);
const UI_PORT = Number(process.env.ELECTRON_UI_PORT || 3848);
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;
const HEALTH_URL = `${API_ORIGIN}/api/health`;
const DEV_UI_URL = 'http://localhost:3000';
const HEALTH_TIMEOUT_MS = 15000;
const KILL_GRACE_MS = 2000;

/** @type {import("child_process").ChildProcess | null} */
let apiChild = null;
let apiOwned = false;
let apiExited = true;
let quitting = false;
let suppressApiExitDialog = false;
/** @type {import("http").Server | null} */
let uiServer = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;

function isDevUi() {
  return process.env.ELECTRON_DEV === '1';
}

function resolveServerJs() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server.js');
  }
  return path.join(__dirname, '..', 'server.js');
}

function resolveOutDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'out');
  }
  return path.join(__dirname, '..', 'out');
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    case '.map':
      return 'application/json';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function fetchHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fetchHealth()) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return fetchHealth();
}

function startApiChild(serverPath) {
  apiExited = false;
  apiOwned = true;
  apiChild = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(API_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  const prefixLog = (chunk, stream) => {
    const text = String(chunk).trimEnd();
    if (!text) return;
    const line = `[bambu-api] ${text}`;
    if (stream === 'stderr') console.error(line);
    else console.log(line);
  };
  apiChild.stdout?.on('data', (c) => prefixLog(c, 'stdout'));
  apiChild.stderr?.on('data', (c) => prefixLog(c, 'stderr'));

  apiChild.on('error', (err) => {
    console.error('[bambu-api] failed to spawn', err);
  });

  apiChild.on('exit', (code, signal) => {
    apiExited = true;
    apiChild = null;
    if (!quitting && apiOwned && !suppressApiExitDialog) {
      dialog.showErrorBox(
        'Bambu Browser API stopped',
        `The local API process exited unexpectedly (${signal ?? code ?? 'unknown'}). The app will close.`,
      );
      app.quit();
    }
  });
}

function killApiChild() {
  return new Promise((resolve) => {
    if (!apiOwned || !apiChild || apiExited) {
      resolve();
      return;
    }
    const child = apiChild;
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    child.once('exit', finish);
    child.kill('SIGTERM');
    const timer = setTimeout(() => {
      if (!apiExited && child === apiChild) {
        try {
          child.kill('SIGKILL');
        } catch {
          /* already gone */
        }
      }
      resolve();
    }, KILL_GRACE_MS);
  });
}

function startStaticUiServer(outDir) {
  return new Promise((resolve, reject) => {
    const indexHtml = path.join(outDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      reject(new Error(`Static UI not found at ${outDir}. Run npm run build:electron first.`));
      return;
    }

    uiServer = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', `http://127.0.0.1:${UI_PORT}`);
        let rel = decodeURIComponent(url.pathname);
        if (rel === '/' || rel === '') rel = '/index.html';
        const unsafe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
        let filePath = path.join(outDir, unsafe);
        const outResolved = path.resolve(outDir);
        if (!path.resolve(filePath).startsWith(outResolved)) {
          res.writeHead(403);
          res.end();
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = indexHtml;
        }
        const body = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mimeFor(filePath) });
        res.end(body);
      } catch {
        res.writeHead(500);
        res.end();
      }
    });

    uiServer.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `UI port ${UI_PORT} is already in use. Close the other process or set ELECTRON_UI_PORT.`,
          ),
        );
        return;
      }
      reject(err);
    });
    uiServer.listen(UI_PORT, '127.0.0.1', () => {
      console.log(`Electron UI listening on http://127.0.0.1:${UI_PORT}`);
      resolve(`http://127.0.0.1:${UI_PORT}`);
    });
  });
}

function stopUiServer() {
  return new Promise((resolve) => {
    if (!uiServer) {
      resolve();
      return;
    }
    uiServer.close(() => resolve());
    uiServer = null;
  });
}

function createWindow(uiUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 560,
    title: 'Bambu Browser',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  return mainWindow.loadURL(uiUrl);
}

async function ensureApi() {
  const serverPath = resolveServerJs();
  if (!fs.existsSync(serverPath)) {
    throw new Error(`server.js not found at ${serverPath}`);
  }

  if (await fetchHealth()) {
    apiOwned = false;
    console.log(`Reusing existing API at ${API_ORIGIN}`);
    return;
  }

  startApiChild(serverPath);
  const ok = await waitForHealth(HEALTH_TIMEOUT_MS);
  if (!ok) {
    suppressApiExitDialog = true;
    await killApiChild();
    apiOwned = false;
    throw new Error(
      `Could not start the local API on port ${API_PORT}. If another program is using that port, stop it (for example npm run api) and try again.`,
    );
  }
}

async function boot() {
  try {
    await ensureApi();
    const uiUrl = isDevUi() ? DEV_UI_URL : await startStaticUiServer(resolveOutDir());
    await createWindow(uiUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dialog.showErrorBox('Bambu Browser failed to start', message);
    app.quit();
  }
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', (e) => {
  if (quitting) return;
  if (apiOwned && !apiExited) {
    e.preventDefault();
    quitting = true;
    void Promise.all([killApiChild(), stopUiServer()]).finally(() => {
      app.quit();
    });
    return;
  }
  quitting = true;
  void stopUiServer();
});

void app.whenReady().then(boot);
