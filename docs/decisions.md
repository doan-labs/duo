# Decisions

One entry per choice that shapes the code: what, why, cost. Status is
`accepted` until superseded; then link the newer entry. Newest last.

## 1. Bun for everything on the web side
2026-09-12, accepted. Runtime, bundler, dev server. One tool, HTML entry, no
config. Cost: Bun ships `.glsl` files as URLs, so shaders are TS strings; and
HMR swaps modules without re-running `main.ts` (see working.md, Limitations).

## 2. Fixed-eye projection for the displays
2026-09-12, accepted. Textures are projected from a fixed eye at z = 40. While
folding, each fragment shows what the flat panel showed along the same ray, then
blurs toward the free edge. Reads as a screen turning away, not a texture
stretching. Cost: the eye is a constant; moving the default camera breaks the look.

## 3. Real DOM when flat, baked canvas while folding
2026-09-12, accepted. Apps need iframes, inputs, webcam and mic, which CSS3D
gives for free, but a DOM panel cannot bend or depth-test. Cost: every layout
number exists in both `os.ts` and `screen.ts`.

## 4. One fake OS, two instances
2026-09-12, accepted. `os()` runs once per display with a `wide` flag. The cover
display is the left four columns of the open grid with the same wallpaper crop,
so folding moves nothing already on screen. Lock state shared, app state not.

## 5. Transparent frameless window
2026-09-12, accepted. The device sits on the desktop like a simulator, not in an
app frame. The HUD floats as its own pill and is the drag handle. Cost:
transparent areas still catch clicks (working.md, Limitations).

## 6. Liquid glass in CSS only
2026-09-12, accepted. Backdrop blur and saturate, conic rim via mask-composite,
radial specular. Identical in WKWebView and Chromium, no canvas, no library.

## 7. Icons animate the thing they do
2026-09-12, accepted. Inline SVG, transform and opacity only,
`transform-box: fill-box`, reduced-motion guard. Open folds a tiny device, Flip
turns with the phone's yaw, Home gathers, Auto-rotate orbits.

## 8. Gestures scrub Web Animations
2026-09-12, accepted. A drag sets `currentTime` on paused animations; release
plays or reverses. The scrubbed animations are handed to the commit
(`unlock(anims)`, `close(anims)`) so none stay paused on the shell. Easing is
plain `ease-out`: a steep curve stacks on the finger and front-loads the drag.

## 9. Lock texture rebaked on the minute
2026-09-12, accepted. The baked lock screen carries the real time so a fold does
not swap the live clock for a stale one. Minute-aligned timeout, only while locked.

## 10. Measured, not eyeballed
2026-09-12, accepted. Corner radii, glass planes, display rectangles and the
HIG grid were measured off Apple's mesh and renders. Comments cite millimetres
and the source; architecture.md has the table.

## 11. No new dependencies without asking
2026-09-12, accepted. `three`, `@tauri-apps/api`, dev tooling. Everything else
is the platform.

## 12. Buttons are hardware in one file, iOS in another
2026-09-12, accepted. `src/buttons.ts` knows meshes, rays, springs and sound
and emits `{ button, down }`; `src/os/buttons.ts` turns presses into iOS
behaviour with iOS timings and calls `device` in os.ts. Keyboard and pointer
share the hardware path, so chords and scripted presses need nothing extra.
Cost: two files named buttons.ts, told apart by directory.

## 13. Cap travel is exaggerated, the body rocks
2026-09-12, accepted. A real cap moves a quarter millimetre; here it is half,
and the whole body gives 0.45 mm and tilts under the finger on an underdamped
spring. From 40 cm the cap alone is two pixels; the rock is what reads.

## 14. Volume up is the button nearer the corner
2026-09-12, accepted. Apple has not said. iPad mini, whose volume pair also
sits on the top edge, swaps them by orientation; this device keeps one mapping.
Supersede when Apple's user guide lands.

## 15. Apps open over the lock screen, not instead of it
2026-09-12, accepted. Camera Control and the lock-screen camera button hide
`.lock` behind the app and `close()` brings it back, as iOS does. Touch ID and
the swipe are the only ways past the lock.

## 16. React for the UI, one file per app
2026-09-12, accepted. The shell, the HUD and every app are React 19 function
components; `src/os/apps/` holds one file per app and `index.ts` is the home
grid. React owns structure and state; Web Animations scrubbing, canvas and
media stay imperative on refs. Amends 11: `react`, `react-dom`,
`@stylexjs/stylex` and their build-time packages are the approved additions.
Cost: a 3400-line file became 40; the fold bake in `screen.ts` is untouched
because it draws canvas, not DOM.

## 17. StyleX, compiled by a Bun plugin rather than Vite
2026-09-12, accepted. All CSS is `stylex.create` with tokens in
`styles/tokens.stylex.ts`; the only plain CSS is the `@layer reset` block in
`index.html`. StyleX ships no Bun integration, so `stylex-plugin.ts` runs the
StyleX Babel plugin from a Bun `onLoad` hook: the dev server injects rules at
runtime (HMR intact), `build.ts` writes them as `dist/stylex.css`. Cost: a
second parser pass on files that import StyleX, and shorthand or selector
mistakes surface at build time, not in `tsc`.

## 18. Glass is blur, tint and a hairline, nothing else
2026-09-12, accepted. Supersedes 6. The conic rim, the radial specular and the
gradient ramps on buttons and knob read as Vista, not as iOS 26. One recipe now:
`blur(20px) saturate(1.6)`, a dark tint at .68, a 1px inset hairline, one
top-edge highlight, a soft drop shadow. Buttons are transparent at rest and
take a flat white fill on hover. Same recipe for the pill and the orbit card.

## 19. The orbit shows itself as an atom, and a Reset puts it back
2026-09-12, accepted. Once the view leaves the front pose (azimuth, elevation,
distance or yaw), a 112 px card appears at the bottom right, baseline with the
pill: three rings turned by the camera pose, the phone as nucleus turned by yaw,
a dot for its front, a dashed ring for distance. Reset (button or the card)
eases the camera back to `EYE` in the render loop and unwinds yaw; a drag
cancels the easing. Cost: five DOM writes per frame, done through refs like the
degree readout, never through React state.

## 20. Control Center is a right-anchored panel on the inner display
2026-09-12, accepted. Apple has shown the Duo's status cluster in the top-right
corner and its controls down the right side, but no Control Center yet. Until
review units land, the inner display gets an iPad-style panel beside the status
stack over a blurred scrim, and the cover display the full-width iPhone page.
Opened by a swipe down from the top strip, scrubbed through the same `swipe()`
as unlock and the home bar; dismissed by a tap on the scrim, a swipe up on the
handle, Home or Esc. Live layer only, like the volume HUD (working.md,
Limitations). Supersede when Apple's user guide describes the real one.

## 21. Two apps at most, split at the hinge, arranged by holding the home bar
2026-09-12, accepted. Apple's hands-on footage shows an app swiped up and held
becoming a card, two halves offered underneath, and the two halves trading
places the same way. Here an app entry carries a `side`; the shell stays one
`Shell` with one list, and the home layer moves to the free half and switches to
the narrow layout there, so the cover display's home and a half of the inner one
are the same code. The gesture is `grab()` in os.tsx,
separate from `swipe()`: it needs a hold timer, a card that follows the hand and
a drop, none of which a scrubbed animation models. Costs: the home layer relayouts (icons land again) when a half is taken or
freed, since the page structure changes; a half-width app keeps the 40 px status padding whether or not the stack is over it; the
cover display cannot split, so folding with two apps up shows only the baked
home until reopened.

