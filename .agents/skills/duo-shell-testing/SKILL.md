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

## Persistence surface

Prefs live under `os.*` localStorage keys: `os.view` (deg/yaw/az/pol/dist/spin, gestures only - HUD slider/buttons, orbit 'change' debounced 300 ms past damping, spin checkbox), `os.toggles`, `os.level`, `os.bright`. `?deg=`/`?yaw=`/`?spin=` and postMessage poses win over saved values and never write. Erase All Content and Settings (Settings -> General -> Transfer or Reset iPhone -> Erase All Content and Settings -> Erase iPhone Duo) wipes `os.*`/`duo.*` keys + IndexedDB and reloads. Embed test: a parent on another localhost port passes the `local()` origin check - iframe `localhost:3000/?debug` from e.g. a `python3 -m http.server` page and `contentWindow.postMessage({deg, yaw}, 'http://localhost:3000')`.
