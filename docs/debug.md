# Debugging without a human

Platform checks are reproducible from `scripts/check-platform.ts` (local/CI),
`scripts/checks/stage3/workflow.mjs` (external packages and actual Store), and
`scripts/checks/stage4/apps.mjs <tag> [App names...]` (built simulator pixels at
inner/cover widths). `APP_DIST` freezes a baseline independently of source edits;
`APP_PORT` avoids conflicts. Gallery tests use real opaque sandbox documents but
no 3D model. `CHROME_BIN` selects the installed browser in CI. Headless pixel
review caught a missing gallery navigation theme even when DOM checks passed:
set the public `app` token theme on the root, not only its background colour.

Run full SwiftShader simulator tests serially. Concurrent software-GPU renderers
can starve sandbox first-paint callbacks beyond the existing ready deadline;
record the failure and rerun alone before diagnosing a lifecycle regression.
Do not lengthen safety deadlines to make an overloaded test pass.

Native raw debug binaries can share WKWebView storage despite different Tauri
identifiers. The platform native harness now sets an explicit random window
`dataStoreIdentifier`, requiring macOS 14+ for isolated persistent test storage.
Rebuild once and restart that same binary to test persistence in that store.
Production storage settings are unchanged. Earlier stage-2 native checks did
not use this partition and are not evidence of test-profile isolation.

How to drive, observe and verify this app from a terminal: headless Chrome for
logic and layout, the real Tauri window for anything a GPU or WKWebView changes.
Every snippet here has been run. Mac only, like the rest of working.md.

## 0. Ground rules

- **Headless first; no visible app required.** Use the installed `puppeteer-core`
  to run Chrome against the local web server for routine UI, interaction,
  persistence, and screenshot checks. It renders the actual React, CSS3D and
  WebGL page without opening a visible window. Do not require the user to launch
  the desktop app for these checks. Use an isolated browser profile so tests do
  not change the user's saved app data.
- **Use the desktop for desktop-specific evidence.** Launch the visible Tauri
  window for native integration, window behavior, WKWebView rendering, or
  GPU/timing issues that remain uncertain headless, and when explicitly requested.
  State what was tested and what remains unverified; Chromium screenshots alone
  do not prove WebKit parity.
- **Assert on state, then look at pixels.** DOM and `__duo` tell you what
  happened; a screenshot tells you whether it looked right. Do both, in that order.
- **Timings are iOS's, so waits must be too.** A side click sleeps only after
  the 300 ms double-click window; a swipe unlock animates out for 420 ms. Wait
  ≥ 1 s before asserting an unlock.
- **Scratch scripts live in `.cache/debug/`.** Gitignored, and module
  resolution walks up to the repo's `node_modules`, so `puppeteer-core` (a
  devDependency) resolves. A script in `/tmp` will not find it.
- **Never edit source while a headless run is loading.** Bun rebundles on save;
  a page that loads mid-rebuild times out on `.os` and looks like a bug.

## 1. Headless Chrome

For an app's visual baseline, open `?debug&app=Notes&deg=180` for unfolded
and `?debug&app=Notes&deg=0` for folded (substitute the app name). Capture before
editing source, repeat the same viewport and state afterwards, and inspect the
saved PNGs. Use `deviceScaleFactor: 2` for crisp captures and crop to the display
as described below. For live fold handover, omit `deg` and drive the hinge
control instead. Puppeteer can also click, type, drag, reload and assert DOM or
storage state in the same session; screenshots are only one part of the check.

Dev server first: `lsof -tiTCP:3000 -sTCP:LISTEN || bun run dev &`. Then:

```js
// .cache/debug/run.mjs  —  bun .cache/debug/run.mjs
import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--window-size=818,664', '--hide-scrollbars']
})
const page = await browser.newPage()
await page.setViewport({ width: 818, height: 664, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text().slice(0, 300)))
await page.goto('http://localhost:3000/?debug', { waitUntil: 'load', timeout: 120000 })
await page.waitForSelector('[data-os]', { timeout: 60000 })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await wait(2500) // model, textures, first frames
// ... steps ...
await browser.close()
```