## 22. The window is cut to the phone, and the phone is framed by bands
2026-09-12, accepted. Amends 5. A transparent window still catches clicks and
still hides the desktop, so the frame is now the phone's own size: 37 px/cm as
before, but the window is 818 × 664 rather than 960 × 760, half the blocked
desktop. `resize()` keeps four bands clear — the HUD pill below, the orbit card
on the right, plain margin above and left, each its widget plus `PAD` — and
hangs the phone in what is left. What it must hold is `SWEEP`, the silhouette
the phone paints through a whole fold (14.4 cm tall at 90°, where perspective
magnifies the near half, against 11.8 flat), measured off the drawing buffer,
not off mesh bounds. The phone stays on the orbit pivot and the frustum is
off-centre instead (`camera.setViewOffset`, which CSS3DRenderer honours), so
turning the view never swings it into an edge. Costs: the phone is close enough
to the edges that wheeling in past ~36 cm crops it, the orbit card's column is
empty whenever the view is home, and the pill's offset (half the difference
between the side bands) is written in `hud.tsx` and mirrored in `main.ts`.

## 23. The shell is decomposed into iOS's own shape
2026-09-12, accepted. Amends 16. `os/os.tsx` had reached 1992 lines holding
every layer of the shell at once, and the layer you wanted was always in the
middle of another. It is now boot only: build the root element, render
`<SpringBoard>`. The shell is `springboard/`, one file per layer — home screen,
home bar, lock screen, status stack, Spotlight, Control Center, power, the
system HUDs, the grid tile — with `springboard.tsx` keeping the layer stack and
the state that outlives any one layer, `scenes.ts` the open apps, `gestures.ts`
the scrubber and the zoom geometry, `clock.ts` the minute two layers read. The
device the frame buttons reach is `device.ts`, which knows nothing about React;
what an app is written against is `uikit/`. The names are Apple's — SpringBoard,
scene, UIKit — because the seams already were: the code had the same three-way
split between the thing a button presses, the shell that stacks layers and the
framework an app links against, so naming them after the OS being imitated puts
each file where someone who knows iOS would look for it, rather than in a
vocabulary invented here that has to be learned first. The import direction is
what holds the shape: `apps/` sees `uikit/` only, `springboard/` sees `uikit/`,
`device.ts` and `apps/index.ts`, `device.ts` sees only types. Costs: five files
became twenty, so a change that used to be a scroll is now a search; `rise` and
`fade` are declared again in four springboard files, because StyleX resolves a
keyframe only in the file that uses it (working.md, Gotchas), as `apps/` already
had to; two seams pass a ref where a prop would read better — `home-screen.tsx`
writes its page into `pageRef`, since `spot()` has to subtract a CSS transform
`offsetLeft` cannot see, and `home-bar.tsx` takes `lockedRef`, since its hold
timer fires 220 ms after the press and must read the lock then, not at the
render that made the handler; and `springboard.tsx` and `home-bar.tsx` now pass
a `Scenes` object between them where the old code closed over its own state.

## 24. The inner panel stays live through the fold, clipped where the fold takes it
2026-09-12, accepted. Amends 3, 4 (lock shared, app state not) and the last cost
in 21. Folding used to swap whatever was running for the baked home screen —
close the lid a few degrees on a Wikipedia page and the big display was back to
its icons, the app only reappearing on the cover once the hinge had stopped.
Three changes, and the first is the one that matters.

**The live inner panel no longer waits for flat.** The screen shader projects
the flat picture from an eye and shows it along the same ray on the folded
surface (decision 2), so the folded display is the flat picture cut off at the
moving half's free edge. `foldClip()` in main.ts computes that edge — rotate it
about the hinge exactly as `shaders/fold.ts` does, project it back onto the
glass plane along the ray it leaves the eye on — and the panel is clipped there
with `clip-path: inset()`. Flat panel, same rays, same picture: the app keeps
running, scrolling and playing while the phone folds, and it is still the same
DOM. Folding a little and opening again touches nothing at all. The clip is
taken from the camera's own position and not the shader's fixed eye: the two
agree at the default pose, and away from it this one still cuts the panel
exactly where the folding half hides it, which is what keeps a panel with no
depth test off the fold. The panel holds all the way to closed, so the app is
never a black slab of glass on the way down.

**The bake goes dark, and the ramp moves to the panel.** `screen.ts` can only
draw the shell, so while the phone is bending with an app up the inner texture
is black and the live panel is the whole picture — including the blur and
darkening the shader ramps over the moving half, which is most of what makes a
fold read as a fold. `ramp()` in main.ts writes the shader's own curves into
bare divs inside the panel: the darkening as one gradient, whose alpha CSS
honours, and the blur as six nested `backdrop-filter` layers cut by `clip-path`,
because Chrome applies a backdrop-filter at full strength across its box —
`mask-image` does nothing to it — and mirrors the backdrop at the box's edge, so
one masked layer cannot taper and one sized layer folds the picture back at its
edge. Nested from the free edge with their variances adding up to the shader's
radius, six layers taper without a visible step. Same band, same exponent, same
72 texels of blur, in the 5 px/mm of the live panel rather than the 12 px/mm of
the bake, at `z-index: 11` because the OS stacks up to 10 and the fold is the
glass over all of it. The cover gets the same ramp while it holds the app, over
its whole width from the hinge as `uiGradient` has it. With no app up nothing
changes: the baked home screen folds with its fade, which is the look the fold
was built around — and no panel is live to flatten it, since a live panel
cannot bend.

**The other display mirrors the one in use.** `follow(angle > HANDOVER)` in
device.ts, every frame: the display in use leads and the other is made to show
the same apps (`stage()` → `mirror()`, scenes.ts), opened and closed with no
zoom because nothing is being launched — the fold is showing the same session on
another piece of glass. So the cover already has the app before the fold turns
it to you, and the inner display still has it when the phone opens again. The
lead passes at 40°, where the fold has taken 94% of the inner display's width
and the cover has turned round to be the glass in front of you; nothing visible
happens at the crossing, both panels were already showing it. A first version
handed the apps over instead — closed on one display, launched on the other —
and the launch zoom playing on the cover at 34° was exactly the clutter a real
fold does not have.

Costs: React owns the panel's children and clears the container on its first
commit, so the ramp divs have to check their parent every frame; a `clip-path`
and a gradient are written while the hinge moves, and six `backdrop-filter`
layers each blur the whole panel before the clip, which is not free; an OS
layer above `z-index: 10` would sit over the fold;
past half way the clip has eaten the whole ramp band and the fold line is a hard
edge, in the live panel and in the shader alike. The mirror is a second copy of
the app, not the same DOM — two React roots cannot share one — so a Safari
iframe loads twice, and what you do on the display in use is not reflected in
the copy: scroll a page on the cover while closed and the inner display opens on
the copy's own scroll position. `arg` does not travel to the copy. An app is
told which instance it is (`os.mirror`) and the copy must start no sound — a
video embed that autoplayed on mount played twice from 90° down until tv/index.tsx
and youtube/index.tsx checked it; what should play once lives at module level, as
music/index.tsx's `deck()` already did. The cover
cannot split (21), so it mirrors the first app whole, and when the lead passes
to it below 40° the inner display's split collapses to that one app, quietly, on
the 9% of it still showing.

## 25. Control Center is three pages, and its switches are device state
2026-09-12, accepted. Amends 20 (the panel), which stays true about where the
panel sits and how it opens. Apple's hands-on footage of the cover display shows
what 20 could not: a rail of glyphs down the right edge, a page of tiles behind
it, and a Now Playing card filling the panel when the note is picked. So the
panel is a three-page track — tiles, Now Playing, connectivity — moved by
tapping the rail, and the pages are one card each rather than a second tile grid.
The status stack answers the panel while it is open: the battery ring reads the
charge out and the Wi-Fi glyph names the network, exactly as in the footage.

