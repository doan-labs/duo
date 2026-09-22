# UI kit

Version **1.2.0**, private local preview. React 19 and compiled StyleX 0.19.
Apps bundle their selected kit; its version does not change host compatibility.
SDK runtime requirements remain separate. Existing Nav/Page/Sym/Num and style
subpaths continue to work. See [CHANGELOG](CHANGELOG.md).

```tsx
import { Button, HStack, Row, Screen, Section, Text, Title, useDisplay } from '@doan-labs/duo-uikit'

function App() {
  const view = useDisplay()
  return <Screen>
    <Title>Field guide</Title>
    <Section>
      <Row label="Display" detail={view.display} />
      <Row label="Fold" subtitle="Hinge angle" detail={<Text value={view.angle} suffix="°" />} chevron />
      <HStack gap={8}><Button onClick={() => console.log('pressed')}>Continue</Button></HStack>
    </Section>
  </Screen>
}
```

The entry point explicitly calls SDK `os.connect()` before rendering and
`os.ready()` after mount. Components do not connect, request ownership or start
network/audio work. `useDisplay()` subscribes to SDK updates; layout naturally
shrinks to the current iframe width, including cover and split views. Mirror
state belongs in SDK storage/session, not component globals.

Components accept native attributes, `as` where appropriate, `animate` for
CSS-only presets and `xstyle` for compiled StyleX extensions. They intentionally
exclude raw `style` and `className`. Defaults preserve the original app geometry;
use semantic elements (`Title as="h1"`, `Row as="li"` inside `List`) for new UI.
Use `Row as="button"` for actions. Name icon-only buttons and every Toggle or Checkbox. `Checkbox` is the tinted square from macOS Calendar; `Toggle` is the iOS switch.

## Layout and type

`VStack` fills its flex parent and `HStack` is a horizontal row centred on the
cross axis. Both take `gap`, `align`, `justify` and `wrap`, so a one-off
`stylex.create` is no longer the way to put two things side by side.

`useWide(at = 600)` returns `[ref, wide]`: attach the ref to the element the
layout lives in and branch on `wide` for a two-column arrangement. Use it rather
than `useDisplay()` for layout, because the box decides and the display does not.
A split half of the inner panel is as narrow as the cover, and an app that reads
`display === 'inner'` there lays out two columns in a space that holds one.

`Text`'s `size` names a step of Dynamic Type at the Large size (`largeTitle`
34/41, `title1` 28/34, `title2` 22/28, `title3` 20/25, `headline` 17/22
semibold, `body` 17/22, `callout` 16/21, `subheadline` 15/20, `footnote` 13/18,
`caption1` 12/16, `caption2` 11/13), each carrying size, leading, SF Pro
tracking and weight together. `weight` emphasises a step on the HIG ladder
(`regular`, `medium`, `semibold`, `bold`). `body` emits nothing and inherits, so
a `Text` inside a header still reads at the header's size. `caption` is the one
legacy name left and is `footnote` in the secondary colour. The consts live in
`typeScale`, `leading`, `tracking` and `weight`; `typography` in `styles.ts`
holds the steps as whole blocks for an app's own `stylex.create`, and
`typeScale.display`..`displayXxl` (44/56/72/96) serve oversized numerals.

## Scales

`space` (2..32 on a 4 px grid), `radius` (`xs` 4, `sm` 8, `md` 10, `lg` 12,
`xl` 16, `xxl` 22, `pill`, `circle`), `shadow` (`card`, `float`, `rim`, `text`),
`glass` (`blur`, `tint`, `tintDark`), `easing` and `motion.press` are the only
sources of those values. `scripts/check-app-tokens.ts` fails a literal size,
weight, radius, shadow, tracking, leading, font, timing or colour in an app or
in the shell, and fails an app reading another app's `appAppearance` key.
`chrome` (scrims, wells, fills and labels over glass or a wallpaper) and
`wallpaper` (the five wallpaper palettes) are the shell's own consts; apps do
not read them.

## Theming

`app` carries the per-app surface as UIKit's dynamic colours: `bg`
(systemGroupedBackground), `fg` (label), `surface`, `elevated`, `label2`,
`label3`, `link`, `separator`, `fill`, `fill2`, `fill3` and `control`. Every
row, separator, switch and secondary label in the kit reads from it, so a dark
app no longer has to avoid `Row` and `Section`. Apply `light` or `dark` from
`styles.ts` to an app root instead of hand-rolling a `createTheme`. `colors`
holds the iOS 26 system hues with `*Dark` siblings and `grey`..`grey6`; they tint
icons, charts and switches, and `blue` is the one interaction colour. Text,
fills and surfaces never come from `colors`.

## Navigation and motion

`Nav`, `Page`, `NavigationLink` and `useNavigation` retain the established
push/back behavior. `NavigationLink` manages destination/return focus. The
stack uses `app.bg` from the public token module.

`animations` contains spin/rise/pop/fade/rip/draw/bob/glow plus the motion every
app should have by default: `row` for a list row that just appeared, `float` /
`floatOut` for a tray entering from below, `sheet` / `sheetOut` for a page
sliding over another. `shared.press` (tappable), `shared.select` (selectable
row) and `shared.swap` (content replaced in place) are the matching transitions.
`usePresence(open)` keeps a thing mounted through its exit animation; `Push`
is the nav transition with the open state kept by the caller. Reduced-motion users
receive no preset animation.

`Menu` is the pop-up menu those parts add up to: pass `open`, `onClose` and
`items`, and it floats out of the control that opened it, draws a row's glyph on
the leading edge as iOS 26 does, rules a line at each `'separator'`, ticks a
`checked` row, ends in an optional `footer` of glyph-over-caption buttons, goes
dead to the pointer while it sinks, and unmounts. It carries no coordinates,
so `xstyle` both places and tints the sheet and `itemStyle` sets a row's type
step. It draws no scrim: a menu over a cross-origin frame or a canvas needs the
app's own catcher for a tap outside, and one whose surface already reports a
click does not. `Widget` only renders the existing declarative
snapshot; `WidgetLabel` is passive typography. Neither refreshes data.

Invented data and feedback are not part of the kit. Generated artwork, the
deterministic chart walk, clock formatting, the WebAudio beep and the sample
tracks live in `@doan-labs/duo-fixtures`; `Bars` in `rings.tsx` takes the values
to plot rather than inventing them from a seed.

The package archive embeds icon/font assets. The supported CLI resolves and
inlines these into the isolated document. No simulator source alias or public
asset server is needed by an installed consumer.

[Generated API data](../../docs/platform/api/uikit.json) comes from exported props
and TSDoc (`bun scripts/generate-kit-docs.ts`).
The committed gallery check covering both display widths, storage mirroring, keyboard
input, navigation, reduced motion, external-request absence and teardown was removed
with its browser driver; that ground is walked with `agent-browser` now.
