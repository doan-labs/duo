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
2026-09-12, accepted. Amends 16. `os/os.tsx` had reached 1992 lines holding every layer of
the shell at once, and the layer you wanted was always in the middle of another. It is now
boot only. The shell is `springboard/`, one file per layer, with `springboard.tsx` keeping
the layer stack and the state that outlives any one layer, `scenes.ts` the open apps,
`gestures.ts` the scrubber and the zoom geometry, `clock.ts` the minute two layers read;
`device.ts` is what the frame buttons reach and knows nothing about React, and `uikit/` is
what an app is written against. The names are Apple's because the seams already were, so
each file sits where someone who knows iOS would look rather than in a vocabulary invented
here. The import direction holds the shape: `apps/` sees `uikit/` only, `springboard/` sees
`uikit/`, `device.ts` and `apps/index.ts`, `device.ts` sees only types. Cost: five files
became twenty; `rise` and `fade` are redeclared in four files, since StyleX resolves a
keyframe only where it is used (working.md, Gotchas); and two seams pass a ref where a prop
would read better - `home-screen.tsx` writes its page into `pageRef` because `spot()` must
subtract a CSS transform `offsetLeft` cannot see, and `home-bar.tsx` takes `lockedRef`
because its hold timer fires 220 ms after the press.

## 24. The inner panel stays live through the fold, clipped where the fold takes it
2026-09-12, accepted. Amends 3, 4 and the last cost in 21. Folding used to swap whatever
was running for the baked home screen. Now `foldClip()` in main.ts computes the moving
half's free edge - rotated about the hinge exactly as `shaders/fold.ts` does, projected
back onto the glass along the ray it leaves the eye on - and clips the live panel there.
Same rays, same picture: the app keeps running and scrolling all the way to closed. The
clip is taken from the camera's own position, not the shader's fixed eye, so a panel with
no depth test stays off the fold at any pose. `screen.ts` can only draw the shell, so with
an app up the inner bake goes black and `ramp()` writes the shader's curves into the panel:
the darkening as one gradient, the blur as six nested `backdrop-filter` layers cut by
`clip-path`, because Chrome applies a backdrop-filter at full strength across its box and
mirrors the backdrop at its edge, so one masked layer cannot taper. `follow(angle >
HANDOVER)` mirrors the session onto the other display, opened with no zoom because nothing
is being launched; the lead passes at 40°, where the fold has taken 94% of the inner width.
Costs: React clears the panel container on first commit, so the ramp divs check their
parent every frame; a clip-path, a gradient and six full-panel blurs are written while the
hinge moves; an OS layer above `z-index: 10` would sit over the fold; past half way the
clip has eaten the ramp band and the fold line is a hard edge. The mirror is a second React
root, so an iframe loads twice, scroll is not shared, `arg` does not travel, and the copy
must start no sound (`os.mirror`). The cover cannot split (21), so it mirrors the first app
whole.

## 25. Control Center is three pages, and its switches are device state
2026-09-12, accepted. Amends 20, which stays true about where the panel sits and how it
opens. Apple's cover-display footage shows a rail of glyphs down the right edge and a Now
Playing card filling the panel, so the panel is a three-page track - tiles, Now Playing,
connectivity - moved by tapping the rail, one card per page rather than a second tile grid.
The status stack answers the panel while it is open: the battery ring reads the charge out,
the Wi-Fi glyph names the network. Nothing on it is decorative. The switches are
`springboard/toggles.ts`, a module store outside React, because both displays run their own
`<SpringBoard>` and per-panel state would let the cover be in airplane mode while the inner
display still had bars. Now Playing drives the Music deck, hoisted to one per device. The
power glyph opens the shell's power-off sheet and `+` puts the grid in edit mode. Costs:
`springboard/` now imports `apps/music/index.tsx` directly, so the shell → app surface is
wider; the deck's clock is a 4 Hz `setInterval` that outlives every listener, because audio
keeps time with nothing mounted; a control removed in edit mode is remembered per panel and
only for the session. Toggles are switches, not behaviour - airplane mode empties the
status ring but nothing here has a radio (flashlight: see 29).

## 26. The phone gives way to the window, not the other way round
2026-09-12, accepted. Amends 22. 22 cut the window to the silhouette a fold paints, which
broke the moment the view turned: edge-on, perspective magnifies the near half to 19.8 cm
against 11.9 flat. Holding that at 37 px/cm needs an 880 × 860 window, bigger than the
960 × 760 we set out to shrink, and holding none of it crops the phone. So the window keeps
its size and the phone yields: `frame()` measures every frame where the phone's bounds land
on the glass at the reference eye and picks the scale that fits them into the box the bands
leave, capped at 37 px/cm. Face on nothing moves; edge-on it is 97%, tilted 45° about 70%.
Bounds, not pixels, because this runs per frame: one box per mesh in two piles, the turning
half measured in the hinge's space so the group's matrix folds it as `shaders/fold.ts`
does, since a vertex shader never reaches a mesh's own bounds. Apple's 96-vertex
phone-sized proxy paints nothing and is excluded as `PHANTOM`, or everything sits at two
thirds size. Costs: nothing may assume 37 px/cm except face on; the box fit reserves room
for a rounded corner the phone does not paint, so a steep tilt comes out about 10% small;
the wheel is left out, since the fit reads direction and not distance, so zooming past
~36 cm still crops; and the frame is anchored on the hinge, so a closed phone hangs to one
side.

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
2026-09-12, accepted. Amends 25, which left the flashlight lighting its tile and no more.
It is the one switch in Control Center with something physical to show: Apple's model
carries the LED as a 3.4 × 1.6 mm recess beside the rear cameras, emitter, glass and
housing as three meshes. The emitter and glass go emissive, a small blended halo sprite
sits off the glass and a point light spills onto the plateau; the housing stays dark so the
pill keeps its edge. Additive blending was tried first and clips to a flat white disc on a
white body. The lock screen's torch button flips the same device-wide switch, so the LED,
the tile and the button agree from either display. iOS 18 answers a flip by expanding the
Dynamic Island into a black card; the Duo has no island, so the card drops out of the top
edge on its own and goes back after 1.8 s. It reacts to the switch and not to the tile that
flipped it, so it shows on both displays and for the lock screen button too. Cost:
`main.ts` now imports from `springboard/`, the one place the scene reads shell state
directly - a boolean a frame, no subscription. The arc has one level lit or dim, as the
torch has no brightness to set.

## 30. Notes is iPadOS on the open phone, and its handwriting is a font
2026-09-12, accepted. The app was one `textarea` on a white sheet. Unfolded, the inner
display is 790 × 555 px - an iPad mini's shape - so Notes now draws what iPadOS draws at
that size: a folder sidebar, the note list, the note, and the pencil palette floating over
all three. It picks the layout off its own box with a ResizeObserver, not off the display,
so a split half gets the phone's one-column Notes like the cover does (the same rule
camera/index.tsx follows). Folders and tags are Apple's sample set and filter nothing; the
list's titles and previews are read back out of the text, so an edit retitles a row as it
is typed. The sidebar glyphs are real SF Symbols out of AppKit, tinted the system yellow
Notes uses, because emoji stand-ins read as another app's icons next to the real ones. The
handwritten note is the system handwriting face at 52 px, not ink paths: a path per glyph
would be the only hand-drawn artwork in the project, and the text stays an editable
`textarea`, which paths could not be. Cost: the handwriting is Bradley Hand, which every
Mac and iPhone has and no Windows or Linux box does, falling back through Segoe Script to
whatever `cursive` maps to. The palette's colours re-ink the whole note rather than a
selection, its undo is the note's own, and it sits 26 px up so the home bar keeps its
band.

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

