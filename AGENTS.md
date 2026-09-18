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

`docs/` is the memory of this project. Start with the [documentation index](docs/README.md),
then read the pages relevant to the task before changing anything non-trivial:

| Task | Read |
| --- | --- |
| Scene, fold, displays, SpringBoard or native shell | [Architecture](docs/architecture.md), [working guide](docs/working.md) |
| SDK, sandbox, app sessions, storage or lifecycle | [Platform overview](docs/platform/README.md), [accepted contract and amendments](docs/platform/contract.md), [runtime](docs/platform/runtime.md), [security](docs/platform/security.md); [manifest](docs/platform/manifest.md) or [updates](docs/platform/updates.md) as relevant |
| App authoring, CLI, UI kit or Store | [Development](docs/platform/dev.md), the relevant package README, [UI kit](docs/platform/uikit.md) or [Store](docs/platform/store.md); distinguish trusted baked apps from sandboxed apps |
| Verification, website integration or release preparation | [Debugging](docs/debug.md) before verification, [local review](docs/platform/review.md) for reproducible platform checks for measured limits; [website handoff](docs/platform/website-integration.md), [website plan](docs/platform/web.md) and [publishing](docs/platform/publishing.md) when relevant |
| Community app submission, review checks or catalog publication | [Publication](docs/platform/publishing.md), [community-apps guide](community-apps/README.md); the publisher moves data only, never runs app code in a credentialed job |
| Scope or design changes | [Project decisions](docs/decisions.md), [roadmap](docs/platform/roadmap.md), [current scope](docs/platform/README.md) |

Current platform references describe enabled behavior; the roadmap separates deferred work.
The contract governs enabled safety guarantees. Resolve apparent code/contract conflicts
explicitly; do not silently weaken the contract to match code. Verification claims belong
in the current review guide with their limits. Chromium evidence is not native parity,
publication or deployment evidence. Do not recreate progress or archive folders; Git history
retains committed historical documents.

Update the owning guide in the same change: constraints and gotchas in working.md,
responsibilities in architecture.md, observation procedures and false alarms in debug.md.
Append numbered design decisions to decisions.md; preserve history and explicitly supersede
conflicting entries. Update platform references for SDK/runtime changes and regenerate
`docs/platform/api/uikit.json` through `scripts/generate-kit-docs.ts`, never by hand.
Keep [the documentation index](docs/README.md) and this task routing current when pages move;
fix inbound links and check website doc consumers. The root README remains the only repository
file tree.

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

- Hard rule: em dashes (U+2014) are banned throughout the repository. Use only the normal ASCII dash (`-`, U+002D) instead.

- One responsibility per file, named after it. New feature the web can call: a file in `packages/shell/desktop/commands/`. New OS-specific code: behind the `Platform` trait in `packages/shell/desktop/platform/`. Never inline either in `main.rs`.
- `packages/shell/native.ts` owns every Tauri check. The rest of the web code never touches `window.__TAURI__`.
- Shaders are TS modules exporting a string, not `.glsl` files - the bundler treats those as assets.
- UI is React function components styled with StyleX: `stylex.create` at the bottom of the file, longhand properties only, pseudo-classes and media queries as nested values, no descendant selectors, never `className` or `style` next to `stylex.props`. Colours and easings come from `packages/uikit/tokens.stylex.ts`. The only plain CSS is the `@layer reset` block in `packages/shell/index.html`.
- Assets belong in `public/`, imported by URL. Apple's model is not redistributable, so it stays out of git.
- Units are centimetres. The camera is fixed at z=40 and the screen shader projects from that eye; moving it breaks the projection.
- Biome owns formatting and lint: single quotes, no semicolons, 2-space indent, 120 columns. Matching edits are formatted by the PostToolUse hook in `.codex/hooks.json`, and staged files again on pre-commit. Codex hooks require user trust before running; see docs/working.md. Use `apply_patch` for Codex edits so the hook runs; shell-written files do not trigger this matcher. Never hand-format or run `biome check --write` or `bun run format` yourself. If the hook is inactive, report it rather than assuming formatting ran. Lint errors are handed back to fix.
- Files and directories are kebab-case, always. Biome enforces it.
- Comments explain why. Skip the ones restating the code.
- No new dependencies without asking. Prefer the platform and what's installed.
- Run `bun run typecheck` before calling work done.
