# Monorepo migration review gate

2026-09-17. First platform progress checkpoint: repository restructure is
implemented and verified. The original platform plans are included alongside
this record. No publishing, deployment, or new external dependencies.

## What changed

| Boundary | Result |
| --- | --- |
| Shell | Scene, HUD, shaders, springboard, device controls, seed registry and page in `packages/shell`; Tauri in `packages/shell/desktop` |
| Apps | All 39 existing apps are private Bun workspaces under `packages/apps`; behavior and baked execution retained |
| UI kit | Existing UI, tokens, React app adapter, shared helpers, rings, icon catalog and sample tracks extracted |
| SDK | Existing `Os` and `CameraHooks` moved to explicitly transitional `legacy.ts`; no new bridge or manifest contract |
| Future work | CLI and web have package metadata, empty entrypoints and typecheck configurations only |

Root tooling still provides `dev`, `build`, `typecheck`, `desktop` and
`desktop:build`. All 44 workspaces have typecheck configurations. Runtime
dependencies are declared by consumers; root owns tooling. Bun's frozen lockfile
install succeeds and all existing external lockfile package records are unchanged.

Static icons moved byte-for-byte to `public/icons`; the UI kit catalog references
their public URLs. Model preparation and `public/model` remain unchanged and
gitignored. All 105 checked binary/native files retain their bytes, excluding
the intentionally updated native command comment. Old generated Tauri schemas
were moved into `.cache/legacy-desktop-gen`, not retained as source.

The SDK owns host-only types; the kit owns the React adapter. Apps have no
imports from another app or the shell. The shared sample track list removes
Podcasts' previous dependency on Music. The shell still reads Music's one deck.
Storage keys, app names, default positions, rendering and app implementations
were preserved. No component harvest, sandbox, store, updater, CLI commands,
website, publication pipeline or release governance is implemented at this gate.

## Verification evidence

Evidence is local and gitignored under `.cache/debug/`.

| Check | Result / evidence |
| --- | --- |
| Root typecheck | `bun run typecheck` passes |
| Every workspace | `bun run --filter '@doan-labs/*' typecheck` passes; `monorepo-types.log` |
| Production build | `bun run build` passes with extracted StyleX CSS and copied public assets |
| Installed-source compilation | `monorepo-package-check.ts` copies SDK/kit into a consumer's `node_modules`, without workspace symlinks for those packages; consumer and kit compile with 6,930 bytes of CSS |
| Rust | `cargo shell-check` passes; `monorepo-cargo-check.log` |
| Native release | `bun run desktop:build -- --no-bundle` passes; `monorepo-native-build.log`, final rerun in `monorepo-native-final-build.log` |
| Browser baseline | Home and Notes at 180° and 0°, isolated headless Chromium; `monorepo-before.log` and `monorepo-before-*.png` |
| Browser production | Same views, no page errors; `monorepo-production.log` and `monorepo-production-*.png` |
| Live behavior, dev | Palette, fold handover, retained inner scene, shared editors, cross-tab storage, split layout and narrow editor pass; `monorepo-integration-retry.log` |
| Live behavior, production | Same checks pass against port 3011 serving `dist`; `monorepo-production-integration.log` |
| Native WKWebView dev | Real window renders Notes open, closed and reopened with existing saved text preserved; `monorepo-native-open.png`, `monorepo-native-fold.png` |
| Native production | Release executable launched with embedded assets after stopping the dev server; model, wallpaper, icons and lock screen render; keyboard side-button sleep/wake observed in screenshots |
| Lint | `bun run lint` exits successfully with 199 warnings; `monorepo-lint.log` |
| Whitespace | `git diff --check` passes |

Pixel comparison of baseline versus production Notes is identical outside the
clock: unfolded changed bounds are `(593,109)-(608,120)`; folded changed bounds
are `(606,103)-(615,114)`, at an 818×664 viewport. The home comparison additionally
changes dynamic widget content. Screenshots were also visually inspected.

An initial concurrent development capture stalled in SwiftShader and the fold
integration timed out. After stopping that capture, the isolated dev integration
and production integration both passed. The interrupted dev capture is not
counted as a complete pass; production has the complete three-view capture.

## Remaining review items and limits

1. **Formatting gate passes.** After explicit user authorization to fix the
   formatting errors, `bun run format` fixed 139 files. `bun run format:check`
   now passes with zero errors; 199 non-blocking lint warnings remain.
   Typecheck and production build pass after formatting. See
   `monorepo-format-fix.log` and `monorepo-format.log`.
2. **Window drag confirmed by the user.** The earlier synthetic drag was
   inconclusive; the user subsequently confirmed native dragging works. Native
   sleep/wake, folding, assets and app rendering were observed by the agent.
3. **Coverage is scoped.** No observed functional regression in the exercised
   flows. Every app typechecks/builds, but every control in all 39 apps was not
   exercised. Native IPC invocation, camera permissions, Windows/Linux,
   signed installers and notarization were not tested.
4. **Packages are not publishable releases.** Private 0.0.0 source exports are
   intentional. The copied consumer test validates source/StyleX resolution;
   standalone asset distribution, SDK runtime compatibility, manifests and
   publication/review policy remain later workstreams.

Review this gate before beginning the platform runtime or UI kit harvest.