2026-09-18. The site was rewritten as a single launch story with the product as the
centrepiece. The hero, the camera scene and the store scene embed the real shell;
`packages/shell/main.ts` now reads `?bg=` at load and `{ deg, yaw, bg }` by same-origin
postMessage, registered before the model loads so a message sent at the frame's load event
is queued rather than lost. The site posts the page's body colour so the device floats in
either theme, and posts poses instead of reloading the frame. Every other scene uses
`packages/web/src/device.tsx`, two hinged panels in CSS 3D driven by a motion value,
because three WebGL scenes with the 3.5 MB model are the ceiling one page can afford and a
scroll-linked pose needs per-frame control. Two build facts came out of the rewrite. React
19 hoists stylesheet links above inline `<style>`, so the reset's `@layer reset` was
declared after StyleX's priority layers and `* { margin: 0 }` beat every StyleX margin in
production; the reset now lives in `packages/web/src/reset.css`, imported before the
virtual StyleX sheet. And the prerender crawl's ten parallel fetches timed out often enough
to fail one build in three; it runs three at a time and skips trailing-slash duplicates.
Cost: the shell carries a small website-only listener, the CSS device is a stylised app
rather than the real OS, so those scenes show layout and not software, and a bridge change
needs `bun scripts/simulator.ts`.

## 55. The page scrolls through Lenis, the camera scene asks on arrival, and the frame drops its title

2026-09-18. Three follow-ups from the first review of the launch page.

**Lenis smooth scroll.** The whole document sits in `ReactLenis root`
(`packages/web/src/smooth-scroll.tsx`) with `anchors` and `stopInertiaOnNavigate` on. Root
mode scrolls the real window, so `useScroll` in the fold scene reads the same position it
always did, and the wrapper renders its children directly, so the server and client DOM
match. Readers with reduced motion never get an instance. `lenis` is the one dependency
added since 53, at the user's request. Cost: Lenis puts `lenis` classes on `<html>`, which
the theme check in `check.mjs` now ignores.

**The camera prompt fires on the scene, not on the frame.** Mounting a screen early with
`?app=Camera` asked for the webcam while the reader was still a section away, and a refusal
left the app saying "allow access and reopen" with no way to reopen. Now `home/camera.tsx`
watches its own column; at four tenths on screen the page calls `getUserMedia`, stops the
stream, and only then mounts the frame, which finds the permission already answered. Cost:
the device appears a second or two after the reader arrives.

**Embedded frames show the device alone.** `packages/shell/hud.tsx` renders the "iPhone
Duo" heading and the display line only when `window.self === window.top`; the hint line and
control bar stay in both. The footer credits the studio with the inlined Doan mark.

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

2026-09-18. The "it behaves like a device" scroll had captions about a song, a screenshot
and split screen over a phone showing its home screen. The bridge in
`packages/shell/main.ts` now takes `cue` beside `app`: `{ split: 'Safari' }` replays the
real home-bar drag through the shell's own `grab()` with synthetic pointer events (up, hold
until it is a card, over to the left half, drop) and opens the named app on the free half;
`{ screenshot: true }` presses the chord; `{ play: true }` starts the deck muted, because a
page scroll is not a gesture to play sound on. The scripts live in `packages/shell/cues.ts`,
the page never touches the shell's DOM, `app` clears the stage first so a step always shows
one app whole, and anything that lands before the displays have booted waits instead of
throwing. This changes decision 24's crossing: a launch arriving with a new pose used to
land on the display in use at that instant, and the hinge then passing 40° made the other
display the lead with an empty stage and mirrored the app away. `follow()` is now called
with the target angle rather than the eased one, and the bridge calls it before launching.
Cost: the frame buttons act on the target side for the fraction of a second the hinge is
still easing.

## 59. Photos is the macOS Photos window, and baked apps keep shared state at module level

2026-09-18. Photos was a title over a square grid. It is now the macOS Photos window: a
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

2026-09-18. Apps live under `community-apps/<slug>/` as independent projects (not
workspaces, no root lockfile edits); `community-apps/registry.json` is the ownership
record, because an `author` string in a manifest proves nothing. Pull requests run
`scripts/check-submissions.ts` with read-only permissions and no secrets, and a pass means
eligible, not accepted. Empty permissions are required for a first curated release, so
publication never widens runtime privilege.

Publication is two jobs: the read-only one builds the merged commit, and
`scripts/publish-catalog.ts` copies validated release files as data, refuses a version
already published with different bytes, reuses an identical release without touching its
metadata (the builder stamps `build.at`, so a rebuild must not win), and assembles
`index.json` from every release in the tree so one publication cannot drop another's
listing. The tree is the `catalog` git branch: same origin as the static site, a rejected
push is the conflict detection between close merges, and the history is the audit log. The
website build merges it with the bundled Notes and Weather releases into `/catalog/`, which
the Store tries before `/cdn` and `/preinstalled`.

The Store names which catalog it is reading and offers **Back to Duo catalog**; a
cross-origin update is refused with both origins named rather than silently inherited.
**Submit your app** goes through an `open_url` command behind the `Platform` trait, so the
web side never learns which OS opens URLs. Cost: a release is live only after the next
deploy, and the publish job can verify the branch but not the hosted URL. Rejected: an
object bucket (credentials and a second origin, while installs bind updates to their
origin), and built releases on `main` (binaries in contributor PRs, a follow-up commit per
merge).

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
2026-09-18, accepted. The 3.6 MB body was requested only after the icons loaded and both
displays were baked, so the download started about three seconds into a page that then sat
black until it arrived. It is now asked for in `index.html` (`rel=preload`, one request:
the loader picks up the same entry) and kicked off at the top of `main.ts`, so it flies
while the rest of the boot runs. The canvas and the CSS3D layer start at zero and fade in
on the first frame that has the phone in it, and an embedding page holds a breathing
outline until then. Which needs a handshake, because the shell can be drawn before the page
that embeds it has hydrated: the shell announces `live` when it can take a message and
`ready` when it has drawn, the page answers by sending the pose, and the page's own `hello`
is answered with whichever state applies. The frame's load event is no longer the trigger -
cross-origin it cannot be recovered after the fact, which is why the website's frames
stayed hidden in development. A framed shell also stops painting the standalone page's
light background, so a dark site gets the phone on its own backdrop rather than a white
card while `bg` is in flight. Cost: two more message shapes on the bridge, and a page that
ignores `hello` still gets the announcements.

## 64. `/kit` is a showcase, the reference moves under `/kit/docs`
2026-09-18, accepted; the drifting strip is superseded by 97. The UI kit's landing page was the reference itself: a lead paragraph,
one code block and a list of 47 export names. It answered "what is the signature of Row"
and nothing else, so a visitor who had never seen the kit left without seeing a single
component. `/kit` is now one hero in the launch page's own language: a headline whose count
is read from the generated API, the install line, and a full-bleed strip that drifts every
demo in `src/kit-demos/` past at the cover display's 387 points. The strip is two identical
runs sliding one run's width, so the loop never seams; hover or focus pauses it, which is
how a visitor presses a component before following its name to the reference. Under 734 px
and under reduced motion the drift is off, the second run is not rendered and the strip is
a plain scroller. Nothing on the page is a screenshot or a second copy: the hero reads
`src/kit/data.ts`, the generated API filtered to the kit plus which names have a demo file,
so a new export or demo changes the page without an edit. Rejected: a browsing page
underneath the hero (a gallery at both display widths, a search over every export, the
palette and symbol set), which rebuilt `/kit/docs` in a second visual language. Cost: 18
demos mount on load, twice that on a wide screen. They are DOM, not canvas, and the
alternative was a wall of images that goes stale.

## 65. One browser builder replaces the two product entry pages

