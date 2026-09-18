# Architecture

One Three.js scene renders the device; React/StyleX draws the OS in DOM. Web and Tauri
use the same bundle. `packages/shell/native.ts` owns all native detection and IPC wrappers.
The root README owns the file tree; [decisions.md](decisions.md) records design rationale.

## Responsibilities

Paths below are relative to `packages/shell/` unless stated otherwise.

| Module | Responsibility |
| --- | --- |
| `packages/shell/index.html` | page shell: the `@layer reset` CSS and the script tag |
| `packages/shell/hud.tsx` | floating HUD (hinge slider, Open, Flip, Home, Reset view, Auto-rotate), the "iPhone Duo" heading and hint shown only when the page is not embedded, and the orbit minimap (an atom driven every frame from the camera pose through refs, shown only off the default view), liquid glass, as React + StyleX |
| `packages/shell/main.ts` | scene, model load and mesh sorting, fold, render loop, HUD wiring, the flash LED (emissive on Apple's emitter and glass, a halo sprite and a point light, read off `toggles.torch` every frame), and the embed bridge (`?bg=` plus same-origin `{ deg, yaw, bg }` messages from the website's frame) |
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

Apps consume SDK/kit exports, never another app or shell internals. SDK `legacy.ts` owns
baked `Os`/`CameraHooks`; the kit owns the React `App` adapter. The shell may consume app
exports: Control Center uses Music's single shared deck. Calendar's widget is baked;
Weather publishes a persisted declarative snapshot.

## Build and package boundaries

`build.ts` builds `packages/shell/index.html` into `dist/` and copies `public/` assets.
`stylex-plugin.ts` injects styles during development and emits `dist/stylex.css` in builds.
The Tauri crate is in `packages/shell/desktop`; `.cargo` and its shared cache stay at root.
The CLI supports external create/check/build/serve/dev/preview; the web workspace here is
a scaffold. See [development](platform/dev.md) for package consumption.

Root tooling builds the shell page at `packages/shell/index.html` into `dist/`.
`public/` is copied verbatim, including icons referenced by the UI kit catalog.
The Tauri crate lives under `packages/shell/desktop`, while `.cargo` and its
shared output directory remain at the root. The CLI supports local create/check
and `packages/web` is the launch site and developer docs, with its own Vite
build that copies the shell's `dist/` under `/device/` to embed it
([progress/web.md](platform/progress/web.md)). Stage 2 adds the runtime and
catalog installation to the earlier monorepo migration.

## Geometry and framing

Scene units are centimetres: multiply Apple's metre model by 100 and offset y by −5.8974
to put the hinge at the origin. The projection eye stays at z=40 even when OrbitControls
moves the camera. `HINGE_Z`, `INNER_Z`, `OUTER_Z`, `INNER` and `OUTER` are in `main.ts`.

`bend.value` is 0 open and π closed. The moving half rotates around `HINGE_Z`; a ±0.35 cm
Hermite strip blends fixed/moving transforms. Mesh classes use Apple's hashed node names;
a changed USDZ requires remeasurement. The outer DOM panel rotates with the hinge group.

`frame()` fits mesh bounds into the area left by `TOP_BAND`, `LEFT_BAND`, `RIGHT_BAND` and
`HUD_BAND`, capped at 37 px/cm. Moving bounds are measured in hinge space; the invisible
`PHANTOM` proxy is excluded. A camera view offset keeps the phone on its orbit pivot and
aligns CSS3DRenderer. HUD dimensions must agree with the bands. Fit accounts for camera
direction, not zoom distance; close zoom can still crop. See [model checks](debug.md#2-reading-the-model).

## Two ways to draw a display

| Surface | Behavior |
| --- | --- |
| Baked canvas | Shell-only texture projected from the fixed eye, blurred/darkened through folding; inner bake is black when a bending app uses live DOM |
| Live DOM | Inner panel at flat ≥179°, or throughout an open app's fold; cover when closed or when its app faces the camera |

`foldClip()` projects the moving edge back onto the inner glass using the camera position.
`ramp()` matches shader shading with one gradient and six clipped blur layers at z-index 11;
OS layers stay at 10 or below. Cover pointer events are enabled only when flat (≤1°).
The cover is off at 180° and fades in over the first 30° of folding.

Live scale is 5 px/mm (`PXCM=0.02` cm/px); baked scale is 12 px/mm. Update matching layout
constants in both paths or the display jumps at transition. Measured geometry:

| Value | Source |
| --- | --- |
| Glass radii: inner 10.7 mm; cover free edge 11.4 mm, hinge edge 1.3 mm | Model meshes; `os.tsx` |
| Bezel 2.2 mm; concentric active-area radii | `screen.ts` |
| Home grid/widget/dock scale 768/1072 | HIG renders; `springboard/home-screen.tsx` |
| Display rectangles | Mesh bounds; `main.ts` |

## State and folding

Device-wide state includes lock, sleep/power, volume, toggles and Music's deck. The lock
texture rebakes each minute. Sleep blacks both live and baked displays; powered-off input
accepts only the held side button. Control Center drives volume, brightness veil, transport
and power; most radio/focus switches are visual state only.

Each display has its own SpringBoard/scenes. The inner display holds at most two apps;
a free half shows narrow home. `follow()` mirrors the active display without launch zoom.
The lead changes at 40°; the cover takes the first split app and the inner split collapses
to it. `goHome()` closes both. Baked apps share module state but retain local component
state; sandbox views share only SDK state. Gesture scrubbing uses `swipe()`/`settle()`;
a 220 ms home-bar hold offers split drop zones.

Both display roots attach to CSS3DRenderer's final camera container before apps mount.
Reparenting would reload iframes. Ordinary folding must retain document/view identity;
split collapse is an explicit view replacement within the same sandbox session.

## Isolated runtime

The [contract](platform/contract.md) owns SDK and lifecycle invariants; [security](platform/security.md)
owns trust limits. IndexedDB is authority, mutations acknowledge transaction completion,
and locks/leases/generations prevent stale writes. Ownership is sticky per session with
checked epochs. Installed documents use verified stored `srcdoc`; previews use verified
Blob `src` and separate namespaces. Release hashes establish integrity, not publisher identity.

Weather's owner fetches and publishes snapshots; nonowners send commands. Host/widget
renderers never fetch weather. Snapshot changes trigger home-texture rebakes and disposal
of replaced textures. Notes/Weather maintenance details are in [working.md](working.md).

## Native window and assets

Tauri uses a transparent, undecorated, shadowless WKWebView with `macOSPrivateApi`. The HUD
pill is the drag region; buttons/inputs remain interactive. The capability grants
`core:window:allow-start-dragging`; the current Rust command is `platform_name`.

Apple's model/wallpaper are not redistributable. `scripts/prepare-model.py` downloads and
flattens the Landscape USDZ into `public/model/`. `scripts/icons.sh` extracts local Mac
icons/SF Symbols; it is human-run tooling, not imported application code.
