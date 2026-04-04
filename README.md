# Bambu browser

A small **local** web app for exploring **Bambu Studio** user profiles: browse accounts, open profile trees, and inspect inheritance chains from the JSON and preset files Studio keeps on disk. The UI is a Next.js application; a companion **Node HTTP server** reads your Bambu Studio data directory with normal filesystem APIs, which browsers cannot do on their own.

## What it does

Bambu Studio stores machine, process, and filament presets under an application-support folder (on macOS, typically `~/Library/Application Support/BambuStudio`). This project lists those profiles, resolves how profiles inherit from one another, and presents that structure in the browser. Nothing is uploaded to the cloud: all data stays on your machine and is served only through the local API you start yourself.

## Requirements

- **Node.js** (current LTS is fine)
- **Bambu Studio** installed and used at least once so its data directory exists (or point the API at a copy of that tree with `BAMBUSTUDIO_ROOT`)

## Usage

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the local JSON API** (in a separate terminal). It serves read-only metadata and file paths from your Bambu Studio root.

   ```bash
   npm run api
   ```

   Optional environment variables:
   - **`BAMBUSTUDIO_ROOT`** — absolute path to the Bambu Studio data folder. If omitted, the server uses the default for your OS (on macOS: `~/Library/Application Support/BambuStudio`).
   - **`PORT`** — API port (default **3847**).

   Example:

   ```bash
   BAMBUSTUDIO_ROOT="/path/to/BambuStudio" PORT=3847 npm run api
   ```

3. **Start the Next.js app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The UI talks to the API at **http://127.0.0.1:3847** by default.

   If the API runs on another host or port, set **`NEXT_PUBLIC_BAMBU_API_URL`** before `npm run dev`, for example:

   ```bash
   NEXT_PUBLIC_BAMBU_API_URL=http://127.0.0.1:3847 npm run dev
   ```

4. **Production build** (UI only; you still need the API process for full functionality)

   ```bash
   npm run build
   npm start
   ```

### Other scripts

- **`npm run lint`** — ESLint
- **`npm run format`** — Prettier write
- **`npm run format:check`** — Prettier check (e.g. for CI)

## Limitations and security

**Intended use is on your own machine, bound to localhost (or loopback), not as a service on the open internet.**

- The helper server (`server.js`) **reads files under your Bambu Studio directory** and exposes them through HTTP. It is a **development-style local tool**, not a hardened production API.
- The API enables **broad CORS** so the browser can call it from your dev origin. Combined with filesystem access under the configured root, exposing this server on a **LAN IP or hostname** would let **any site or client that can reach the port** request that data. **Do not** bind it to `0.0.0.0` or deploy it where untrusted networks can reach it unless you fully understand and accept that risk.
- The Next.js app and browser features involved (secure context, optional file-picker flows) are **designed around local development** on `http://localhost` / `http://127.0.0.1`. Running the stack elsewhere may hit browser or mixed-content restrictions.

Treat this repository as a **personal, localhost-only utility**. If you need remote access, use an explicit, reviewed approach (VPN, SSH tunnel, or a proper authenticated backend), not an open local API.

## Technical layout

### Architecture

The app is split into **two processes**:

1. **Next.js client** (`npm run dev` / `build` + `start`) — React 19 with the App Router (`app/`). The home page (`app/page.tsx`) renders the `BambuProfileWorkbench`, which loads data from the local API URL (`NEXT_PUBLIC_BAMBU_API_URL`, default `http://127.0.0.1:3847`).

2. **Local HTTP API** (`server.js`, started with `npm run api`) — plain Node with `http` and `fs/promises`. It reads the Bambu Studio directory on disk, validates paths under the configured root, and returns JSON. The browser cannot do this on its own without a file-picker API or similar, so this process is required for normal development.

**`lib/bambu/`** holds client-side domain logic: API client (`bambu-api-client.ts`), profile and inheritance resolution (`resolver.ts`, `mapping.ts`), helpers for displaying inheritance chains (`chain-display.ts`), file-handling / validation helpers where needed, and related types. **`components/profile-manager/`** is the profile tree and toolbar UI (for example `ProfileTreeGrid`, `BambuProfileWorkbench`). **`components/ui/`** is reusable primitives (buttons, table, collapsible). **`localization/`** handles locales (context, strings, process-parameter tooltips). **`components/providers.tsx`** wires `next-themes` (light/dark) and the locale provider around the app. Fonts and global styles live in `app/layout.tsx` and `app/globals.css`.

### Packages and tooling

| Area                  | Package                                                              | Role                                                        |
| --------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework             | `next`                                                               | App Router, routing, build/start                            |
| UI                    | `react`, `react-dom`                                                 | Component library                                           |
| Components / headless | `@base-ui/react`                                                     | Unstyled primitives for building UI                         |
| Variants              | `class-variance-authority`                                           | Variant-based Tailwind classes on components                |
| Classes               | `clsx`, `tailwind-merge`                                             | Merge and dedupe CSS class names                            |
| Icons                 | `lucide-react`                                                       | Icons in the UI                                             |
| Theme                 | `next-themes`                                                        | Light/dark/system via `class` on `<html>`                   |
| CLI / scaffolding     | `shadcn`                                                             | shadcn/ui tooling for component setup (project conventions) |
| Animation             | `tw-animate-css`                                                     | Tailwind-oriented animation utilities                       |
| Styling               | `tailwindcss`, `@tailwindcss/postcss`                                | Tailwind CSS v4 with PostCSS                                |
| Language              | TypeScript, `@types/node`, `@types/react`, `@types/react-dom`        | Type-checking                                               |
| Quality               | `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier` | Lint and formatting                                         |

Versions live in `package.json`; bump `next` and `eslint-config-next` together if you change the Next.js version.

### Directory map (short)

- `app/` — Next.js App Router: `layout.tsx`, `page.tsx`, `globals.css`
- `components/` — React components (profile manager, UI, theme, language)
- `lib/bambu/` — Bambu-specific logic and client-side API calls
- `lib/utils/` — Shared helpers (for example `cn`)
- `localization/` — Translations and `LocaleProvider`
- `types/` — Shared types where needed
- `server.js` — Local read-only HTTP API over the Bambu Studio data directory
