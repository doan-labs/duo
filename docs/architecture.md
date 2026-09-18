# Architecture

Stage 4 adds the public kit primitives, generated API data and a standalone
Developer gallery. The kit owns shared presentation and subscription-only view
hooks; apps retain their effects and trusted native integration. Exact legacy
appearance values are collected in kit tokens, enforced by `check-app-tokens.ts`.

Stage 3 adds public CLI packaging in `scripts/package-platform.ts` and immutable
development serving in `packages/cli/development.mjs`. The existing runtime
owns development namespaces, source-origin-bound installs and explicit update
transitions; neither the CLI nor Store duplicates lifecycle authority. See
`platform/progress/stage-3.md` for checked behavior and local artifact workflow.

A folding iPhone Duo: one Three.js scene, a fake iOS drawn in real DOM, and a
transparent Tauri window so the device floats on the desktop. Web and desktop
run the same bundle; `packages/shell/native.ts` is the only file that knows which one it is.
The file tree is in the README; this page is about responsibilities.

## Responsibilities

| Where | Owns |
| --- | --- |
| `packages/shell/index.html` | page shell: the `@layer reset` CSS and the script tag |
| `packages/shell/hud.tsx` | floating HUD (hinge slider, Open, Flip, Home, Reset view, Auto-rotate) and the orbit minimap (an atom driven every frame from the camera pose through refs, shown only off the default view), liquid glass, as React + StyleX |
| `packages/shell/main.ts` | scene, model load and mesh sorting, fold, render loop, HUD wiring, the flash LED (emissive on Apple's emitter and glass, a halo sprite and a point light, read off `toggles.torch` every frame) |
| `packages/shell/buttons.ts` | the buttons on the frame as hardware: meshes, hit boxes, cap and body springs, click, keys |
| `packages/shell/os.tsx` | boot, and nothing else: builds one display's root element, styles it by hand because CSS3DObject gets it before React has run, and renders `<SpringBoard>` into it |
| `packages/shell/device.ts` | the device the frame buttons see: `lockState`, `device` (sleep and wake, volume, screenshot, power), `active.wide` and the `follow()` that makes the other display mirror the one in use every frame, and the display registry `addDisplay()` keeps. No React and no StyleX, so `packages/shell/buttons.ts` and `main.ts` reach the hardware side of iOS without pulling in the UI |
| `packages/shell/springboard/` | the shell one display runs. `springboard.tsx` is the layer stack and the state that outlives any one layer; each layer is its own file (`home-screen`, `home-bar`, `lock-screen`, `status-bar`, `spotlight`, `control-center`, `power`, `system-hud`, `tile`). `scenes.ts` owns the open apps, `gestures.ts` the scrubber and the zoom geometry, `clock.ts` the minute, `toggles.ts` the switches. React renders structure; WAAPI scrubbing and zooms stay imperative on refs |
| `packages/shell/springboard/control-center.tsx` | Control Center, iOS 26: three pages on one rail — the tile grid, the Now Playing card, the connectivity list — a right panel unfolded, full width folded. Volume writes `device.level`, brightness sets the shell's veil, the transport drives the deck in `apps/music/index.tsx`, the power glyph opens the shell's sheet, `+` is edit mode. `springboard.tsx` owns the pull strip and the open/close animations |
| `packages/shell/springboard/toggles.ts` | the switches Control Center flips (airplane, the three radios, AirDrop, hotspot, rotation lock, mirroring, focus, torch), device-wide rather than per panel, plus `useToggles()` and the plain `toggles` object for code with no render to hook. `status-bar.tsx` is the other reader: what is on shows in the stack on both displays. The torch has two more: `lock-screen.tsx` flips it and `main.ts` lights the LED |
| `packages/shell/device-buttons.ts` | what a press means: click, hold, double, chord, with iOS timings |
| `packages/apps/` | a folder per app: `<name>/index.tsx` is the entry component, `<name>/styles.ts` its `stylex.create`, anything else the app alone needs sits beside them. The shell owns the grid in `packages/shell/apps.ts`; the UI kit owns `shared.ts` and `rings.tsx`. A widget ships in the app that owns it, as WidgetKit does (`WeatherWidget`, `CalendarWidget`) |
| `packages/apps/notes/` | Notes internals: `data.ts` owns the sample notes and groups, `store.ts` owns persisted text and subscriptions, `folders.tsx` the decorative sidebar, `note-list.tsx` the subscribed rows, and `editor.tsx` both editor presentations and the shared textarea. `apps/notes/index.tsx` owns width selection and navigation; view styles stay with their components |
| `packages/uikit/` | what the apps link against: `app.ts` (the React `App` adapter over SDK host types), `nav.tsx` (`Nav`/`useNav`/`Page`), `sym.tsx` (`Sym`), `styles.ts` (blocks and keyframes more than one file uses, glass included), `tokens.stylex.ts` (colours, fonts, per-app surface, grid geometry, easings) |
| `stylex-plugin.ts`, `build.ts`, `bunfig.toml` | StyleX compile step for Bun: dev injects rules at runtime, build writes `dist/stylex.css` |
| `packages/shell/screen.ts` | the same shell baked to canvas textures, for the fold |
| `packages/shell/shaders/` | GLSL as TS strings: `fold.ts` geometry, `screen.ts` projection |
| `packages/shell/native.ts` | `isDesktop` and typed `invoke()` wrappers; web gets defaults |
| `packages/shell/desktop/` | Tauri crate: `main.rs` wires, `commands/` per feature, `platform/` per OS |

Package imports run one way: apps consume `@doan-labs/ipduo-sdk` and
`@doan-labs/ipduo-uikit`, never the shell or another app. The UI kit owns UI,
tokens, the icon catalog, shared helpers, rings and sample tracks. Its React
`App` adapter consumes `Os` from the SDK; SDK `legacy.ts` owns the existing
`Os` and `CameraHooks` types without React. These are transitional baked-app
types. The separate sandbox contract and client live in SDK `manifest.ts`,
`compat.ts`, `permissions.ts`, `protocol.ts`, `guards.ts` and `client.ts`;
`mirror.ts` and `react.ts` own optimistic async KV hydration. Their integrated
host lives under `packages/shell/runtime/`.

`scripts/build-app.ts` bundles isolated documents, embeds public icon/font
assets, hashes script/styles into the first-head-child CSP, and emits immutable
release files plus a catalog. `uikit/sandbox-stylex.ts` is a builder-only alias:
it lifts dynamic StyleX variables into CSSOM classes in a hash-authorized
stylesheet. The baked shell still uses the ordinary StyleX runtime.

The shell imports app entries through workspace exports and keeps the baked
registry and default positions in `apps.ts`. Control Center still reads Music's
shared deck; Calendar remains baked, while Weather publishes a persisted
declarative widget snapshot through the SDK.
The hardware path (`buttons.ts` → `device-buttons.ts` → `device.ts`) retains
its behavior. Notes and Weather are isolated releases; other existing apps remain baked.

Root tooling builds the shell page at `packages/shell/index.html` into `dist/`.
`public/` is copied verbatim, including icons referenced by the UI kit catalog.
The Tauri crate lives under `packages/shell/desktop`, while `.cargo` and its
shared output directory remain at the root. The CLI supports local create/check
and the web workspace remains a scaffold. Stage 2 adds the runtime and catalog
installation to the earlier monorepo migration.

## Weather data and widget

`apps/weather/data.ts` owns Open-Meteo forecasts, geocoding, persisted locations
and units, subscriptions and the widget snapshot. `weather/styles.ts` owns
presentation; `temperature-chart.tsx` draws actual hourly temperatures.
`apps/weather/index.tsx` owns location management and daily-detail navigation.
Both displays share SDK storage for preferences and forecasts. Only the session
owner fetches; other views send commands. The owner publishes the widget snapshot;
search, scroll and detail navigation remain local to each app instance.
`runtime/widgets.tsx` reads the persisted snapshot without fetching weather.
`screen.ts` reads that snapshot; `main.ts` rebakes home textures only
when that snapshot changes and disposes the previous textures.

## Units and camera

Scene units are centimetres. Apple's USDZ is metres, scaled by 100 and dropped
by 5.8974 so the hinge axis sits at the origin. The camera lives at z = 40 and
the screen shader projects from that eye; OrbitControls moves the real camera,
the projection eye stays fixed. Planes and rectangles (`HINGE_Z`, `INNER_Z`,
`OUTER_Z`, `INNER`, `OUTER`) are constants in `packages/shell/main.ts`, handed to the
shaders as `#define`s.

The window is cut to the phone. Four bands (`TOP_BAND`, `LEFT_BAND`,
`RIGHT_BAND` for the orbit card, `HUD_BAND` for the pill) are kept clear and
what is left is the phone's box. The box sits off the window's middle, so the
frustum is off-centre (`camera.setViewOffset`) rather than the phone off the
origin: the phone stays on the orbit pivot, and CSS3DRenderer reads the same
`camera.view` so the live panels follow. The HUD's own numbers live in
`packages/shell/hud.tsx` and are mirrored in those bands by hand.

`frame()` fits the phone into that box every frame, at `SCALE` (37 px/cm, the
reference size) or under it. It projects one box per mesh — `still` and `folds`,
the second in the hinge's space so the group's matrix folds it the way
`shaders/fold.ts` does — from the reference eye rather than the camera's own, so
turning the view shrinks the phone and the wheel still zooms. Face on the cap
binds and nothing moves; edge-on the near half is perspective-magnified half as
tall again, and the phone gives way instead of leaving the window (decisions 26).

## The fold

`bend.value` is 0 open, π closed. Cross-section through the hinge, seen from above:

```
            fixed half                       moving half
   ─────────────────────────┐  ┌──────────────────────────
   glass + bezel            │  │   rotates about the hinge by bend
   (never moves)            │  │
                         ┌──┴──┴──┐
                         │ strip  │  ±0.35 cm: Hermite blend of the two
                         └────────┘  halves' transforms (shaders/fold.ts)
                            hinge axis, z = HINGE_Z
```

Meshes are sorted once at load by Apple's node names in `packages/shell/main.ts`:
`MOVING` and `FIXED` are the two half-body ancestors, `FLEXIBLE` the four
strip meshes, `SCREEN` maps the two glass meshes to their texture. These are
hashed ids from Apple's file. A new USDZ from Apple means re-measuring them.

The hinge angle also rotates a `THREE.Group` carrying the outer live panel, so
DOM and GPU agree on where the cover half is.

## Two ways to draw a display

1. **Baked** (`os/screen.ts`): a canvas texture per display on the glass mesh.
   `shaders/screen.ts` projects it from the fixed eye, then blurs and darkens
   toward the free edge as the fold progresses. It can only draw the shell, so
   with an app up and the phone bending the inner texture is black instead.
2. **Live** (`os/os.tsx` via CSS3DRenderer): real DOM placed in the scene over
   the canvas. A panel stands in for the bake only where the bake cannot draw
   what is up, because a flat panel over the bake flattens its fold. The cover
   panel is live closed (< 1°) or holding an app at any angle it faces you; the
   inner one flat (≥ `FLAT` = 179°, main.ts) or, with an app up, through the
   whole fold: `foldClip()` clips it at the moving half's free edge, projected
   back onto the glass along the ray it leaves the camera on, which makes the
   flat panel and the folded surface the same picture (decisions.md 24). Either
   panel, while standing in, carries `ramp()`: the shader's darkening as one
   gradient and its blur as six nested `backdrop-filter` layers whose variances
   add up to the shader's radius, at `z-index: 11` over everything the OS stacks.
   Depthless either way: the clip is what keeps the inner panel off the half it
   is standing in for, and the cover takes pointer events only when flat (≤ 1°),
   so a turned panel cannot swallow a press meant for the frame drawn over it.

They must match pixel for pixel or the screen jumps when a fold starts. Live is
5 px/mm (`PXCM = 0.02` cm/px, `main.ts`); baked is 12 px/mm (`PX`, `screen.ts`),
which scales the shell's numbers by 12/5. Change a layout constant in both.

Where the numbers come from:

| Number | Source |
| --- | --- |
| Glass corners 10.7 mm inner, 11.4 mm outer free edge, 1.3 mm outer hinge edge | Apple's display meshes, measured in headless Chrome (comment in os.tsx `os()`) |
| Bezel 2.2 mm, active-area radii concentric with the glass | same, `BEZEL`, `RADIUS`, `OUTER_RADII` in screen.ts |
| Grid, widget, dock sizes | Apple's iPhone Duo HIG renders, scaled by 768/1072 (this glass width over theirs), `springboard/home-screen.tsx` header |
| Display rectangles `INNER`, `OUTER` | mesh bounds, `main.ts` |

## Display state

- **Lock** is device-wide (`lockState`, device.ts). Unlocking one display unlocks
  the other silently. `main.ts` reads it each frame to pick the baked home or
  lock texture and rebakes the lock texture on the minute.
- **Switches and the deck** are device-wide too, and neither is React state:
  `springboard/toggles.ts` holds Control Center's switches behind
  `useSyncExternalStore`, `nowPlaying` in `apps/music/index.tsx` holds the one
  `<audio>`. Both displays' panels and status stacks subscribe, so a switch
  flipped on the cover is flipped when the phone opens, and a track started in
  Control Center is the one the Music app shows. The baked textures do not draw
  either: only a live panel reports them (working.md, Limitations).
- **Apps** are per display: each `<SpringBoard>` owns one `useScenes()`
  (`springboard/scenes.ts`) holding its open apps, its photos and its Spotlight.
  A scene is one app instance on the glass; `goHome()` (device.ts) closes on
  both displays. A scene carries a `side`: unset is the whole display,
  `left`/`right` one half of it, so the inner display holds one app or two side
  by side (never more). The home screen stays mounted under them; with one half
  taken it squeezes into the other and lays out narrow, as the cover display
  does (`homeSide` in springboard.tsx picks the free half, `homeWide` in
  home-screen.tsx is the layout). It counts as covered only when one app fills
  the display or both halves are taken (`covered()`, scenes.ts). The fold does
  not move them: the display in use leads and the other mirrors it every frame
  (`follow()` in device.ts → `stage()`/`mirror()` in scenes.ts, quiet opens and
  closes with no zoom), so both hold the session through the whole fold and the
  lead passing at `HANDOVER` = 40° changes nothing on screen. The cover cannot
  split, so it mirrors the first app whole (decisions.md 24).
- **Gestures** share one scrubber, `swipe()` in `springboard/gestures.ts`:
  pauses Web Animations, drives `currentTime` from the drag, plays or reverses
  on release. Lock-screen swipe, the tap fallback and Control Center (down from
  the top strip to open, up from its home bar to close) all go through it. The
  home bar under an app has its own, `grab()` in `springboard/home-bar.tsx`: a
  swipe scrubs the shrink and closes on release; a pause of 220 ms mid-swipe
  turns the app into a card on the finger, offers the two halves as drop zones
  and `place()` lands it, swapping with whatever holds that half. Wide display
  only; the cover keeps swipe-to-close.
- **Sleep and power** are device-wide (`device` in device.ts): asleep fades every
  panel to black and `main.ts` blacks the baked textures too; powered off is
  asleep plus deaf to everything but a held side button. The cover display is
  off while the phone is flat, on for every other angle; the inner one is off
  while it bends with an app up, since only the live panel can draw that. `active.wide`, set each
  frame from the hinge angle, names the display the buttons talk to.
- **Buttons** flow pointer or key → `packages/shell/buttons.ts` (`{ button, down }`) →
  `packages/shell/device-buttons.ts` (meaning) → `device` → the display in use. The Camera
  app publishes `CameraHooks` on `os.camera` for shutter, record and zoom.

## Isolated app runtime

`packages/shell/runtime/database.ts` owns IndexedDB schema and transaction
completion. `storage.ts` implements revisioned persistent and session KV;
`releases.ts` streams and verifies release artifacts; `lifecycle.ts` owns
locks, leases, install, activation, rollback, legacy migration and removal.
`sessions.ts` owns each document's app session, sticky owner and command queue.
`bridge.ts` creates opaque-origin iframes and authenticates nonce/port launches.
`display.ts` derives view fields from render-loop visibility writes;
`sandbox.tsx` renders connection/failure state. `registry.ts` populates shell
tiles from authoritative records and seeds bundled releases once. `photos.ts`
adapts the existing camera roll for the manifest-gated host service.

Notes and Weather are bundled separately by `scripts/build-app.ts`; the shell
imports neither app module. `scripts/build-preinstalled.ts` packages their
immutable releases under both the local catalog and bundled offline source.
The Store can select a separately hosted developer catalog and install its
verified documents without rebuilding the shell. Release hashes establish
integrity relative to that catalog, not publisher identity. The host recomputes
script/style hashes and checks the exact document CSP against the manifest.

Both display roots attach to CSS3DRenderer's final camera container before
apps mount, initially hidden. A later reparent would reload an iframe; this
placement preserves the same documents and sessions across folding.

## Native window

Tauri 2 window: `transparent`, `decorations: false`, `shadow: false`,
`macOSPrivateApi` for the transparent WKWebView. The HUD pill is the
`data-tauri-drag-region`; Tauri ignores drags starting on buttons and inputs,
so the controls stay clickable. `core:window:allow-start-dragging` is granted in
`capabilities/default.json`. Rust has one command today, `platform_name`.

## Assets

Apple's model and wallpaper are not redistributable. `scripts/prepare-model.py`
downloads the USDZ, selects the Landscape pose, flattens to USDC and rewrites
texture paths into `public/model/`. `scripts/icons.sh` re-extracts app icons
and SF Symbols from the local Mac. Human-run, never imported.
