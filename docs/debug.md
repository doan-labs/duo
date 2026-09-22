# Debugging

Use the `agent-browser` CLI (`.agents/skills/agent-browser`, `agent-browser skills get core`)
for routine behavior and screenshots; use visible Tauri for native integration, window
behavior, WebKit/GPU differences or an explicit request. No other browser driver without
being asked for one. Assert state, then inspect pixels. Chromium results do not establish
native parity.
[The review guide](platform/review.md) owns platform commands and measured coverage.

## 0. Ground rules

For the built browser builder, run `bun scripts/check-builder.mjs <site-url>/build`.
It uses agent-browser, isolated storage and fake streamed provider replies. Inspect captures
under `.cache/debug/builder/`. This verifies real compilation/preview but not a paid provider
call. Stop other task-owned simulator sessions before heavy render tests. Nested iframe
buttons need fresh frame snapshot refs; the CLI's page-level eval can still target the top
page after frame selection. Scroll a nested panel's control into view before clicking.
Mobile builder tabs use opacity and inert input handling rather than display/visibility
hiding: Chromium can suspend a hidden iframe's startup paint callbacks. Verify a fresh
mobile reload on the Chat tab as well as switching tabs after a desktop launch.

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

## 1. The browser

Start `bun run dev` on a free port, then drive the page with `agent-browser`. Load
`agent-browser skills get core` first: the CLI serves the workflow that matches the
installed version, so the commands here would go stale and are deliberately absent.
The shell needs a WebGL context, so use a real Chrome window rather than a software
rasterizer whenever the capture is about pixels.

Use identical state/viewports before and after a change. 818×664 matches the native window;
use deviceScaleFactor 2 for detail and crop rather than shrink. Baselines use
`?debug&app=Notes&deg=180` and `deg=0`; use 120 for clipping. Live fold tests must omit the
pinned `deg` parameter and drive the hinge control.

### The state probe

StyleX classes are unstable; use shell data attributes:

| Area | Selectors/state |
| --- | --- |
| Display/app | data-os=wide/narrow; data-app; data-side=left/right; data-lock/data-hidden; data-pages; data-homebar; data-drop=left/right/none while an app is on a finger |
| HUD/hardware | data-hud=vol/thumb/poff/flash/torch/cc/dim; data-on; data-torch; data-boot |
| Control Center | data-cc; data-cc-slider=bright/volume; data-cc-pull; data-cc-page=0/1/2 |
| Split | data-drop=left/right/none |
| Home grid | data-tile; data-cell=left:i/right:i; data-folder, data-folder-well while a folder is open; data-wallpapers, data-paper, data-on for the sheet; `localStorage['os.home']`, `['os.wallpaper']` |
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
frame to expose it: that reloads the document. Evaluating script inside a frame from the
driver is privileged test inspection, not an installed-app capability.

### Gestures and focus

| Action | Probe |
| --- | --- |
| Open Control Center | At flat yaw 0, drag from display rect.right−60, rect.top+10 down ~190 px; wait ≥1.5 s |
| Split | Mouse down at app centre/display bottom−8; move up, hold 1.5 s for slow rendering, move to half, release. Send no zero-motion moves during the hold: each move resets the 220 ms timer |
| App switcher | Same, but release without a sideways move; `[data-switcher]` is on the display and every mounted `[data-app]` carries a `scale(0.56)` transform |
| Divider | `[data-divider]` exists only with two halves on the glass; drag it and read the halves' `offsetWidth` |
| Flick home | Use one move without a pause; slow CDP calls can cross the 220 ms split threshold |
| Reset orbit | Click button[title="Reset view"]; allow ~8 s under SwiftShader before asserting the button is disabled again |
| Type | Click/focus the actual field, check document.activeElement, then type/paste; AX set-value may not trigger React |
| Touch drag or tap inside the embedded shell | No CLI path reaches it: `agent-browser frame @eN` then `eval` still targets the top page. Attach to the page target, `Runtime.enable`, and evaluate against the child frame's `executionContextId` (the shell is a context, not a target: same site, different port), then drive gestures with `Input.synthesizeScrollGesture` or `Input.dispatchTouchEvent` on the page session |

For scripted React range changes, use the native input value setter before dispatching
input; direct assignment can update React's tracker without notifying its handler.
For layout checks, finish only finite shell animations, never infinite app animations.
Safari's URL pill is covered by a real embedded-page scroll check: select the visible Safari app,
scroll inside `iframe[title="Page"]` down to assert the compact pill (`scale(.72)`, a px
`max-width` hugging the host), then up to assert the expanded pill (`max-width: 100%`). The Duo
site sends the direction through its `duo-safari-scroll` parent message because the iframe is
cross-origin. A mouse wheel over the device orbits the camera rather than scrolling the page;
to drive the pill from the top page, dispatch that message yourself as a `MessageEvent` whose
`source` is the frame's `contentWindow` and whose `origin` is the frame's. To inspect the
motion, pause the row's `document.getAnimations()` and step `currentTime` between captures.
Test a second external site only for navigation and interaction; without the bridge, its
private scroll cannot drive Safari chrome.
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
818×664/yaw 0 only: side (720,237), Camera Control (718,396), volume up/down (621,75)/(570,75).

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
and 14.4 cm tall at 90°; orbit extremes reached 19.8 cm tall/18.7 cm wide. `SWEEP` in main.ts
rounds the fold's own extremes up to 17×14.9 cm, which is what the fit's ceiling holds: a
frame roomier than that keeps one size through the whole fold, and the readout to check it
is `__duo.camera.fov`, constant across the slider.

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

