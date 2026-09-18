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

- `?debug` exposes `window.__duo` (`bend`, `phone`, `renderer`, `scene`,
  `camera`, `screens`, `device`, and `press(button, down)` for scripted presses).
- `?deg=0..180&yaw=<radians>` pins the pose. `?app=Notes` boots into an app,
  past the lock screen. `?yaw=-1.5708` faces the right edge and its buttons.
  `?hud=0` drops the slider, buttons, hint and orbit widget and centres the fit
  on the phone rather than the hinge: the phone alone, for a page that poses it
  by postMessage (the site's home scenes, `Simulator bare`).
- Gestures: swipe down from the top 26 px of a display for Control Center, from
  the lock screen too. Swipe its home bar up, tap the scrim, `Esc` or Home close
  it. Its volume slider is `device.level`; brightness is a black veil the shell
  keeps after the panel is gone.
- Control Center's three pages are the rail on its right edge: dot, note,
  radiowaves. Folded, the rail sits under the pages instead: the cover is 387 px
  and the grid plus a rail beside it would run into the status stack. Everything on them does something — the radios and the focus, lock
  and mirroring tiles show in the status stack on both displays, the transport
  plays real audio through the Music app's deck, the power glyph opens the
  slide-to-power-off sheet, `+` wobbles the grid so a tile can be dropped (its
  dashed slot brings it back).
- Split screen (inner display): swipe an app's home bar up and hold still for a
  quarter second; the app becomes a card and two frosted halves appear. Drop it
  on one to take that half; the home screen squeezes into the other as a whole
  narrow home (two pages, dock, search), like the cover display's. Open a second
  app from there. Drop it on the half another app holds and they trade places; drop
  it over the hinge and it goes back. Each half has its own home bar. Flick a
  bar without pausing to close that app, as before.
- Folding keeps the app running. It stays on the inner display, live and clipped
  where the fold has taken the glass (`foldClip()` in main.ts), blurred and
  darkened toward the fold the way the bake is (`ramp()`), all the way to
  closed. The cover mirrors it from the first degree of fold, so wherever the
  fold turns the cover to you it is already showing the app, with the same ramp
  over its own width; the display in use switches at `HANDOVER` = 40° and
  nothing shows for it. Open flat the cover is off, fading in over the first
  30° of fold, so the back of an open phone is a sleeping display and not a
  blurred copy of the app (decision 27). The ramp is `z-index: 11`; keep OS layers at 10 or
  below (the power slider is there) or they will sit over the fold. Folding and
  opening again does not touch the inner display's app — same DOM, same scroll,
  no reload — and orbiting mid-fold keeps it too: the clip follows the camera.
  Two halves fold to the first of them.
- Keys: `Esc` goes home on both displays. The buttons on the frame are `L`
  (side), `C` (Camera Control), `↑` `↓` (volume); hold `L` and tap `↑` for a
  screenshot, keep both down for the power-off slider. A mouse can only press
  one button at a time, so chords are keyboard, or key plus click.
- Reset view (the pill's ↺, or a click on the minimap) unwinds yaw and eases the
  camera back to z = 40. Both are dimmed / hidden while the view is already
  default: |azimuth| ≤ 0.02, |polar − π/2| ≤ 0.02, distance ≤ 40.5 and yaw
  within 0.02 of a full turn. Anything else counts as "away", so `?yaw=1` loads
  with the minimap shown and a Flip shows it until the next Reset. Zooming in
  alone does not: the card would sit over the screen you zoomed in to read.
- The minimap's `hud.orbit()` runs every frame and writes transforms through
  refs; only the away flag crosses React, and only when it changes. Its three
  rings are the world's gimbal seen from the camera, the nucleus is the phone
  (turns with yaw), the electron marks the phone's front on the equator ring, the
  dashed circle grows as the camera comes closer.

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

- Docs pages come from `packages/web/content/docs/*.md` at build time, one
  page per file at `/docs/<name>`. Add the slug to `ORDER` in `src/docs.ts` to
  place it in a sidebar group; an unlisted file lands at the end of Build. The
  first paragraph is the index summary. Links between pages are relative
  (`storage.md`), site pages absolute (`/sdk`), repository files full GitHub
  URLs. The repository's own `docs/` is not rendered (decision 54).
- The kit and SDK references list whatever `packages/uikit/index.ts` and
  `packages/sdk/index.ts` re-export. A component's TSDoc may sit on its props
  type (the kit's habit) or on the function; the props table expands
  `PrimitiveProps<…> & { … }` intersections, reads defaults off the destructured
  parameter, and names what the props extend. Document each member of the props
  type for the Description column; an undocumented export shows "No TSDoc on
  this export yet".
- Each `/kit/<Export>` page is breadcrumb, title, the TSDoc's first paragraph
  and a Source link to the GitHub blob, then Preview and Usage tabs, then an
  "API reference" table (`ApiTable` in `src/api-card.tsx`, or the signature
  when there are no members), then three related exports of the same kind.
  Preview renders the real component in a 387 px frame with the light app
  theme; Usage is the same file's highlighted text (`src/highlight.tsx`),
  collapsed past 300 px. The demo is one file per component in
  `packages/web/src/kit-demos/`, `navigation-link.tsx` for `NavigationLink`,
  default-exporting a `Demo` that imports only from `@doan-labs/ipduo-uikit`;
  `src/kit-preview.tsx` picks it up by name, so a demo cannot drift from its
  code. No file, no tabs: the page shows the signature instead. The frame is 360 px tall and a flex column, so `Nav`, `Screen` and
  `VStack` fill it; the button reset the shell's `index.html` applies lives in
  `src/reset.css` under `[data-kit-frame]`.
- `VITE_SIMULATOR_URL` points the embed elsewhere (a different port, a deployed
  shell). In the build it is `/device/`, the copied root `dist/`.
- The Markdown renderer covers the syntax `content/docs/` uses. Before using a
  new construct in a doc, check it renders; `src/markdown.tsx` is where it
  learns. A table's first column wraps on narrow content, so keep it short.
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
  `?bg=` at load, then `{ deg, yaw, bg, paused, app }` by postMessage from the
  same origin: `paused` parks the render loop while the frame is off screen,
  `app` launches an app by home screen name (empty string is Home).
  `src/simulator.tsx` posts the body colour and its `deg`, `yaw` and `app`
  props, and never puts a live pose in the frame URL: a `src` change reloads
  the whole scene. After changing
  the bridge, rebuild the copy with `bun scripts/simulator.ts`. That script also
  copies `/model`, `/icons`, `/cdn` and `/preinstalled` to the site root: the
  shell loads all four by absolute path, and the runtime seeds Notes and
  Weather from the last one.
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