2026-09-18. `/build` combines a bring-your-own-key chat with the real simulator;
`/get-started` and `/simulator` redirect there. This supersedes the separate product pages
in decision 57. CLI setup stays in developer docs; `/device/` stays the embedded shell. The
owner selected direct browser provider requests over a Cloudflare Worker proxy:
credentials and prompts never pass through Duo's servers, at the cost of requiring provider
CORS. OpenRouter is the initial default; custom HTTPS Chat Completions endpoints and manual
model IDs remain available.

Compilation is esbuild-wasm and Babel standalone in a worker, using StyleX's official
browser plugin and a precompiled, fixed React/SDK/kit runtime: no runtime npm installation,
no generated code in the trusted page, and named token imports resolve against that exact
runtime build. Whole source revisions simplify validation and recovery. This is not a
substitute for CLI type, publication or runtime checks.

Browser previews extend verified development documents with a token-bound parent channel
and project-owned namespace. Explicit revision activation checkpoints data, retires old
authority and replaces app frames while keeping the phone mounted; this amends preview
selection in decision 49, not installed update rules. Undo restores the corresponding data
as well as code, but arbitrary React state is not preserved. Credentials stay in page
memory, never in worker, project or simulator storage. Readiness is reported after a
successful React commit, including hidden mirrored displays whose paint callbacks Chromium
can suspend - this amends the preview interpretation of first-paint readiness, and visible
pixels need separate checks.

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

2026-09-19. Decision 65 made `/build` the single product entry. Its first live use showed the
interaction and provider setup were not ready to ship, and the page depended on the
simulator being healthy to become usable at all. The navigation item is now `Simulator`
and points at `/simulator`, the standalone page where a visitor folds and taps the phone
online with nothing to configure. `/build` and `/get-started` redirect there.

The builder source, its provider presets, model list and end-to-end check remain in the
repository as upcoming work rather than being deleted, so the next attempt starts from the
refined workspace instead of from zero. This supersedes the routing part of decision 65;
its credential and preview-lifecycle guarantees still govern the parked code.

## 68. Music plays licensed recordings instead of invented ones

2026-09-19. The Music app and Control Center's deck shared five invented titles over SoundHelix
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

2026-09-19. The home screen showed `apps.ts` in its written order, and Utilities was a fake
app whose view drew a grid of icons. Two of the oldest iOS gestures were missing: hold an
icon onto another to make a folder, and hold the paper to change it.

`grid.ts` keeps the order the finger made, per half, as app keys and folders, in
localStorage under `os.home`, resolved against the registry on every read, so an app
installed or removed since still lands or leaves and a folder left with one app dissolves
into it. `apps.ts` stays the truth about what exists; a factory entry with `folder` is a
folder the first time, which is what Utilities is now. Its package is gone: a folder is
grid data, not an app, and Spotlight skips it. There is no edit mode and no reorder - a
hold lifts one tile, a drop on a cell stacks, anything else springs back, and the grid
jiggles only while a tile is up. Reordering needs cells to make room as the finger passes,
a second gesture with its own ceiling, and nothing needs it yet.

The wallpaper is one string in `wallpaper.ts` under `os.wallpaper`, for both displays and
the bake. The alternatives are SVG gradients as data URLs, so the same string is a CSS
background and decodes into the canvas; nothing new ships. `screen.ts` reads `grid()` and
`main.ts` rebakes on either store, so the fold shows what the finger left. Cost: a picture
off the disk is shrunk to 1600 px and kept as a JPEG data URL to fit localStorage, and a
Camera shot is a `blob:` URL that dies with the page, so it is not restored.

## 70. Home parks an app, the switcher shows what is parked, and two halves share a divider

2026-09-19. Going Home closed the app: the scene left the list and its React tree with it,
so there was nothing to switch back to and no way to see what was running.

A scene now has a `parked` state: off the glass, still mounted, `display: none`. Home, the
home-bar swipe, an app's own `home()` and the lock all park; only the switcher's flick, one
app replacing another (`swap`) and a mirror going away close. Opening a parked app brings
the same instance back, so state survives a trip through Home and across the fold. Six stay
parked, the oldest closes past that, and Camera closes rather than parks so no hidden app
keeps the webcam.

The switcher reuses the hold the split gesture already had: let go and every mounted scene
lines up as a card, most recent in front; drag sideways first and the halves are offered as
before, so the site's split cue plays unchanged. The cards are the app elements themselves,
transformed, so no snapshotting is needed. The cover gets the switcher too, though it still
cannot split. The seam between two halves is a divider dragged between 30% and 70%;
`zone()` takes the ratio, so the zoom, the drop card and the home bars follow it, and it
returns to the middle when a half empties, since the narrow home is always half.

## 71. The Store is laid out like the App Store, with the icon as the artwork

2026-09-19. The first Store was a settings-style list: a gradient hero, then every app in one long
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
checks drive is unchanged. The `appstore*` appearance tokens were rewritten for the new
styles: `scripts/check-app-tokens.ts` keeps every size, weight, radius and fixed colour in
an app's styles in `tokens.stylex.ts`, so the store's live there too.

## 72. Settings is real, or the row is not there

2026-09-19. Settings was 75 lines of decoration: four switches wired to nothing
and sixteen chevrons that went nowhere. It is now a `Nav` stack where every row
does something, and Apple's rows with nothing behind them are absent rather
than drawn. The radios flip `springboard/toggles.ts`, the store both status
stacks and Control Center already read, so Airplane Mode in Settings empties
the bars on both displays. Apps lists `os.store`'s installed releases with
their real version, size, source and permissions, and removes one through the
same `store.remove` the App Store calls. About reads the catalog and
`navigator.storage.estimate()`; Duo Storage divides the measured usage rather
than the quota, because a browser hands out gigabytes and a release is
kilobytes. Transfer or Reset runs `runtime/erase.ts`: clear every object store
in `ipduo`, drop the `os.` and `duo.` localStorage keys, reload — the next boot
reseeds the preinstalled catalog exactly as a first visit does.

Baked apps never import the shell, so the switches, the eraser and the link
opener arrive as one `SettingsHost` prop from apps.ts, the way the Store gets
`openExternal`; `Switches` moves to the SDK so the shell's store and the app
cannot drift apart. Costs: Settings drops `mock` but is far shorter than iOS's
root, so a reader looking for Display & Brightness will not find it. The erase
is deliberately not `localStorage.clear()` — the shell shares an origin with
the website, whose `ipduo-theme` and `duo-builder-*` keys have to survive a
phone being wiped. And uninstalling a preinstalled app is undone by the next
reload, because `bootRegistry` reseeds any bundled release that is not
installed. Rather than change the reseed, the button goes: `StoreRow` gains
`preinstalled`, read from the `seeded` mark the boot install writes, and
neither Settings nor the App Store draws Remove App for a row that carries it.
A dead button is worse than a missing one.

## 73. An app can claim the side button's double-click while a sheet is up

Apps received no hardware button events: the frame's side button double-click always
launched Wallet from `device.ts`. Flappy Duo's Duo Pay sheet needed the same gesture as
Apple Pay, and a fake side button drawn inside the app is not the frame's button. The
minimal route is a claim: `side.claim` and `side.release` on the bridge, a `side` event
back, and a registry in `device.ts` that `wallet()` consults before launching Wallet. Only
a claiming view that is visible and active receives the press, so a background app or the
other display cannot swallow it, and the bridge drops the claim on revoke. Single clicks,
long press and volume stay with the shell; forwarding every button was considered and
skipped until an app needs it. Older SDKs never send `side.claim`, so they never receive
`side` and keep treating unknown events as a protocol error safely.

## 74. The ready deadline only runs while the view is visible

