---
name: duo-shell-testing
description: How to drive and assert the Duo simulator shell (packages/shell) with agent-browser — headed WebGL workarounds, ?debug hooks, the CSS3D-transformed displays, Control Center and Settings UI paths, and the embed/pose bridge. Use when testing the shell's UI, gestures, persistence or embed behavior end to end.
---

# Testing the Duo shell with agent-browser

Serve with `bun run dev` at the repo root (http://localhost:3000/). Load `?debug` for `window.__duo = { bend, phone, renderer, scene, camera, controls, screens, press, device }`; `document.body.dataset.ready` marks first paint.

## Headed WebGL (needed for screen recordings)

`agent-browser open --headed` fails here with `THREE.WebGLRenderer: Error creating WebGL context`. Headless gets WebGL via SwiftShader but renders nothing on the desktop to record. For a visible window:

```sh
CHROME=$HOME/.agent-browser/browsers/chrome-*/chrome
"$CHROME" --remote-debugging-port=9222 --user-data-dir=/tmp/duo-chrome \
  --use-angle=swiftshader --enable-unsafe-swiftshader \
  --no-first-run --window-size=1600,1200 --start-maximized &
export AGENT_BROWSER_SESSION=<name>
agent-browser connect 9222
```

`wmctrl -r '<title>' -b add,maximized_vert,maximized_horz` maximizes before recording.

## Driving the 3D-transformed displays

- The phone's DOM panels are CSS3D objects: `getBoundingClientRect()` returns 0x0 on `[data-cc-pull]`, `[data-os]` and tiles. Locate click targets by scanning `document.elementFromPoint(x, y)` over the projected area; tag an element with a marker attribute and scan for `el.closest('[data-mark]')` to find its on-screen extent.
- Elements are only hit-testable when that display faces the camera — after a Flip or saved yaw, the live panel may face away; reset the view first.
- Control Center: `pointerdown` on `[data-cc-pull]` (top 26 px of a display), then drag down > ~49 screen px (swipe() commits past 0.35 of 140 px, or a flick). Works on the lock screen too.
- Frame buttons have keys (`KEYS` in buttons.ts): `ArrowUp`/`ArrowDown` = volume up/down, `l` = side, `c` = camera — real gesture path for `device.volume()`/`device.setLevel()`.
- CC sliders (`[data-cc-slider="bright"|"volume"]`) are vertical drags relative to grab point, value = v0 + (y0 - y)/rect.height.
- `agent-browser eval` shares one JS context per page — `const` redeclarations collide across calls; wrap probes in an IIFE.
- `agent-browser frame` does not reliably switch eval context for cross-origin iframes. To read a same-origin iframe's localStorage, open a second tab on that origin — storage is shared.

## Probing baked-app DOM (Health, Fitness, Settings...)

- Baked apps render same-document inside `div[data-app="<name>"]` under each `div[data-os="wide"|"narrow"]` - unlike sandboxed apps, top-doc `eval` and `querySelector` reach them. `data-app` also tags the home-screen tile, so pick the element that contains the app's `nav` (e.g. `nav[aria-label="Health"]`), not index 0. Both displays mount a copy; when folded the idle display is `display:none`.
- Row/cell labels are often bare text nodes inside elements that have icon/detail children, so leaf-only text searches miss them. Match a direct text node instead: `[...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim() === '<text>')`.
- `getBoundingClientRect` inside the CSS3D panel returns projected rects that do not preserve top/bottom order - do not measure sibling gaps from rects. Assert `getComputedStyle` values (paddingTop/marginTop/gap/borderRadius) and verify visually from screenshots; for click coordinates, scan `elementFromPoint` for the element tagged with a `data-mark` attribute.
- A live "before/after" comparison needs no second build: set `el.style.<prop>` to the pre-change value (e.g. `marginTop = '0px'`, `borderRadius = '12px'`), screenshot, then `removeProperty` to restore - the old rendering is reproduced exactly for pure-CSS changes.
- `agent-browser scroll` does not reach an app's own scroll region: set `scrollTop` on the scrollable div via `eval` (find it with `scrollHeight > clientHeight`), or send a real wheel over that region.

## Persistence surface

Prefs live under `os.*` localStorage keys: `os.view` (deg/yaw/az/pol/dist/spin, gestures only - HUD slider/buttons, orbit 'change' debounced 300 ms past damping, spin checkbox), `os.toggles`, `os.level`, `os.bright`. `?deg=`/`?yaw=`/`?spin=` and postMessage poses win over saved values and never write. Erase All Content and Settings (Settings -> General -> Transfer or Reset iPhone -> Erase All Content and Settings -> Erase iPhone Duo) wipes `os.*`/`duo.*` keys + IndexedDB and reloads. Embed test: a parent on another localhost port passes the `local()` origin check - iframe `localhost:3000/?debug` from e.g. a `python3 -m http.server` page and `contentWindow.postMessage({deg, yaw}, 'http://localhost:3000')`.

## Testing sandboxed apps inside the displays

Apps run as `iframe srcdoc` inside each `[data-os="wide"|"narrow"]` display panel, sandboxed with only `allow-scripts` (opaque origin). The parent's `eval`/`elementFromPoint` cannot read their DOM.

- `agent-browser snapshot -i` DOES penetrate the sandboxed srcdoc iframes: every app control gets an `@eN` ref, and `agent-browser click @eN` dispatches the click inside the iframe correctly through the CSS3D transform. `agent-browser fill @eN "text"` types into fields; `agent-browser type "x"` treats `x` as a selector (fails) - use `fill`.
- The `-i` snapshot hides non-interactive text (comment bodies, empty states, section caps). Always pair with a screenshot for pixel proof.
- Real-mouse clicks via the computer tool also work through the CSS3D transform - use them for content regions the a11y tree covers or where a click is refused ("Element is covered by ...").
- `agent-browser scroll` does not scroll the app's inner scroll containers; use the mouse wheel over that region instead.
- To read app internals, attach to the `about:srcdoc` iframe targets over CDP (`Target.attachToTarget` + `Runtime.evaluate` on :9222). Top-doc `eval` cannot pierce the opaque origin.
- After rebuilding an app (`bun scripts/build-app.ts` or `bun ./build.ts`), the installed record may still pin the old release as `current` while the new one sits as an un-promoted `candidate` - verify the loaded bundle via the iframe's `srcdoc` sha256 vs `dist/preinstalled/apps/<id>/<release>/app.html`, and clear IndexedDB + `os.*`/`duo.*` to force a reinstall when the test needs the new release.

## Two-display session model (wide + cover)

Both displays run the same app session as separate views on one set of iframes. Each iframe carries `data-os` (`wide`/`narrow`), `data-owner` (`1` on the session owner), `data-state` (`connecting`/`connected`/`ready`), `data-generation`.

- The hidden/unfacing display's view can hold `owner="1"` while staying `connected` (never `ready`) - at `deg=180` the cover copy often grabs ownership first. The visible view is then a non-owner mirror, so `useSyncExternalStore`/`useJSON` fallbacks on the mirror must return STABLE objects: the news app shipped a `comments.get(id) || { loading: true }` literal that read as a changed snapshot on every call, looped re-renders, and unmounted the React root (React error #185) - permanent white blank on the wide display only.
- Diagnose inside the opaque srcdoc iframe: element stays alive (srcdoc intact, `data-state` still `ready`, no shell "Try again" sheet) while `body.childElementCount` drops to 1 (mount div gone) = in-app React fatal. A shell view-revoke instead removes the iframe element and shows the black error sheet. Inject `error`/`unhandledrejection` listeners writing to `window.__err` BEFORE the repro to capture the exception; or attach over CDP and read `window` state after.
- `?app=<id>` auto-launches the app only on the inner display. At `deg=0` the cover shows the lock/wallpaper screen - tap the display once to wake/unlock and reveal the running app.
- `device.wake()` is bound to `pointerdown` on the top document; `agent-browser click @eN` does NOT fire it (no top-doc pointerdown). Real-mouse clicks do.
- `os.open('Safari', url)` from an app launches the real sim Safari app on that display's slot (full URL bar + live external page). The host remounts the slot's iframe - a JS expando on the old element is lost, which is how an app-switch remount differs from an in-place reload.

## Fold-motion tests (foldMotion uniform, decisions.md 95)

The fold blur/darken exists only while the hinge is moving (+250ms debounce, ~300ms fade); at rest the live DOM panels take whatever faces the camera. To observe it:

- `?deg=N` loads ALREADY SETTLED (angle==target at boot) - use it for settled-state proof only. Drive `input[aria-label="Hinge angle"]` for motion: set `.value` via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set` + dispatch `input` (React's onChange).
- DOM oracle for the fold effect: `ramp()` appends layer divs inside the `[data-os]` roots - `display:'block'` + backdrop-filter while the effect is on, `display:'none'` at rest. Stale `backdrop-filter`/`background` values persist on hidden layers - assert on `style.display`, never on the filter value. `__duo.bend.value` is the eased angle in rad (deg = 180 - bend*180/PI); during no-app motion both `[data-os]` panels get `display:'none'`.
- Mid-motion screenshots: eased travel is ~1s for big jumps - a screenshot right after driving the slider usually lands mid-travel. More reliable: real-mouse `left_mouse_down` on the HUD slider knob, stepwise `mouse_move`, screenshot while the button is still held (motion persists through the drag), then `left_mouse_up`.
- Order constraint: an open app keeps `innerLive` visible through the whole fold and blacks the bakes, so the blur band never appears - capture no-app mid-motion blur BEFORE launching any app.
- The cover panel's `pointerEvents` only turn on at angle<1 - wait for a full settle to 0 before tapping the cover; at held mid angles the cover may be visible but is scenery.

## Page-to-screen coordinate mapping (computer tool)

The computer tool's 1024x768 space covers the whole display; agent-browser/eval coords are page CSS px. Map: `computer_x = page_x * (1024/display_w)` and `computer_y = (page_y + browser_chrome_px) * (768/display_h)`. On a 1600x1200 display with a maximized window this is x*0.64 and (y+143)*0.64 - the 143px is tab strip + omnibox + any infobar, and changes if the infobar closes. Calibrate before gestures: `getBoundingClientRect()` on `input[aria-label="Hinge angle"]` (plain DOM, real rect) and compare with where a real click/drag actually lands on the track.
