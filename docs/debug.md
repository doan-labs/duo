# Debugging

Use headless Chromium/Puppeteer for routine behavior and screenshots; use visible Tauri
for native integration, window behavior, WebKit/GPU differences or an explicit request.
Assert state, then inspect pixels. Chromium results do not establish native parity.
[The review guide](platform/review.md) owns platform commands and measured coverage.

## 0. Ground rules

1. Use isolated test storage, never the user's saved data. Native store isolation needs
   an explicit WebKit dataStoreIdentifier; a different Tauri identifier alone is insufficient.
2. Keep scratch scripts in `.cache/debug/` so repository dependencies resolve. Cache scripts
   and captures are local conveniences, not committed fixtures guaranteed on a fresh clone.
3. Freeze source while loading/capturing. Restart task-owned processes after relevant HMR
   or checkout changes; do not terminate unrelated listeners to free a port.
4. Run heavy SwiftShader checks serially. Keep preview iframes onscreen so first-paint
   callbacks run. Rerun overloaded failures alone; never extend safety deadlines to pass.
5. Record the tested runtime and limits. Wait ≥1 s for unlock (420 ms animation); side-click
   handling includes a 300 ms double-click window. Inspect screenshots after compositing settles.

- **`Encountered two children with the same key` on a `/kit/Nav` pop is not
  the site's.** `packages/uikit/nav.tsx` calls `setLeaving` inside the
  `setStack` updater; React dev double-invokes updaters, so the leaving entry
  is queued twice. It is a dev-only warning in the kit, seen wherever `Nav`
  pops under a development build.

## 1. Headless Chrome

Start `bun run dev` on a free port. For a quick capture:
`bun scripts/shot.ts <url> <out.png>`. For interaction, save this as `.cache/debug/run.mjs`
and run it with Bun. Puppeteer creates a temporary profile by default.

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

Use identical state/viewports before and after a change. 818×664 matches the native window;
use deviceScaleFactor 2 for detail and crop rather than shrink. Baselines use
`?debug&app=Notes&deg=180` and `deg=0`; use 120 for clipping. Live fold tests must omit the
pinned `deg` parameter and drive the hinge control. `CHROME_BIN` selects Chrome in platform checks.

### The state probe

StyleX classes are unstable; use shell data attributes:

| Area | Selectors/state |
| --- | --- |
| Display/app | data-os; data-app; data-side=left/right; data-lock/data-hidden; data-pages |
| HUD/hardware | data-hud=vol/thumb/poff/flash/torch/cc/dim/orbit; data-on; data-torch; data-boot |
| Control Center | data-cc; data-cc-slider=bright/volume; data-cc-pull; data-cc-page=0/1/2 |
| Split | data-drop=left/right/none |
| Sandbox | data-view/session/generation/state/owner; select frames by data-view, never frame-list order |

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

Visible display offsetWidth is 790 inner / 387 cover; hidden panels may report 0.
StyleX sets width through classes, not inline style. Both roots stay attached, so check
computed display/opacity/clip and SDK visibility rather than DOM presence. A screenshot
thumbnail clones the display and can double data-app matches.

For fold continuity, mark nodes/view IDs and assert identity through close/open. Poll the
actual bend angle instead of fixed waits; SwiftShader may need ~10 s. Do not reparent a
frame to expose it: that reloads the document. Puppeteer frame evaluation is privileged
test inspection, not an installed-app capability.

### Gestures and focus

| Action | Probe |
| --- | --- |
| Open Control Center | At flat yaw 0, drag from display rect.right−60, rect.top+10 down ~190 px; wait ≥1.5 s |
| Split | Mouse down at app centre/display bottom−8; move up, hold 1.5 s for slow rendering, move to half, release |
| Flick home | Use one move without a pause; slow CDP calls can cross the 220 ms split threshold |
| Reset orbit | Click button[title="Reset view"]; allow ~8 s under SwiftShader before asserting orbit data-on is gone |
| Type | Click/focus the actual field, check document.activeElement, then type/paste; AX set-value may not trigger React |

For scripted React range changes, use the native input value setter before dispatching
input; direct assignment can update React's tracker without notifying its handler.
For layout checks, finish only finite shell animations, never infinite app animations.
Control Center child paths, when needed: + `[1,0,0,0,0]`, power `[1,0,0,0,1]`, rail
`[1,0,1,i]`, grid `[1,0,0,1,0,0,0,n]` (tile child 0, minus child 1), radio
`[1,0,0,1,0,0,0,0,0,j]`; recheck against current DOM before relying on them.