818×664 matches the desktop window, so viewport coordinates found here are
window coordinates there (section 3).

### The state probe

StyleX hashes every class name, so probes hook on `data-*` attributes the shell
sets for this purpose: `data-os`, `data-lock` (`data-hidden` while an app covers
it), `data-torch` on the lock screen's
torch button, `data-hud="vol|thumb|poff|flash|torch|cc|dim"` (`data-on` while
the volume HUD shows, or while the torch is on), `data-boot`, `data-pages`, `data-app`
(with `data-side="left|right"` on a half-width app, absent full-screen), and
`data-drop="left|right|none"` on the drop zones while an app is on a finger.
Control Center is `data-cc` (also `data-hud="cc"`), its sliders
`data-cc-slider="bright|volume"`, the strip that opens it `data-cc-pull`
(absent while it is open); `data-hud="dim"` is the brightness veil, read its
computed opacity. To open it headless, drag with `page.mouse` from
`(rect.right - 60, rect.top + 8)` down ~190 px in ten steps, where `rect` is the
display's `getBoundingClientRect()` (flat at yaw 0), then wait ≥ 1.5 s. Which
page is up is `data-cc-page="0|1|2"` on the track's viewport. Nothing inside the
panel carries an attribute of its own, so reach a control by walking children
from `[data-cc]`: `[1,0,0,0,0]` is `+`, `[1,0,0,0,1]` power, `[1,0,1,i]` the
rail's three pips, `[1,0,0,1,0,0,0,n]` the nth grid cell (`,0` its tile, `,1`
its minus badge in edit mode), `[1,0,0,1,0,0,0,0,0,j]` the jth radio.
`.cache/debug/cc.mjs <deg> <tag>` walks all of it: open, the three pages, play,
edit, drop a tile, power.
To split headless: mouse down on the bar (display bottom − 8 px, x at the
app's centre), eight moves of 14 px up with 25 ms waits, wait 1.5 s (SwiftShader
paints late), move sideways to the target half, wait, up. `.cache/debug/split.mjs`
does the whole sequence: split, open a second app, swap, close one.
The orbit minimap is `data-hud="orbit"` with `data-on` while the view is off its
default pose; its caption is `[data-cap]` (`"−36° · −7°"`, az · el) and the pill's
Reset is `button[title="Reset view"]`, `disabled` at the default pose. Under
SwiftShader the homing lerp and yaw unwind run at a few frames per second, so
allow 8 s after Reset before asserting `data-on` is gone.

One `evaluate` that returns everything worth asserting. Extend it, do not
replace it; a probe that prints the same shape every step is what makes a log
readable after the fact.

```js
const st = () => page.evaluate(() => ({
  asleep: __duo.device.asleep, off: __duo.device.off, level: __duo.device.level,
  locked: document.querySelectorAll('[data-lock]:not([data-hidden])').length,
  apps: [...document.querySelectorAll('[data-app]')].map((e) => e.closest('[data-os]').offsetWidth + ':' + e.dataset.app),
  vol: !!document.querySelector('[data-hud=vol][data-on]'), thumb: !!document.querySelector('[data-hud=thumb]'),
  poff: !!document.querySelector('[data-hud=poff]'), recing: !!document.querySelector('[data-recording]'),
  zl: document.querySelector('[data-zoom]')?.textContent,
  boot: !!document.querySelector('[data-boot]')
}))
```

`closest('[data-os]').offsetWidth` is `790` for the inner display and `387` for
the cover: the only cheap way to tell which instance an element belongs to. The
inline `style.width` the older probe read is empty since StyleX took the root
over — it sets the size through a class.

