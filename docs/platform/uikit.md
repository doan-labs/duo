# UI kit

`@doan-labs/ipduo-uikit`. SwiftUI-shaped components, React underneath, StyleX
for styling. It owns the UI contract and tokens. The SDK separately owns the
host API, bridge, manifest, and runtime compatibility.

## Harvest, do not design

The existing `shared` sheet is used at 340 sites across 40 apps. The counts are
the component list. Each `shared.x` used by three or more apps becomes a
component; anything under that stays a style.

| Today | Component | Sites |
| --- | --- | --- |
| `hdr`, `hdrSm`, `hero` | `LargeTitle`, `Title`, `Hero` | 53 |
| `grp`, `row`, `rowR`, `rowIc` | `List`, `Section`, `Row` with label, detail, chevron, icon, toggle | 64 |
| `sub`, `ts` | `Text` with `size="caption"`, `size="footnote"` | 62 |
| `pill`, `sw`, `bk` | `Button` (`filled`, `tinted`, `plain`), `Toggle`, back handled by `NavigationStack` | 27 |
| `body`, `column` | `Screen`, `VStack` | 51 |
| `Nav`, `Page`, `useNav` | `NavigationStack`, `NavigationLink`, `useNavigation` | already components |
| `Sym` | `Symbol` | already a component |
| `Num` | `Text` with `format` | already a component |
| `spin`, `rise`, `pop`, `fade`, `rip`, `draw`, `bob`, `glow` | `animations.*` presets, used through the `animate` prop | animations |
| `widget`, `widgetLabel` | `Widget`, `WidgetLabel` | widgets |

Then rewrite the official apps onto the kit, one PR per app. Each rewrite either
deletes app code or reveals a missing component; the missing component is the
spec. Settings first because it is the canonical List app. Weather last because
it is bespoke and will show where the kit should stop.

## Second tier

Ship each when the first app needs it, not before: `TabView`, `Sheet`, `Alert`,
`ActionSheet`, `Picker`, `Slider`, `SearchField`, `ContextMenu`, `Form`,
`ProgressView`, `Grid`.

## Rules

- **Tokens only.** No colour, font, radius or easing literal in an app. Everything
  comes from `tokens.stylex.ts`. A Biome rule forbids hex and `px` fonts under
  `packages/apps`.
- **Modifiers are props.** `<Text size="title" weight="bold" color="secondary">`.
  No builder DSL, no wrapper-per-modifier.
- **Every component works at cover width.** It consumes SDK display information and collapses
  itself. A component that only looks right on the inner display does not merge.
- **Every component works as a mirror.** No component starts sound, network or
  timers on its own.
- **Component files export one component and its props type.** Docs are generated
  from the TSDoc on that export (web.md).
- **The Developer app** in the store renders every component in every state. It
  is the visual regression page and the live documentation.

## Versioning

The kit is the API that apps compile against, so it has its own semver and its
own `CHANGELOG.md`:

- Patch: visual fix, no prop change.
- Minor: new component or new optional prop.
- Major: removed or renamed prop or component. Announced one minor ahead with a
  console warning in dev mode; the old name keeps working for that one minor.

Apps bundle their selected kit version inside their own documents. The host
does not reject an app merely because the shell uses a different kit version.
SDK runtime requirements determine host compatibility. Migrating official apps
to a new kit major remains explicit source work, not a forced runtime replacement.

## Why StyleX stays

StyleX compiles styles and deduplicates atomic rules within a build. Each
isolated document includes its own styles and tokens; it cannot inherit the
shell's stylesheet. Every downloadable app may use the kit. CI builds source
through the supported toolchain rather than accepting prebuilt releases.
Repeated runtime/CSS bytes across apps are a cost to measure when setting limits.
Plain CSS token distribution, if provided, belongs to the kit, not the SDK.
