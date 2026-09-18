# Working on it

The verification notes assume a Mac. The app itself builds for macOS, Windows
and Linux; only the screenshot tooling below is Mac-only.

## Commands

```sh
bun run dev            # http://localhost:3000, serves public/ as files
bun run desktop        # Tauri window; needs rustup and a free port 3000
bun run typecheck      # required before calling work done
bun run format         # biome; also runs on every edit and pre-commit
bun run build          # dist/, via build.ts (Bun.build + StyleX plugin, then dist/stylex.css)
```

StyleX has no Bun integration of its own, so `stylex-plugin.ts` runs the StyleX
Babel plugin in a Bun `onLoad` hook. `bunfig.toml` hands it to the dev server
(rules injected at runtime, so HMR and Fast Refresh keep working); `build.ts`
hands it to `Bun.build` and writes the collected rules as one static sheet.
The plugin transforms application source and installed `@doan-labs` packages that import `@stylexjs/stylex`, excluding other dependencies. Token imports use exported `@doan-labs/ipduo-uikit/tokens.stylex.ts`.

First clone: `pip install usd-core && python3 scripts/prepare-model.py`.

## Automatic formatting hooks

Codex loads `.codex/hooks.json` and runs the existing Biome check-and-fix
command after matching file edits,
with a 30-second timeout and remaining errors returned to the agent. Codex's
matcher covers `apply_patch`, `Edit`, and `Write`; it does not cover files
written through shell commands. Its command resolves the Git root first and,
checks the whole repository rather than just the edited file.