### Pressing buttons

Exercise both logic and hardware hit testing:

```js
// Logic path: skips the raycast, exercises device-buttons.ts and device.
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

Do not capture between mouse-down and mouse-up: a 0.3–6 s screenshot turns a click into
a hold. Recompute projected coordinates after orbit, fit-band or hit-box changes. At default
818×664/yaw 0 only: side (644,234), Camera Control (642,390), volume up/down (547,75)/(497,75).

## 2. Reading the model

Use USD tooling when system Python lacks pxr:

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

Model units are metres; scene units are centimetres with y offset −5.8974. Mesh bounds are
not the rendered silhouette: the invisible PHANTOM proxy is 6.1 cm deep, and the vertex
shader fold is absent from CPU bounds. Measure alpha in the drawing buffer:

```js
__duo.bend.value = ((180 - deg) / 180) * Math.PI
const gl = __duo.renderer.getContext()
__duo.renderer.render(__duo.scene, __duo.camera)   // same tick, or the buffer is gone
const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px)
// ... box of every pixel with alpha ≥ 8; readPixels is bottom-up
```

Render/read in the same tick: the render loop otherwise overwrites bend.value. Use a large
viewport with camera.clearViewOffset(), reject edge-touching bounds, and account for
bottom-up pixels. At 37 px/cm, measured bounds were 16.6×11.8 cm flat, 16.9 cm wide at 170°
and 14.4 cm tall at 90°; orbit extremes reached 19.8 cm tall/18.7 cm wide.

If available locally, `bun .cache/debug/framecheck.mjs 818x664 180,120,90,0` sweeps 24 azimuths
×15 tilts per pose. Otherwise reproduce that sweep with the probe above. Check clearance
against all HUD bands; tolerate only 1–2 px antialias fringe. Changing bands must not clip
the device or silently reduce its intended face-on scale.

## 3. The desktop window

Start `bun run desktop`, wait for the actual window, and read its position before input:

```sh
osascript -e 'tell application "System Events" to set frontmost of first process whose name is "iphoneduo" to true'
osascript -e 'tell application "System Events" to tell process "iphoneduo" to get {position, size} of window 1'
screencapture -x /tmp/duo-screen.png
```

Screen points = viewport coordinates + measured window origin. Do not infer origin from
centring: menu bars shift it. Use real pointer events for dragging; synthetic AX drags
were inconclusive. Focus the app and field before input. `cliclick t:` types but cannot
hold ordinary keys; use a real key plus mouse for chords, or test logic via __duo.press.

For a 2× capture, sips cropOffset is y,x in doubled pixels; scale the measured origin and
window size accordingly. AX trees include hidden mirrored DOM, so inspect screenshots
and state. Recompute click coordinates after pose changes to avoid orbiting the canvas.

Native persistence tests use the copied harness crate with an explicit dataStoreIdentifier
(macOS 14+); restart the same binary to reuse that test store. Production storage is unchanged.
The Tauri config generator/adapter workaround and bounded native coverage are in
[the review guide](platform/review.md#verification-scope-and-limits).

## Known false alarms

| Symptom | Check / correction |
| --- | --- |
| Timeout during load | Source may have rebundled; rerun against stable output. For ready failures, check SwiftShader contention and offscreen frames |
| Hidden root or app seems absent | Roots stay attached; inspect display/clip/opacity, readiness and the intended view |
| HUD missing from screenshot | Transient lifetime may be shorter than capture; inspect computed opacity, then verify on native GPU |
| Wallet opens while typing | Field lacks focus; frame shortcuts received the text |
| App stays at icon size | SwiftShader stalled finite launch animation; finish it before layout measurement |
| Side click opens Siri | Input lasted >500 ms; never screenshot during the press |
| Desktop input misses / EADDRINUSE | Measure window origin / identify listener ownership before restarting |
| Ramp missing or behind content | Wait for its first render; ramp z-index is 11, OS layers ≤10 |
| Cover fully blurred under a fading mask | Chromium does not taper backdrop-filter output with mask-image; use clipped layers |
| Cover looks sharp mid-fold | Check whether live DOM incorrectly overlays the bake; attached does not mean visible |
| Control Center drag does nothing | Account for panel inset/projection; start near rect.top+10 |
| Tiles appear washed out | Compare source pixels; wallpaper gradients affect perceived contrast |
| Scrollbar skin absent | Use ignoreDefaultArgs: ['--hide-scrollbars']; Puppeteer adds hiding even when omitted from args |
| Camera cannot shoot headless | No videoWidth without a webcam; test fallback/UI, not real still capture |
| Gallery navigation has wrong colors | Apply the app token theme to its root, not only background color |
| Old code after checkout/stash/HMR | Restart the task-owned test window/server before trusting results |

## Platform checks

[The review recipe](platform/review.md) prepares private archives and lists complete commands.
Use committed scripts, not assumed cache files:

| Check | Purpose / prerequisite |
| --- | --- |
| `bun scripts/check-platform.ts` | Local/CI types, SDK, API freshness, token/import checks, builds and gallery |
| `bun scripts/checks/stage2/mvp.mjs` | Frozen simulator + external catalog; GET/OPEN, isolation, fold/persist and unchanged dist hashes; build first, supply PLATFORM_ARTIFACTS |
| `bun scripts/checks/stage2/runtime.mjs` | Adversarial bridge/storage/lifecycle matrix |
| `bun scripts/checks/stage3/workflow.mjs` | Public external-package and real Store lifecycle flow |
| `bun scripts/checks/stage3/development.mjs` | Verified preview bytes, namespace isolation and teardown |
| `bun scripts/checks/stage4/apps.mjs <tag> [App names...]` | Both-width app captures; APP_DIST freezes baseline, APP_PORT avoids conflicts |
| `bun scripts/checks/stage2/notes.mjs` / `weather.mjs` | Real shell on port 3110: edits/reload; owner refresh/network denial |
| `bun scripts/checks/stage2/e0-document.mjs` | Builder/src/srcdoc engine probe with a memory-store fixture; cannot prove persistence or integrated bridge authority |
| `bun scripts/checks/stage2/m-permissions.mjs` | Mocked geolocation/fake-device feature probe; not actual native consent or integrated photos verification |

MVP `--serve` leaves its servers running for native checks. Inspect 180/120/0 captures;
partial clipping at 120° is expected. Gallery tests need no model; full simulator tests do.
Install archives into external fixtures before checking them, avoiding accidental global
Bun cache resolution. The default archive manifest is `.cache/platform-packages/final/artifacts.json`;
override with PLATFORM_ARTIFACTS and use a fresh directory when repacking unchanged versions.

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
## 11. Website verification (2026-09-18)

`bun packages/web/scripts/check.mjs [url]` is the committed check for
`packages/web`: thirteen routes at 1440, 820 and 390 px, in light and dark, page and console errors,
horizontal overflow, the nav's desktop list versus mobile `<details>` menu,
tables and code on the platform docs, every internal link, and a nav click
that routes without a document reload. It blocks the simulator frame so a
missing shell server cannot fail the site. Screenshots land in
`.cache/debug/web/<route>-<width>.png`. Run it against the dev server
(`bun run dev` in `packages/web`, port 3001) and against the static build
(`.cache/debug/web/serve-dist.ts` serves `dist/client` on 3011, mapping a
directory to its `index.html` like a file host).

`.cache/debug/web/embed.mjs` is the one check that lets the frame load: on the
production Simulator page it waits for `[data-os]` inside the frame, prints the
shell's state, and clicks the site's Closed button, expecting the frame's `src`
to carry `deg=0`. Under SwiftShader the shell takes 20 to 60 s to reach
`[data-os]`; that is the model and textures, not a fault. The frame is
`iframe[title="Duo simulator"]` (or `Duo running <app>`); use `contentFrame()` and the probes
from section 1 inside it.

False alarm: `FAIL link /device/...` from an older check meant the link
crawler followed the "Open full size" link into the copied shell, which has no
`h1`; the crawler now skips `/device`.

False alarm: the embedded Store on a black screen reading "Preinstalled
catalog unavailable. Reload to retry." is not a runtime fault. The shell fetches
`/cdn/index.json` and `/preinstalled/index.json` from the origin root, so the
site build must copy both directories out of `dist/` beside `/model` and
`/icons` (`packages/web/scripts/simulator.ts` does). "Loading apps…" for a few
seconds after that is the registry seeding Notes and Weather; a screenshot
taken before it ends shows the same black screen.
