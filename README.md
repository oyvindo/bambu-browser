# Bambu browser

A local profile browser for **Bambu Studio** and **OrcaSlicer**: browse process
and filament profiles, inspect inheritance chains, compare values, and edit
user profiles.

## Recommended: download the desktop app

For most users, download the latest macOS or Windows build from
**[GitHub Releases](https://github.com/oyvindo/bambu-browser/releases)**. The
desktop app starts its local API automatically; no terminal or developer setup
is required.

The hosted [Vercel web app](https://bambu-browser.vercel.app/) **cannot read
slicer profiles on its own**. On both macOS and Windows, `server.js` must be
running locally on the same computer. Developers can either:

1. run only `vp run api` locally and use the Vercel interface, or
2. clone the repository and run both `vp run api` and `vp run dev`.

The browser never uploads profile data. The API is bound to loopback and reads
the slicer files directly from your computer.

## What it does

Bambu Studio stores machine, process, and filament presets under an application-support folder (on macOS, typically `~/Library/Application Support/BambuStudio`). This project lists those profiles, resolves how profiles inherit from one another, and presents that structure in the browser. Nothing is uploaded to the cloud: all data stays on your machine and is served only through the local API you start yourself.

## Developer requirements

- **[Vite+](https://viteplus.dev/)** (`vp`) — install with `curl -fsSL https://vite.plus | bash`, then open a new terminal and run `vp help`. Vite+ manages the Node.js runtime and npm for this repo.
- **Bambu Studio** installed and used at least once so its data directory exists (or point the API at a copy of that tree with `BAMBUSTUDIO_ROOT`)

This app is still **Next.js + Electron**. Vite+ is the toolchain (install, lint, format, type-check, tests). `vp dev` and `vp build` always start Vite, which this project does not use. Run Next and Electron through `vp run <script>` (same as the `package.json` scripts).

## Developer usage

1. **Install dependencies**

   ```bash
   vp install
   ```

2. **Start the local JSON API** (in a separate terminal). It reads profiles and can replace explicitly selected user process/filament files under your Bambu Studio root.

   ```bash
   vp run api
   ```

   Optional environment variables:
   - **`BAMBUSTUDIO_ROOT`** — absolute path to the Bambu Studio data folder. If omitted, the server uses the default for your OS (on macOS: `~/Library/Application Support/BambuStudio`; on Windows: `%APPDATA%\BambuStudio`).
   - **`ORCASLICER_ROOT`** — absolute path to the OrcaSlicer data folder. Defaults to `~/Library/Application Support/OrcaSlicer` on macOS and `%APPDATA%\OrcaSlicer` on Windows.
   - **`PORT`** — API port (default **3847**).
   - **`BAMBU_BROWSER_WRITE_ORIGINS`** — optional comma-separated non-localhost browser origins that may use the profile write endpoint. Localhost and 127.0.0.1 origins are allowed automatically.

   Example:

   ```bash
   BAMBUSTUDIO_ROOT="/path/to/BambuStudio" PORT=3847 vp run api
   ```

3. **Start the Next.js app**

   ```bash
   vp run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The UI talks to the API at **http://127.0.0.1:3847** by default.

   The same API process serves both slicers. Its routes accept
   `slicer=bambu|orca` and default to `bambu` for backward compatibility.

   If the API runs on another host or port, set **`NEXT_PUBLIC_BAMBU_API_URL`** before `vp run dev`, for example:

   ```bash
   NEXT_PUBLIC_BAMBU_API_URL=http://127.0.0.1:3847 vp run dev
   ```

4. **Production build** (UI only; you still need the API process for full functionality)

   ```bash
   vp run build
   vp run start
   ```

### Desktop app (Electron)

The same UI and `server.js` API can run inside a desktop window so you do not need two terminals. The web commands above are unchanged: Electron is only an extra packaging layer.

- **`vp run electron:dev`** — starts Next.js (`next dev` on port 3000) and opens Electron. The app starts `server.js` on port **3847** itself. Do not run `vp run api` at the same time unless you intend to reuse that process (the app will attach if 3847 already serves `/api/health`).
- **`vp run electron:preview`** — static-export the UI and open Electron without building a `.dmg`.
- **`vp run dist`** (or `vp run dist:mac`) — static-export the UI and build an ad-hoc signed macOS `.dmg` under `dist/`.
- **`vp run dist:win`** — same export, then a Windows NSIS installer (x64) under `dist/`. Prefer running this **on Windows**. From macOS, NSIS often needs [Wine](https://www.electron.build/multi-platform-build); otherwise build on a Windows machine or CI runner.

**GitHub Releases:** pushing a version tag (`v0.1.0`, `v1.2.3`, …) runs [`.github/workflows/desktop-release.yml`](.github/workflows/desktop-release.yml). It builds the arm64 `.dmg` on `macos-latest` and the NSIS installer on `windows-latest`, then attaches those files to a GitHub Release for that tag. Ordinary pushes (for example to `main`) do not run this workflow; **Vercel still publishes the web app** independently.

Bump `version` in `package.json` so it matches the tag (installer filenames use that version), commit, then:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Closing the window quits the app and stops the API process it started. If it reused an API you started with `vp run api`, that process is left running.

#### First launch of a downloaded build

Neither build carries a paid developer certificate, so both operating systems may block the first launch. Later launches are usually normal after you allow the app once.

**Windows.** The NSIS installer (`Bambu Browser Setup … .exe`) is unsigned. Microsoft Defender SmartScreen often shows **Windows protected your PC** / **unrecognized app** with no **Run** on the first screen. Click **More info**, then **Run anyway**. User Account Control may still ask whether to allow the installer to make changes. SmartScreen is not guaranteed on every PC (it depends on Windows version, SmartScreen settings, and group policy). An unsigned Windows installer is an “unknown publisher” warning, not a “file is corrupt” error.

**macOS.** The app is ad-hoc signed (`identity: "-"` in [electron-builder.yml](electron-builder.yml)) but **not notarized**, so Gatekeeper shows _“Apple could not verify … is free of malware”_ with only **Done** and **Move to Bin**. This is expected. To open it:

1. Click **Done** (not _Move to Bin_).
2. Open **System Settings → Privacy & Security** and scroll to the Security section.
3. Next to the note that Bambu Browser was blocked, click **Open Anyway** and confirm with Touch ID or your password.

The equivalent from a terminal is to drop the download flag:

```bash
xattr -dr com.apple.quarantine "/Applications/Bambu Browser.app"
```

A message saying the app is **“damaged and can’t be opened”** means something different: that build has an invalid signature. Ad-hoc signing was added after `v0.1.0`, so use a `.dmg` from a later tag.

macOS notarization (which would remove the Gatekeeper prompt entirely) and Windows Authenticode signing (which would remove or reduce SmartScreen) are not part of this setup yet; both require a paid certificate.

### Other scripts

- **`vp check`** — format, lint, and type-check (prefer this in validation loops)
- **`vp lint`** / **`vp fmt`** — Oxlint and Oxfmt on their own
- **`vp test`** — Vitest only; **`vp run test`** also runs `server.node-test.js`
- **`vp run electron:dev`** / **`electron:preview`** / **`dist`** / **`dist:win`** — desktop wrapper (see above)

`package.json` scripts still work with `npm run …` if you already have Node installed.

### Git hooks

`vp install` runs `vp config` locally and installs the project-owned hooks:

- **Pre-commit** runs `vp staged`. Code files receive `vp check --fix`; supported
  non-code files receive `vp fmt`. Only staged files matching those patterns run.
- **Pre-push** validates the whole project with `vp check`, then runs the complete
  test script with `vp run test`.

Skip a hook once with `git commit --no-verify` or `git push --no-verify`. Set
`VP_GIT_HOOKS=0` to disable Vite+ hooks for a process. CI does not install hooks:
the `prepare` script exits when `CI` is set.

## Limitations and security

**Intended use is on your own machine, bound to localhost (or loopback), not as a service on the open internet.**

- The helper server (`server.js`) reads files under your Bambu Studio directory and can replace existing user process/filament JSON files. System profiles and paths outside `user/` or `users/` are read-only. It is a **development-style local tool**, not a hardened production API.
- Read endpoints enable broad CORS. Write requests are limited to localhost/127.0.0.1 browser origins unless explicitly added with `BAMBU_BROWSER_WRITE_ORIGINS`. **Do not** bind the server to `0.0.0.0` or deploy it where untrusted networks can reach it.
- The web interface always requires `server.js` on the same computer. When the
  hosted Vercel UI calls `http://127.0.0.1:3847`, the browser may ask for local
  network/device permission; allow it for the API calls to succeed.

Treat this repository as a **personal, localhost-only utility**. If you need remote access, use an explicit, reviewed approach (VPN, SSH tunnel, or a proper authenticated backend), not an open local API.

## Technical layout

### Architecture

The app is split into **two processes** in the web workflow (an optional Electron process wraps both for the desktop app):

1. **Next.js client** (`vp run dev` / `vp run build` + `vp run start`) — React 19 with the App Router (`app/`). The home page (`app/page.tsx`) renders the `BambuProfileWorkbench`, which loads Bambu Studio or OrcaSlicer data from the local API URL (`NEXT_PUBLIC_BAMBU_API_URL`, default `http://127.0.0.1:3847`).

2. **Local HTTP API** (`server.js`, started with `vp run api`) — plain Node with `http` and `fs/promises`. A `slicer` request parameter selects the configured Bambu Studio or OrcaSlicer root. The API validates paths under that root, lists user profiles, and resolves vendor-specific system inheritance. The Electron app starts this process automatically.

The shared workbench, inheritance grid, and leaf editor are deliberately
slicer-neutral. Bambu keeps its curated field descriptions and generated
PrintConfig validation. Orca fields use labels, categories, units, tooltips,
types, bounds, and enums generated from OrcaSlicer v2.4.2's pinned
`PrintConfig.cpp`; unknown future fields remain visible and editable. Machine
profiles are intentionally omitted from the sidebar to keep it focused on
editable process and filament profiles.

**`lib/bambu/`** holds client-side domain logic: API client (`bambu-api-client.ts`), profile and inheritance resolution (`resolver.ts`, `mapping.ts`), helpers for displaying inheritance chains (`chain-display.ts`), file-handling / validation helpers where needed, and related types. **`components/profile-manager/`** is the profile tree and toolbar UI (for example `ProfileTreeGrid`, `BambuProfileWorkbench`). **`components/ui/`** is reusable primitives (buttons, table, collapsible). **`localization/`** handles locales (context, strings, process-parameter tooltips). **`components/providers.tsx`** wires `@wrksz/themes` (light/dark) and the locale provider around the app. Fonts and global styles live in `app/layout.tsx` and `app/globals.css`.

### Packages and tooling

| Area                  | Package                                                       | Role                                                                    |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Framework             | `next`                                                        | App Router, routing, build/start                                        |
| UI                    | `react`, `react-dom`                                          | Component library                                                       |
| Components / headless | `@base-ui/react`                                              | Unstyled primitives for building UI                                     |
| Variants              | `tailwind-variants`                                           | Variant-based Tailwind classes on components (with built-in twMerge)    |
| Classes               | `tailwind-merge`                                              | Merge and dedupe CSS class names                                        |
| Icons                 | `lucide-react`                                                | Icons in the UI                                                         |
| Theme                 | `@wrksz/themes`                                               | Light/dark/system via `class` on `<html>` (Next.js 16 / React 19 ready) |
| CLI / scaffolding     | `shadcn`                                                      | shadcn/ui tooling for component setup (project conventions)             |
| Animation             | `tw-animate-css`                                              | Tailwind-oriented animation utilities                                   |
| Styling               | `tailwindcss`, `@tailwindcss/postcss`                         | Tailwind CSS v4 with PostCSS                                            |
| Language              | TypeScript, `@types/node`, `@types/react`, `@types/react-dom` | Type-checking                                                           |
| Toolchain             | `vite-plus` (`vp`)                                            | Install, Oxlint, Oxfmt, Vitest, type-check (`vp check` / `vp test`)     |
| Desktop               | `electron`, `electron-builder`, `concurrently`, `wait-on`     | Optional wrapper and macOS `.dmg` (`vp run electron:dev` / `dist`)      |

Versions live in `package.json`. Lint, format, and test config live in `vite.config.ts`.

### Validate Bambu Studio schema coverage

The profile grid has committed key manifests for
`fdm_process_common.json` and `fdm_filament_common.json`. It also renders
unknown keys found in inherited or future profiles under **Other settings**.

Run the normal schema and localization tests with:

```sh
vp run test
```

To compare the manifests with the Bambu Studio files installed on your
computer:

```sh
vp run validate:bambu-schema
```

The validator uses the same default Bambu Studio location as `server.js`.
Override it when necessary:

```sh
BAMBUSTUDIO_ROOT="/path/to/BambuStudio" vp run validate:bambu-schema
```

Generated validation metadata (known keys, value shapes, and small categorical
allowlists) is committed; complete Bambu profiles are never copied into this
repository.

Numeric limits and option types come from Bambu Studio's own
`src/libslic3r/PrintConfig.cpp` rather than from the range of values that
happens to appear in the shipped profiles. Refresh that artifact with:

```sh
vp run generate:config-bounds
```

It downloads `PrintConfig.cpp` from the BambuStudio repository. Point it at a
local checkout instead when you prefer:

```sh
BAMBUSTUDIO_PRINTCONFIG="/path/to/BambuStudio/src/libslic3r/PrintConfig.cpp" vp run generate:config-bounds
```

OrcaSlicer's separate field metadata and validation definitions are pinned to
the release and commit recorded in
`lib/bambu/orca-profile-config.generated.ts`. Refresh the committed artifact
after intentionally updating that pin:

```sh
vp run generate:orca-config
```

### Directory map (short)

- `app/` — Next.js App Router: `layout.tsx`, `page.tsx`, `globals.css`
- `components/` — React components (profile manager, UI, theme, language)
- `lib/bambu/` — Bambu-specific logic and client-side API calls
- `lib/utils/` — Shared helpers (for example `cn`)
- `localization/` — Translations and `LocaleProvider`
- `types/` — Shared types where needed
- `vite.config.ts` — Vite+ lint, format, test, and staged-file config
- `server.js` — Local HTTP API for reading profiles and editing user profile files
- `electron/` — Desktop shell (`main.js`) that starts `server.js` and loads the UI
- `electron-builder.yml` — macOS `.dmg` packaging

## License

This project is open source under the [MIT License](LICENSE). You may use, modify, and distribute it under those terms; see the license file for the full text and copyright notice.
