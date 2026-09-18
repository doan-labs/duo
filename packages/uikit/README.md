# UI kit

Version **0.2.0**, private local preview. React 19 and compiled StyleX 0.19.
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
Use `Row as="button"` for actions. Name icon-only buttons and every Toggle.

## Layout and type

`VStack` fills its flex parent and `HStack` is a horizontal row centred on the
cross axis. Both take `gap`, `align`, `justify` and `wrap`, so a one-off
`stylex.create` is no longer the way to put two things side by side.

`Text`'s `size` names a step of the type ramp (`largeTitle`, `title1`..`title3`,
`headline`, `body`, `callout`, `subheadline`, `footnote`, `caption1`,
`caption2`), each carrying size, leading and weight together. `body` emits
nothing and inherits, so a `Text` inside a header still reads at the header's
size. `caption`, `footnote` and `title` are the original names and still render
exactly as they did; unlike the ramp steps they also set a colour. Prefer
`size="subheadline" color="secondary"` over `size="caption"` in new UI. The raw
px live in `typeScale`, and `typography` in `styles.ts` holds the same steps as
whole blocks for an app's own `stylex.create`.

## Theming

`app` carries the per-app surface: `bg`, `fg`, `surface`, `elevated`, `label2`,
`separator`, `fill` and `track`. Every row, separator, switch and secondary
label in the kit reads from it, so a dark app no longer has to avoid `Row` and
`Section`. Apply `light` or `dark` from `styles.ts` to an app root instead of
hand-rolling a `createTheme`. The `app` defaults are the light values the kit
used to hardcode, so applying `light` changes nothing.

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
receive no preset animation. `Widget` only renders the existing declarative
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