The other display mirrors the one in use (decisions.md 24), so that number is
what says the mirror worked: open an app, click `button[title="Close"]`, and
the same `data-app` should turn up under `387` — with `getAnimations()` empty
on it, since a mirror's open has no zoom. The inner copy's node is the same
one the whole way down and back (`.cache/debug/fold-mirror.mjs` marks it and
checks). The hinge eases asymptotically and SwiftShader gives few frames a
second, so poll `__duo.bend.value` until the angle is under 1° rather than
waiting a fixed time — a fold takes ~10 s headless against ~1 s on a GPU.

A `.thumb` holds a clone of the whole display, so `[data-app]` counts double
while a screenshot thumbnail is showing.

### Pressing buttons

Two paths, test both:

```js
// Logic path: skips the raycast, exercises os/buttons.ts and device.
const press = (b, ms = 80) => page.evaluate(async (b, ms) => {
  __duo.press(b, true); await new Promise((r) => setTimeout(r, ms)); __duo.press(b, false)
}, b, ms)
await press('side')           // click
await press('side', 650)      // hold → Siri
// Chord: hold one, tap the other.
await page.evaluate(() => __duo.press('up', true)); await wait(30)
await press('side'); await page.evaluate(() => __duo.press('up', false))

// Hardware path: the raycast, capture and OrbitControls suppression.
const at = await page.evaluate((name) => {
  let m; __duo.phone.traverse((o) => { if (o.userData.button === name) m = o })
  const v = m.getWorldPosition(new m.position.constructor()).project(__duo.camera)
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }
}, 'side')
await page.mouse.move(at.x, at.y); await wait(50)
await page.evaluate(() => document.querySelector('canvas').style.cursor) // 'pointer'
await page.mouse.down(); await wait(120); await page.mouse.up()
```

Do not take a screenshot between `mouse.down` and `mouse.up`: under
SwiftShader a screenshot takes 0.3–6 s and the press becomes a hold.

Buttons at yaw 0, 818×664: side (644, 234), Camera Control (642, 390), volume
up (547, 75), volume down (497, 75). These hold at the home view only — `frame()`
shrinks the phone as the view turns, so recompute with the snippet above after
turning the camera, or after touching the bands in `main.ts` or `PAD` in
`packages/shell/buttons.ts`.

### Looking at things

- Crop, do not shrink: `page.screenshot({ path, clip: { x: 160, y: 140, width: 640, height: 480 } })`
  keeps the display legible. `deviceScaleFactor: 2` for the frame's edges.
- `?yaw=-1.2` shows the right edge and its two buttons; `?yaw=-1.5708` is
  edge-on. Cap travel is 2 px from the front; the body tilt is what you will
  see in a still. Compare against an idle shot of the same clip.
- `?deg=0` is the cover, `?deg=120` mid-fold. **Above about 90° mid-fold,
  neither `.os` is in the DOM**: CSS3DRenderer only appends a panel once it is
  visible, the inner one is hidden off flat and the cover one still faces away.
  `waitForSelector('[data-os]')` times out; use `bun scripts/shot.ts <url>
  <out.png>` (its wait is try/caught) or wait a fixed 3 s instead. **With no app
  up, no panel is live between 1° and 179°** and the bake draws both displays
  with their fold; `?deg=60` has an empty `[data-os]` list. With an app up the
  cover panel is live wherever it faces the camera, mirroring the inner one from
  about 90° down — `?debug&app=Safari&deg=30` is the pose to look at
  (`.cache/debug/cover-ramp.mjs` probes it), and
  `.cache/debug/fold-live.mjs` walks the whole sweep. With an app up the inner
  panel is in the DOM at every angle, clipped:
  `getComputedStyle(os).clipPath` reads `inset(0px 0px 0px 28.77%)` at
  `?deg=110`, 67.87% at 73° and 100% by 20°, and
  `__duo.screens.inner.material.color.r` is 0 because the bake under it is off.
  The clip follows the camera, so moving `__duo.camera.position` changes it
  without touching the hinge (`.cache/debug/orbit-fold.mjs`). The fold's blur and
  darkening are bare `div`s appended after React's children — one gradient and
  six `backdrop-filter` layers — found with
  `os.querySelectorAll('div[style*="backdrop-filter"]')`; they carry no filter
  until the first frame that wants one, so a flat pose has none.
  `.cache/debug/keep-state.mjs` proves the app is not remounted by a partial
  fold (it marks the element and looks for the mark afterwards) and
  `.cache/debug/fold-real.mjs` walks the real flow: tap the icon on the inner
  display, fold to closed, open again. A hidden panel stays in the DOM with
  `display: none`, so `offsetWidth` is 0: check it before trusting a query.
