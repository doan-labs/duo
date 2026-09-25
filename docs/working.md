# Working guide

Use [architecture](architecture.md) for ownership, [debugging](debug.md) for verification,
and [platform development](platform/dev.md) for external apps. Commands run from the root
unless noted. Native instructions below assume macOS; Windows/Linux parity is unverified.

## Commands

```sh
bun install
bun run dev            # http://localhost:3000
bun run desktop        # Tauri; needs rustup and a free port 3000
bun run typecheck      # required before calling work done
bun run build          # dist/ and dist/stylex.css
bun run --filter '@doan-labs/*' typecheck
cargo shell-check
```

Prepare the model once: `pip install usd-core && python3 scripts/prepare-model.py`.
Native production: from `packages/shell`, run `bun x tauri build --debug --no-bundle`.
Workspace consumers own runtime dependencies; root owns tools, public assets and caches.

The dev server, the production build and CI disable Bun's FTL optimizer
(`BUN_JSC_useFTLJIT=false`).
Bun 1.4.0 can miscompile StyleX's parser after repeated compilations, rejecting valid
media queries; see [Bun #41609](https://github.com/oven-sh/bun/issues/41609).
Keep reduced-motion rules and media-query ordering enabled.

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
| `?arg=<catalog id>` | Argument the `?app=` app gets as `os.arg`; `?app=App Store&arg=<id>` opens that app's page in the Store |
| `?hud=0` | No slider, buttons, hint or minimap, fit centred on the phone; for a page that poses it by postMessage |
| `Esc` / Home | Return home on both displays |
| `L`, `C`, `↑`/`↓` | Side, Camera Control, volume buttons |
| Control Center | Pull down from the top 26 px; home-bar swipe, scrim, Esc or Home dismisses |
| App switcher | Swipe home bar up, hold ≥220 ms, let go: every running app as a card. Drag or wheel to scroll, tap a card to bring it back, flick one up to quit it, tap the wallpaper for Home |
| Split (inner display) | Swipe home bar up, hold ≥220 ms, drag sideways, drop on a half; occupied halves swap, hinge drop cancels |
| Split divider | With an app on each half, drag the pill on the seam; 30-70%, back to the middle when one leaves |
| Folder | Hold an icon 0.5 s, carry it onto another icon or folder, let go; elsewhere it springs back. Tap a folder to open it, tap its name to rename; hold an icon inside and let go outside the well to take it out. A folder down to one app dissolves |
| Dock | Hold a dock icon 0.5 s and carry it onto the paper of a half to set it there, or onto an icon to fold them; carry a grid icon onto the dock to add it, or a dock icon up or down the dock to reorder. The dock opens a slot as the finger arrives and closes it as it leaves; at most 8 apps |
| Wallpaper | Hold the paper itself 0.5 s; tap a swatch (dune, gradients, Camera shots, `+` for a picture off the disk), tap outside to close |
| Reset / minimap | Return yaw and camera to the default view |

Going Home parks an app rather than closing it: it stays mounted, `display: none`, so the
switcher can show it live and put it back with its state. The six most recent stay; older
ones close, and Camera always closes so a parked app cannot hold the webcam. A layer
that lays scenes out through `ctl.els` (the switcher) must do so from a passive effect:
the shell re-creates the scenes' ref callbacks every render, so React empties the map in
the mutation phase and refills it in the layout phase, after a child's layout effect.

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

A sandboxed app listening through `os.device.on('volume' | 'camera-control')` takes
those presses before any row above runs; `device-buttons.ts` offers each press to
`device.ts` listeners first and remembers the taker, so the slide and release follow it.
Keep the side button and the chord checks ahead of any offer: apps hear `side`, they never
take it. A new device event type must go only to views that watched it, because a released
SDK revokes itself on an event type it does not know.

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

Every size, weight, radius, shadow, tracking, leading, font, timing and colour comes from
`packages/uikit/tokens.stylex.ts` (`typography`/`typeScale`+`leading`+`tracking`+`weight`,
`space`, `radius`, `shadow`, `glass`, `easing`, `motion`, `colors`, `app`); a value with no
step is snapped to the nearest one, not added. An app's own colours go under its `// <app>`
line in `appAppearance`, named by role, and only that app reads them. The shell reads no
`appAppearance`; its materials are `chrome`/`wallpaper` consts. `bun scripts/check-app-tokens.ts`
is the gate; `screen.ts`, `main.ts`, `device.ts` and shaders are exempt because they paint
canvas and WebGL, so a token change there is a second edit by hand.

Keyframes must be declared in the consuming file; reusable animations are whole style
blocks. Identical declarations deduplicate. For sandbox gallery roots, apply the public
app token theme, not only a background color.

The bottom-centre home bar occupies 180×22 px at z-index 8. Keep controls outside that hit
area; Notes' palette clears it by 26 px. OS layers stay at z-index ≤10 beneath the fold
ramp at 11. `getBoundingClientRect()` is screen space; use `spot()`'s offset chain for
panel coordinates, including home-page transforms. Chromium can lose rounded image clips
inside CSS3D; existing widgets use text/gradients.

A bottom-anchored column (`justifyContent: 'flex-end'`) that outgrows its panel overflows
off the top, where no scroll reaches it. Both displays are shorter than a phone keypad, so
Calculator and Phone make the column a `containerType: 'size'` container and size their
keys `min(<full>, (100cqh - <fixed>) / <rows>)`; change `<fixed>` with any height around them.

## Safari maintenance

`packages/apps/safari/index.tsx` owns tab history, the floating URL pill and the cover rail;
`bookmarks.tsx` owns the local Recently Saved, folders and bookmark sections; shared Safari
layout and material rules stay in `styles.ts`. Real web pages scroll in their own iframe
viewport. The Duo website mounts `packages/web/src/safari-scroll-bridge.tsx`, which sends only
scroll direction and position to the parent because cross-origin document scroll events cannot
reach the Safari DOM. The URL pill compacts into the small gray pill on downward intent and
expands on upward intent. A page that does not install the bridge remains functional, but its
URL pill cannot mirror its private scroll position.

The grid order and the wallpaper persist in localStorage (`os.home`, `os.wallpaper`); clear
them for a factory home. `screen.ts` bakes from the same `grid()` snapshot the live home
renders, so a change to either must keep the two reading the same data.

The shell's other preferences persist the same way, all under `os.` keys so erase.ts wipes
them with the phone: `view.ts` keeps the 3D view (`os.view` - hinge angle, yaw, camera orbit
and zoom, auto-rotate), `toggles.ts` keeps the Control Center switches (`os.toggles`), and
device.ts and springboard.tsx keep ringer level and brightness (`os.level`, `os.bright`).
Pose writes happen on user gestures only - a `?deg=` param or a postMessage pose poses the
phone for the visit without becoming a preference, so an embedding page cannot overwrite
what the finger saved.

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

Cover/split use one-column cards. The host renders persisted widget snapshots and rebakes
on changes without fetching. Keep `scrollbar-width`/`scrollbar-color` at auto where WebKit
pseudo-elements apply; non-auto values override the detailed thumb skin in Chromium.
Other engines use the thin/tinted fallback. [Scrollbar verification](debug.md#known-false-alarms)
must launch the browser without `--hide-scrollbars`.

## Maps maintenance

`data.ts` owns the places, the tile URLs and the Web Mercator maths (`zoomAt` keeps the
point under the cursor still, `fit` frames a route in what the panels leave uncovered);
`map.tsx` draws the tile grid, the pins, the route overlay and the map chrome, `sidebar.tsx`
the search column, `place.tsx` the selected place, `directions.tsx` the ways there and the
steps. `live.ts` holds the backends: Photon geocodes the search field and reverse-geocodes
dropped pins and the blue dot, and FOSSGIS's OSRM hosts (`routed-car`, `routed-bike`,
`routed-foot`) return the routes - all keyless and CORS-open, so no secret rides in the
bundle. `share.ts` is the store both copies draw: query, results, selection, directions,
routes, estimate, `me`, recents, the camera `view` and the layer `kind` are one module
state, so the fold hands the same map over whole - either copy writes intent and only
the `!os.mirror` copy fetches or animates. The mirror's `flyTo` writes the target view
flat instead of scheduling frames; the live copy's animation frames land in the store
and the folded display draws them. `os.mirror` reads live from `active.wide`, so the
flag follows the fold rather than the spawn - whichever display is in use counts as
the running copy at that moment, even one opened quietly long before. The directions
scroll offset shares the store too: either copy writes its scrollTop debounced, both
settle on the shared value whenever it changes (only the folded-away one actually
moves), and a new destination, mode or route remounts the scroller at the top. Results
and routes are keyed by the request that asked for them - the search key carries a
~0.5-degree camera bucket so a query re-biases when the map crosses towns - and each
record counts `tries`: a failure retries once, reopening directions clears the failed
record to ask again, and no render can loop a fetch. `camera.ts` is the fly plan behind
every jump: `flyTo` runs it through a rAF
driver, drag and wheel interrupt it, a released drag coasts on its velocity, and zoom is
fractional - tiles render at the nearest integer level scaled by `2 ** (z - tileZ)`.
Explore uses OpenStreetMap Japan's MapTiler Basic raster and Satellite uses Esri World
Imagery, both keyless: CARTO watermarks anonymous requests and Stadia rejects them. Recents
start from the same sample as before and grow with what the session actually looks up.
Every fetch gates on `!os.mirror`: the folded-away copy draws but searches, routes and
locates nothing.

Panels run the full height of the display and pad their own content past the 40 px status
stack, which the map draws under. `ASIDE` and `CARD` in `styles.ts` are also what the map
centres against through `padX` in `index.tsx`; changing one without the other offsets every
pin from the space it was meant to fill. Below 600 px the same panels become one bottom
sheet, sized by `SHEET`.

## Website

The `/build` workspace generates compiler assets during website dev/build. Use the normal
web scripts, not Vite alone on a fresh checkout. The first compilation downloads Babel,
StyleX, esbuild WASM and the prebuilt runtime. Source files export a component; the builder
owns connect/ready. Browser compilation is not the CLI publication check. Full constraints
are in [builder](platform/builder.md). Freeze source before tests: HMR can reset the chat's
preview sequence while leaving the shell mounted; reload the workspace after editing it.

`packages/web` is the developer site: TanStack Start on Vite, StyleX through
`packages/web/vite-stylex.ts`, every route prerendered. See
[docs/platform/web.md](platform/web.md) for the plan and the build record.

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
  URLs. The repository's own `docs/` is not rendered (decision 57).
- The kit and SDK references list whatever `packages/uikit/index.ts` and
  `packages/sdk/index.ts` re-export. A component's TSDoc may sit on its props
  type (the kit's habit) or on the function; the props table expands
  `PrimitiveProps<…> & { … }` intersections, reads defaults off the destructured
  parameter, and names what the props extend. Document each member of the props
  type for the Description column; an undocumented export shows "No TSDoc on
  this export yet".
- `/kit` is the hero (`src/kit/hero.tsx`: headline counted from the generated
  API, install line, stats) over the showcase grid in `src/kit/showcase.tsx`.
  Each tile is one file in `src/kit/scenes/`, a small app composed only from
  the kit and its tokens, drawn in the kit's light theme or, for a `night`
  tile, its dark one. A tile mounts its scene the first time it scrolls into
  view, so mount animations (rings, bars, the menu) play in front of the
  visitor; the prerendered HTML carries the captions, not the scenes. Tiles are
  `contain: paint`, which makes a `Sheet`'s fixed scrim fill the tile rather
  than the page. The grid is six columns at 1200 px, so a two-column tile is
  387 px, the cover width. The fold tile hides its width control when its
  stage cannot hold 790 px. `src/kit-demos/` stays the per-export reference
  demos; the reference is `/kit/docs`.
  A dev server serves the site's own `public/icons/`, a stale copy; the build
  recopies the full set from the root `dist/`, so a symbol that looks blank in
  dev is not necessarily missing.
- Each `/kit/docs/<Export>` page is breadcrumb, title, the TSDoc's first paragraph
  and a Source link to the GitHub blob, then Preview and Usage tabs, then an
  "API reference" table (`ApiTable` in `src/api-card.tsx`, or the signature
  when there are no members), then three related exports of the same kind.
  Preview renders the real component in a 387 px frame with the light app
  theme; Usage is the same file's highlighted text (`src/highlight.tsx`),
  collapsed past 300 px. The demo is one file per component in
  `packages/web/src/kit-demos/`, `navigation-link.tsx` for `NavigationLink`,
  default-exporting a `Demo` that imports only from `@doan-labs/duo-uikit`;
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
  `?bg=` at load, then `{ deg, yaw, bg, paused, app, arg, cue }` by postMessage from
  the same origin: a `yaw` that differs from the current one also eases the
  camera home, since a page poses the phone as its reader sees it and an orbit
  drag would otherwise leave it showing its back; `paused` parks the render loop while the frame is off screen,
  `app` clears the stage and launches an app by home screen name (empty string
  is Home; `arg` reaches it as `os.arg`, so `app: 'App Store'` plus a catalog id
  opens that app's page in the Store), `cue` makes the phone do something once it is up (`packages/shell/cues.ts`:
  `split` drags it onto the left half by synthetic pointer events and opens the
  named app beside it, `switcher` holds the home bar and lets go, `folder` resets
  the grid and carries Find My onto Stocks, `wallpaper` holds the paper and taps
  the next swatch, `screenshot`, `play` starts the deck muted, `control` pulls
  Control Center down on the inner display). `hear: [...types]` asks to be told
  the device events an app would hear (`packages/shell/embed-device.ts`), each
  posted back to the asking origin as `{ device: { type, data } }`; the page
  listens as a visible, active view, so while it hears volume or Camera Control
  those presses are its, and `hear: []` stops. `spots: true` asks where the
  four caps are, answered as `{ spots: { side, camera, up, down } }` in frame
  pixels after every rendered frame that moved one, so a page can point at a
  button while the phone eases into a pose; `spots: false` stops. The shell
  also accepts a localhost parent on another port, so `vite dev` on 3001 can
  drive the root dev server on 3000; anything else must be the same origin. `src/simulator.tsx` posts the body colour and
  its `deg`, `yaw`, `app`, `cue` and `hear` props (re-sent on every load, so a
  message lost to the frame's blank first document is not lost for good), and never puts a live pose in the
  frame URL: a `src` change reloads the whole scene. After changing
  the bridge, rebuild the copy with `bun scripts/simulator.ts`. That script also
  copies `/model`, `/icons`, `/cdn` and `/preinstalled` to the site root: the
  shell loads all four by absolute path, and the runtime seeds Notes and
  Weather from the last one.
- Under 734 px the hero swaps the WebGL shell for the pre-rendered loop
  `public/hero.{webm,mp4}`.
- The page scrolls through Lenis (`src/smooth-scroll.tsx`, `ReactLenis root`
  around everything in `__root.tsx`; off under reduced motion). A region that
  scrolls on its own needs `data-lenis-prevent`, and anything reading
  `document.documentElement.className` must expect the `lenis` classes there.
- The home story is one sticky scene (`src/home/works.tsx`) on one `Simulator
  bare` frame. Its camera step shows a card and opens the Camera app only after
  the reader clicks Allow; the page asks for the webcam itself first, then
  posts `app`. Never open the Camera app in a frame that mounts early: the
  browser prompts before the reader can see why.
- Inside a frame the shell's HUD hides its "iPhone Duo" heading and display
  line (`window.self !== window.top` in `packages/shell/hud.tsx`); the hint
  and the control bar stay.
- Check the production build too, with `dist/client` served on port 3011. Block
  frames for the page checks and load the hero shell once for the bridge check,
  so expect about two minutes.

## Community apps and the catalog branch

`community-apps/<slug>/` folders are not workspaces: they resolve `@doan-labs/*` and React
through the root fallback in `scripts/build-app.ts`, so keep them inside the repository and
never add them to the root `workspaces`. Scratch apps for checks also live under `.cache/`
for the same reason (a temp directory outside the repo cannot resolve React's transitive
`scheduler`). `scripts/check-submissions.ts` compares against `origin/main` by default; pass
`--base` on another branch. Never edit `registry.json` for someone else's id without the
listed maintainers. The `catalog` branch holds only the published tree; do not merge it into
`main` or rewrite its history, since release folders under `apps/` are immutable URLs.
After a changed catalog push, publication creates an empty `main` commit to trigger the
static website build; this is the bridge between the data branch and the deployed `/catalog`.
`packages/web/scripts/catalog.ts` fetches it during the site build and tolerates its absence.

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