Nothing on the panel is decorative any more, which is the point of the change:

- The switches are `springboard/toggles.ts`, a module store outside React, not
  a panel's `useState`. Both displays run their own `<SpringBoard>`, so per-panel
  state would let the cover be in airplane mode while the inner display still had
  bars. The status stack draws them on both.
- Now Playing drives the Music app's deck, hoisted in `apps/music/index.tsx` from one
  per component to one per device. A track started in Control Center is the one
  the app opens on, and closing the app no longer stops the audio.
- The power glyph opens the shell's slide-to-power-off sheet, the same one the
  side button reaches; `+` puts the grid in edit mode.

Costs: `springboard/` now imports an app file directly (`apps/music/index.tsx`) and not
only `apps/index.ts` — the direction is still shell → app, but the surface is
wider. The deck's clock is a 4 Hz `setInterval` that outlives every listener,
because audio has to keep time with nothing mounted; it returns immediately while
paused. A control removed in edit mode is remembered per panel, not per device,
and only for the session — there is no controls library to add from, so the empty
slot is the way back. Toggles are switches, not behaviour: airplane mode empties
the status ring but nothing here has a radio to turn off, and the flashlight
lights its tile and no more.

## 26. The phone gives way to the window, not the other way round
2026-09-12, accepted. Amends 22. 22 cut the window to the silhouette the phone
paints through a fold, which held for folding and for the front view and broke
the moment the view turned: edge-on, the near half is close enough to the camera
that perspective magnifies it to 19.8 cm against 11.9 flat, and tilted 40° it is
18.7 cm wide. Holding all of that at 37 px/cm needs an 880 × 860 window — bigger
than the 960 × 760 we set out to shrink — and holding none of it crops the phone
at the window's edge, which is what shipped.

So the window keeps its size and the phone yields. `frame()` runs every frame,
measures where the phone's bounds land on the glass at the reference eye, and
picks the scale that fits them into the box the bands leave, capped at 37 px/cm.
Face on nothing moves: the cap binds and the phone is the same size it has always
been. Turned edge-on it is 97%, tilted 45° about 70%, and it never leaves the
window.

Bounds, not pixels, because this runs per frame: one box per mesh in two piles,
the turning half measured in the hinge's space so the group's own matrix folds it
exactly as `shaders/fold.ts` does — the fold is a vertex shader, so a mesh's own
bounds never see it. Apple's file also carries a 96-vertex proxy the size of the
phone and 6.1 cm deep that paints nothing; it is `PHANTOM` in `main.ts` and
excluded, or the phone would sit at two thirds of its size everywhere.

Costs: the scale is no longer a constant, so nothing may assume 37 px/cm except
face on; the fit is a box fit, so at a steep tilt it reserves room for a rounded
corner the phone does not paint and comes out around 10% smaller than it strictly
needs; the wheel is deliberately left out of it (the fit reads the camera's
direction, not its distance), so zooming in past ~36 cm still crops, as before;
and the frame is still anchored on the hinge, so a closed phone hangs to one
side of its box rather than in the middle of it.

## 27. The cover is off when the phone is open flat, and fades in with the fold
2026-09-12, accepted. Amends 24. The mirror put the app on the cover at every
angle it faced you, 180° included, so the back of an open phone showed a
blurred, half-darkened copy of the app under the cameras. A real fold sleeps the
cover the moment it is open, and the bake already had it black there (`angle >
FLAT`); the live panel now follows: hidden at `FLAT`, and faded in over the
first 30° of fold with an `opacity` on the panel, because at 179° the ramp still
leaves the hinge side of the copy readable and going from black to that in one
frame is a pop.

Cost: 30° of fade a real cover does not have — it is on or off — and one more
style written per frame on the cover panel. A lock screen on the cover was
considered instead and rejected: it would be a third thing the cover can show,
and the phone is open, so nobody is meant to be reading its back.

## 28. Control Center's tiles are tint over the scrim, not glass of their own
2026-09-12, accepted. Amends 25. Every tile and both cards carried a
`backdrop-filter` of their own on top of the scrim's. On the desktop (WKWebView)
that lit up the whole page box — the clipped, sliding track the tiles sit in —
as a lighter, flatter rectangle against the blur around it, and its edges
flickered while the panel slid, because WebKit paints a nested backdrop-filter
over its clip layer and re-rasterises it every frame of the transform. Chrome
showed neither. The scrim already blurs the display at 42 px, so a 20 px blur
over that is invisible; the tiles keep only their translucent fill and the
highlight, and the panel reads the same. Thirteen backdrop layers gone. Their
outer drop shadows went too: the page box that clips the sliding track clipped
the shadows with it, and the cut showed as a faint rectangle around the grid,
dark in the corners beside a card's rounded ones and a hard line under the
bottom row.

Cost: a tile's `saturate(160%)` went with it, so an active tint is a shade less
vivid; and a tile no longer frosts anything that is not already under the scrim,
which nothing is.

## 29. The flashlight is hardware, and its card stands in for the island
2026-09-12, accepted. Amends 25, which left the flashlight lighting its tile
and no more. It is the one switch in Control Center with something physical to
show: Apple's model carries the LED as a 3.4 × 1.6 mm recess beside the rear
cameras, emitter, glass and housing as three meshes. The emitter and glass go
emissive, a small blended halo sprite sits off the glass and a point light
spills onto the plateau; the housing stays dark so the pill keeps its edge.
Additive blending was tried first and clips to a flat white disc on a white
body. The lock screen's torch button, which had a `useState` of its own, now
flips the same device-wide switch, so the LED, the tile and the button agree
from either display.

iOS 18 answers a flip by expanding the Dynamic Island into a black card: the
brightness arc, the beam, the torch. The Duo has no island (its inner camera is
under the display, the cover's is a punch-hole top-right), so the card drops
out of the top edge on its own and goes back after 1.8 s. It reacts to the
switch and not to the tile that flipped it, so it shows on both displays and
for the lock screen button too.

Cost: `main.ts` now imports from `springboard/`, the one place the scene reads
shell state directly; a boolean a frame, no subscription. The arc has one level
lit or dim, as the torch has no brightness to set.

## 30. Notes is iPadOS on the open phone, and its handwriting is a font
2026-09-12, accepted. The app was one `textarea` on a white sheet. Unfolded, the
inner display is 790 × 555 px — an iPad mini's shape — so Notes now draws what
iPadOS draws at that size: a folder sidebar, the note list, the note, and the
pencil palette floating over all three. It picks the layout off its own box with
a ResizeObserver, not off the display, so a split half of the inner panel gets
the phone's one-column Notes like the cover does (the same rule camera/index.tsx
follows). Folders and tags are Apple's sample set and filter nothing; the list
is the ten notes the app ships with, and its titles and previews are read back
out of the text, so an edit retitles a row as it is typed.

The sidebar glyphs are real SF Symbols out of AppKit (`folder.fill`,
`trash.fill`, `note.text`, `person.2.fill`, twelve in all), tinted with the
system yellow Notes uses; emoji stand-ins read as another app's icons next to
the real ones. The handwritten note is the system handwriting face at 52 px, not
ink paths: a path per glyph would be the only hand-drawn artwork in the project,
and the text stays a `textarea` you can edit, which paths could not be.