- Transient UI (volume HUD, thumbnail) may be gone or not yet faded in by the
  time SwiftShader delivers a screenshot. Read the class and the computed style
  (`getComputedStyle(el).opacity`) instead of trusting the pixels; if the
  class is on and opacity is `0` at 150 ms, the compositor is starved, not
  the CSS. Confirm such things on the desktop (section 3).
- Webcam is absent headless: Camera shows its fallback and `shoot()` is a
  no-op (no `videoWidth`). Test recording and zoom UI, not stills.

## 2. Reading the model

System `python3` has no `pxr`; run USD tooling through uv:

```sh
uv run --quiet --with usd-core python - <<'EOF'
from pxr import Usd, UsdGeom
s = Usd.Stage.Open('public/model/iPhone_Duo_Render.usdc')
c = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ['default', 'render'])
for p in s.Traverse():
    if p.IsA(UsdGeom.Mesh):
        b = c.ComputeWorldBound(p).ComputeAlignedRange()
        print(p.GetName(), [round(v, 3) for v in b.GetMin()], [round(v, 3) for v in b.GetSize()])
EOF
```

Units come out in metres. Scene cm = m × 100, and y is dropped by 5.8974 in
`main.ts`. Small meshes on the frame edges are buttons; a thin shell at the
same spot is the cap (two ids per edge button in `packages/shell/buttons.ts`).

### What the phone actually paints

Mesh bounds are not the silhouette: one mesh is 6.1 cm deep and paints nothing
at any pose (`PHANTOM` in `main.ts`, verified by hiding it and diffing the
buffer), and mid-fold the near half is magnified by perspective. Read the alpha
of the drawing buffer instead, and step `bend.value` yourself — the fold lives
in the vertex shader, so a CPU box never sees it.

```js
__duo.bend.value = ((180 - deg) / 180) * Math.PI
const gl = __duo.renderer.getContext()
__duo.renderer.render(__duo.scene, __duo.camera)   // same tick, or the buffer is gone
const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px)
// ... box of every pixel with alpha ≥ 8; readPixels is bottom-up
```

Measured at 37 px/cm: 16.6 × 11.8 cm flat, 16.9 wide at 170°, 14.4 tall at 90°.
Turning the view is worth far more than folding — 19.8 cm tall and 18.7 wide at
the extremes, because edge-on the near half is 8 cm closer to the camera — which
is why `frame()` fits the phone to the window rather than the window to the
phone (decisions 26).

Two false alarms, both of which cost an afternoon:

- **Measuring in the app's own window caps the reading.** A silhouette that runs
  off the window is truncated by it, so every clipped pose reports the same
  number and it looks like a constant. Measure in a window far bigger than the
  real one, with `camera.clearViewOffset()`, and flag any box that touches an
  edge as unusable.
- **The fold does not survive a frame.** The render loop rewrites `bend.value`
  from the slider every tick, so setting it and then awaiting a frame silently
  gives you 180° again. Read it back in the same tick, or pin the fold with
  `?deg=` and reload.

`.cache/debug/framecheck.mjs` is the whole check: it drives the real controls
through 24 azimuths × 15 tilts per fold, then reports the tightest clearance
against the bands and how far the phone was shrunk. Nothing should come back
negative by more than a pixel or two of antialias fringe.

