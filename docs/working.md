# Working guide

Use [architecture](architecture.md) for ownership, [debugging](debug.md) for verification,
and [platform development](platform/dev.md) for external apps. Commands run from the root
unless noted. Native instructions below assume macOS; Windows/Linux parity is unverified.

## Commands

```sh
bun run dev            # http://localhost:3000, serves public/ as files
bun run desktop        # Tauri window; needs rustup and a free port 3000
bun run typecheck      # required before calling work done; also checks packages/web
bun run format         # biome; also runs on every edit and pre-commit
bun run build          # dist/, via build.ts (Bun.build + StyleX plugin, then dist/stylex.css)
```

Prepare the model once: `pip install usd-core && python3 scripts/prepare-model.py`.
Native production: from `packages/shell`, run `bun x tauri build --debug --no-bundle`.
Workspace consumers own runtime dependencies; root owns tools, public assets and caches.

StyleX compiles through `stylex-plugin.ts`: dev injects rules, production extracts CSS.
The plugin includes installed `@doan-labs` sources importing StyleX. Use the kit's exported
`tokens.stylex.ts`; an isolated document cannot inherit shell styles or assets.

## Automatic formatting hooks

Use `apply_patch` for edits. `.codex/hooks.json` matches apply_patch/Edit/Write, not shell
writes, and runs the repository-wide Biome check/fix with a 30-second timeout. It requires
trust for both project config and the exact hook definition; changed hooks need review.
Until trusted, it is skipped. Report an inactive hook rather than assuming formatting ran.
Do not hand-format or invoke `bun run format`/Biome write manually. Pre-commit also checks
staged files. See [the hook documentation](https://learn.chatgpt.com/docs/hooks).

## Controls and debug entry points

| Control | Action |
| --- | --- |
| `?debug` | Expose `window.__duo`; [probe reference](debug.md#the-state-probe) |
| `?deg=0..180&yaw=<radians>` | Pin pose; 0 closed, 180 flat, yaw −1.5708 faces the right edge |
| `?app=Notes` | Open an app past the lock screen |
| `Esc` / Home | Return home on both displays |
| `L`, `C`, `↑`/`↓` | Side, Camera Control, volume buttons |
| Control Center | Pull down from the top 26 px; home-bar swipe, scrim, Esc or Home dismisses |
| Split (inner display) | Swipe home bar up, hold ≥220 ms, drop on a half; occupied halves swap, hinge drop cancels |
| Reset / minimap | Return yaw and camera to the default view |

The active display changes at 40°. Ordinary folding keeps the existing views; split
collapse replaces the inner half view. Camera gestures and clicks use screen-space
coordinates, so zoom affects gesture distances. See [architecture](architecture.md#state-and-folding).

## Buttons on the frame

| Press | Action |
| --- | --- |
| Side click | Wake to lock screen or sleep; never unlock |
| Side double-click / hold 0.5 s | Wallet / Siri; hold boots when powered off |
| Side + volume click / hold 1.2 s | Screenshot / power-off slider |
| Volume | HUD and repeated stepping while held; Camera shutter when active |
| Camera Control click | Open Camera even while locked; shutter when already open |
| Camera Control hold 0.4 s / slide | Record until release / zoom ×2 per centimetre |

Camera publishes `shoot`, `record`, `zoom` via legacy `os.camera` in an effect and clears
it on unmount. `scenes.ts` and `device.ts` route these hooks to the frame buttons.

## Adding things

### Trusted baked app

1. Add `packages/apps/<name>/index.tsx` with `({ os }: { os: Os }) => JSX`, app-local
   styles/effects, a private package manifest and root-derived tsconfig.
2. Declare its workspace dependency in the shell and register it in `packages/shell/apps.ts`:
   LEFT/RIGHT/DOCK for a tile, or APPS for Spotlight-only. Register its public webp icon in ICONS.
3. Import SDK/kit exports, not shell internals or another app. Clean up timers/media.
4. Verify wide, cover and split layouts, then build/typecheck. Baked single-instance effects
   use shared module state and `os.mirror`; duplicate embeds must not autoplay.

Sandboxed apps instead use [the external workflow](platform/dev.md), SDK views, host storage
and owner epochs. Do not register their source in the shell. Both models measure their box
for layout; cover and split widths are narrow.

### Shell, native and presentation extensions

| Addition | Implementation rule |
| --- | --- |
| Shell layer | File in `springboard/`, mounted in z-order; lasting state stays in SpringBoard. Reuse gesture scrubbing; declare keyframes in the consuming file |
| Control Center control | Entry in `controls` with id/c2/r2/el; device switches go through `toggles.ts` and `flip()`, not per-panel state. New pages also update track width and rail |
| Native command | File in `desktop/commands/`, register in mod.rs, wrap in `native.ts` with web defaults; OS-specific work goes behind Platform, never in main.rs |
| SF Symbol | Add to `scripts/icons.sh`, run on a Mac with Xcode/webp, register in `packages/uikit/icons/index.ts`, render with Sym |
| Trusted home widget | Export from its app, mount WidgetTile with `onOpen(element)`, update the separate canvas bake. Two 2×2 widgets fit; extra rows overflow |
| Layout constant | Update live tokens/layout and `screen.ts`; compare flat and 120° |
| Page HUD widget | Update the corresponding main.ts/hud.tsx bands and rerun [fit checks](debug.md#2-reading-the-model) |

## Style and layout constraints

All styling uses StyleX except `@layer reset` in shell index.html. Unlayered global CSS
beats StyleX regardless of specificity. Use longhand properties, no descendant selectors,
no `!important`, and dynamic StyleX props rather than raw style/className. Build after
style changes: shorthand errors can pass TypeScript and fail the Babel transform.

Keyframes must be declared in the consuming file; reusable animations are whole style
blocks. Identical declarations deduplicate. For sandbox gallery roots, apply the public
app token theme, not only a background color.

The bottom-centre home bar occupies 180×22 px at z-index 8. Keep controls outside that hit
area; Notes' palette clears it by 26 px. OS layers stay at z-index ≤10 beneath the fold
ramp at 11. `getBoundingClientRect()` is screen space; use `spot()`'s offset chain for
panel coordinates, including home-page transforms. Chromium can lose rounded image clips
inside CSS3D; existing widgets use text/gradients.

## Notes maintenance

`main.tsx` connects the SDK; `index.tsx` selects columns above 600 px or Nav below it.
`data.ts` owns shipped notes; `store.ts` adapts SDK storage. Migration commits/verifies
legacy `duo.notes.<id>` values before conditionally deleting unchanged originals. Empty
strings remain edits; saving the shipped body removes the override. Undo restores shipped
text, not edit history. Close pre-platform tabs that could still write legacy keys.

Editors/rows subscribe to shared text. Selected note and pushed page use session keys;
palette/ink state stays local. Crossing 600 px remounts the layout; selecting another note
resets the pen but retains wide-layout ink color. Folders, tags, compose, sharing, search
and most toolbar icons are decorative; creation/deletion/filtering are not implemented.

## Weather maintenance

Use Open-Meteo forecasts/geocoding. Keep metric source values, convert only temperature,
label other units, and format Unix timestamps in each city's timezone. Geolocation cache
identity includes coordinates, not just location id. Never fabricate fallback observations.

SDK storage holds places, selection, units and forecasts. Only the owner fetches: refresh
stale data after ten minutes, reconcile every 30 seconds/on visibility, and abort work on
owner change. Nonowners send refresh commands. Location needs a secure context and browser/OS
permission; search remains available on denial. Native permission parity is not established.

The cards grid responds to its own container width, so cover and split displays
use one column. Keep actionable buttons out of the bottom-centre home-bar
region; the saved-city Remove control sits at the right edge for that reason.
The baked home widget reads the host's persisted declarative snapshot and is
rebaked on changes; it does not fetch weather itself.

Weather's scroll areas use `styles.scrollbar`: a rounded translucent native
thumb with a subtle track and hover/pressed feedback. Keep `scrollbar-width`
and `scrollbar-color` at `auto` in engines supporting `::-webkit-scrollbar`;
non-auto standard values override that detailed skin in Chromium. Engines
without those pseudo-elements use the thin, tinted standard-property fallback.

## Website

`packages/web` is the developer site: TanStack Start on Vite, StyleX through
`packages/web/vite-stylex.ts`, every route prerendered. See
[docs/platform/progress/web.md](platform/progress/web.md) for the design.

```sh
cd packages/web
bun run dev            # http://localhost:3001; the simulator embed expects the root dev server on 3000
bun run build          # regenerates src/generated/api.ts, rebuilds the shell into public/device, prerenders dist/client
bun run check          # headless Chrome over every route at three widths; screenshots in .cache/debug/web
bun run api            # only the TSDoc reference
```

- Docs pages come from `docs/**/*.md` at build time. Add a file there and it
  has a page at `/docs/<path>`; set its badge in `src/docs.ts` if the default
  (`plan` under `docs/platform/`, `works` elsewhere) is wrong.
- The kit and SDK references list whatever `packages/uikit/index.ts` and
  `packages/sdk/index.ts` re-export. Write the TSDoc on the export and on each
  member of its props type; an undocumented export shows "No TSDoc on this
  export yet".
- `VITE_SIMULATOR_URL` points the embed elsewhere (a different port, a deployed
  shell). In the build it is `/device/`, the copied root `dist/`.
- The Markdown renderer covers the syntax `docs/` uses. Before using a new
  construct in a doc, check it renders; `src/markdown.tsx` is where it learns.
- Route files are TanStack's names (`docs.$.tsx`, `__root.tsx`); Biome's
  kebab-case rule is off for that folder only. `src/route-tree.gen.ts` is
  generated on `dev` and `build` and committed.
- Breakpoints are local constants in each file (`MID` 1068, `NARROW` 833,
  `SMALL` 734): StyleX 0.19 cannot resolve an imported string as a media-query
  key and fails with "Invalid pseudo or at-rule".
- The reset is `src/reset.css`, imported in `__root.tsx` before
  `virtual:stylex.css`. Keep that order: a layer declared later wins, and React
  hoists `<link>` above inline `<style>`, which once put the reset last and
  zeroed every StyleX margin in the production build only.
- Never put `className` or `style` beside `stylex.props`. Dynamic values go
  through a StyleX function style (`at: (left) => ({ left })`) or a `motion.*`
  element that carries only `style`.
- The embedded shell is driven over the bridge in `packages/shell/main.ts`:
  `?bg=` at load, then `{ deg, yaw, bg }` by postMessage from the same origin.
  `src/simulator.tsx` posts the body colour and its `deg` prop; after changing
  the bridge, rebuild the copy with `bun scripts/simulator.ts`.
- Under 734 px the hero swaps the WebGL shell for `public/hero.{webm,mp4}`,
  rendered from `packages/web/video` (Remotion, its own `bun install`).
- The page scrolls through Lenis (`src/smooth-scroll.tsx`, `ReactLenis root`
  around everything in `__root.tsx`; off under reduced motion). A region that
  scrolls on its own needs `data-lenis-prevent`, and anything reading
  `document.documentElement.className` must expect the `lenis` classes there.
- The camera scene asks for the webcam itself when it comes on screen, then
  mounts the frame (`Simulator mount`). Do not open the Camera app in a frame
  that mounts early: the browser prompts before the reader can see why.
- Inside a frame the shell's HUD hides its "iPhone Duo" heading and display
  line (`window.self !== window.top` in `packages/shell/hud.tsx`); the hint
  and the control bar stay.
- The check runs against the production build too:
  `bun scripts/check.mjs http://localhost:3011` with `dist/client` served on
  that port. It blocks frames for the page checks and loads the hero shell once
  for the bridge check, so expect about two minutes.

## Monorepo migration gate (historical)

Root commands remain the entry points. Bun workspaces own runtime dependencies; root owns build and verification tools. Each package has its own typecheck configuration. `bun run --filter '@doan-labs/*' typecheck` checks all packages. `cargo shell-check` checks the relocated native crate from the root. Tauri commands run from `packages/shell`, with frontend hooks explicitly running at the repository root. `dist/`, `public/`, model preparation and the shared Cargo cache stay at the root.

App imports use SDK and UI kit package exports, never another app or shell internals. The shell seed registry is `packages/shell/apps.ts`. The SDK exports only existing transitional baked-app host types; the UI kit owns the React `App` adapter. All packages remain private at version 0.0.0. CLI and website are empty scaffolds; manifests, sandboxing, component harvest, publication and update features are not implemented at this gate.

The preceding paragraph records the earlier migration gate. Stage 2 supersedes
its SDK/CLI/runtime status; see the current checkpoint below.

The icon catalog now lives in `packages/uikit/icons/index.ts` and serves assets from `public/icons/`; the extraction script writes there. Publishing an isolated UI kit consumer will need its own asset distribution contract. No publishable package claim is made by this migration.

## Isolated document tooling

`bun scripts/build-app.ts <app-folder>` emits immutable releases/catalogs under dist/cdn;
`IPDUO_BUILD_OUTPUT` selects another root. Public icon/font assets are embedded. Existing
release identities are never overwritten. `--experiment` and `IPDUO_BUILD_ENTRY` are test-only
memory-store fixtures, not installed Notes releases.

For private archives, CLI create/check/build/serve/dev/preview, use [development](platform/dev.md)
and [the review recipe](platform/review.md). Previews execute verified Blob bytes in separate
namespaces. Refresh/update are explicit and source-origin bound. Leases, cleanup and durable
transition reconciliation stay enabled; hiding optional UI must not disable safeguards.

## Limitations

| Area | Limit |
| --- | --- |
| Window | Transparent areas catch clicks. Fit caps at 37 px/cm but shrinks tilted views; zoom closer than about 36 cm can crop |
| HMR | Non-React module swaps may leave stale scene/listener state. Restart task-owned test processes; never kill an unrelated server on a busy port |
| Rendering | Live/baked layouts are maintained separately; model ids require remeasurement after asset changes. Transient HUDs appear only on live panels |
| Baked mirrors | Separate DOM/scroll/args; embedded videos do not synchronize. Shared-module Music/Podcasts playback is the exception; sandbox sharing uses SDK state |
| Simulated controls | Radios/focus/rotation switches are visual state. Torch drives the model LED, at one brightness; pressure-sensitive Camera Control is absent |
| Capture | Screenshot thumbnails are DOM clones; recording is an indicator/clock. Photos holds shutter stills, not persisted recordings |
| Sandbox | Camera/microphone denied; external catalogs/previews accept no device permissions. Never add allow-same-origin to work around capture refusal |
| Distribution | Documents: 1 MiB soft/4 MiB hard; releases: 8 MiB hard. Unsigned catalogs prove integrity, not publisher identity |
| Verification | Full native permission/background-media/update-recovery parity is unverified; [review](platform/review.md) records scope, [roadmap](platform/roadmap.md) records deferred work |
