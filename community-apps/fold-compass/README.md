# Fold Compass

The example community submission. It shows the hinge angle, changes layout between the
open desk board, the folded workspace and the cover's pocket card, and keeps one field
note in app-private storage. Its responsive layout, typography, glass surfaces and
reduced-motion-safe transitions use the public UI kit token scales.

## Verify

From the repository root:

```sh
bun scripts/check-submissions.ts community-apps/fold-compass
```

That runs the CLI `check` (manifest, imports, strict types, 4 MiB cap), the submission
rules (files, registry entry, empty permissions, version increase) and builds the release
into a temporary directory. Then open the simulator, load the built catalog in App Store
and fold to 120° and 0°: the board becomes a folded workspace, then a pocket card.

## Layout

| File | Purpose |
| --- | --- |
| `manifest.json` | Identity `labs.doan.fold-compass`, version, author, license |
| `main.tsx` | Live hinge and storage wiring with the responsive app markup |
| `styles.ts` | Token-based layout, glass treatment and reduced-motion-safe motion |
| `package.json` | Platform dependencies only, so no lockfile is needed |
| `icon.png` | 1024 px square PNG |
| `screenshots/inner.png`, `screenshots/cover.png` | Both displays, captured from the simulator |
| `CHANGELOG.md`, `LICENSE` | Version history and the MIT license |