```sh
bun .cache/debug/framecheck.mjs 818x664 180,120,90,0
# deg 180: tightest az15 el0 — clear l59 t63 r162 b143 ...; smallest az90 el45 at 25.8 px/cm (70%)
```

## 3. The desktop window

Clean start, always. HMR swaps modules without re-running `main.ts`, so a
window that has been open across edits has stale listeners and doubled state.

```sh
pkill -f "cargo/debug/iphoneduo"; pkill -f "tauri dev"; lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill
(nohup bun run desktop > /tmp/desktop.log 2>&1 &); sleep 45; tail -3 /tmp/desktop.log
osascript -e 'tell application "System Events" to set frontmost of first process whose name is "iphoneduo" to true'
osascript -e 'tell application "System Events" to tell process "iphoneduo" to get {position, size} of window 1'
```

**Always read the window position.** It is 818×664 and centred by Tauri, but the
menu bar shifts the centring down: a 960×760 window on the 1920×1080 desktop here
reported `480, 175`, not the 160 you would compute. Window coordinates = viewport
coordinates + that origin. A click that misses by 15 px misses the volume buttons
entirely (their hit box is 19 px tall).

```sh
# Real mouse: click, and press-hold-release. Coordinates in screen points.
cliclick c:1195,456                      # side button (644+551, 233+223): origin read, not computed
cliclick dd:1195,456 w:800 du:1195,456   # hold 800 ms → Siri
cliclick kd:cmd ... # modifiers only; for L/C/arrow keys use `cliclick t:l` (types, no hold)
# Capture the window at 2x, crop, shrink for viewing.
cap() { screencapture -x /tmp/full.png && sips -c 1328 1636 --cropOffset 446 1102 /tmp/full.png --out /tmp/$1.png >/dev/null && sips -Z 960 /tmp/$1.png >/dev/null; }
cap d1
```

`--cropOffset` is `y x` in 2x pixels: window origin × 2. Hold a chord on the
desktop with the keyboard focused in the window: `cliclick t:` cannot hold a
key, so for side+volume use the mouse on one button and a real key on the
other, or verify chords headless via `__duo.press`.

Accessibility trees (orca `get-app-state`, `list-windows`) list hidden DOM as
if visible. Trust screenshots and `st()`, not tree text. `cliclick t:` types
into whatever is frontmost; set frontmost first and click inside the window once.

## 4. Known false alarms

