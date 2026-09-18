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
