# CLI

Local Bun tooling; this package is private and is not published to npm.
The package is `@doan-labs/duo-cli`; installed projects use the `duo` executable.

```sh
bun scripts/package-platform.ts
bun packages/cli/index.mjs create my-app --packages .cache/platform-packages/artifacts.json
bun packages/cli/index.mjs check /path/to/my-app
bun packages/cli/index.mjs build /path/to/my-app --out /path/to/catalog
bun packages/cli/index.mjs serve /path/to/catalog --port 5173
```

`create` writes a manifest, React/Nav entry, placeholder icon, changelog and
package metadata. `check` validates metadata, official-lane membership, parsed
import boundaries, strict TypeScript and the 4 MiB bundle cap. It refuses source
symlinks, relative imports outside the app, computed imports, shell/other-app
imports and remote source modules. These hygiene checks do not replace sandbox
enforcement or implement the broader publishing service. Temporary check output
is removed. `build` also enforces the hard cap.

Run create from the desired parent directory (the name is kebab-case, at most
12 characters). `--packages` selects the local archive set for unpublished
SDK/kit/CLI versions and their transitive overrides. Run `bun install` in the
created folder, then use its `bun run check`, `bun run build` and `bun run dev`.
No source needs to live inside this repository.

`dev [folder] --port 5173 --simulator http://localhost:3000` builds and watches,
printing the shell's `?dev=` URL. Reload explicitly to select a rebuilt release.
`preview` does the same initial build without watching. Both use immutable
release paths; Ctrl-C stops the server/watcher and removes owned temporary
output. Preview data is isolated by origin and app id. Remove its DEV row in
App Store to clear it. Device permissions remain deferred for previews.

`serve` provides loopback static hosting with CORS. Load its `/index.json` URL
in App Store, then GET/OPEN. Explicit Refresh uses the selected catalog; no
background catalog polling is enabled. See [the review guide](../../docs/platform/review.md)
for reproduction and verification scope.

`bun scripts/check-platform.ts` runs the corresponding repository/CI gate,
including SDK tests, generated API freshness and the opaque-frame UI gallery.
External installed packages use their own exports and declarations. Repository
examples have a documented compiler fallback to repository packages; external
artifact-consumption checks independently verify that fallback is unnecessary.
