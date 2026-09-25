# DESIGN.md

Hard rules for anything with pixels in it: an app, the shell, the kit, the site.
Read this before the first line of UI, not after the screenshot looks wrong.
These are rules, not preferences. A change that breaks one is wrong even if it
looks fine on the display you happened to open.

The living version of the first three rules is
[the guidelines tab](packages/web/src/guidelines/rules.tsx) on the website; the
tokens they name are [`packages/uikit/tokens.stylex.ts`](packages/uikit/tokens.stylex.ts).
Rationale for a rule lives in [decisions](docs/decisions.md); this page is the rule.

## 1. Design for the cover first

The cover display is 387 points wide, the inner display 790: a little more than
two covers. Lay out in boxes and let width decide, measured on your own box,
never from the display: a split half of the inner display is as narrow as the
cover.

`useWide()` from the kit is that measurement: a `ResizeObserver` on the ref it
returns, true past 600 px. Use it rather than writing the observer again, and
keep what you store a boolean — an app holding the observed width in state
re-renders on every pixel of the fold.

A cover layout has room to breathe unfolded. The reverse never works. Never hide
a feature on the cover; the person may never unfold the phone for it.

## 2. Your app runs twice

The other display holds a running copy so the fold hands over without a remount.
The copy draws everything and starts nothing: no sound, no network, no timer.
State both copies must agree on lives in shared storage, not in a component.

Test: open, fold all the way, unfold. Same scroll position, same playback, once.

## 3. Tokens only

Every colour, font size, weight, leading, tracking, radius, shadow, blur and
easing comes from `packages/uikit/tokens.stylex.ts`. No hex, no px font size, no
`cubic-bezier` typed by hand. The two displays have different densities and the
shell tunes the palette for both; a literal looks wrong on one of them and
inherits no fix.

`bun scripts/check-app-tokens.ts` enforces this for `packages/apps` and
`packages/shell`. Only the numbers `0` and `1` are allowed as literals. A
literal `'none'` is still a literal: restructure into an additive style instead
of writing the off value.

| Scale | Owns |
| --- | --- |
| `colors` | The iOS 26 system hues and `grey`..`grey6`, with dark siblings |
| `app` | The per-app UIKit dynamic colours: `bg`, `fg`, `surface`, `elevated`, `label2`, `label3`, `link`, `separator`, `fill`..`fill3`, `control` |
| `fonts` | SF Pro, Rounded, New York, SF Mono. Nothing else |
| `typeScale` + `leading` + `tracking` + `weight` | Dynamic Type at the Large size |
| `space` | A 4 px grid. Gaps, padding and insets pick a step, never a number |
| `radius` | Continuous corners, one per role |
| `shadow` | `card`, `float`, `rim`, `text`. The only four |
| `glass` | Blur and tint, per decision 18 |
| `easing` + `motion` | The only curves, and the one press state |
| `layout` | Home-grid geometry, mirrored by `os/screen.ts` |
| `appAppearance` | One app's own identity colours, keyed by its folder name |

`chrome` and `wallpaper` are the shell's; an app never reads them. `glass` is
open to apps. `appAppearance` keys are prefixed with the folder name of the only
app that may read them, and it is a `defineConsts` table with no light and dark
siblings: anything that must change with appearance belongs in `app`, not there.

## 4. Glass is blur, tint and a hairline, nothing else

Decision 18. One recipe, wherever glass appears:

- `backdropFilter` and `WebkitBackdropFilter`: `glass.blur`
- a tint: `glass.tint`, `glass.tintDark`, or `app.surface` for a panel inside an app
- one hairline: `shadow.rim`
- one soft drop shadow: `shadow.float`
- `radius.xxl` for a tray or panel, `radius.pill` for a control inside it

No conic rims, no radial speculars, no gradient ramps, no borders drawn on top
of the rim. Those read as Vista, not as iOS 26. Buttons on glass are transparent
at rest and take a flat fill on hover.

A panel floats. A sidebar or a tab bar is inset from the edges of the pane and
rounded on all four corners, with the pane padding itself clear of it. It is not
a full-height slab with a hairline down one side; a slab is flat chrome wearing
a tint.

Two traps:

- **`backdrop-filter` escapes a parent's rounded clip** in WebKit and Chromium.
  A filtered child inside a rounded card squares the card's corners. If the
  thing behind is already blurred, drop the filter; it buys nothing.
- **Do not hardcode a translucency to fake glass in light appearance.** Use
  `app.surface` and let the shell theme it, or the panel is right in one
  appearance and wrong in the other.

## 5. Shape, space and type

Radius by role, nothing in between: `xs` 4 a checkbox or chart bar, `sm` 8 a
button or row icon, `md` 10 an inset grouped list or text field, `lg` 12 a card
or sheet, `xl` 16 a large card or hero tile, `xxl` 22 a widget or glass tray,
plus `pill` and `circle`.

Body text is `body` 17 on `leading.body` 22 with `tracking.body` -0.43. Use
whole steps; carrying a size without its leading and tracking is how a screen
starts looking like a web page. Nothing lighter than `weight.regular`, except
`weight.thin` for an oversized numeral.

Blue is the one interaction colour, and it comes from `app.link`, not from a
hue. Text and surfaces come from `app`; the hues in `colors` are for tinting an
icon square, a chart, a switch.

Space between siblings belongs to the block below, styled once on the block,
never wired at each call site: `paddingTop` on a transparent stack,
`marginTop` on a surfaced card or `Section`, `gap` on a flex or grid parent.
`space.sm` is the floor and `space.lg` separates major blocks; a section
header still owns the room to its own rows. No two siblings touch - a card
flush to the block above it is a bug, not a look.

Round a step past enough: a filled row, chip or footer card spanning a panel
is `radius.xl` or more. `radius.lg` on a full-width filled bar still reads
as a rectangle.

## 6. Motion

Every curve is in `easing`; a push takes about 380 ms; nothing bounces twice.
Everything tappable shrinks to `motion.press` and eases back, through the kit's
shared press style rather than a new one.

## 7. The iOS rules still hold

- Navigation is a stack with a back button on the left; Escape goes home.
- Text input works on the cover: a note, a search, a message, at 387 points.
- A widget is a snapshot the shell draws, with its age shown. Not a live view.
- The home bar owns the bottom 22 px. Floating chrome clears it.
- No invented data. A rating with nothing behind it, a fake chart position or a
  placeholder screenshot is worse than the missing section (decision 72).

## 8. How the styles are written

- `stylex.create` at the bottom of the file, longhand properties only,
  pseudo-classes and media queries as nested values, no descendant selectors.
- Never `className` or `style` beside `stylex.props`.
- A grid child defaults to `min-width: auto` and will push its own capsule off
  the track; give it `minWidth: 0`.
- Comments explain why. Skip the ones restating the property.

## Before calling a UI change done

1. `bun run typecheck`
2. `bun scripts/check-app-tokens.ts`
3. `bun scripts/check-platform.ts`
4. Screenshot both displays with `agent-browser` (load `agent-browser skills get core`
   first): the inner display folded open, and the cover. A change verified on one
   of them is not verified.