A deep link (`?app=`) opens the app on both displays, and the display not in use keeps
its root at `display:none` so the sandbox document stays alive. Nothing in that document
paints, so an app that reports ready from `requestAnimationFrame`, as every first-party
app and the CLI template do, never reports it there. The hidden view was the session
owner, its 10 s deadline failed it, and the session ended with reason `error` on the
display the person was looking at. The bridge now arms the ready timer only while
`ViewInfo.visible` is true and re-arms when visibility flips; the hello deadline is
unchanged because scripts run in hidden documents. Changing every app to call `ready()`
outside a frame callback was the alternative, and it would not have covered third-party
apps built from the template.

## 75. The device's design system is Apple's, expressed as scales

2026-09-19. Supersedes the "no visual redesign" clause of 48 and the 15 px body
in 17's successor tokens. The kit's palette was iOS 13 (`#007aff`), its body text
15 px at 1.3 leading, and 356 `appAppearance` constants named by their first use
(`musicFontSize6`, `settingsBorderRadius3`) carried every size, weight, radius,
shadow and timing an app wanted, so no two apps agreed on anything. The token
module now holds what Apple publishes and nothing an app invents: the iOS 26
system hues with their dark siblings and `grey`..`grey6`; the UIKit dynamic
colours as the per-app `app` theme (`label2`, `label3`, `link`, `separator`,
`fill`..`fill3`); Dynamic Type at the Large size as `typeScale` + `leading` +
`tracking` + `weight`, with `typography` as whole steps and four `display` sizes
for oversized numerals; a 4 px `space` scale; `radius` at 4/8/10/12/16/22/pill;
four `shadow`s (`card`, `float`, `rim`, `text`); `glass` as blur and tint per 18;
`motion.press` as the one press state. `appAppearance` keeps only an app's own
colours, gradients and halos, prefixed with the app's folder name, and
`scripts/check-app-tokens.ts` fails an app that reads another app's key, any
literal colour, size, weight, radius, shadow, tracking, leading, font or timing
in `packages/apps` or `packages/shell` (canvas and WebGL files exempt). Body is
17/22 with -0.43 px tracking, so every app grew; that is the HIG's reading size
and the deviation was not defensible. The apple.com marketing system was
considered and rejected for the device: its `#0066cc` accent, parchment tiles
and 56 px hero belong to a web page, not to an iPhone. Cost: a one-time
migration of 38 apps and the shell, and the kit moves to 1.0.0 because names
were removed.

## 76. The CSS-3D device is gone; the real shell carries every scene

2026-09-20. Decision 54 chose a CSS-3D Duo (`packages/web/src/device.tsx`) for the
scroll and posture scenes, on the reasoning that three WebGL frames carrying the
3.5 MB model were the ceiling one page could afford and that a scroll-linked pose
needed per-frame control. Both scenes have since moved back to the real shell:
`home/works.tsx` drives a sticky `Simulator` by pose over the postMessage bridge and
`home/fold.tsx` eases it between four postures. The component was left exporting a
`Device` nothing imported, so it was deleted. This supersedes the second half of
decision 55; the embed bridge it also established stands unchanged.

The reasoning that produced it was sound and may return: a second stylised device
is the right answer if a scene ever needs a pose the shell cannot be asked for, or
if frame count becomes a measured problem again. Git history holds the component.

Two things came out of the same pass. Three.js `OrbitControls.connect()` sets
`touch-action: none` on the canvas it is given, and the shell's canvas covers the
whole frame, so once the hero showed the real device at phone width a touch drag on
it scrolled nothing at all; `packages/shell/main.ts` now sets `touch-action: pan-y`
after the constructor, which returns vertical drags to the page and keeps the
horizontal drag that actually turns the phone. And `motion` renders `tabIndex` as a
real SSR attribute for any element carrying a gesture prop, while `useReducedMotion()`
returns `null` on the server and a boolean on the first client render: gating a
gesture prop, a style or an `initial` pose on that value changes the markup between
the two and aborts hydration for the whole tree. Props stay present, `tabIndex` is
stated, and only values are gated. Note that `?? false` does not fix this, because
the divergence is server-`null` against client-`true`.

## 77. Settings splits on the unfolded display

2026-09-20. Decision 72 made Settings a `Nav` stack, which is the right shape for
the cover and wrong for 790 px of inner glass: one column of rows with half the
width empty. It is now iPadOS's split view above 600 px of measured width, the
threshold Photos and Weather already switch at. The root list is written once, as
`rootList()` in `index.tsx` returning `Group[]`; `sidebar.tsx` draws it as
destinations and `Folded` draws it as pushing rows, so a row cannot exist in one
layout and not the other. Selecting a destination is a keyed `Nav`, which drops
whatever the last pane had pushed and replays `shared.swap` on the fresh mount.
The sidebar's field filters the same list rather than opening a search pane.

Settings gains `edge` in apps.ts so the sidebar's material reaches the top corner
the way Apple's footage shows it, and each column pads its own 40 px. The pad goes
on the flex parent of `Nav`, never inside it: `Nav`'s pages are absolutely
positioned at `inset: 0`, which resolves against the padding box and would cover
the band. Nothing behind a row changed, and decision 72's rule stands: the panes
Apple has that this device does not are still absent rather than drawn.