Cost: the handwriting is Bradley Hand, which every Mac and iPhone has and no
Windows or Linux box does — off Apple's platforms it falls back through Segoe
Script to whatever `cursive` maps to. The palette's colours re-ink the whole
note rather than a selection, its undo is the note's own (back to the shipped
text, dropping the localStorage key), and it sits 26 px up so the home bar keeps
its band.

## 31. The side button never unlocks
2026-09-13, accepted; supersedes the Touch ID half of 15. A click used to wake
and unlock in one go, as if the finger sat on a sensor, so the lock screen only
ever flashed past. Now a click wakes to the lock screen or sleeps, and the swipe
is the only way past the lock. The cost is that the padlock's shackle no longer
lifts: nothing opens it any more, so the animation went with the Touch ID hook.

## 32. Notes shares persisted text, while navigation stays local
2026-09-17, accepted. Amends 16 and 30. Notes keeps its public entry in
`apps/notes/index.tsx`, with its data, persistence, folders, list and editor separated
under `apps/notes/`. Both editor presentations use the same controlled textarea.
`useSyncExternalStore` reads the existing `duo.notes.<id>` keys; a local subscriber
set notifies both displays after an edit, and the browser storage event handles
other tabs. This replaces per-editor text copies and the global `duo.note`
redraw event. Rows derive their titles and previews from the same snapshot as
editors, so an already-mounted editor no longer misses changes on the cover.

The >600 px layout rule, sample content, per-display navigation, ink selection,
pen reset on note selection, and reset-to-shipped undo remain. Note rows are
native buttons so keyboard activation works without bespoke key handlers.
Cost: more files to navigate, synchronous localStorage reads, and last write wins
if two displays or tabs edit the same note. Storage failures are not handled;
selection, scroll, pencil and colour are still local UI state, not persisted or
mirrored. This is a text synchronization fix, not a new navigation handover.

## 33. Weather uses real forecasts with explicit failure states
2026-09-17, accepted. Weather replaces its five-day San Francisco-only feed and
fabricated fallback with Open-Meteo current conditions, hourly forecasts, ten
daily forecasts and geocoding. Requests are deduplicated by location, time out
after 15 seconds, and refresh every ten minutes while mounted. A failed refresh
retains the last successful in-memory result with an error banner; a cold
failure shows unavailable values and Retry. No generated weather is presented
as an observation. The data is explicitly labelled as model estimates.

Saved places, selected location and Celsius/Fahrenheit are stored under
`duo.weather.v1`, shared across the two displays and browser tabs. Storage
failure falls back to session state. Geolocation is requested only from its
button; denied/unavailable access leaves city search usable. Location-local
dates and times use the provider's IANA timezone and Unix timestamps, including
the chart and day details. Weather updates also rebake the home widget.

Cost: internet access and provider availability are required; forecast caches
are not persisted across reloads. Search and scroll remain per-display. This
is not an Apple WeatherKit client and does not implement radar, severe-weather
alerts or notification delivery. Every displayed control operates on real
forecast data or saved settings; metric cards are informational.

## 34. Weather surfaces are one glass recipe, blurred per element
2026-09-17, accepted. Every Weather surface (toolbar capsules, cards, the search
field, location tiles, search results, the notice and the day-detail sheet)
shares one material in `weather/styles.ts`: a thin white fill over
`backdrop-filter: blur(24px) saturate(170%)`, a 1 px top highlight and a
half-pixel rim as inset shadows, and a soft drop. Controls add hover/active
fills and a press scale; the search field replaces the browser focus ring with
a brighter rim. Toolbar glyphs are SF Symbols through `Sym`, not text.

Unlike Control Center (decision 28), each card blurs on its own rather than
sitting on a pre-blurred scrim, because the cards scroll over live clouds and
have to read as glass wherever they land. Cost: the day-detail sheet is also a
blurred layer, so its cards are nested backdrop filters. Chromium composites
this correctly; WebKit's nested backdrop-filter inside a clipped layer has not
been checked here, and the fallback is to drop the sheet's blur, not the cards'.

## 35. Apps run under the status stack when they say so

2026-09-17. The shell used to pad every app 40 px from the top and paint its own background there, so a gradient app like Weather showed a black band under the clock. Apple's Duo footage has no band: Mail, Voice Memos, everything runs edge to edge and the time floats over it. An app now sets `edge: true` in the registry to skip the shell padding and pad its own top; Weather does. Cost: an `edge` app owns the status-stack clearance and its light/dark contrast under the clock. Light apps keep the shell padding because it is invisible against their grey.

## 36. Numbers roll through @sfinterface/numbers

2026-09-17. Every displayed number (Weather values, Stocks prices, Calculator output, Camera zoom) renders through `Num` in `src/os/uikit/num.tsx`, a thin wrapper over the library's `Numbers`: undefined draws the em dash, whole numbers by default, leading suffix space to NBSP. Formatting stays `Intl.NumberFormat`. Strings for non-React surfaces (the baked widget in `screen.ts`, SVG chart labels, aria-labels) keep the old helpers. Cost: one dependency and 96 extra DOM nodes on the Weather screen; reduced motion turns the roll off.

## 37. Workspace extraction preserves the baked runtime at the migration gate

2026-09-17. Bun workspaces separate the shell, existing apps, UI kit and SDK.
CLI and web are private scaffolds. Root tooling, public assets, build output
and Cargo cache stay at the root; the shell page and Tauri crate move together
under `packages/shell`. App imports use package exports, never another app or
shell internals. Shared rings, icon catalog and sample tracks join the existing
UI helpers in the kit. SDK `legacy.ts` owns the existing host-only types; the
React `App` adapter stays in the kit.

Cost: all current apps still execute as trusted baked components. This gate
neither implements nor claims the future downloadable-app isolation boundary.
Manifest, SDK protocol, UI harvest, CLI commands, website and publishing remain
separate workstreams. Packages are private at 0.0.0. Root-relative icon URLs
preserve current browser/native delivery; isolated releases will need their
own asset distribution design before publication. Storage keys, app names,
seed positions and renderer behavior are unchanged.

## 38. Isolated documents carry assets and lift dynamic styles into classes

2026-09-17. The app builder emits one `app.html`, with a first-head-child CSP
hashing its script and static stylesheet. Public icon/font URLs are replaced
with data URIs. A builder-only StyleX adapter turns dynamic variable maps into
classes using CSSOM in an initially empty, hash-authorized stylesheet. Each
property value is parsed separately through `setProperty`; it cannot inject a
second rule. The baked shell keeps its existing StyleX runtime.

Cost: every app bundles its own runtime and assets, the dynamic stylesheet
retains each distinct value map for the document lifetime, and arbitrary
third-party inline-style conventions are not promised compatible. The CSP
bounds connections, not all JavaScript-driven presentation changes or
self-navigation. Real Notes document probes exercise the strategy in Chromium
and WKWebView; integrated migration and lifecycle evidence remain in the
platform checkpoint.

## 39. Notes navigation belongs to its sandbox session

2026-09-18. Supersedes decision 32 for isolated Notes. Selected note and pushed
page are string keys in `os.session`, so replacement views restore navigation
after split collapse. Text uses `useKV(os.storage, note.id)`; an absent value
means shipped text, while an empty string remains an edit. The editor displays
hydration, saving and failure states instead of treating an optimistic edit as
durable. Cost: navigation changes are shared between displays and persistence
is asynchronous.

## 40. Persistent launch authority is in IndexedDB

2026-09-18. The `ipduo` database owns installed records, release bytes, app data,
checkpoints and migration markers. Transactions acknowledge only on complete;
data writes check the installed generation inside the write transaction.
Lifecycle changes use per-app Web Locks and cross-tab leases. BroadcastChannel
only invalidates; it never supplies trusted data. Native engine prerequisites
were measured before implementing the host. Cost: unavailable storage is an
explicit error, and a crashed tab's lease can delay activation up to 30 seconds.

