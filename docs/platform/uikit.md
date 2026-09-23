# UI kit

Private `@doan-labs/duo-uikit` 1.2.0 provides presentation components for baked apps
and isolated documents. The SDK separately owns host API, bridge, manifest and runtime
compatibility. The kit's version never gates host compatibility.

Use [the package reference](../../packages/uikit/README.md) for exports, examples and
styling. [Generated API data](api/uikit.json) comes from TSDoc and exported props; regenerate
with `bun scripts/generate-kit-docs.ts` and verify with `--check`. Do not edit generated
JSON manually or maintain a second handwritten component API catalog.

## Current design

The kit is Apple's design system for the device (decision 75): iOS 26 system hues, UIKit
dynamic colours as the per-app `app` theme, Dynamic Type at the Large size with the HIG's
leading and SF Pro tracking, and `space`, `radius`, `shadow`, `glass` and `motion` scales.
Typed `as` and StyleX `xstyle` support app composition; legacy Nav/Page/Sym/Num and style
subpaths remain. `Checkbox`, `IconButton`, `Segmented`, `TextField`, `Select` and `Sheet`
are the desktop controls a tablet layout needs, drawn on native elements. `appAppearance` holds only an app's own colours, prefixed by its folder
name. The AST token gate (`scripts/check-app-tokens.ts`) fails any literal size, weight,
radius, shadow, tracking, leading, font, timing or colour in `packages/apps` and
`packages/shell`, and any cross-app `appAppearance` read; it runs locally/in CI alongside
Biome, not as a new Biome plugin.

`Screen` and `useDisplay` subscribe without opening a bridge, calling ready or owning
network/audio work. Apps own connection, readiness and effects. Layout follows the view's
box, including cover and split widths. `useWide` is that rule as a hook: it observes an
element's own box against a 600 px default, so an app branches on the room it has rather
than on which display it is. Navigation handles cleanup and reduced motion.
Widget rendering consumes bounded snapshots; it does not fetch or wake app sessions.

Each sandbox bundles its own React, kit, assets and compiled styles. It cannot inherit
shell CSS. The builder embeds icons/fonts and converts dynamic StyleX values to classes
compatible with the document CSP. Existing trusted integrations remain in their apps.

## Evidence and evolution

The external [Developer gallery](../../examples/developer/main.tsx) and
[current platform verification](review.md) document package consumption, keyboard/navigation,
mirror state, reduced motion and 39 official surfaces at both fold endpoints. Those are
scoped Chromium checks, not exhaustive native parity.

The kit has its own changelog/versioning: visual fixes are patches, compatible additions
are minors, removals/renames require a major and an announced migration. A public 1.0
support commitment remains a roadmap decision. Additional components should follow a
real app need; expanded widgets and a visual redesign are not implied by the harvest.
