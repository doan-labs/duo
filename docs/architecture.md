# Architecture

One Three.js scene renders the device; React/StyleX draws the OS in DOM. Web and Tauri
use the same bundle. `packages/shell/native.ts` owns all native detection and IPC wrappers.
The root README owns the file tree; [decisions.md](decisions.md) records design rationale.

## Responsibilities

Paths below are relative to `packages/shell/` unless stated otherwise.

| Module | Responsibility |
| --- | --- |
| `main.ts` | Model loading/mesh classification, scene, fold/render loop, display visibility, HUD wiring and torch LED |
| `hud.tsx` | Hinge slider, fold/flip/home/reset buttons and auto-rotate; the degree readout is written through a ref, only state changes cross React |
| `view.ts` | The persisted view preference (`os.view`): hinge angle, yaw, camera orbit/zoom and auto-rotate, restored at load and written on gestures only |
| `buttons.ts` → `device-buttons.ts` → `device.ts` | Hardware hit boxes/springs/keys → press interpretation → device actions and display registry; device.ts has no React/StyleX |
| `os.tsx` | Create each display root and mount SpringBoard |
| `springboard/springboard.tsx` | Layer stack and state that outlives individual layers |
| `springboard/scenes.ts` | Per-display apps, split placement and mirrored scenes |
| `springboard/gestures.ts`, `home-bar.tsx` | WAAPI scrubbing/zoom geometry, the hold-to-switch/split gesture and the lift that carries a held tile |
| `springboard/grid.ts`, `wallpaper.ts` | Device-wide, persisted home order (apps, folders and the dock) and wallpaper; both displays and the bake read them |
| `springboard/folder.tsx`, `wallpaper-sheet.tsx` | The open-folder layer and the wallpaper picker, mounted by the home screen |
| `springboard/switcher.tsx` | App switcher: parked and on-glass scenes as scrollable live cards |
| `springboard/control-center.tsx`, `toggles.ts`, `clock.ts` | Control UI, device-wide switches and minute clock |
| `apps.ts` | Trusted baked registry and default positions |
| `screen.ts`, `shaders/` | Baked shell textures, fold geometry and fixed-eye projection |
| `runtime/` | Isolated app authority; [module map and invariants](platform/runtime.md) |
| `native.ts`, `desktop/` | Typed IPC/defaults; Rust wiring, feature commands and OS-specific platform implementations |
| `packages/apps/` | App-local presentation/effects; every folder with a `manifest.json` is a preinstalled sandbox release, the rest stay baked (they need the camera, microphone or embedded pages) |
| `packages/sdk/`, `packages/uikit/` | Host protocol/manifest/state API; presentation, tokens, icons and subscription-only display hooks |
| `packages/web/` | Launch site and developer docs: TanStack Start prerendered to `dist/client`, docs from `content/docs/*.md`, references generated from the SDK and kit exports, the shell embedded in a frame and posed over the `main.ts` bridge ([website](platform/web.md)) |
| Root build tooling | StyleX transform, isolated app/preinstalled builds and shell output |

Apps consume SDK/kit exports, never another app or shell internals. SDK `legacy.ts` owns
baked `Os`/`CameraHooks`; the kit owns the React `App` adapter. The shell may consume app
exports: Control Center uses Music's single shared deck. Calendar's widget is baked;
Weather publishes a persisted declarative snapshot.

## Build and package boundaries

The website's [builder](platform/builder.md) owns browser provider calls, source projects
and a compiler worker. `runtime/builder-preview.ts` owns the web-only channel and preview
activation; `sdk/builder-preview.ts` shares its wire format. Generated documents reuse the
SDK bridge, sandbox, storage and document verifier. They never execute in the chat page.

`build.ts` builds `packages/shell/index.html` into `dist/` and copies `public/` assets.
`stylex-plugin.ts` injects styles during development and emits `dist/stylex.css` in builds.
The Tauri crate is in `packages/shell/desktop`; `.cargo` and its shared cache stay at root.
The CLI supports external create/check/build/serve/dev/preview; `packages/web` is the
launch site, with its own Vite build that copies the shell's `dist/` under `/device/`. See [development](platform/dev.md) for package consumption.

`scripts/build-app.ts` emits immutable releases: one policy-bearing HTML document with
embedded script/styles/icons/fonts plus release metadata and icon. The builder-only
`uikit/sandbox-stylex.ts` converts dynamic values into CSSOM classes in a hash-authorized
stylesheet; baked apps use ordinary StyleX. `scripts/build-preinstalled.ts` packages Notes
and Weather separately; the shell imports neither app module.

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
| Bezel 1.2 mm; concentric active-area radii | `screen.ts` |
| Home grid/widget/dock scale 768/1072 | HIG renders; `springboard/home-screen.tsx` |
| Display rectangles | Mesh bounds; `main.ts` |

## State and folding

Device-wide state includes lock, sleep/power, volume, toggles, the home grid, the wallpaper
and Music's deck. The lock
texture rebakes each minute. Sleep blacks both live and baked displays; powered-off input
accepts only the held side button. Control Center drives volume, brightness veil, transport
and power; most radio/focus switches are visual state only.

Each display has its own SpringBoard/scenes. The inner display holds at most two apps
on the glass, split at a draggable divider (`split` in scenes.ts; a free half shows narrow
home at the middle). Going Home parks a scene: mounted, hidden, listed by the app
switcher (`springboard/switcher.tsx`), which transforms the live app elements into cards. `follow()` mirrors the active display without launch zoom.
The lead changes at 40°; the cover takes the first split app and the inner split collapses
to it. `goHome()` closes both. Baked apps share module state but retain local component
state; sandbox views share only SDK state. Gesture scrubbing uses `swipe()`/`settle()`;
a 220 ms home-bar hold makes a card: released, it opens the switcher; dragged sideways, it
offers the split drop zones.

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
