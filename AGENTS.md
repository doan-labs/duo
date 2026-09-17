# AGENTS.md

A folding iPhone Duo rendered with Three.js, shipping as a web page and as a native desktop window.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime, bundler, dev server | Bun |
| Language | TypeScript, strict |
| UI | React 19, StyleX 0.19 compiled by a Bun plugin (`stylex-plugin.ts`) |
| 3D | Three.js r186, USDLoader |
| Desktop shell | Tauri 2 (Rust) |
| Model | Apple's iPhone Duo USDZ, flattened to USDC |

## Commands

```sh
bun run dev          # web dev server
bun run typecheck    # tsc --noEmit
bun run format       # biome check --write .
bun run build        # dist/
bun run desktop      # native window
bun run desktop:build
```

Fresh clone also needs the model, once: `pip install usd-core && python3 scripts/prepare-model.py`.

## Structure

The authoritative file tree is in [README.md](README.md).

## Docs

`docs/` is the memory of this project. Read before changing anything non-trivial:

- `docs/architecture.md` when touching main.ts, os/, shaders/ or desktop/.
- `docs/working.md` for commands, debug hooks, how to add an app or a command, and known limits.
- `docs/decisions.md` before reversing something that looks odd; it is usually there on purpose.
- `docs/debug.md` before verifying anything: how to drive headless Chrome and the desktop
  window from a terminal, the state probe, and the false alarms already run into.

Update them in the same change: a new constraint or gotcha goes in working.md, a design
choice with a cost goes in decisions.md as a new numbered entry (never edit history; supersede),
a moved responsibility goes in architecture.md, a new way to observe or a new false alarm goes
in debug.md. The README's file tree is the only file tree.

## Verification

Use headless Chrome through the installed `puppeteer-core` as the default for
web UI, behavior checks, and screenshots. Follow [docs/debug.md](docs/debug.md):
run the local web server, exercise the real page in an isolated browser profile,
and inspect both state and captured pixels. A visible app window is not required;
do not ask the user to open the app for routine browser verification.

Use the visible Tauri app when testing native integration, window behavior,
WKWebView-specific rendering, or a GPU/timing issue headless Chrome cannot resolve,
or when the user explicitly requests it. Report which runtime was verified;
headless Chromium results do not establish native WebKit parity.

## Conventions

- One responsibility per file, named after it. New feature the web can call: a file in `packages/shell/desktop/commands/`. New OS-specific code: behind the `Platform` trait in `packages/shell/desktop/platform/`. Never inline either in `main.rs`.
- `packages/shell/native.ts` owns every Tauri check. The rest of the web code never touches `window.__TAURI__`.
- Shaders are TS modules exporting a string, not `.glsl` files — the bundler treats those as assets.
- UI is React function components styled with StyleX: `stylex.create` at the bottom of the file, longhand properties only, pseudo-classes and media queries as nested values, no descendant selectors, never `className` or `style` next to `stylex.props`. Colours and easings come from `packages/uikit/tokens.stylex.ts`. The only plain CSS is the `@layer reset` block in `packages/shell/index.html`.
- Assets belong in `public/`, imported by URL. Apple's model is not redistributable, so it stays out of git.
- Units are centimetres. The camera is fixed at z=40 and the screen shader projects from that eye; moving it breaks the projection.
- Biome owns formatting and lint: single quotes, no semicolons, 2-space indent, 120 columns. Matching edits are formatted by the PostToolUse hook in `.codex/hooks.json`, and staged files again on pre-commit. Codex hooks require user trust before running; see docs/working.md. Use `apply_patch` for Codex edits so the hook runs; shell-written files do not trigger this matcher. Never hand-format or run `biome check --write` or `bun run format` yourself. If the hook is inactive, report it rather than assuming formatting ran. Lint errors are handed back to fix.
- Files and directories are kebab-case, always. Biome enforces it.
- Comments explain why. Skip the ones restating the code.
- No new dependencies without asking. Prefer the platform and what's installed.
- Run `bun run typecheck` before calling work done.