| Symptom | Cause |
| --- | --- |
| `waitForSelector('[data-os]')` times out at `?deg=120` | panels never appended while hidden (see 1) |
| Same at `?deg=0` or `?debug`, once | page loaded during a rebundle; rerun |
| `.vol.on` true, nothing in the screenshot | SwiftShader starved the transition; check computed opacity or use the desktop |
| Two `Camera` entries in `[data-app]` | screenshot thumbnail clone |
| `[data-app]` empty mid-fold, the app "lost" | with no app up neither panel is in the DOM off flat; CSS3DRenderer appends a panel only once it faces the camera, so the cover's copy is queryable only from where the cover shows |
| `__duo.device.wallet()` opened nothing | use the hardware path, a side double-click via `__duo.press('side', …)` twice; `.cache/debug/mirror-close2.mjs` does |
| The fold ramp missing from the panel's children | it is appended on the first frame that wants it, and React's first commit clears the container — check again a frame later, not once |
| `[data-torch]` null at `?yaw=3.1416` | same as the mid-fold case: a panel facing away is not in the DOM. Flip the torch from the front, then turn with `button[title="Flip"]` and wait for the yaw to unwind (~9 s under SwiftShader); `.cache/debug/torch.mjs` does |
| The flashlight card measures `opacity: 1` but is not in the screenshot | it holds 1.8 s and a SwiftShader screenshot takes longer than that. Stub the page's `setTimeout` for that one delay before the flip, or check the computed style and trust it |
| A `[data-os]` found but `offsetWidth` 0 | CSS3DRenderer leaves a hidden panel in the DOM as `display: none` |
| Wallet opens while typing into a field | the field never took focus, so the letters went to the frame's keys (`l` is the side button; `hello` is a double-click). Check `document.activeElement` after the click; if it is `BODY`, something cancelled the pointerdown — an `on*` handler returning `false` does, silently, and `preventDefault` never shows up in a trace |
| `[data-app]` at icon size, `getAnimations()` `running` at `t=0` for seconds | headless only: the open zoom does not tick under SwiftShader; `finish()` it before measuring or clicking |
| Side click opened Siri | the run held it > 500 ms (a screenshot in between) |
| Volume click did nothing on the desktop | window origin assumed, not read (y is 175 here) |
| `bun run desktop` → EADDRINUSE | old dev server on 3000; kill it first |
| `python3 … ModuleNotFoundError: pxr` | use `uv run --with usd-core` |
| The Control Center drag opened nothing | the pull strip is 26 px of `disp`, which is inset 11, and the projected panel is ~0.72 of CSS size: start at `rect.top + 10`, not + 6 |
| The panel's tiles look washed out at a gap | they are not; the wallpaper's own gradient is lighter there. Sample the PNG before believing a screenshot's contrast |
| A flick on the home bar split the screen instead of closing | each `page.mouse.move` is a slow CDP round trip under SwiftShader, so a gap ≥ 220 ms between moves reads as the hold; flick with one move, hold with a `wait` |
| The fold's ramp is in the DOM with the right styles but not in the picture | it is under the app: `[data-app]` is `z-index: 2` and the OS stacks up to 10, so an overlay at `z-index: auto` loses. The ramp sits at 11 |
| The whole cover is blurred under a `mask-image` that fades to nothing | Chrome ignores `mask-image` on a `backdrop-filter`'s output; cut one with `clip-path` |
| The cover looks sharp mid-fold where the bake is blurred | a live panel is over the bake; with no app up none should be (`[data-os]` empty between 1° and 179°) |
| A window that worked now runs old code: the baked clock is stale and the fold behaves like a commit ago | `git stash`/`checkout` under a running dev server reloads every open window with that tree, and the reload after `stash pop` a second later can be missed. Never swap the tree under an open window; restart it (section 3) before believing what it shows |

## 5. Open thread

Where the last session stopped: every button behaviour passes headless via
`__duo.press` and via the mouse on the side and Camera Control caps; on the
desktop, side click / hold / Camera Control were confirmed by screenshot, and
the one volume click was aimed at y = 324 with the window actually at y = 175
(so 339 was needed). Next: rerun `cliclick c:1168,337` on the desktop, capture
within a second, expect the HUD under the volume buttons.

## 6. Notes rebuild verification (2026-09-17)

The local evidence is under `.cache/debug/astra-notes/` (gitignored). With the
web server on port 3000, `bun .cache/debug/astra-notes/check.mjs after` captures
four 2× crops at an 818×664 viewport: unfolded handwriting, unfolded plain text,
folded list and folded editor. `before-*` was captured before the rebuild.
The same run asserts edits, live row titles, reload persistence, restore-to-shipped
key removal, narrow back navigation and Escape returning home. It uses an
isolated browser profile, not the user's stored notes.

`bun .cache/debug/astra-notes/integration.mjs` checks palette colour, a real
fold/open cycle, retaining the inner scene node, cover edits updating the open
inner editor, a real cross-tab storage event, and a home-bar hold/drop into the
left split followed by opening its narrow editor. Do not use a pinned `?deg=`
for the live fold test; drive the hinge slider and poll the actual angle.