## 41. Sandbox effect ownership is sticky

2026-09-18. The first view owns effects until revoked; the oldest survivor then
receives a new epoch. Hinge angle and visibility never transfer ownership.
Owner-only host methods check the epoch and acknowledged commands survive
handover. Cost: hidden-frame timer throttling and user-activation loss remain
browser constraints; cooperative network effects cannot promise exactly-once
execution. Audio apps remain gated on the measured media contract.

## 42. Opaque-origin media capture is deferred

2026-09-18. Approved during implementation after Chromium refused
`getUserMedia` with SecurityError even with camera policy, fake devices and
browser permission granted. Camera and microphone are omitted from the
permission table and explicitly denied on every sandbox. Geolocation,
clipboard and photos remain in scope. Capture requires a separately reviewed
host-mediated media contract; the sandbox does not gain `allow-same-origin`.

## 43. Stage 2 launches at the four-outcome MVP gate

2026-09-18. The user's scope amendment supersedes
the broader stage 2 completion matrix, including decision 42's requirement
to finish additional permissions for launch. Capture stays denied. Keep core
infrastructure and existing lifecycle safeguards; optional live development
and new update staging are disabled at their entry points, with no development
watcher/fetch or background catalog polling. Existing durable transitions
still reconcile. Cost: private local tooling and unsigned developer catalogs
prove installation; they do not constitute a published distribution service.

## 44. Display roots attach before sandbox documents load

2026-09-18. Both OS roots are initially hidden inside CSS3DRenderer's final
camera container before async app boot. Appending to the body and letting
Three.js reparent on first display caused iframe document reloads while
folding. Cost: `main.ts` depends on the installed renderer's container nesting;
the fold integration check asserts stable view IDs across 180/120/0 degrees.
Display changes update the existing SDK views instead of relaunching apps.

## 45. Explicit developer preview and updates resume after safety checks

2026-09-18. The stage-3 scope supersedes decision 43's temporary disabling of
live development and explicit update staging/retry. Preview documents use
immutable release URLs and separate origin/app storage namespaces; reload is
explicit. Updates reuse retained checkpoints, generation fencing and leases.
Catalog selection never starts polling. Cost: local CLI previews require a
running developer server and simulator reload to select a rebuilt release.

## 46. Unsigned installed apps bind to their catalog origin

2026-09-18. Initial installation records its source origin. A different catalog
origin cannot update that id and inherit its data. Records without provenance
accept only the shell origin. Cost: moving an unsigned catalog to a new origin
requires explicit removal/reinstallation; signing and publisher identities are
future distribution work, not an implicit trust decision.

## 47. Review packages carry their build toolchain and assets

2026-09-18. Local SDK/kit/CLI archives resolve dependencies from the external
consumer and include the existing compiler and local kit assets. The workspace
is a fallback for repository apps only. Cost: unpublished versions require
local archive overrides for transitive package resolution; public npm release
and provenance remain separate decisions.

## 48. Harvest the UI kit without changing app composition

2026-09-18. Public kit 0.1.0 wraps existing native elements and StyleX patterns;
typed `as`/`xstyle` preserve each app's appearance. Existing low-level exports
and trusted shell components stay supported. Exact legacy appearance constants
live in tokens, with a local/CI AST check rather than a new lint dependency.
Cost: names and bespoke app compositions are less uniform than a redesign.

## 49. Development src pins verified document bytes

2026-09-18. Supersedes decision 45's direct remote iframe navigation and the
literal server-src wording in platform contract §2.1/§2.7. The downloader still
uses immutable developer release URLs; iframe `src` is now an owned Blob URL
of the verified HTML. A second server fetch could otherwise substitute its CSP
and code after validation. Same-release loads reuse the URL; replacement/removal
revoke it under the existing app lock. Storage namespace, SDK protocol, opaque
sandbox and generation rules are unchanged. Cost: one in-memory document copy
per loaded developer app and a required `blob:` allowance in shell frame CSP.

## 50. Current guidance, roadmap and evidence have separate homes

2026-09-18. The documentation index routes tasks to current maintainer/platform guides.
The accepted contract moves out of progress; completed reports, original proposals and
superseded scope instructions remain dated archives. Current references incorporate explicit
amendments; the roadmap owns deferred work. This supersedes instructions to append completed
workstreams to a live progress folder, not runtime decisions or safety requirements.
Cost: moved links and website consumers need checking. The root README remains the only
repository tree; generated API data stays at its existing path and is never hand-edited.

## 51. Remove documentation archives after the restructure

2026-09-18. At the user's request, remove both documentation archive directories as well
as the empty progress directory. Supersedes decision 50's archive-retention policy.
Current guides retain the accepted contract, launch scope and verification limitations;
committed history remains available through Git. Do not recreate archive/progress folders.
Cost: old proposals and checkpoint narratives are no longer browsable as current files.

## 52. Use the Duo package namespace before publication

2026-09-18. Supersedes earlier package naming: the workspace root is `@doan-labs/duo`,
the SDK and kit are `@doan-labs/duo-sdk` and `@doan-labs/duo-uikit`, and the CLI is
`@doan-labs/duo-cli` with the `duo` executable. Internal packages use the `duo-` prefix.
Update imports, tooling, templates and archives together. App ids, database/lock names,
bridge protocol and native bundle identity remain stable to preserve installed data.
Cost: existing local consumers must rebuild/reinstall their archives.

## 53. The website is a prerendered TanStack Start site styled with StyleX

2026-09-17. `packages/web` uses TanStack Start on Vite because the user asked
for it and because file routes, `head()` per route and a prerender crawl give
a static `dist/client` with no server to run. Styling stays StyleX, the repo
rule, through `packages/web/vite-stylex.ts`: the same Babel plugin the root Bun
plugin runs, collected across the client and server passes into one virtual
stylesheet, with runtime injection off because a second `<style>` in the
server-rendered head broke hydration. Documentation is rendered from
`docs/**/*.md` by a parser written for exactly the syntax those files use,
and the SDK and kit references come from the Babel parser walking each
package's `index.ts`, because TypeScript 7 ships no compiler API and no
Markdown or TSDoc library is installed.

Cost: two build systems in one repository. Vite's types pull in `@types/node`,
so `packages/web` is excluded from the root TypeScript project and checked by
its own `tsc -p` in the same `typecheck` script; the Biome config carves out
TanStack's `$param` and `__root` file names and the generated route tree. The
Markdown parser learns new syntax by hand. The site's build runs the root
build a second time to copy the simulator under `/device/`.

## 54. The launch page drives the real shell over a postMessage bridge and folds a CSS device everywhere else

2026-09-18. The site was rewritten as a single launch story (hero, it works,
real camera, App Store, the fold is input, build, SDK, first apps, open, go)
with the product as the centrepiece. The hero, the camera scene and the store
scene embed the real shell; `packages/shell/main.ts` now reads `?bg=` at load
and `{ deg, yaw, bg }` by same-origin postMessage, registered before the model
loads so a message sent at the frame's load event is queued rather than lost.
The site posts the page's body colour so the device floats on the page in
either theme, and posts poses instead of reloading the frame. Every other
scene (scroll-linked fold, posture picker, live-reload loop) uses
`packages/web/src/device.tsx`, two hinged panels in CSS 3D driven by a motion
value, because three WebGL scenes with the 3.5 MB model are the ceiling one
page can afford and a scroll-linked pose needs per-frame control.