Three geometry values are the app's own rather than the kit's, because the kit's
row is a phone list and this is iPadOS: cards take `radius.xl`, rows are 44 px
whatever they carry (the kit's 11 px padding makes 52 with a glyph in it), and
the row hairline is inset to where the label starts instead of running edge to
edge. All three live in `styles.ts` and reach every pane through the `Row` and
`Section` wrappers in `parts.tsx`, so no call site states them. Cost: Settings
and the other grouped lists in the shell no longer match row for row.

## 78. Calendar's month is a sheet ruled by the week, and it opens with a life in it

2026-09-20. The first month view drew a full grid: a rule on every cell edge, a wash
on the weekend columns, and the date set at body size in the top right. On a fresh
install it also drew nothing else, because `useEvents` fell back to an empty list.
Both together read as a spreadsheet someone had forgotten to fill in, which is not
what the app is.

Apple's month view is a sheet ruled only by the week. There are no column rules, and
that is not decoration: a multi-day event is one bar running across the days it
covers, and a vertical rule every 80 px would cut it into pieces. So the week is now
a grid of seven columns and a few 15 px lanes, and `lanes.ts` packs each event into
the first lane free for its whole run. Day and Week use the same packer for their
all-day row, which is why `Cupertino trip` is one bar there too instead of the same
title repeated in four columns. A week that runs out of lanes counts what it dropped
and opens the day, so nothing is hidden silently. Day numbers are the footnote step,
centred, and today and the picked day are discs rather than pills, which is why the
disc drops the `1 Sep` month label: the label would stretch it.

The cover gets dots. At 387 points a title is four letters and an ellipsis, so the
narrow month draws up to four dots under each number and a tap opens the day, which
is what iPhone does and what rule 1 asks for. Nothing is cover-only or inner-only;
the same events are reachable from both.

A fresh install seeds a working month around today (`seed.ts`), the keynote the
home-screen widget draws included, so the tile and the app agree. The first edit
writes the whole list to storage and it is the person's calendar from then on. Work
is orange, not red: the only red on the sheet should be today.

## 79. Calendar is two sheets, not one, and the rule weight is the whole argument

Decision 78 dropped the column rules from the month, reasoning that a vertical line
every 80 px would cut a multi-day bar into pieces. Held against the real thing, that
was wrong: macOS Calendar rules its month both ways and still runs a bar straight
over the rules, because the rule is a seventh of the weight of a separator. The
mistake was not drawing the line, it was drawing it at `app.separator`, which is
sized for one hairline between two rows, not for seven crossing every week. So
`appAppearance.calendarGrid` exists and every rule in the app is on it, and
`calendarWeekend` shades Saturday and Sunday the way both sheets do.

The month is now two sheets from one component. Inside, it is the Mac's: ruled both
ways, weekend shaded, the number hung on the right of its day, the picked day lifted
whole. On the cover it is the phone's: no rules, no shading, the number centred over
its dots. Rule 1 says design for the cover first, and the cover is not a small Mac.

The month also stopped ruling an empty sixth week. `weeks()` returns the weeks a
month actually spans, so a five-week month gives its rows the height it has, and the
lanes are `1fr` rather than a fixed 16 px, which is what kept the third lane on the
sheet in a six-week month instead of off the bottom of it. The thumbnail in the
sidebar and the twelve in Year pad back to six, because a grid that changes height
every month jumps.

Day and Week hang their hours on their own lines rather than near them, and draw now
the way Calendar does: pale across the week, solid with a dot on today, the time
itself in a pill in the gutter. The head is one grid with the body, and the scroller
has no scrollbar, because a gutter on one and not the other is what knocked the two
out of line.

The sidebar's calendars are the kit's `Checkbox`, which was written as macOS
Calendar's tinted square and had drifted out of use. A dot plus a trailing checkmark
was iOS's pattern wearing a Mac layout.

`Sheet` now leaves the way it arrives. It popped in and vanished, because a native
`<dialog>` closes the moment `close()` is called. `usePresence` holds the close back
200 ms so `popOut` and the backdrop's fade can play, and `onCancel` is intercepted so
Escape goes through React rather than closing the dialog out from under the
animation. Every popover in the repo is this component, so they all gained the exit.

## 80. The fold rule and the JSON encoding each get one home

2026-09-20. Calendar's layout branch was the fourth copy of the same eleven lines:
a `ResizeObserver` on the app's own root, a comparison against 600, a `wide`
boolean. App Store, Notes and Photos had written it out too, each with its own
version of the comment explaining why it measures a box instead of reading
`useDisplay()`. The rule is a design decision, not app code: a split half of the
inner panel is as narrow as the cover, so the room an app has is the only thing
that can choose its columns. It is now `useWide(at = 600)` in the kit, returning
`[ref, wide]`, and in every one of those apps the ref existed for nothing else, so
each lost six lines and the threshold stopped being a number per app.

Decision 77 wrote the fifth copy while this was in flight, which is the argument
rather than an objection to it: Settings had reached the same 600 independently
and named it `SPLIT`. It reads the kit's default now. Five apps arriving at one
number by hand is how a design decision turns into folklore.

The same argument settled the second copy. `useKV` is strings-only by contract and
that is right, but every app storing a list had wrapped it in the same three lines:
parse or fall back, stringify on write. Calendar and Notes each kept a private
`parse` helper and Reminders inlined it. `useJSON(space, key, fallback)` in the SDK
is that wrapper, next to `useKV` rather than in the kit, because it is storage and
not presentation. `fallback` is the useful half: nothing written yet is a fresh
install rather than an empty list, so Calendar seeds its month there and Reminders
ships its five tasks there instead of at the call site.

Neither is a new capability and neither is a component. The bar for moving
something into the kit is a second consumer that already exists, which is why the
calendar's date helpers, its lane packer and its sidebar chrome stayed in the app:
one caller each, and a sidebar whose width, ground and border differ per app is
four lines of flex pretending to be a component.

## 81. The pop-up menu is the kit's, not each app's

2026-09-20. Four menus had been written by hand — Safari's page actions and its
bookmarks overflow, Maps' map type, Weather's units — and each was the same
sheet: absolutely placed glass, `shadow.float`, a column of rows with a glyph on
the trailing edge. Only Safari's knew how to leave. `Menu` in the kit is now the
control: it owns `role="menu"`, the radio row and its tick, staying mounted
through `floatOut` and going dead to the pointer while it sinks. `MenuItem` is
`label`, `icon`, `checked`, `disabled`, `name` and `onSelect`; nothing about
where the sheet is.

Placement and tint stay with the app, through `xstyle` on the sheet and
`itemStyle` on a row, because a menu over a map wants a near-opaque white at a
corner of the map's chrome and one over a night sky wants dark glass under a
title. That is the same split the kit already uses for `Button` and `Toggle`:
the kit carries the control, the app carries where it sits. The alternative, an
`anchor` prop enumerating corners, would have had to grow a case for Safari's,
which is not anchored to anything — it stacks above the address bar in the
floating toolbar's own flow.

The sheet draws no scrim. Safari needs one because its page is a cross-origin
frame that never reports a click, Maps closes on the map's own pointer handler,
and Weather's list closes on its rows; a scrim in the kit would have been right
for one of the three and in the way of the other two. Cost: a new menu has to
decide for itself what dismisses it, and Maps and Weather changed appearance
slightly: both gained the exit they never had, and Weather's typed `✓` is now
the same `app.link` tick Maps was already drawing.

## 82. The menu draws iOS 26, row for row

2026-09-22. Safari's two menus were a guess at Apple's: a glyph on the trailing
edge, no rules between groups, and a list of whatever the shell could do. Held
against screenshots of iOS 26, Apple's more menu is Share, Add to Bookmarks, Add
Bookmark to…, a rule, New Tab, New Private Tab, and a footer of two glyph-over-
caption buttons, Bookmarks and All Tabs; the page menu is Hide Distracting Items,
Translate, a rule, Manage Extensions, and a footer of Find on Page and the two
text-size buttons. Every glyph sits on the leading edge.

`Menu` now draws that: `icon` leads, `items` takes `'separator'`, and `footer` is
the closing row. Maps and Weather inherit the leading glyph, which is the iOS 26
shape they were meant to have. Safari fills both menus with Apple's rows and greys
the ones a cross-origin frame forbids, Hide Distracting Items, Translate, Manage
Extensions and Find on Page, rather than dropping or faking them. Text size is
real: Safari's Page Zoom is the frame laid out at 100/z and scaled by z, in
Apple's eleven steps from 50% to 300%, remembered per host for the session. Seven
SF Symbols join the set for the new rows. Cost: a private tab is a plain new tab,
since the shell keeps no history or storage for any tab, and the •••
sub-menu inside the page menu (Request Desktop Website, Page Actions, Website
Settings) is not drawn yet.

## 83. The address bar is iOS 26's dark glass, with nothing under it

2026-09-23. Held against the phone, Safari's bar was wrong three ways: a white
glass with a second white field inside it, three drawn lines where Apple has a
glyph, and a toolbar row of back, forward, share, bookmarks and tabs under a
layout that has none. On iOS 26 the pill, the back button and the more button
are one dark glass, rgb 73 over a white page, that lets the page's type show
through, and the leading glyph is `text.below.rectangle`, a symbol only Apple's
own apps get. `scripts/symbols.swift` now falls back to CoreGlyphsPrivate, where
it loads by name through `Bundle.image(forResource:)`.

The bar wears the kit's `dark` theme, so its type, glyphs and placeholder read
from `app` like any dark screen. The address sits straight on the glass at 17 px,
and at 13 px on the cover, whose camera column leaves the host about 80 px. The
toolbar row is gone from the inner display: share, bookmarks and all tabs were
already in the more menu, and bookmarks takes the round close button an iOS 26
sheet carries.

The compact bar is measured off the phone rather than guessed: the full pill at
72%, sunk 10 px to sit just above the home indicator, as wide as the host plus
18 pt either side, which a canvas measures because an input never sizes to its
text. The scale springs and the width does not, since a width that overshoots
narrows the pill past the name it is shrinking around. A tap on the compact pill
only brings the bar back; the next one edits the address. Cost: forward has no
button on the inner display, as on the phone, where it is a swipe the shell
cannot take from a cross-origin frame. The glass is always dark, where Apple's
lightens over a light page in light mode; the shell cannot read a frame's pixels
to choose.

## 84. Safari's buttons give under the finger, and All Tabs is iOS 26's overview

2026-09-23

The more and back buttons had no press state, and the page menu and reload
glyphs had one on the bar's .45 s transition, so a click lifted before they
moved. Every Safari button now takes the kit's `motion.press` in
`motion.pressDuration` and lets go on `easing.spring`, the durations switching
on `:active` so the way in is fast and the way out springs. The round glass
buttons also light, to `safariBarPress`, as iOS 26's glass does, and a bookmark
row greys at once and fades instead of shrinking, as an iOS list row does.

All Tabs was light cards with a close dot top-left over a white page. It is now
the phone's overview: the cards on dark ground under the kit's `dark` theme, a
glass close dot top-right, and in place of the address bar a new tab button,
the Private and Tabs segments on one glass track, and a blue Done. Private tabs
are a list of their own: New Private Tab and the overview's + on Private add to
it, it may run empty and then shows its own page, and Done goes back to the open
tab if it is in the list on show, else that list's last tab, else a new one. The
open tab is held by id, since closing a tab before it would shift an index.
Cost: a private tab is private only in name, as before, since the shell keeps no
history or storage for any tab. The status bar stays dark-on-light over the dark
overview: the shell draws it from the manifest's fixed `light` flag, and no app
can change that while it runs.

## 85. Phone is iOS 26's five tabs, and its keypad fits the glass

2026-09-23. Phone had two tabs, Recents and Keypad, on a flat strip, and its keypad
was a fixed 521 px that both displays are too short for, so the number you typed
went off the top (issue 23). Held against a screenshot of iOS 26, Phone is five tabs,
Favorites, Recents, Contacts, Keypad and Voicemail, on a floating capsule with the
selected tab on a lighter pill, and dark keys under a hairline with a handset on a
deep green call key.

Phone now draws that. The bar stops 22 px up, clear of the home indicator. The keys
and call key are one `min(76px, (100cqh - 141px) / 5)` disc, the Calculator fix,
and the digit is 45% of it, so the keypad shrinks as a whole and the number always
shows. Every row on the new tabs calls, as Recents always did; tapping a voicemail
calls back and clears its dot. Six SF Symbols join the set, the handset among them,
so the call key drops its emoji. Cost: letters under the digits keep the ramp's
tracking rather than iOS's wide spacing, favourites are a fixed four, there is no
voicemail audio, and a contact has no detail page in Phone.

## 86. The Store wears the App Store's sidebar, and the app page opens inside the pane

2026-09-20. Decision 71 gave the Store the App Store's list shapes but kept a settings-app
skeleton around them: one long root page, a filter line of chips, and a detail page that
pushed over the whole app. Beside a real App Store window the difference was structural, not
cosmetic.

The root is now a sidebar of sections, as the Mac App Store has: search at the top, Discover,
Apps, the three lanes, Updates and Develop with their counts, and the catalog everything came
from at the foot with Refresh beside it, where the account row sits on a Mac. The lane chips,
the Apps/Updates segment and the header's Refresh are gone; the sections carry that. On the
cover a sidebar would be a sidebar and no page, so the same list becomes a tab bar and the
search field moves up beside the large title. The lanes have no room in four tabs, so Apps
shows every lane there. The box decides, as it did before, not the display.

Both float, inset and rounded on `app.surface` with decision 18's recipe and `shadow.float`,
rather than a full-height slab behind a hairline and a strip pinned to the bottom edge; the
pane pads itself clear of whichever is showing. A flat slab beside flat content is what iOS 26
stopped doing, and the first pass had shipped exactly that. The tint stays on the theme's own
surface rather than a fixed translucency, because `appAppearance` is a const table with no
light and dark siblings and a white wash would only be right in one of them. A Today card's
bar dropped its blur in the same pass: the artwork behind it is already blurred, and a
filtered child escapes its parent's rounded clip, which was squaring off the card's bottom
corners.

`Nav` now wraps the pane rather than the app, so pushing an app page leaves the sidebar and the
tab bar in place, as the Mac does; the pane is keyed on the section, so picking another one
drops the page that was over it instead of stranding it. The page itself gained the parts the
App Store has and the catalog can answer honestly: the compatibility line, the description
beside the developer's links, an App Privacy card naming the device access the release asked
for or stating there is none, and You Might Also Like from the rest of the lane. Ratings,
charts, age ratings and screenshots have no data behind them and were left out rather than
invented.

Discover keeps the blurred-icon artwork from decision 71 for the cards and drops it for the
lead, which sits on a plain surface with its icon beside the copy, as the App Store's own lead
card does. Every card carries `data-store-app` and a capsule, so a section that shows an app
exposes the same hooks a row does and the store checks reach them from wherever they land.
Every button label, `data-store-app` and `data-store-submit` hook and notice is unchanged.

Three follow-ups from looking at it on the glass. The sidebar runs up under the status stack
and stops 8 px from the top, because the shell's 40 px reserve left a band of bare background
across the whole width and the panel stranded below it; the clock sits on the far right of the
inner display, so nothing collides, and the pane keeps its own clearance. The group that opens
a pane drops its hairline and heads straight into its rows: the pane's large title has already
named the section, and a second heading under it cost a fifth of the display before the first
app. Rows lost their lane chip, since every group is one lane and its heading says which; DEV
and the permission chips stay, and the chip line is only drawn when it holds something. The
Store also moved from the right page into the dock, where its traffic belongs.

The panels then stopped being paper. `app.surface` is opaque white, so the blur on them had
been decoration: nothing showed through. They sit on `appstorePanel` now, a translucent white,
which is safe to fix because the Store is a baked light app and has no dark sibling to be
wrong in. Where the glass earns it differs by axis: the tab bar crosses the scroll, so its
clearance moved out of the pane and into the scroller and the list genuinely passes under it;
the sidebar stands beside a list scrolling down, which never passes behind it, so it keeps its
column and shows the page's tone rather than moving content. The catalog at its foot became a
control instead of two grey discs around a label, matching the search field at the panel's
other end.

Then the corners. The bezel went from 2.2 mm to 1.2 mm (architecture.md), which moved the
inner display's corner to 47.5 px, and the sidebar now takes the radius concentric with it,
39.5 px at 8 px in, instead of the kit's 22 px. What sits in its corners had to follow: a 34 px
field cannot take the 31.5 px corner that would be concentric, so the search field and the
catalog became capsules, each dropped just far enough that its end rides a circle concentric
with the panel's, 8 px clear all round (24 px from the top for the field, 12 px from the bottom
for the 56 px catalog). The rectangular field had its corner up against the curve. The glass
then got something to carry: the pane runs the full width, under the sidebar, and pads its
scroller and a pushed app page clear, so the copy stays beside the panel while Discover's wash
(the day's release blown up and blurred across the top of the page) and a page sliding in pass
under it. That reverses the column above: a column suits a list, but it left the glass over
plain paper, where it read as a white slab. The catalog is now a white card, where a Mac puts
the account: the Duo mark in a disc concentric with the capsule's end, Doan Labs over Duo
catalog, Refresh beside it.

## 87. Music wears Apple Music's chrome, and its accent is the app's own

2026-09-24. Music had been a list of five tracks and a play button, closer to a demo of the
deck than to the app the Dock names. It now takes Apple Music's shape, as the Store took the
App Store's in decision 86: a floating sidebar of sections on the wide box, and on the cover
the same list as a floating tab bar - Home, New, Radio, Library - with Search split off into
its own circle beside it, as iOS 26 draws them. `Nav` wraps the pane for the same reason it
does in the Store: an album, artist or mix page pushes over the section and the chrome stays.

The chrome has the parts the catalog can answer honestly. Home is shelves of the real
releases: Top Picks and New Releases by year, Recently Played from the deck's own history,
and the mixes. New leads with the newest release over Latest Albums and New Songs. Radio is
stations - Duo Radio over the whole library, one per artist, one per broad genre - where a
tap plays the collection shuffled under the station's name, since a fake live stream would be
invented data. Library is the five lists iOS names plus a Recently Added shelf; Search shows
browse categories until there is text, then top result, songs, albums and artists. The mini
player floats over whichever section is up once something has started, and the Now Playing
sheet slides up over everything with artwork, scrubber, shuffle and repeat, volume, Up Next,
and the credits card - which is where the licences live, with the `P` line that was already
on the album page footers.

The queue model moved with it. The deck now holds a list plus `order`, a permutation of
indices, so shuffle is a reshuffled order, repeat-all is a wrap, repeat-one is staying put,
and Up Next reads `upcoming` back out; skipping back inside the first three seconds goes to
the previous track and after that rewinds, as iOS does. Stations and Shuffle deal the rest of
the order at random under their own context name, which is what the sheet's "Playing From"
line reports. `nowPlaying` and `useNowPlaying` keep their old contract, so Control Center and
the launch cues drive the same deck untouched.

The accent is `musicAccent` (#fc3c44) plus its soft fill, under `appAppearance` as the app's
own identity colour rather than `app.link`: the selected tab, the Play and Shuffle pills and
the sheet's on-state marks all read Music, not the system blue. Category tiles take their
colour from `art()` rather than an invented palette, and artwork backs every card it can.

## 88. The dock is arranged by the finger, like the pages

The dock stops being a static list from apps.ts and joins the arranged grid: `os.home`
now saves a `dock` key next to `left` and `right`, resolve() cleans it against the
registry the same way, and the baked canvas draws exactly what the live column shows.
A dock icon held 0.5 s lifts like any tile; carried up or down the column it reorders,
carried onto the paper it lands loose on that half, carried onto an icon it folds.
A grid icon carried onto the dock lands at the slot under the finger. The dock holds
apps only - a folder there would answer to a tap the column has no room to explain -
and caps at 8, the most that clears the status stack and the search button at the
52.5% centre.

The make-room is transforms only, the same reason the grid's is: the other icons slide
on `translateY` and the glass animates an explicit height, so a finger that changes
its mind mid-drag retargets smoothly and nothing in the DOM moves. The column's
centre rides in `top`, not a `translateY(-50%)`: `spot()` and `lift()` read the
offset chain, which a transform hides, and a carried tile needs that chain honest -
the dock re-centres while a tile is on the finger, so `lift()` drives its transform
per animation frame and folds the drift of the tile's own layout origin into it.
The let-go gets
the same treatment a tap got from `zoom`: the grid updates first, then the freshly
mounted tile flies from where the finger left it (lift reports the carried box and
the display's 3D scale; the FLIP kills the tile's landing stagger so the two
transforms do not compose).

The saved `dock` key means the finger arranged it, even when it saved an empty
column; only a missing key falls back to the factory five. That asymmetry is what
makes "dock down to zero" stick across reloads while a pre-change `os.home` still
yields the factory dock untouched.

## 89. Health and Fitness share one book and wear iPadOS's chrome

2026-09-24. Health and Fitness shipped as mock pills: invented rings on invented
cards, with no data behind them and none of the gestures that make the pair feel
like one system on the real phones.

Both now read `packages/fixtures/health.ts`, a single persisted book: the
profile and goals, the pinned metrics Health's Summary shows, per-day accruals
and measurements over a deterministic 90-day seed, and the workout log. The
book's mutations (`log`, `measure`, `logWorkout`, `removeWorkout`, `setGoals`,
`setPin`, `setProfile`) are the only way values change, so a workout logged in
Fitness is already on Health's charts and a weigh-in in Health is already in
Fitness's activity history - there is no sync to configure, which is exactly
what Health's Sharing page now says. `health.test.ts` pins the book's
guarantees: same date, same seed; logged amounts sit on top of the seed and
reverse on delete; series span the asked range.

The chrome is iPadOS's, per the rules already in this document: the floating
glass sidebar with search, the tab bar on the cover, ~380 ms pushes, the glass
recipe from decision 18. Health keeps `light: true` in the registry; Fitness is
the same recipe on `tintDark`. Ring colours live in the kit (`RING_TINTS`) so
Health's mini rings, Fitness's hero and Watch's glance can never drift apart -
the token gate would have rejected a cross-app `appAppearance` read.

Both drop `mock`. The screens are no longer invented data: every rendered
number is the book's, every button writes back to it, and the two displays'
copies stay in lockstep through the same module cells decision 59 set.

## 90. Dark Mode is a switch, and the apps it does not draw stay dark

2026-09-25. Apps baked light stayed light forever: `apps.ts`'s `light` flag was
the whole appearance story. There was no Dark Mode.

`Switches` gains `darkMode`, flipped from Control Center's new tile (the
half-lit circle, next to the brightness slider where iOS puts it) or Settings >
Display & Brightness. The SpringBoard theme pick becomes
`app.light && !darkMode ? light : dark`, so every light app - Health, Settings,
the sandboxed releases - wears the kit's dark theme when it is on, and the
status stack follows the app under it as before. Apps declared dark in the
registry (Fitness, and Apple's Fitness really is always dark) do not read the
switch, which is the point of the flag surviving: `light` means "follows the
system", its absence means "always dark".

An app's own glass chrome could not ride the theme before: `glass.tint` is a
const. The `app` var set gains `glass` - light glass in the light theme,
`tintDark` in the dark one - so a themed app's sidebar, tab bar and menus
(including the kit's `Menu`) retint without a prop. Chrome that is not the
app's, like `shared.glass` on the dock and widgets, keeps `glass.tint`:
Dark Mode does not repaint the system the way it repaints apps.

The switch is device-wide through `toggles.ts`, so both displays flip together.
Like the rest of that object it is session state, not persisted.

## 91. Sheets are non-modal dialogs

`Sheet` used `dialog.showModal()`, which lifts the card into the top layer. The
top layer ignores the scene's transforms when Chromium hit-tests it: every
pointer event inside the card resolved to the untransformed position behind
the preserve-3d `matrix3d`, so real clicks passed through the sheet to the app
underneath. The sheet renders with the `open` attribute instead - a non-modal
dialog stays in the transformed tree where hit-testing is honest - and draws
its own scrim, focus and Escape handling (`show`/`open` never raise `cancel`).
A side effect worth keeping: the captured Escape no longer reaches the shell's
Esc-goes-Home binding while a sheet is up.

## 92. The view, the switches and the levels are remembered

A reload forgot everything but the grid and the wallpaper: the phone came back
open, level, front-facing at the reference size, auto-rotate off, radios and
torch at their defaults, ringer at ten sixteenths, brightness at 70%. Every one
of those is a preference the finger can set, so all of them persist now.

`view.ts` keeps `os.view` - hinge angle, yaw, camera orbit (azimuth, polar,
distance) and auto-rotate - restored once at load with `?deg=`, `?yaw=` and
`?spin=` still winning, since a deep link or an embedding page poses the phone
on purpose. Writes happen on gestures only: the slider, the fold/flip/reset
buttons, a trailing debounce on the orbit 'change' event (damping keeps the
camera moving past 'end', so the write waits for the pose to rest) and the
auto-rotate checkbox. A postMessage pose never saves, so a page posing the
phone for a section cannot overwrite what the user left. The camera restore
happens before the model lands and clamps polar and distance to the controls'
limits, so a saved pose can never strand the phone out of reach.

`toggles.ts`, `device.ts` and `springboard.tsx` keep the rest: `os.toggles` for
the Control Center switches (saved keys resolve against the defaults, so a
switch added or removed since still lands right), `os.level` for the ringer,
`os.bright` for brightness. All `os.` keys, so Erase All Content and Settings
forgets them with the rest of the phone, and none of it reaches the website's
own hyphenated keys. The sleep, lock and power states stay transient - what is
asleep should wake to the lock screen, not to sleep.

This supersedes decision 90's "session state, not persisted" for `toggles.ts`:
the switches do persist now, and Dark Mode rides along with them.

## 93. Sibling gaps belong to the block below, and corners err rounder

2026-09-25. Health and Fitness shipped a crop of flush elements: the
Average/Minimum/Maximum cards touching the chart above them, the Sleep hero
touching its hypnogram, category titles touching their grouped lists, and
the sidebar account chip rounded only enough to still read as a rectangle.
Every page had hand-wired spacing and the wiring had holes.

Separation now lives on the block that can be followed, not at each call
site: `paddingTop` on transparent stacks (`statGrid`, `grid`, `awardGrid`),
`marginTop` on surfaced blocks (`chartBox`, `shared.grp`), `gap` on flex and
grid parents (`sideList`). `space.sm` is the floor and `space.lg` separates
major blocks; a section header keeps the room to its own rows, so under a
header the pair can breathe past the floor. `shared.grp` carries the floor
for every app at once, and `shared.hdr` gets `space.sm` on top so pushed
titles stop hugging the pane. Rounding errs a step upward: a filled row,
chip or footer card spanning a panel is `radius.xl` or more, which is what
the sidebar account and streak chips now take. Cost: under a `secHead` some
pairs settle a step airier than before; the uniformity is the point.

## 94. Panel chips take the panel's radius, and charts draw their own look

2026-09-25. Two follow-ups to 93: the sidebar account chip still read
mismatched under the floating panel's corner at `radius.xl`, and the Health
charts read as flat knock-offs of Apple's - a hard-edged area fill, plain
bars, disjoint hypnogram blocks.

The chip now takes `layout.screenInnerPanel`, the same radius the sidebar
itself draws, in both Health and Fitness - a floating child borrows the
panel's curve rather than picking a step from the radius scale. The rule in
DESIGN.md says so alongside the `radius.xl` floor.

The chart vocabulary is rebuilt on our own look: a dotted hairline grid at
the quartiles behind every big chart, capsule bars off a baseline hairline,
a smoothed line over a tint-to-transparent gradient with the latest point
dotted, and the hypnogram as one continuous wave that changes colour at each
stage instead of disjoint blocks. Fitness's WeekBars moves to the same
vocabulary. Cost: the wave hypnogram no longer shows per-segment time labels
directly on the blocks; the stage legend under it carries the totals.

## 95. Apps hear the frame's buttons and sensors as device events

2026-09-25. The SDK exposed the hinge (`view.angle`) and the side button's
double-click claim, and contract 3.8 said single clicks, long press and the
volume buttons are never forwarded. Apps asked for the rest of the hardware
the simulator already models: volume, Camera Control, the side button, the
phone's pose and the Control Center switches.

`os.device.on(type, cb)` is now the one pattern for all of it, returning the
unsubscribe. On the wire, `device.watch { type }` / `device.unwatch { type }`
and a single `{ ev: 'device', p: { type, data } }` event. The first listener
of a type watches, the last one to leave unwatches, so the host routes only
what something listens to. This supersedes the contract 3.8 sentence above;
the double-click claim (`os.sideButton`) stays as it was.

- Volume and Camera Control are *taken*: while a view listens and is visible
  and active, the press goes to it instead of the ringer, the HUD or Camera.
  Choosing the view follows the double-click claim: first in listen order.
  The view that took a press keeps its slides and release, so it never sees
  a stuck button, even if it stopped listening mid-press.
- The side button is *heard*, never taken. An app must not be able to stop
  the person locking or powering off the phone. The side and volume chord
  (screenshot, power-off) stays the system's for the same reason.
- `orientation` (`{ yaw, hinge }` in degrees) and `switches` are states:
  the watch reply is the current value, then each change. The SDK replays
  the latest value to a late listener. The pose is rounded to 0.1°, so an
  ease that has almost landed stops sending events instead of trickling on.
- The switches are read-only. Letting any app turn on airplane mode or the
  torch is a permission question, not an event, and stays unanswered.

The events are opt-in per type for a compatibility reason as much as a
privacy one: a released SDK closes its connection on an event type it does
not know, so a type the host sends unasked would break every app built
before it. Haptics and battery were left out. The simulator has nothing to
vibrate, and its charge is a constant.

## 96. The /sdk page hears the real shell, as an app would

`/sdk` stops forwarding to `/docs/sdk` and becomes the showcase for decision
95, with an SDK item in the global bar. Each device event type is one chapter
beside one sticky phone: the sample code, the sample's own variables and the
last payloads. The chapter in the middle of the screen poses the phone so its
buttons face the reader.

Every number on the page comes from the shell. The embed bridge gained
`{ hear: [...types] }`, answered with `{ device: { type, data } }` to the
origin that asked, and `packages/shell/embed-device.ts` builds it from the same
`deviceEvents` a sandboxed view uses, as a view that is always visible and
active. So the page takes volume and Camera Control presses exactly as a
listening app would, and the side button still sleeps the phone. A page-side
simulation was rejected: it would show what we meant the events to be, not
what the shell sends. A `control` cue pulls Control Center down, because the
switches are read-only and the reader has to flip them in the phone.

Only one frame renders, for the WebGL budget decision 76 set, and the page
never hears anything until it asks, as with apps.

`yaw` is measured from the eye, not the world: it is the phone's own turn less
the camera's orbit azimuth. Dragging the phone orbits the camera, and to the
person that is turning the phone, so an app hears it. Only the azimuth counts;
tilting the camera up or down is not a turn about the long axis.

The page opens on a tour: a ring pulses on the cap the chapter is about and a
card beside it says what to do, with Back and Next walking the chapters. The
page cannot see into the frame, so the shell reports where the caps are
(`{ spots }` on the bridge, projected from the same hit boxes a pointer
presses) after each frame that moved one, and the ring rides the pose ease
instead of landing where the phone used to be. A ring goes once its chapter
is tried: a press for the buttons, a turn away from the page's pose for the
orientation, a flip for the switches, since those two arrive as state on
their own.
Closed, the tour leaves a "Show the tour" bubble in the stage's top right,
breathing a ring so a reader who closed it by accident finds the way back; it
reopens on the chapter in view.

## 97. `/kit` shows a grid of composed scenes, not a strip of reference demos

2026-09-25, accepted; supersedes the showcase half of 64. The drifting strip
showed the reference demos one after another at the same size, so the page read
as the reference on a conveyor belt rather than the best the kit can build. `/kit`
now keeps the hero and puts a bento grid under it: ten tiles, each a small app
composed from the kit (a Notes screen whose frame moves between 387 and 790
points while `useWide()` switches its layout, the Activity rings, a Settings
stack with a push, controls, a menu, a form with a sheet, widgets over the
real wallpaper, the type ramp, the symbols, the hues). The strip's rejection of
"a browsing page underneath the hero" in 64 stands for search and per-export
browsing, which stay under `/kit/docs`; this is a showcase, not an index.
Scenes live in `src/kit/scenes/`, separate from `src/kit-demos/`, because a
reference demo shows one export plainly and a scene composes several. Cost: the
scenes mount on the client as they scroll in, so the prerendered page carries
their captions only; and the scenes are hand-composed, so a new export does not
appear in the grid until someone builds a tile for it.