The four before/after crops have zero pixels differing by more than 8/255 per
channel after excluding their top 80 image pixels (the shell's changing clock).
The two folded crops are pixel-identical in that region. Compare the actual
PNGs as well as the numeric diff. Keep source edits out of a running capture:
Bun HMR can destroy its execution context during a reload, requiring a fresh run.

These are Chromium/SwiftShader checks. The Tauri WKWebView, native GPU rendering,
and non-Mac handwriting fallbacks were not verified in this rebuild.

Production was checked separately with `production.mjs` against `dist/` served
on port 3011 by the local `serve-dist.ts`. It repeats the four captures and
behavior checks, plus mouse focus followed by real keyboard typing, an empty
string surviving reload, and Enter activating a note row. Both
`bun run typecheck` and `bun run build` passed; scoped Biome checks passed too.

## 7. Weather rebuild verification (2026-09-17)

Scratch checks and screenshots use `.cache/debug/weather-*`. `weather-check.mjs`
exercises actual Open-Meteo forecasts and Tokyo geocoding, city save/removal,
Celsius/Fahrenheit persistence, daily details, the hourly chart, Escape,
reload and folded layout. `weather-edge.mjs` checks a deliberately blocked
forecast request, retaining the last successful result, retry recovery and a
cold offline start with no fabricated readings. Geolocation callbacks are
stubbed for denied and successful permission paths; the successful London
coordinates still fetch a real forecast. These tests do not validate the
operating system's permission prompt.

`weather-production.mjs` runs against `dist/` served on port 3011, checking
keyboard focus and tab trapping, live fold/open, unit handover and cross-tab
storage. When driving the React hinge input, use the native input value setter
before dispatching an input event: assigning `input.value` normally updates
React's tracker and causes the synthetic event to be ignored. Do not finish
infinite cloud animations in headless tests; finish only finite shell animations.

The folded scene may retain a hidden inner Weather instance. Count or target
the visible display rather than assuming each weather selector occurs once.
All visual/runtime checks here are headless Chromium; native WKWebView parity
is not established. Source lint passes, but the automatic formatting hook was
inactive in this session, so the formatter check still reports pending formatting.

For Weather scrollbar checks, run `.cache/debug/weather-scrollbar.mjs`. It
launches Chrome with `ignoreDefaultArgs: ['--hide-scrollbars']`, checks the computed thumb skin,
exercises horizontal and vertical scrolling through real wheel events, and captures
`.cache/debug/weather-scrollbar.png`. The usual screenshot launch flag hides
the exact UI under test. Puppeteer also adds it by default in headless mode,
so merely omitting it from `args` is insufficient.

`weather-glass.mjs` captures the four Weather surfaces (main, locations with the
search field focused, search results, day detail) cropped to `[data-weather]` at
2x into `.cache/debug/glass-*.png`. Under SwiftShader the four 2x captures take
over five minutes; run it in the background. The Fog condition title shows a
grey square: that is Apple's 🌫️ emoji, not a missing glyph.

## 8. Monorepo migration gate (2026-09-17)

See [migration.md](platform/progress/migration.md) for commands, results and remaining review
items. Evidence files are `.cache/debug/monorepo-*`. `monorepo-check.mjs`
accepts a phase name and optional base URL; it captures home, open Notes and
closed Notes. `monorepo-serve-dist.ts` serves the production output on port 3011.
The production integration script repeats the existing Notes integration
against that origin, with a fresh isolated Chrome profile.

Run screenshot-heavy SwiftShader checks serially. The concurrent capture in
this migration stalled while native compilation was consuming CPU; stopping
that capture and rerunning the integration alone passed. A successful DOM
probe before a stalled screenshot does not mean the capture finished.

Native release verification launched `.cache/cargo/release/iphoneduo` after
stopping Tauri dev, proving assets came from the embedded production build.
The raw executable may not appear in the Codex computer-use app inventory;
Orca resolved it by process name. Inspect native screenshots as well as AX:
hidden mirrored scenes can appear in the accessibility tree. Synthetic HUD
dragging did not move the window in this session and is not a verified drag test.
The user subsequently confirmed native dragging works, closing that review item.

## 9. Stage 2 document and engine experiments

`bun scripts/checks/stage2/e0-document.mjs` builds a real Notes document with
an explicit memory-store fixture, serves installed-style `srcdoc` and dev-style
`src` frames, and asserts their probes in an isolated Chromium instance. It
also exercises actual Open-Meteo requests, denied origins, IndexedDB and Web
Locks. `--serve` leaves the harness running for the visible native recipe in
[stage-2.md](platform/progress/stage-2.md). Native builds use the separate
`com.mnismt.iphoneduo.stage2` identifier and embedded harness assets; regular
app data is not a test fixture.

The harness records `window.results`, with a `loader` discriminator, and
writes received native probe JSON into `.cache/debug/stage2/native-*.json`.
These are experiment probes, not new shell `data-*` hooks. The memory-store
fixture deliberately cannot establish persistence or bridge acceptance.

`bun scripts/checks/stage2/m-permissions.mjs` runs the feature portion of M
using Chromium's fake media device and mocked geolocation. A failed declared
camera result is a real API refusal, not missing headless hardware. Photos and
the host permission gate require the integrated runtime and are separate.

The first native harness capture appeared black because default black text
was drawn over a transparent window, with the Notes frames below a long
results block. The harness now uses an opaque background and collapsed
results. Inspect screenshots after the view settles; an immediate screenshot
after a synthetic scroll can contain only partial composited layers. A
successful accessibility probe alone does not establish the captured pixels.

## 10. Stage 2 integrated MVP checks

Prepare local archives with `bun scripts/package-platform.ts .cache/platform-packages/final`
when absent, then run `bun run build` and `bun scripts/checks/stage2/mvp.mjs`. The script copies
Fold Compass outside the repository, builds with public SDK/kit imports, serves
the frozen simulator on 3111 and a separate app catalog on 3112, and drives
real Store GET/OPEN. It checks isolation, app-private persistence, 180/120/0
degree SDK layouts, stable frame IDs and relaunch. It hashes every simulator
dist file before the separate build and after install/fold/reload. Evidence and
pixels live under `.cache/debug/stage2/mvp/`. Inspect the three fold captures;
partial clipping at 120 degrees is the real folded device, not a layout failure.
`--serve` leaves both servers running for native UI verification.

`bun scripts/checks/stage2/runtime.mjs` exercises the real host with probe apps:
policy tampering, migration, quota abort, owner and nonowner commands, handover,
trial activation/restoration, two-tab removal and old-generation rejection
after reinstall. These fixture-only update calls verify retained safeguards.
Stage 3's Store workflow separately verifies the subsequently enabled entry points.

`bun scripts/checks/stage2/notes.mjs` and `weather.mjs` use the real shell on
port 3110 (`PORT=3110 bun run dev`). Notes verifies SDK edits/reload; Weather
checks one owner fetch across two views, command refresh and denied network.
Sandbox frames expose `data-view`, `data-session`, `data-generation`,
`data-state` and `data-owner` for test observation. Puppeteer frame evaluation
is privileged test inspection, not an API available to an installed app.

Both display roots must already be in CSS3DRenderer's camera container when
iframes load. A detached hidden cover never connected; moving it from body
into the renderer on its first visible frame reloaded it. Checking only
`ready` at 180 degrees misses this failure; assert unchanged view IDs after
folding through the cover transition.

Stage-5 development probes need a viewport that keeps every iframe onscreen.
Cross-origin frames below the viewport may suspend requestAnimationFrame, so
an app that calls ready after its first paint can time out in an undersized
test harness. This is separate from parallel SwiftShader contention; neither
justifies weakening the host deadline. Select frames by `data-view`, not by
Puppeteer's frame-list order. Maps' blank external embed was present in both
the frozen pre-migration baseline and final headless captures.

MVP checks consume `.cache/platform-packages/final/artifacts.json` (override with
`PLATFORM_ARTIFACTS`) in the external test project. A naked temporary source
folder can make Bun resolve React from its global cache without transitive
dependencies. Installing the prepared archives first verifies the actual
developer setup and avoids relying on that cache fallback.
