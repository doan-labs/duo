# Stage 3 developer workflow

2026-09-18. Complete and locally verified.

## Verified foundations

- `bun scripts/package-platform.ts` produces local SDK, UI-kit and CLI archives
  plus `artifacts.json` under `.cache/platform-packages`. Source workspace
  manifests stay private; nothing is published. CLI staging includes the existing
  builder, StyleX compiler, reset and official list. The kit includes local icon
  assets. Only dependencies already used by this repository are required.
- CLI create with `--packages <artifacts.json>` writes a consumer package using
  archive paths and overrides for the unpublished transitive packages. Bun
  otherwise tries the nonexistent registry version even when the direct package
  is a local archive. The external project installs and runs its installed CLI
  `check` and `build`. Evidence: `stage3-external-install.log`,
  `stage3-external-build.log`, `.cache/debug/stage3-external.json`.
- The builder resolves SDK/kit from the consumer's actual installed packages,
  including their metadata and embedded assets. Workspace resolution is only a
  fallback for existing repository apps, not required by packaged consumers.
- `development.mjs` verifies opaque src frames, separation from an installed app
  and from another development origin, immutable documents across rebuilds,
  explicit reload/stale-view fencing, persisted development data, removal of
  only preview data, and stopped watcher/server with no late build or polling.
  Evidence: `.cache/debug/stage3/development.json`, `stage3-development.log`.
  The development entry flag is enabled only after these checks passed.

## Current implementation decisions

Development downloads immutable `/apps/<id>/<release>/app.html` URLs. Stage-5
decision 49 pins verified HTML in a Blob `src`, superseding direct server
navigation without changing SDK, namespace or lifecycle contracts. The manifest
and release at the server root identify the current build; the host verifies
that exact release before creating its separate namespace and src frame.
Rebuilding does not navigate an already running frame. Reloading the simulator
selects the new release and retains only that preview namespace's storage.
CLI stop closes requests and watcher, waits for its active build, and removes
its owned temporary output. No automatic browser reload or catalog polling.

Device permissions remain refused for external catalogs and local previews.
No capture or additional permission work is implied by development support.
The DEV row in Store provides explicit removal; it clears the preview namespace
and revokes its frames. Installed rows remain manageable when their catalog is
not currently selected. Explicit Refresh keeps the selected external catalog.

Updates bind to the origin recorded at initial install. A different unsigned
catalog must not impersonate an existing app id and inherit its data. Existing
records without provenance accept the shell origin; removal/reinstall is an
explicit new installation. This adds a conservative host-side check without
changing the SDK protocol or weakening generation/ownership guarantees.

## Final evidence

`bun scripts/checks/stage3/workflow.mjs` passes against the built simulator and
installed local package archives in an OS temporary project. It exercises the
public CLI and real Store, including interrupted download/retry, independent
preview storage, GET/open, 180/120/0 fold, persistence after browser-process
restart, staging while another tab runs, activation after that session ends,
failed launch/restore/retry, and a newer fixed release after a failure. Uninstall
clears installed data without clearing preview data. The final rerun also proves
the Store offers a newer fixed version rather than only retrying a failed one.

Evidence: `.cache/debug/stage3/workflow/evidence.json`, `preview.png` and
`fold-180.png`, `fold-120.png`, `fold-0.png`; pixels inspected. Development
teardown and runtime source-origin rejection have separate passing checks.
Typecheck and production build pass. These stage-3 results are Chromium; the
native install/open/fold/restart evidence remains the bounded stage-2 matrix.

Reproduce from the repository:

```sh
bun scripts/package-platform.ts .cache/platform-packages/stage3
bun run typecheck
bun run build
bun scripts/checks/stage3/workflow.mjs
bun scripts/checks/stage3/development.mjs
```

The local CLI README gives the manual external-project commands. These private
archives are review artifacts, not an npm release. Stage 4 continues next.