Two build facts came out of the rewrite. React 19 hoists stylesheet links above
inline `<style>`, so the reset's `@layer reset` was declared after StyleX's
priority layers and `* { margin: 0 }` beat every StyleX margin in production;
the reset now lives in `packages/web/src/reset.css`, imported before the
virtual StyleX sheet so Vite bundles it first. The prerender crawl's ten
parallel fetches against its own server timed out often enough to fail one
build in three; it runs three at a time and skips trailing-slash duplicates.

Cost: the shell carries a small website-only listener, and the CSS device is a
stylised app rather than the real OS, so those scenes show layout, not
software. A shell rebuild (`bun scripts/simulator.ts`) is needed whenever the
bridge changes.

## 55. The page scrolls through Lenis, the camera scene asks on arrival, and the frame drops its title

2026-09-18. Three follow-ups from the first review of the launch page.

**Lenis smooth scroll.** The whole document sits in `ReactLenis root`
(`packages/web/src/smooth-scroll.tsx`), the same wrapper doan-labs.com uses,
with `anchors` and `stopInertiaOnNavigate` on. Root mode scrolls the real
window, so `useScroll` in the fold scene reads the same position it always
did, and the wrapper renders its children directly, so the server and client
DOM match. Readers with reduced motion never get an instance: native scrolling
wins. `lenis` is the one dependency added since decision 53, at the user's
request. Cost: Lenis puts `lenis` classes on `<html>`, which the theme check
in `check.mjs` now ignores when it compares the class list across a reload.

**The camera prompt fires on the scene, not on the frame.** The frame used to
mount a screen early with `?app=Camera`, so the browser asked for the webcam
while the reader was still on the previous section, and a refusal left the app
saying "allow access and reopen" with no way to reopen. Now `home/camera.tsx`
watches its own column; when four tenths of it is on screen the page itself
calls `getUserMedia`, stops the stream, and only then lets the frame mount
(`Simulator mount={asked}`). Same origin plus `allow="camera"` means the
Camera app inside finds the permission already answered. Cost: the frame loads
after the prompt instead of before it, so the device appears a second or two
after the reader arrives.

**Embedded frames show the device alone.** The HUD's "iPhone Duo" heading and
the display line are for the shell opened on its own; inside the site every
scene has its own headline. `packages/shell/hud.tsx` renders them only when
`window.self === window.top`. The hint line and the control bar stay in both.