`Invalid media query syntax` after repeated StyleX compilations can be Bun's FTL
optimizer bug, not invalid CSS ([Bun #41609](https://github.com/oven-sh/bun/issues/41609)).
The full Linux build reproduces it; `BUN_JSC_useFTLJIT=false` fixes that reproduction.
`bun run build` and CI set this flag. For direct platform verification, use
`BUN_JSC_useFTLJIT=false bun scripts/check-platform.ts`.

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
| Scrollbar skin absent | Some drivers pass `--hide-scrollbars` by default; launch the browser without it |
| Camera cannot shoot headless | No videoWidth without a webcam; test fallback/UI, not real still capture |
| Gallery navigation has wrong colors | Apply the app token theme to its root, not only background color |
| Old code after checkout/stash/HMR | Restart the task-owned test window/server before trusting results |
| A `touch-action` change has no effect | Chromium computes touch-action regions at paint, so restyling a live element leaves the old region swallowing gestures. Reload the frame or restart the shell for a fresh document before trusting any touch measurement |
| A gesture over an embedded frame moves nothing | Hand-rolled `Input.dispatchTouchEvent` does not hit-test into frames and reports a silent zero for every point over one. Use `Input.synthesizeScrollGesture`, which goes through the real gesture pipeline |
| A clean console that should not be | `agent-browser console` does not record `console.error`. Register a shim as an init script before the first navigation, and do not truncate each entry: React's hydration diff, the part that names the element, comes after several hundred characters of boilerplate |
| A hydration mismatch in a component that looks correct | `useReducedMotion()` is `null` on the server and a boolean on the first client render, so anything gated on it (a prop, a class, an `initial` pose, a branch of the tree) changes the markup between the two. `?? false` does not help: the divergence is server-`null` against client-`true`. Note also that a component returning `children` unwrapped on one path shifts the React tree depth, which desynchronises every `useId` below it and surfaces in the component that called `useId`, not in the one that branched |

## Platform checks

[The review recipe](platform/review.md) prepares private archives and lists complete commands.
Use committed scripts, not assumed cache files:

| Check | Purpose / prerequisite |
| --- | --- |
| `bun scripts/check-platform.ts` | Local/CI types, SDK, API freshness, token/import checks and the build |
| `bun scripts/checks/stage4/validation.mjs` | App source boundaries and strict typecheck through the CLI validator |
| `bun scripts/checks/stage4/packages.mjs` | External consumption of the private SDK/kit/CLI archives |
| `bun scripts/checks/submission/negatives.mjs` | Invalid submissions fail the gate for the stated reason |
| `bun scripts/checks/publish/publisher.mjs` | Publisher behaviors on a scratch catalog tree |

These are static and build-level checks. The committed headless-Chromium suite
(the stage2/stage3/stage4 drivers, the store catalog-switching check and the submission
runtime probe) was removed with its browser driver. Runtime behavior - Store install and
launch, the bridge and storage matrix, preview teardown, fold captures, permission
prompts - is now walked with `agent-browser` against a running shell, and those passes
are not committed gates.

Install archives into external fixtures before checking them, avoiding accidental global
Bun cache resolution. The default archive manifest is `.cache/platform-packages/final/artifacts.json`;
override with PLATFORM_ARTIFACTS and use a fresh directory when repacking unchanged versions.

Full native permission/background-media/update-recovery parity and exhaustive app interactions
remain unverified. Keep these limits explicit; successful builds or Chromium screenshots do
not close them. No progress/archive documentation directories are maintained.

## Website verification (2026-09-18)

Community catalog visibility has two deployment boundaries. A green `Publish catalog /
publish` job proves that `origin/catalog` contains the release; it does not prove that the
static site has rebuilt. The same workflow should create a `chore(web): redeploy catalog`
commit on `main`. Verify that commit and then inspect `/catalog/index.json` and `/apps` for
the release ID. If the branch is current but the site is stale, the failure is in the web
deployment trigger or hosting propagation, not submission validation.

The shared docs/UI-kit sidebar uses `data-lenis-prevent` so wheel and touch
input scroll its overflow instead of the page's Lenis controller. At desktop
width, wheel over the component links and verify the aside's `scrollTop`
increases while the page stays still; also check page scrolling outside it.
Its thin, transparent-track scrollbar uses theme tokens and gains contrast on
hover or keyboard focus. Check both light and dark themes with scrollbars visible.

There is no general committed website check: it was removed with its browser
driver. What it covered is the list to walk with `agent-browser` instead:
fourteen routes at 1440, 820 and 390 px, in light and dark, page and console
errors, horizontal overflow, the nav's desktop list versus mobile `<details>`
menu, tables and code on the platform docs, every internal link, and a nav
click that routes without a document reload. Block the simulator frame for
those passes so a missing shell server cannot fail the site, and run them
against the dev server (`bun run dev` in `packages/web`, port 3001) and the
static build (`dist/client` served on 3011, mapping a directory to its
`index.html` like a file host).

The removed website scripts described earlier layout checks. Current verification uses
agent-browser, including the committed builder check
above. `/simulator` now redirects to `/build`; its phone stays mounted while folding.
Use fresh frame snapshot refs to enter `iframe[title="Duo simulator"]`, inspect shell
state, and operate the fold control. Under SwiftShader the shell can take 20 to 60 s
to reach `[data-os]`; model and texture startup is separate from app readiness.

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
