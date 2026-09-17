# Architecture

A folding iPhone Duo: one Three.js scene, a fake iOS drawn in real DOM, and a
transparent Tauri window so the device floats on the desktop. Web and desktop
run the same bundle; `src/native.ts` is the only file that knows which one it is.
The file tree is in the README; this page is about responsibilities.

## Responsibilities

| Where | Owns |
| --- | --- |
| `index.html` | page shell: the `@layer reset` CSS and the script tag |
| `src/hud.tsx` | floating HUD (hinge slider, Open, Flip, Home, Reset view, Auto-rotate) and the orbit minimap (an atom driven every frame from the camera pose through refs, shown only off the default view), liquid glass, as React + StyleX |
| `src/main.ts` | scene, model load and mesh sorting, fold, render loop, HUD wiring, the flash LED (emissive on Apple's emitter and glass, a halo sprite and a point light, read off `toggles.torch` every frame) |
| `src/buttons.ts` | the buttons on the frame as hardware: meshes, hit boxes, cap and body springs, click, keys |
| `src/os/os.tsx` | boot, and nothing else: builds one display's root element, styles it by hand because CSS3DObject gets it before React has run, and renders `<SpringBoard>` into it |
| `src/os/device.ts` | the device the frame buttons see: `lockState`, `device` (sleep and wake, volume, screenshot, power), `active.wide` and the `follow()` that makes the other display mirror the one in use every frame, and the display registry `addDisplay()` keeps. No React and no StyleX, so `src/buttons.ts` and `main.ts` reach the hardware side of iOS without pulling in the UI |
| `src/os/springboard/` | the shell one display runs. `springboard.tsx` is the layer stack and the state that outlives any one layer; each layer is its own file (`home-screen`, `home-bar`, `lock-screen`, `status-bar`, `spotlight`, `control-center`, `power`, `system-hud`, `tile`). `scenes.ts` owns the open apps, `gestures.ts` the scrubber and the zoom geometry, `clock.ts` the minute, `toggles.ts` the switches. React renders structure; WAAPI scrubbing and zooms stay imperative on refs |
| `src/os/springboard/control-center.tsx` | Control Center, iOS 26: three pages on one rail — the tile grid, the Now Playing card, the connectivity list — a right panel unfolded, full width folded. Volume writes `device.level`, brightness sets the shell's veil, the transport drives the deck in `apps/music.tsx`, the power glyph opens the shell's sheet, `+` is edit mode. `springboard.tsx` owns the pull strip and the open/close animations |
| `src/os/springboard/toggles.ts` | the switches Control Center flips (airplane, the three radios, AirDrop, hotspot, rotation lock, mirroring, focus, torch), device-wide rather than per panel, plus `useToggles()` and the plain `toggles` object for code with no render to hook. `status-bar.tsx` is the other reader: what is on shows in the stack on both displays. The torch has two more: `lock-screen.tsx` flips it and `main.ts` lights the LED |
| `src/os/buttons.ts` | what a press means: click, hold, double, chord, with iOS timings |
| `src/os/apps/` | one entry component per app; `index.ts` is the home grid (`LEFT`, `RIGHT`, `DOCK`, `APPS`) and `byName()`; `shared.ts` helpers. A widget ships in the app that owns it, as WidgetKit does (`WeatherWidget`, `CalendarWidget`) |
| `src/os/apps/notes/` | Notes internals: `data.ts` owns the sample notes and groups, `store.ts` owns persisted text and subscriptions, `folders.tsx` the decorative sidebar, `note-list.tsx` the subscribed rows, and `editor.tsx` both editor presentations and the shared textarea. `apps/notes.tsx` owns width selection and navigation; view styles stay with their components |
| `src/os/uikit/` | what the apps link against: `app.ts` (the `App`/`Os`/`CameraHooks` types, zero runtime), `nav.tsx` (`Nav`/`useNav`/`Page`), `sym.tsx` (`Sym`), `styles.ts` (blocks and keyframes more than one file uses, glass included), `tokens.stylex.ts` (colours, fonts, per-app surface, grid geometry, easings) |
| `stylex-plugin.ts`, `build.ts`, `bunfig.toml` | StyleX compile step for Bun: dev injects rules at runtime, build writes `dist/stylex.css` |
| `src/os/screen.ts` | the same shell baked to canvas textures, for the fold |
| `src/shaders/` | GLSL as TS strings: `fold.ts` geometry, `screen.ts` projection |
| `src/native.ts` | `isDesktop` and typed `invoke()` wrappers; web gets defaults |
| `src/desktop/` | Tauri crate: `main.rs` wires, `commands/` per feature, `platform/` per OS |

Inside `src/os/` the imports run one way, and that direction is the point of the
shape: `apps/` sees `uikit/` and nothing else, never the shell and never the
device; `springboard/` sees `uikit/`, `device.ts` and `apps/` — `index.ts` for
the grid, and an app file directly when the shell has to show what that app is
doing, which today is only Control Center reading the deck in `apps/music.tsx`;
`device.ts` sees only the types in `uikit/app.ts`. So an app file knows nothing
about the shell it is drawn in, and the hardware path (`src/buttons.ts` →
`src/os/buttons.ts` → `device`) reaches iOS without touching React. An import
that runs the other way is the sign a responsibility has landed in the wrong
file.

## Weather data and widget

`apps/weather/data.ts` owns Open-Meteo forecasts, geocoding, persisted locations
and units, subscriptions and the widget snapshot. `weather/styles.ts` owns
presentation; `temperature-chart.tsx` draws actual hourly temperatures.
`apps/weather/index.tsx` owns location management and daily-detail navigation.
Both displays and the widget share the selected city and forecast cache;
search, scroll and detail navigation remain local to each app instance.
`screen.ts` reads the widget snapshot; `main.ts` rebakes home textures only
when that snapshot changes and disposes the previous textures.

## Units and camera

Scene units are centimetres. Apple's USDZ is metres, scaled by 100 and dropped
by 5.8974 so the hinge axis sits at the origin. The camera lives at z = 40 and
the screen shader projects from that eye; OrbitControls moves the real camera,
the projection eye stays fixed. Planes and rectangles (`HINGE_Z`, `INNER_Z`,
`OUTER_Z`, `INNER`, `OUTER`) are constants in `src/main.ts`, handed to the
shaders as `#define`s.

The window is cut to the phone. Four bands (`TOP_BAND`, `LEFT_BAND`,
`RIGHT_BAND` for the orbit card, `HUD_BAND` for the pill) are kept clear and
what is left is the phone's box. The box sits off the window's middle, so the
frustum is off-centre (`camera.setViewOffset`) rather than the phone off the
origin: the phone stays on the orbit pivot, and CSS3DRenderer reads the same
`camera.view` so the live panels follow. The HUD's own numbers live in
`src/hud.tsx` and are mirrored in those bands by hand.

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

Meshes are sorted once at load by Apple's node names in `src/main.ts`:
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
  `useSyncExternalStore`, `nowPlaying` in `apps/music.tsx` holds the one
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
- **Buttons** flow pointer or key → `src/buttons.ts` (`{ button, down }`) →
  `src/os/buttons.ts` (meaning) → `device` → the display in use. The Camera
  app publishes `CameraHooks` on `os.camera` for shutter, record and zoom.

## Desktop shell

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
