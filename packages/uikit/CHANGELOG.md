# 1.1.0

Added the desktop-style controls Calendar's tablet layout needed, so no app has
to draw them again: `Checkbox` (the tinted square, hollow at rest and filled
with a white tick), `IconButton` (a symbol-only toolbar button in `plain`,
`tinted` and `round` variants), `Segmented` (a radio group of views or filters),
`TextField` and `Select` (native fields over `fill`, any input type, `multiline`
for a textarea) and `Sheet` (a modal card on a native `<dialog>`). `Toggle`
stays the iOS switch. `Checkbox` animates the way macOS draws it: the fill fades
in, the tick springs up from half size, and the box squashes while pressed.

`useWide(at = 600)` returns `[ref, wide]` and measures the ref's own box, which
four apps had each written out as a `ResizeObserver` against the same 600 px.
The threshold now has one home, and the reason it is a box measurement rather
than `useDisplay()` is stated once in the kit rather than in four app comments.

# 1.0.0

The design system is Apple's. Every value in `tokens.stylex.ts` now traces to
the HIG or to UIKit, and every size, weight, radius, shadow, font and timing an
app uses comes from a scale. Removals, hence the major.

Colours: `colors` is the iOS 26 system palette (`blue` is `#0088ff`, `red`
`#ff383c`, and so on) with a `*Dark` sibling per hue, `mint` and `brown` added,
and `grey`..`grey6` plus `grey2Dark`..`grey6Dark`. Removed `blueBright`,
`blueDark`'s old value, `greenBright`, `redBright`, `settingsPink`,
`settingsIndigo`, `separator`, `groupedLight`, `barLight`, `trackLight`,
`trackDark`, `darkElevated`, `darkElevated2`, `separatorDark`, `fill`,
`fillThin`, `fillThick`, `fillDark`, `controlDark` and the `weather*` hues.

Surfaces: `app` is the UIKit dynamic colour set. Added `label3`, `link`, `fill2`,
`fill3`; removed `track` (use `fill2`). `light` and `dark` carry UIKit's light
and dark values. `Text` gained `color="tertiary"`.

Type: `typeScale` is Dynamic Type at Large (body 17, not 15), joined by
`leading`, `tracking` and `weight` consts and four `display` sizes. `typography`
steps carry all four. `Text` `weight` is `regular | medium | semibold | bold`;
`size="footnote"` and `size="title"` as colour-setting legacy names are gone
(`footnote` is now the ramp step). `fonts` gained `rounded`, `serif`, `mono`.

Scales: added `space`, `radius`, `shadow`, `glass`, `motion`; `easing` gained
`linear`, `out`, `inOut`. Added `chrome` and `wallpaper` consts for the shell's
glass scrims and wallpaper palettes. `shared.glass` lost its radial sheen (decision 18).
`shared.press`, `pill`, `fab` and `widget` all press to `motion.press`.

`appAppearance`: every `*FontSize*`, `*FontWeight*`, `*Radius*`, `*Shadow*`,
`*TimingFunction*` and `*FontFamily*` key is removed; colour keys are renamed by
role (`photosSidebarBackgroundColor` is `photosSidebar`). Keys are grouped under
a `// <app>` line and only that app may read them.

`Button variant="plain"` now presses. `Row`'s chevron is `app.label3`.

No SDK protocol or host compatibility requirement changes.

# 0.2.0

Removed three components that were verbatim renames of something already
exported: `Hero` (`LargeTitle`), `Symbol` (`Sym`) and `NavigationStack` (`Nav`).
`Sym` now carries the `SymProps` type and the TSDoc that `Symbol` existed to
hold. `NavigationLink` stays; unlike the other three it manages destination and
return focus, which `Nav` and `Page` do not.

Added `HStack`, and `gap` / `align` / `justify` / `wrap` on both stacks. The kit
had no horizontal primitive, so the apps carried roughly 530 hand-written flex
declarations.

Added the type ramp. `Text`'s `size` names a step (`largeTitle`,
`title1`..`title3`, `headline`, `body`, `callout`, `subheadline`, `footnote`,
`caption1`, `caption2`), each with size, leading and weight together; `typeScale`
holds the raw px and `typography` the same steps as whole blocks. `caption`,
`footnote` and `title` still render exactly as before and are now documented as
the original names to migrate off.

Added the per-app surface. `app` gained `surface`, `elevated`, `label2`,
`separator`, `fill` and `track`, and `shared` reads from them instead of
hardcoding light values, so a dark app can theme `Row`, `Section`, `Toggle` and
secondary labels rather than avoiding them. `light` and `dark` ship as themes;
the `app` defaults are the values the kit used to hardcode, so applying `light`
changes nothing.

`Row` gained `subtitle`, the second line most iOS rows have, and `chevron` now
renders the SF chevron through `Sym` instead of a typed `›`.

Moved invented data and feedback out of the kit into `@doan-labs/duo-fixtures`:
`hue`, `art`, `walk`, `poly`, `mmss`, `beep` and the sample tracks. `Bars` in
`rings.tsx` takes the values to plot instead of generating them from a seed, so
the kit no longer depends on fixture data to draw a chart.

Removed four `shared` blocks with no consumer anywhere in the repo (`grid`,
`gridImg`, `viewer`, `viewerImg`), and 35 `appAppearance` constants: 19 that
were never referenced and 16 that were exact duplicates of a palette colour
(`notesColor10` was `colors.darkElevated`, `healthColor3` was `colors.indigo`,
and so on). The remaining 224 are still per-app values in a shared module and
still want moving into the app that owns them.

No SDK protocol or host compatibility requirement changes.

# 0.1.0

Add harvested screen, stack, title, list, row, text, button, toggle, symbol,
navigation and passive widget-label components; display subscription and
reduced-motion CSS animation presets. Existing Nav/Page/Sym/Num and style
subpaths remain supported. Apps bundle their selected kit version. This minor
release changes no SDK protocol or host compatibility requirement.