Codex requires the project configuration and the exact hook definition to be
trusted before it runs. Use `/hooks` in the Codex CLI from this repository to
review and trust the hook; changed definitions need review again. Until then,
the hook is configured but skipped, so do not assume automatic formatting ran.
See the [official hooks documentation](https://learn.chatgpt.com/docs/hooks).

## Debug hooks

- `?debug` exposes `window.__duo` (`bend`, `phone`, `renderer`, `scene`,
  `camera`, `screens`, `device`, and `press(button, down)` for scripted presses).
- `?deg=0..180&yaw=<radians>` pins the pose. `?app=Notes` boots into an app,
  past the lock screen. `?yaw=-1.5708` faces the right edge and its buttons.
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

Click a cap in the scene (they are padded 1.5 mm, so the sliver visible from
the front is enough) or use the keys above. `packages/shell/buttons.ts` is the hardware:
mesh ids, hit boxes, cap travel, the body rocking, the click. `packages/shell/device-buttons.ts`
is iOS: what a click, a hold, a double-click and a chord do. Behaviours and
timings are Apple's for a side button plus Camera Control:

| Press | Does |
| --- | --- |
| side click | asleep: wake to the lock screen. Else sleep. Only the swipe unlocks (decisions 31) |
| side double-click | Wallet |
| side hold (0.5 s) | Siri; powered off: boot |
| side + volume click | screenshot (flash, thumbnail in the corner) |
| side + volume held (1.2 s) | slide to power off |
| volume | HUD under the buttons; held, keeps stepping. In Camera: shutter |
| Camera Control click | Camera (from the lock screen too, without unlocking); in Camera: shutter |
| Camera Control hold (0.4 s) | record until released |
| Camera Control slide | zoom, ×2 per centimetre along the cap |

The Camera app publishes `shoot`, `record`, `zoom` on `os.camera` (`CameraHooks`
in `packages/sdk/legacy.ts`) from an effect and clears it on unmount; `cam()` in
`springboard/scenes.ts` reads it off the open app and `device.ts` hands it to the
buttons. Any other app that wants a button does the same.

## Adding things

**An app.** A new `packages/apps/<name>/index.tsx` exporting a component
`({ os }: { os: Os }) => JSX` (use `Nav`, `Page`, `useNav` from `@doan-labs/ipduo-uikit/nav.tsx`;
clean up timers and media in effect cleanups; styles in a `stylex.create` in
`<name>/styles.ts` next to it, shared blocks from `@doan-labs/ipduo-uikit/styles.ts`; anything
else the app alone needs goes in the same folder). Add `{ name, view, light? }` to
`LEFT`, `RIGHT` or `DOCK` in `packages/shell/apps.ts` for a tile, or to the tail of `APPS`
for Spotlight-only. Icon: a webp in `public/icons/`, registered in
`ICONS` by the same name. The baked home screen picks it up from the same lists.
Declare a private workspace manifest and extend the root tsconfig, then add its workspace dependency to the shell. An app imports the SDK host types and UI kit exports: not the shell, not
`device.ts`, and never another app except through `os.open(name)`.

**Every app folds the same way, and gets it for nothing.** The fold is the
shell's: the display in use leads and the other mirrors it (decisions.md 24), so
an app is simply mounted on both displays while the phone folds — it never
learns the angle and needs no fold code. What it must survive is being two
instances at once: component state is per instance, module state is shared.
So anything that must be one — a track playing, a recording, a Bluetooth
switch — lives at module level (`deck()` in music/index.tsx, `toggles.ts`) and both
instances draw it; anything that must not happen twice checks `os.mirror`, true
in the copy, and the copy starts no sound of its own (tv/index.tsx and youtube/index.tsx
embed with `autoplay=0` there). An app that autoplays on mount without that
check plays twice from about 90° down. It also lays out in both widths, wide
and narrow, since the cover copy is narrow; `Nav`/`Page` already do. An app is
not told which display it is on, and a split half on the wide one is narrow too,
so an app that needs its own layout measures its box: camera/index.tsx watches its
root with a ResizeObserver and goes landscape (Apple's rail: shutter and mode
dial stood up along the right edge) when wider than tall, iPhone-portrait
otherwise; notes/index.tsx watches the same way and gives a box wider than 600 px
iPadOS's three columns — folders, list, note — and anything narrower the phone's
list with the note on a pushed page.

**An SF Symbol.** Add the name to the `symbols.swift` line in `scripts/icons.sh`
and run it (macOS, Xcode, `brew install webp`); register the webp in `SYM` in
`packages/uikit/icons/index.ts` and use `<Sym name>`. A glyph drawn by hand looks wrong next
to the real ones.

**A widget on the home screen.** It ships inside the app that owns it, as
WidgetKit does: a second export from `apps/<name>/index.tsx` taking
`{ onOpen }: { onOpen: (from: HTMLElement) => void }`, drawn with `shared.widget`
and `shared.widgetLabel`, calling `onOpen` with the element the app should zoom
out of. Mount it in a `<WidgetTile>` in `springboard/home-screen.tsx`
(`onOpen={(el) => onOpen(byName('<name>')!, el)}`). Two 2x2 cells fit the grid's
top-left before the icons start; a third pushes a row off. The baked home screen
draws its own copy by hand, in `screen.ts`.

**A shell layer.** A file in `packages/shell/springboard/`, exporting the component and
whatever hook it needs (`system-hud.tsx` is the pattern: the overlays and their
`use*` in one file), mounted in `springboard.tsx` in z-order. State that
outlives the layer stays in `springboard.tsx`; everything else belongs in the
new file. It may import `uikit/`, `device.ts`, `packages/shell/apps.ts` and its siblings.
Anything a finger scrubs goes through `swipe()` and `settle()` in `gestures.ts`
rather than new pointer bookkeeping, and keyframes it animates with are declared
in the file itself even when `uikit/styles.ts` already has the same frames
(Gotchas, below).

**A Control Center control.** An entry in the `controls` array in
`springboard/control-center.tsx`: an `id` (the edit-mode key), `c2`/`r2` for a
tile wider or taller than one cell, and `el`, a `styles.tile` div. Placement is
the array's order, so inserting one moves everything after it. A control that
switches something adds a field to `Toggles` in `springboard/toggles.ts` and
flips it with `flip()`, never local state — the other display and the status
stack read the same object. A control that opens an app calls `open(name)`,
which closes the panel first. A whole new page is a fourth child of
`styles.track` plus a glyph in the rail; widen `styles.track` to match.

**A native command.** A `#[tauri::command]` fn in a new file under
`packages/shell/desktop/commands/`, listed in `commands/mod.rs`; a wrapper in
`packages/shell/native.ts` that returns a default when `!isDesktop`. Anything OS-specific
goes behind the `Platform` trait in `platform/`, never in the command.

**A layout constant.** Change it in `uikit/tokens.stylex.ts` (`layout`) or the
springboard file that draws it, and in `screen.ts`, then check a mid-fold pose
(`?deg=120`) against the flat one.

**A widget on the page.** It goes in a band: `main.ts` keeps `TOP_BAND`,
`LEFT_BAND`, `RIGHT_BAND` (the orbit card) and `HUD_BAND` (the pill) clear of the
phone, and `frame()` fits the phone into what is left. Give the new one a band of
its own or grow one, in both files, then re-run the fit check (docs/debug.md §2):
a band that grows does not crop the phone, it shrinks it, so the cost shows up as
the phone no longer reaching 37 px/cm face on.

## Verifying visually

The full procedure, scripts and known false alarms are in `docs/debug.md`. In short:

- Headless: `bun scripts/shot.ts <url> <out.png>`, or puppeteer-core against
  `http://localhost:3000/?debug`. Chrome renders the same CSS3D and WebGL.
- Desktop: `screencapture -x` gives 2x; the window is 818×664 and its origin
  must be read with osascript, not assumed. Use real mouse events (`cliclick`)
  for drags; synthetic accessibility drags do not move a frameless window.
  Accessibility text trees list hidden DOM too, so trust screenshots.

## Limitations

- **Click-through.** Transparent window areas still catch clicks. Fix is
  per-frame canvas alpha hit testing plus `set_ignore_cursor_events` from Rust.
- **HMR.** React components hot-swap through Fast Refresh, but Bun swaps other
  modules without re-running `main.ts`. If the scene or HUD wiring looks
  doubled, restart `bun run desktop`; kill the old dev server first if port
  3000 is taken.
- **Layout twice.** Live and baked layouts are maintained by hand in two files.
- **Mesh ids.** The fold sorts meshes by Apple's hashed node names in
  `main.ts`. A new USDZ from Apple breaks the fold until they are re-measured.
- **Gesture distance is in screen pixels.** Zooming the orbit camera changes
  how far a swipe is in device terms.
- **The window is cut to the phone, so the phone is not always 37 px/cm.**
  `frame()` fits it to the box the bands leave, at the reference scale or under
  it: face on it is 37 px/cm, edge-on 97%, tilted 45° about 70%. The fit reads
  the camera's direction and not its distance, so the wheel still zooms and
  closer than about 36 cm (of 40 at rest, 21 at the stop) still crops at the
  window's edge. Zoom out, or widen `PAD`.
- **Transient UI is live only.** Volume HUD, Control Center, screenshot
  thumbnail, power slider and boot logo are DOM, so they show only while a
  panel is live: the inner one flat and facing, or bending with an app up, the
  cover one closed, or holding the app below 40°, and deaf to the pointer until
  it is flat. Everywhere else the bake draws the display, fold and all. Sleep is
  in both layers: the baked textures go black too.
- **The other display shows a copy, not the same app.** Two React roots cannot
  share DOM, so the mirror (`follow()`, device.ts) opens the app a second time
  on the other display, quietly: a Safari iframe loads twice, a deep link's
  `arg` is not in the copy, and scrolling on the display in use does not move
  the copy — close the lid, scroll, open it, and the inner display is where its
  own copy was. The cover takes the first app of a split, whole, and the split
  collapses to it on the inner display when the lead passes below 40°
  (decisions.md 24). Video in an iframe is a copy too: the mirror's embed is
  paused (`os.mirror`), so a trailer playing on the inner display keeps its
  sound through the fold, but the cover shows it stopped at the start and the
  two never sync. Music and Podcasts do carry over, because playback is module
  state.
- **Switches switch nothing but themselves.** Control Center's radios, focus,
  rotation lock and mirroring are device state the status stack reports
  (`toggles.ts`); there is no radio to turn off and the display does not rotate.
  Airplane mode empties the status ring and reads "Off" for the network, and
  that is the whole of it. The flashlight is the exception: its tile, the lock
  screen button and the LED beside the rear cameras are one switch, and every
  flip drops the flashlight card from the top edge (`system-hud.tsx`, the
  Dynamic Island expansion on a phone with no island). One brightness level.
- **Screenshots and recordings are not kept.** The thumbnail is a DOM clone
  (nothing here can read pixels back) and recording is an indicator and a
  clock. Photos shows stills from the shutter only.
- **No light press.** A mouse has no pressure, so Camera Control's half-press
  overlay is not modelled; slide does zoom directly.

## Gotchas

- All CSS is StyleX except the `@layer reset` block in `packages/shell/index.html`. Anything
  unlayered added there beats every StyleX rule regardless of specificity, so
  new global CSS goes inside that layer or nowhere.
- StyleX has no descendant selectors. `.parent:active .child` becomes `:active`
  on the child, or pointer state in React. Per-item values (a colour, a delay,
  an artwork gradient) are dynamic styles, `styles.tint(color)`, never `style=`.
- `stylex.keyframes` only works in the file that defines it; an imported
  keyframe fails the compile. Shared animations are whole blocks
  (`shared.rise`), not shared keyframes, and a file that needs the frame itself
  declares it again — `rise` and `fade` are written out in four springboard
  files for that reason. Identical frames compile to one name, so nothing
  duplicates in the sheet.
- The StyleX Babel pass rejects shorthands (`padding: '6px 15px'`,
  `border: '1px solid'`, `transition: 'x .2s'`). The error surfaces from
  `bun run build`, not from `tsc`, so build before calling style work done.
- Rounded-corner clips drop on image layers inside the CSS3D subtree in
  Chrome. Widgets stay text and gradients.
- The home bar is 180 × 22 px at the bottom centre of every app and takes its
  pointers from a layer above (`z-index: 8`), so app UI docked along the bottom
  centre must start above it or it swallows the only gesture out of the app.
  Notes' pencil palette sits 26 px up for that reason, where iPadOS puts it
  lower.
- `getBoundingClientRect` is screen space; the panels are rotated in 3D. Use
  the offset chain (`spot()` in `springboard/gestures.ts`) for in-panel
  positions; it also subtracts the home screen's page transform, which
  `offsetLeft` does not see.
- Biome owns formatting. Do not hand-format, do not use `!important`, keep
  filenames kebab-case.

## Notes maintenance

The app entry chooses columns above 600 px and the existing UIKit `Nav` below
that width. `main.tsx` connects the sandbox SDK and renders the app.
`apps/notes/data.ts` owns the ten shipped notes; `store.ts` is the only Notes
module that adapts SDK storage. The host migrates legacy `duo.notes.<id>` keys
once, verifies the transaction, and conditionally removes unchanged originals.
Empty strings remain edits. Writing the shipped body removes its override. The undo buttons
restore that body; they are not an edit-history stack.

Both display editors and rows subscribe to persisted text. Navigation and palette
state now uses shared session keys for selected note and pushed page; palette
state stays per instance. Resizing across 600 px remounts the layout, and
selecting a different note resets the pen but retains
the wide layout's ink colour. Folders, tags, compose, sharing, search and most
toolbar icons remain decorative. No note creation, deletion or folder filtering
is implemented by this rebuild.

## Weather maintenance

Weather uses the keyless Open-Meteo forecast and geocoding endpoints. The API's
default metric units are kept internally; the temperature toggle converts
only temperature, with wind, rain and pressure explicitly labelled in metric
units. Forecast timestamps are Unix seconds, formatted in the city's timezone.
Use the location ID plus coordinates for geolocation entries so moving to a
new position cannot reuse the previous position's cached forecast.

Weather's SDK storage stores places, selected place, units and forecasts.
The session owner refreshes stale forecasts after ten minutes, reconciling
every 30 seconds and on visibility changes. Nonowners request refresh through
commands. Owner changes abort in-flight work. A failed request must never fall
back to fabricated measurements. Browser location access needs
a secure context (localhost qualifies) and permission; native location access
depends on the webview environment. Search remains available if it is denied.

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

## Monorepo migration gate (historical)

Root commands remain the entry points. Bun workspaces own runtime dependencies; root owns build and verification tools. Each package has its own typecheck configuration. `bun run --filter '@doan-labs/*' typecheck` checks all packages. `cargo shell-check` checks the relocated native crate from the root. Tauri commands run from `packages/shell`, with frontend hooks explicitly running at the repository root. `dist/`, `public/`, model preparation and the shared Cargo cache stay at the root.

App imports use SDK and UI kit package exports, never another app or shell internals. The shell seed registry is `packages/shell/apps.ts`. The SDK exports only existing transitional baked-app host types; the UI kit owns the React `App` adapter. All packages remain private at version 0.0.0. CLI and website are empty scaffolds; manifests, sandboxing, component harvest, publication and update features are not implemented at this gate.

The preceding paragraph records the earlier migration gate. Stage 2 supersedes
its SDK/CLI/runtime status; see the current checkpoint below.

The icon catalog now lives in `packages/uikit/icons/index.ts` and serves assets from `public/icons/`; the extraction script writes there. Publishing an isolated UI kit consumer will need its own asset distribution contract. No publishable package claim is made by this migration.

## Isolated document tooling

`bun scripts/build-app.ts <app-folder>` validates the folder's authored
`manifest.json`, bundles its entry, and writes `app.html`, the icon and
`release.json` under `dist/cdn/apps/<id>/<version>+<hash>/`. The catalog retains
release identities. Existing release folders are immutable: repeating an
identical build refuses to overwrite them. `IPDUO_BUILD_OUTPUT` selects a
separate output root for experiments. Assets referenced under `/icons/` and
`/fonts/` are embedded; they cannot rely on the parent shell's origin.

The builder's `--experiment` switch and `IPDUO_BUILD_ENTRY` are test-only.
They let E0 render Notes with a memory store independently of the integrated
host database. Do not use that fixture for an installed Notes release.
The status of app migration, the shell `?dev=` loader, measured limits and
owner experiments is in [the stage 2 checkpoint](platform/progress/stage-2.md).

Opaque-origin camera capture is not enabled by Permissions Policy alone.
The feature probe currently reports `SecurityError: Invalid security origin`
even for a declared camera. Do not add `allow-same-origin` as a workaround.

## Stage 2 MVP operation and limits

This section records the stage-2 gate. Stage 3 subsequently enables verified
local development and explicit staging/retry after their safety checks passed;
see the current workflow below. Other scope deferrals remain in force.

The [amended gate](platform/stage-2-mvp.md) is independent app execution,
isolation, visible fold/display behavior and installation without simulator
rebuild. Build the simulator once with `bun run build`, then run
`bun scripts/checks/stage2/mvp.mjs` for the separate-catalog demonstration.
For an authored app, build with `bun scripts/build-app.ts <folder>`, serve
the output with CORS, and enter its `/index.json` URL in App Store. The SDK and
kit remain private 0.0.0 packages resolved by the local toolchain.

`PREVIEW_FEATURES` disables live development and new update staging. CLI `dev`
returns before building, watching or serving; shell `?dev=` rejects before
fetching or creating a development namespace/frame. Catalog refresh runs at
boot or on explicit request, with no hourly polling or automatic downloads.
Update/retry controls are hidden and their Store operations reject. Existing
committed candidates, trial recovery, leases, cleanup and removal remain
reconciled; disabling shared lifecycle work could strand durable state.

External catalogs may install apps with network origins but no device
permissions. Camera/microphone are rejected globally. Existing permission
adapters and Weather's declared geolocation remain without expanding their
acceptance claims. No downloadable camera or photos app is exposed in this
gate. Weather's retained widget age timer runs once per minute; it does not
wake an app or fetch a forecast. Broader widgets, device permissions and native
app updates remain roadmap work.

App documents have a 1 MiB soft / 4 MiB hard cap; complete releases have an
8 MiB hard cap. The downloader verifies streamed size, file hashes, release
identity and the exact hashed document policy. Catalogs are not signed:
selecting one does not authenticate its author. Old pre-platform browser tabs
can still edit legacy localStorage after migration; close them before relying
on the migrated Notes state. Full native permission, background timer/audio,
offline/update recovery and publishing matrices are not claimed at this gate.

## Current developer workflow

`bun scripts/package-platform.ts` writes private local tar archives. CLI create
accepts `--packages <artifacts.json>` so new projects use those archives rather
than unpublished registry versions. The generated project supports `bun run
check`, `bun run build` and `bun run dev` after `bun install`. Its source and
node_modules can live wholly outside this repository. CLI build's `--out`
selects a catalog directory; `serve <catalog> --port 5173` serves it with CORS.

`dev` watches source and prints a `?dev=` link; `preview` serves one build.
Documents download from immutable release URLs and execute via a Blob `src` of
the verified bytes, preventing a second server response from replacing the CSP.
Reload selects the new build and fences
the previous preview generation; it never aliases installed data. Stopping the
CLI closes its server/watcher and removes owned temporary output. Store's DEV
row removes preview data. Device permissions remain denied for these previews.

Store refresh is explicit and retains the selected catalog. Updates use the
existing candidate/checkpoint/lease machinery and must come from the app's
original catalog origin. This prevents another unsigned catalog from taking
over an installed id's data. Existing provenance-less records accept the shell
origin. The SDK protocol and launch-generation rules are unchanged.
