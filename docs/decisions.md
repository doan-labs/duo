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
video embed that autoplayed on mount played twice from 90° down until tv.tsx
and youtube.tsx checked it; what should play once lives at module level, as
music.tsx's `deck()` already did. The cover
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
- Now Playing drives the Music app's deck, hoisted in `apps/music.tsx` from one
  per component to one per device. A track started in Control Center is the one
  the app opens on, and closing the app no longer stops the audio.
- The power glyph opens the shell's slide-to-power-off sheet, the same one the
  side button reaches; `+` puts the grid in edit mode.

Costs: `springboard/` now imports an app file directly (`apps/music.tsx`) and not
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
the phone's one-column Notes like the cover does (the same rule camera.tsx
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
`apps/notes.tsx`, with its data, persistence, folders, list and editor separated
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
