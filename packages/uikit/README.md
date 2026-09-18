# UI kit

Version **0.1.0**, private local preview. React 19 and compiled StyleX 0.19.
Apps bundle their selected kit; its version does not change host compatibility.
SDK runtime requirements remain separate. Existing Nav/Page/Sym/Num and style
subpaths continue to work. See [CHANGELOG](CHANGELOG.md).

```tsx
import { Button, Row, Screen, Section, Text, Title, useDisplay } from '@doan-labs/duo-uikit'

function App() {
  const view = useDisplay()
  return <Screen>
    <Title>Field guide</Title>
    <Section>
      <Row label="Display" detail={view.display} />
      <Row label="Fold" detail={<Text value={view.angle} suffix="°" />} />
      <Row><Button onClick={() => console.log('pressed')}>Continue</Button></Row>
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

`NavigationStack`, `NavigationLink` and `useNavigation` retain the established
push/back behavior. NavigationLink manages destination/return focus. The stack
uses `app.bg` from the public token module. For a light app, apply a
`stylex.createTheme(app, { bg: colors.groupedLight, fg: colors.black })` theme
to its root as shown in the [Developer gallery](../../examples/developer/main.tsx).

`animations` contains spin/rise/pop/fade/rip/draw/bob/glow. Reduced-motion users
receive no preset animation. `Widget` only renders the existing declarative
snapshot; `WidgetLabel` is passive typography. Neither refreshes data. Legacy
audio helpers remain explicit helpers for trusted integrations, not automatic
mirror-safe effects. Sample tracks are fixture data, not a playback service.

The package archive embeds icon/font assets. The supported CLI resolves and
inlines these into the isolated document. No simulator source alias or public
asset server is needed by an installed consumer.

[Generated API data](../../docs/platform/api/uikit.json) comes from exported props
and TSDoc (`bun scripts/generate-kit-docs.ts`).
[Gallery verification](../../scripts/checks/stage4/gallery.mjs) covers both
display widths, storage mirroring, keyboard input, navigation, reduced motion,
external-request absence and teardown.