The footer credits the studio: the Doan mark (the four-shape drawing from
doan-labs.com's handoff file, inlined so it takes `currentColor`) and "Made by
Doan Labs" linking to doan-labs.com.


## 56. The site's badges follow the progress records, not the plan files' age

2026-09-18. After the rebase onto stages 2–5, `packages/web/src/docs.ts` stopped
treating every `docs/platform/*.md` as a planning document. The files that
carry their own "Implemented / Not implemented" header now render as "Works
today" with a note that the roadmap sections inside them remain intent; the
progress records are "Works today"; the revision-2 contract is "Works today"
because the shell implements it, with its superseded A–M checklist named in the
note; `web.md` stays "Proposed" until something is deployed. Pages that quote
commands quote the CLI's real ones and say the packages are local archives, not
npm. Cost: the badge is per file, so a reader of `store.md` sees one badge over
a document that is half shipped and half roadmap; the file's own header does
the finer split, and the note under the badge points at it. Alternative
rejected: per-section badges parsed from headings, which would put a rule in
the site about how the plan files are written.

## 57. The site's docs are written for developers, not rendered from the repository's notes

2026-09-18, the same day, superseding decision 56 and the "docs live next to
code" rule in `docs/platform/web.md`. `/docs` no longer renders
`docs/**/*.md`; it renders `packages/web/content/docs/*.md`, eleven pages
written for someone building an app: Introduction, Getting started, Your first
app, Manifest, Lifecycle, Displays and the fold, Storage, Permissions, CLI,
Catalogs, Publishing. The status badges (`src/status.tsx`) and the notices
under every heading are gone with it, and the eyebrows read "Get started",
"Reference", not "Get started · Works today". The reason: the repository's
notes are planning records, progress logs and a decision journal, half of each
file describing roadmap, and a badge per file could not make them read as
documentation; the owner said so after seeing them. The plan files stay where
they are and the site links to GitHub for them. Cost: two places now describe
the platform, and a contract change has to reach `content/docs` by hand; the
SDK and kit references remain generated, and the pages quote only commands
that `packages/cli/README.md` documents. Alternative rejected: keeping the
repository docs as a fourth sidebar group, which would have put the same
"Planning document" badges back one click away.

## 58. The bridge cues what the phone does, and the lead display follows the target angle

2026-09-18. The "it behaves like a device" scroll had captions about a song, a
screenshot and split screen over a phone showing its home screen. The bridge in
`packages/shell/main.ts` now takes `cue` beside `app`: `{ split: 'Safari' }`
replays the real home-bar drag through the shell's own `grab()` with synthetic
pointer events (up, hold until it is a card, over to the left half, drop) and
opens the named app on the free half; `{ screenshot: true }` presses the chord;
`{ play: true }` starts the deck muted, because a page scroll is not a gesture
to play sound on. The scripts live in `packages/shell/cues.ts`, the page never
touches the shell's DOM, and `app` now clears the stage first so a step always
shows one app whole. An app or cue that lands before the displays have booted
waits for them instead of throwing.

Two facts forced a change to decision 24's crossing. A launch that arrives with
a new pose used to land on the display in use at that instant; when the hinge
then passed 40°, the other display became the lead with an empty stage and
mirrored the app away. `follow()` is now called with the target angle rather
than the eased one, and the bridge calls it before launching, so a launch lands
on the display the hinge is heading to and the lead never swings back over it.
Nothing visible changes at the crossing, as before: both displays already show
the session. Cost: the frame buttons act on the target side for the fraction of
a second the hinge is still easing.

## 59. Photos is the macOS Photos window, and baked apps keep shared state at module level

Photos was a title over a square grid. It is now the macOS Photos window: a
sidebar of Library and the pinned Favorites, Recently Saved and Recently
Deleted, every row backed by a real filter; a toolbar with the − / + zoom pill, the Years / Months / All
Photos switch, the aspect, filter, more, info, share, favourite and delete
items and a search magnifier; a grid of aspect-fit thumbnails with a "45
Photos" footer; and a dark viewer opened by clicking a selected photo. The
macOS albums, sharing and utilities rows have nothing behind them here and are
left out; filter and more are disabled. The toolbar is too wide for the 590 px beside the sidebar, so search
opens a row under the toolbar rather than sitting in it, the way macOS
collapses a narrow window's toolbar. Folded, the same window loses the inline
sidebar and the sidebar button slides it over the grid.

Photos is baked into the shell bundle, so it cannot use the SDK's `useKV`
React hook: `packages/sdk/react.ts` imports React, which resolves from
`packages/sdk`, and only sandboxed apps carry their own React. Selection,
favourites and the bin therefore live in a module-level store read through
`useSyncExternalStore`, which is also what decision 24's mirror needs: the copy
the other display holds during a fold reads the same library.
## 60. Maps draws its own tiles instead of embedding OpenStreetMap

2026-09-18. Maps was an `<iframe>` of openstreetmap.org: it brought a foreign map's chrome
into the frame and never rendered in a headless capture. It now draws raster tiles itself.
`packages/apps/maps/data.ts` holds the Web Mercator maths, the tile URLs and the places;
`map.tsx` lays out the tile grid with pointer-capture panning over it. The furniture is
Apple Maps': a full-height sidebar of search, one Siri suggestion and recents, the selected
place's card beside it, pins carrying their own labels rather than callouts, and a glass
control stack down the right edge. Explore uses OpenStreetMap Japan's MapTiler Basic raster
and Satellite uses Esri World Imagery, both keyless, because CARTO watermarks anonymous
requests and Stadia rejects them.

Nothing routes or geocodes. A place owns its walking time, search filters the list, and
every control that would have needed a backend — guides, saved places, share, report an
issue, the account avatar — was removed rather than left as decoration. Places sit at their
real coordinates to about a block, walking times are invented, and recents are sampled from
the list at load, so the session opens on a different three each time.

## 61. Community apps are source in the repository, published by a publisher that only moves data

2026-09-18. The curated Store needed a path from a contributor's fork to an installable
release. Apps now live under `community-apps/<slug>/` as independent projects (not
workspaces, no root lockfile edits); `community-apps/registry.json` is the ownership
record, because an `author` string in a manifest proves nothing. Pull requests run
`scripts/check-submissions.ts` in a job with read-only permissions and no secrets: the
builder, the CLI checks and a headless install/launch that captures both displays are
evidence for a reviewer, and a pass means eligible, not accepted. Empty permissions are
required for the first curated release so publication never widens runtime privilege.

Publication is two jobs. The read-only one builds the merged commit; the writing one runs
`scripts/publish-catalog.ts`, which copies validated release files as data, refuses a
version already published with different bytes, reuses an identical release without
touching its metadata (the builder stamps `build.at`, so a rebuild must not win), and
assembles `index.json` from every release in the tree so one app's publication cannot
drop another's listing. The tree is the `catalog` git branch: the site is static assets
on the same origin, a rejected push is the conflict detection between close merges, and
the history is the audit log. The website build unpacks that branch and merges the
bundled Notes and Weather releases with the same publisher into `/catalog/`, which the
Store tries before `/cdn` and `/preinstalled`. Cost: a release is live only after the
site's next deploy, and the publish job cannot verify the hosted URL, only the branch.
Alternatives rejected: an object bucket (credentials and a second origin, while installs
bind updates to their origin), and committing built releases to `main` (contributor PRs
would carry binaries and every merge would need a follow-up commit).

The Store shows which catalog it is reading and offers **Back to Duo catalog** after a
developer catalog is loaded; an app installed from another origin is refused an update
with both origins named and the supported transition (remove, then get), rather than a
silent inheritance. The native **Submit your app** link goes through a new `open_url`
command behind the `Platform` trait, so the web side never learns which OS opens URLs.

## 62. The Reset button is the whole orbit UI, and the phone grows to the frame it is given
2026-09-18, accepted. Supersedes 19, amends 22. The atom minimap read as a
second device floating beside the first, and it earned its 112 px column at the
cost of the phone's: with the card gone the right band is plain `PAD` again, the
pill is centred under the window rather than offset, and the only thing left of
the orbit state is the pill's Reset, which still lights up the moment the view
leaves the front pose. The bands themselves are down from 24 px to 16 (and the
pill sits 20 px up, not 28), and the fit's ceiling is no longer the flat 37 px/cm
reference: it is whichever is larger of that reference and what the box leaves
for `SWEEP`, the silhouette a whole fold paints (17 x 14.9 cm, measured off the
drawing buffer). A frame with room to spare therefore draws the phone larger,
682 px wide in the website's 1280 x 715 hero against 613 before, and centred
rather than hanging left, while the native window keeps its reference size
within a couple of percent. Folding never resizes the phone at any frame size,
since the ceiling already holds the sweep. Costs: the camera pose is no longer
drawn anywhere, so a turned view is read off the phone itself, and the per-pose
click coordinates in docs/debug.md move with the bands.

## 63. The frame is asked for first, the scene fades in, and the page and the shell shake hands
2026-09-18, accepted. The 3.6 MB body was requested only after the icons loaded
and both displays were baked, so the download started about three seconds into
a page that then sat black until it arrived. It is now asked for in `index.html`
(`rel=preload`, one request: the loader picks up the same entry) and kicked off
at the top of `main.ts`, so it flies while the rest of the boot runs. The canvas
and the CSS3D layer start at zero and fade in on the first frame that has the
phone in it, and an embedding page holds a breathing outline until then.

Which needs a handshake, because the shell can be drawn before the page that
embeds it has hydrated: the shell announces `live` when it can take a message
and `ready` when it has drawn, the page answers by sending the pose, and the
page also sends `hello` when it starts listening, which the shell answers with
whichever state applies. The frame's own load event is no longer the trigger:
cross-origin it cannot be recovered after the fact, which is why the website's
frames stayed hidden in development. A framed shell also stops painting the
standalone page's light background, so a dark site gets the phone on its own
backdrop rather than a white card while `bg` is in flight. Cost: two more
message shapes on the bridge, and a page that embeds the shell without
answering `hello` still gets the announcements, so nothing is lost if it ignores
them.

## 64. `/kit` is a showcase, the reference moves under `/kit/docs`
2026-09-18, accepted. The UI kit's landing page was the reference itself: a lead
paragraph, one code block and a list of 47 export names. It answered "what is
the signature of Row" and nothing else, so a visitor who had never seen the kit
left without seeing a single component. `/kit` is now one hero in the launch
page's own language and nothing else: a headline whose count is read from the
generated API, the install line, and a full-bleed strip that drifts every demo
in `src/kit-demos/` past at the cover display's 387 points. The strip is two
identical runs sliding one run's width, so the loop never seams; hover or focus
pauses it, which is how a visitor presses a component before following its name
to the reference. Under 734 px and under reduced motion the drift is off, the
second run is not rendered and the strip is a plain scroller.

A browsing page underneath the hero was tried first (a gallery at both display
widths, a search over every export, the palette and symbol set) and cut: it
rebuilt `/kit/docs` in a second visual language. Sending "See all components"
straight to the reference leaves one job per page. The reference is unchanged,
one level down at `/kit/docs` and `/kit/docs/<Export>`, and the sidebar it
carries links back.

Nothing on the page is a screenshot or a second copy: the hero reads
`src/kit/data.ts`, which is the generated API filtered to the kit plus which
names have a demo file, so a new export or a new demo changes the page without
an edit. The cost is a heavier route: 18 demos mount on load, twice that on a
wide screen because of the second run. They are DOM, not canvas, and the
alternative was a wall of images that goes stale the first time a component
changes.

## 65. One browser builder replaces the two product entry pages

2026-09-18. `/build` combines a bring-your-own-key chat with the real simulator;
`/get-started` and `/simulator` redirect there. This supersedes the separate product
pages in decision 57 and the original website page plan. CLI setup stays in developer
docs; `/device/` stays the embedded shell. The owner selected direct browser provider
requests over a Cloudflare Worker proxy: credentials/prompts never pass through Duo's
servers, at the cost of requiring provider CORS. OpenRouter is the initial default;
custom HTTPS Chat Completions endpoints and manual model IDs remain available.

The owner approved esbuild-wasm and Babel standalone. A worker uses StyleX's official
browser plugin and a precompiled, fixed React/SDK/kit runtime. No runtime npm installation
or generated code in the trusted page. Named token imports resolve against that exact
runtime build. Whole source revisions simplify validation and recovery. Compilation is
not a substitute for CLI type, publication or runtime checks.

Browser previews extend verified development documents with a token-bound parent channel
and project-owned namespace. Their explicit revision activation checkpoints data, retires
old authority and replaces app frames while keeping the phone mounted. This amends preview
selection in decision 49, not installed update rules. Data checkpoints survive interrupted
starts; Undo restores the corresponding data as well as code. Arbitrary React state is not
preserved. Credentials stay in page memory, never worker/project/simulator storage. See
the builder guide for hard limits and the review guide for measured evidence.

The generated entry reports readiness after a successful React commit, including hidden
mirrored displays whose paint callbacks Chromium can suspend. This explicitly amends the
preview interpretation of first-paint readiness; visible pixels need separate checks.
The existing startup deadline and authority gates are unchanged.

## 66. The committed headless-Chromium suite is removed, not replaced

2026-09-18. Decision 63 dropped `puppeteer-core` from the dependencies but left twelve
scripts importing it, so the whole suite was dead: it could not run on a fresh clone or in
CI, and only kept passing locally on a stale `node_modules` copy. The owner chose removal
over restoring the dependency. Deleted: the stage2 MVP, adversarial runtime, document,
permission, Notes and Weather drivers, the stage3 workflow and development checks, the
stage4 app captures and component gallery, the store catalog-switching check, the
submission runtime probe, and the six in-page probe helpers that only those drivers built.
`notes-store.ts` stays; `scripts/build-app.ts` uses it.

What this costs, stated plainly rather than implied: `check-platform.ts` no longer ends in
a gallery run, and `check-submissions.ts` loses `--runtime`, so no automated step installs,
launches or captures a community submission. Declared `network` origins and app-frame
requests are no longer machine-checked before a merge; that is now a reviewer's judgement
against a running shell. This weakens the untrusted-code gate described in decision 55 and
amends the evidence claims in the review guide. The sandbox and lifecycle guarantees in the
contract are unchanged - what changed is how much of them a machine re-proves per pull
request.

Behavior verification moves to `agent-browser` against a running simulator, consistent with
decision 63 for the website. Those passes are deliberately not committed gates: an
agent-driven walk is not a CI check, and the review and debugging guides now say so instead
of pointing at scripts that no longer exist.

## 67. The simulator is the public page again; the browser builder is parked

Decision 65 made `/build` the single product entry. Its first live use showed the
interaction and provider setup were not ready to ship, and the page depended on the
simulator being healthy to become usable at all. The navigation item is now `Simulator`
and points at `/simulator`, the standalone page where a visitor folds and taps the phone
online with nothing to configure. `/build` and `/get-started` redirect there.

The builder source, its provider presets, model list and end-to-end check remain in the
repository as upcoming work rather than being deleted, so the next attempt starts from the
refined workspace instead of from zero. This supersedes the routing part of decision 65;
its credential and preview-lifecycle guarantees still govern the parked code.


## 68. Music plays licensed recordings instead of invented ones

The Music app and Control Center's deck shared five invented titles over SoundHelix
demo MP3s and a hashed gradient for artwork. It played, but every visible part of it
was a placeholder, which is why the app carried the mockup pill.

Both now read `packages/fixtures/tracks.ts`, five real releases from the Internet
Archive under CC BY, CC BY-SA or CC0, with the release's own cover art. The audio is
streamed from the archive item on first play, so the repository carries no music; the
covers are resized into `public/covers/` and served from the site, because a card
waiting on archive.org looks broken and a 33 KB image does not. Each track carries its
published running time, so the scrubber reads right before the file has loaded.

Attribution is at the point of use: the now-playing card names the release and the
licence, and `docs/credits.md` carries the full table. NonCommercial and NoDerivatives
material is excluded on purpose, since the site is public and the repository is MIT, and
`packages/fixtures/tracks.test.ts` fails the build if a track arrives under one of them
or names a cover with no file behind it.

Music drops `mock`. The screen is no longer invented data. Podcasts keeps its invented
shows and episode titles and so keeps the pill; only the audio underneath it is shared.


## 69. The home grid is arranged by hand and remembered, and the wallpaper with it

The home screen showed `apps.ts` in its written order and the dune wallpaper, and
Utilities was a fake app whose view drew a grid of icons. Two of the oldest iOS
gestures were missing: hold an icon and drop it on another to make a folder, and hold
the paper to change it.

`grid.ts` keeps the order the finger made, per half, as app keys and folders, in
localStorage under `os.home`. It is resolved against the registry on every read, so an
app installed or removed since the order was saved still lands or leaves, and a folder
left with one app dissolves into it. `apps.ts` stays the truth about what exists and
where it ships; a factory entry with `folder` is a folder the first time, which is what
Utilities is now. Its package is gone: a folder is grid data, not an app, and Spotlight
skips it.

There is no edit mode and no reorder. A hold lifts the one tile; a drop on a cell stacks,
a drop anywhere else springs back, and the rest of the grid jiggles only while a tile is
up. Reordering would need cells to make room as the finger passes, which is a second
gesture with its own ceiling, and nothing here needs it yet. Inside an open folder the
same hold carries a tile out: let go outside the well and it sits down after the folder.

The wallpaper is one string in `wallpaper.ts`, under `os.wallpaper`, for both displays
and for the bake. The alternatives are SVG gradients as data URLs, so the same string
is a CSS background and decodes into the canvas; nothing new ships. A picture off the
disk is shrunk to 1600 px and kept as a JPEG data URL so it fits localStorage; a Camera
shot is a `blob:` URL that dies with the page, so it hangs until reload and is not
restored. `screen.ts` reads `grid()` and `main.ts` rebakes on either store, so the fold
shows what the finger left.

## 70. Home parks an app, the switcher shows what is parked, and two halves share a divider

Going Home closed the app: the scene left the list and its React tree went with it, so
there was nothing to switch back to and no way to see what was running. iOS keeps the
last apps alive behind the switcher, and the folding footage shows the switcher's cards
and a split whose halves are not equal.

A scene now has a `parked` state: off the glass, still mounted, `display: none`. Home,
the home-bar swipe, an app's own `home()` and the lock all park; only the switcher's
flick, one app replacing another (`swap`) and a mirror going away close. Opening a parked
app brings the same instance back, so state survives a trip through Home and across the
fold. Six stay parked, the oldest closes past that, and Camera closes rather than parks so
no hidden app keeps the webcam.

The switcher reuses the hold the split gesture already had: pausing mid-swipe still makes
a card, and what happens next depends on the hand. Let go and every mounted scene lines up
as a card, most recent in front; drag sideways first and the halves are offered as before,
so the site's split cue plays unchanged. The cards are the app elements themselves,
transformed, so a card is the live app and no snapshotting is needed. The cover display
gets the switcher too, though it still cannot split.

The seam between two halves is a divider, dragged between 30% and 70%. `zone()` takes the
ratio, so the zoom, the drop card and the home bars follow it; it returns to the middle
when a half empties, since the narrow home the other half shows is always half.

## 70. The Store is laid out like the App Store, with the icon as the artwork

The first Store was a settings-style list: a gradient hero, then every app in one long
grouped list. It worked and looked like a form. The new root page follows the App Store:
a Today card, then one group per lane with its rows in two columns on a wide box, so nine
apps take one screen instead of three, and a lane filter (All, Official, Community) beside
the Apps/Updates segment, as the website's `/apps` browser has. A sideways carousel was
tried first and dropped: a mouse cannot scroll it. Restore previous version moved from
under the row to the detail page, next to Remove App, where the destructive actions live.

The Today card's artwork is the featured release's own icon, blown up and blurred under a
dark gradient: every app brings its own palette and no artwork has to be drawn or shipped.
Whether the box is wide decides the layout, measured with a ResizeObserver as Maps and
Camera do, not the display: a split half of the inner display is as narrow as the cover.
Every button label, `data-store-app` and `data-store-submit` hook and notice the store
checks drive is unchanged. The `appstore*` appearance tokens are no longer read; the
styles use the kit's `app` and `colors` tokens and plain sizes, as the kit's own do.

