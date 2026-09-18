# Stage 4 UI-kit harvest

2026-09-18. Complete and locally verified; no public release.

## Migration method and evidence

Settings migrated first. Existing styles and native element types are preserved
by typed components with `as` and StyleX `xstyle` extensions. Settings passed
inner/cover captures before Contacts/Mail, which passed before Notes, Reminders,
Files and Messages. Those also passed at both widths. The same proven patterns
then migrated across the remaining apps; Weather is last. Trusted shell-only
apps retain their APIs and effects. This is a UI migration, not an expansion of
the sandbox's device permissions or a forced conversion of every built-in app.

Baseline and migration captures are under `.cache/debug/stage4/`. The frozen
baseline avoids comparing against a live rebundle. Actual pixels are inspected
alongside DOM and runtime checks. Full simulator checks require the local Apple
model; the isolated component gallery does not.

## Public kit

Kit 0.1.0 adds screen/stack, titles, grouped rows, captions/numbers, buttons,
switches, navigation aliases/links, symbols, CSS animation presets and passive
widget labels. Old Nav/Page/Sym/Num and style subpaths remain. `useDisplay`
subscribes to the SDK without opening a connection. No component starts network,
audio or ownership work; navigation cleanup and reduced motion are handled.

`examples/developer` is a separately installable gallery, not a shell special
case. Its public exports render in opaque 768/340px views, mirror a durable
switch, expose real SDK display updates, handle keyboard activation and push/back,
respect reduced motion, and tear down with no external requests. Pixel review
caught the gallery's missing app-surface theme; the example now explicitly themes
navigation along with its root. Evidence: `gallery/evidence.json` and captures.

Exact appearance constants are harvested into `tokens.stylex.ts`; generated
legacy names identify their first use and preserve values rather than impose a
new palette. New UI uses semantic tokens. Bespoke graphics and dynamic colour
generation remain app-specific. API data is generated from TSDoc and exported
props into `docs/platform/api/uikit.json`, ready for the website owner.

## Validation

CLI check now parses imports, rejects shell/other-app/remote and escaped relative
sources, symlinks and computed imports, and runs strict TypeScript before bundle
validation. Builder enforces the 4 MiB cap for every entry path. Existing
TypeScript, React types and Babel tooling are included in CLI archives; no new
third-party library was introduced. Negative import/type cases pass.

`scripts/check-platform.ts` passes locally: strict types, SDK tests, API freshness,
token checks, negative import/type cases, four app builds, shell build and gallery.
The CI workflow does not publish or deploy; remote CI has not run.

Final archives were consumed outside the workspace by the full Developer gallery:
`.cache/debug/stage4/packages.json`. Public kit is 0.1.0; private SDK/CLI are 0.0.0.
The 39 official app surfaces passed at both fold endpoints (78 captures), recorded
in `stage4/final` (Settings, Contacts, Mail, Messages, Reminders, Files) and
`stage4/final-serial` (the remaining 33). All captures were visually reviewed via
`stage4/review-0.png` through `review-9.png`. This is a rendering smoke matrix,
not exhaustive interaction/native parity. Camera shows its unavailable state in
headless Chromium; Maps depends on an external embed. Trusted app capabilities
remain where they were; this harvest adds no sandbox permissions.

Serial final Notes persistence/Escape and Weather live owner/refresh/network-denial
checks pass (`stage5-notes-serial.log`, `stage5-weather-serial.log`). Navigation,
keyboard, mirror and reduced-motion interactions are covered by the gallery.
