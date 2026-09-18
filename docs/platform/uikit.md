# UI kit

Private `@doan-labs/ipduo-uikit` 0.1.0 provides presentation components for baked apps
and isolated documents. The SDK separately owns host API, bridge, manifest and runtime
compatibility. The kit's version never gates host compatibility.

Use [the package reference](../../packages/uikit/README.md) for exports, examples and
styling. [Generated API data](api/uikit.json) comes from TSDoc and exported props; regenerate
with `bun scripts/generate-kit-docs.ts` and verify with `--check`. Do not edit generated
JSON manually or maintain a second handwritten component API catalog.

## Current design

The harvest preserves existing appearance and native element behavior. Typed `as` and
StyleX `xstyle` support app composition; legacy Nav/Page/Sym/Num and style subpaths remain.
Shared presentation values live in kit tokens. New UI uses semantic tokens; harvested
legacy values preserve existing pixels. The AST token gate runs locally/in CI alongside
Biome, not as a new Biome plugin.

`Screen` and `useDisplay` subscribe without opening a bridge, calling ready or owning
network/audio work. Apps own connection, readiness and effects. Layout follows the view's
box, including cover and split widths. Navigation handles cleanup and reduced motion.
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
