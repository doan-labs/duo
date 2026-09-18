# Website integration

Taken up 2026-09-18: `packages/web` now describes this state on every page;
see [progress/web.md](progress/web.md). The constraints below still hold, in
particular that no install command implies publication.

This work does not edit `packages/web` or its separate worktree, merge that
worktree or wait for it. Public hosting remains static at duo.doan-labs.com.
There is no custom backend and no deployment in this task.

- SDK preview version: 0.0.0, protocol 1. The accepted runtime contract remains
  `contract.md`; capture and extra device permissions remain deferred.
- UI-kit preview version: 0.1.0. Generated `api/uikit.json` contains package
  version, descriptions, exported prop declarations and source links. Generate
  with `bun scripts/generate-kit-docs.ts`; CI checks freshness. Compatibility and
  examples are in `packages/uikit/README.md`; no renderer or route is prescribed.
- CLI stays a private 0.0.0 preview. `scripts/package-platform.ts` creates local
  SDK/kit/CLI archives and `artifacts.json`. These are local review artifacts,
  not published npm URLs. Website install commands must not imply publication.
- A developer hosts static catalog `index.json` plus immutable
  `apps/<id>/<version>+<hash>/` release files with CORS. Store loads a catalog
  explicitly and never polls. Updates bind to their original catalog origin.
  `?dev=<origin>` downloads immutable preview documents in a separate namespace;
  the verified HTML executes from a Blob `src`. Allow `blob:` in frame CSP and
  the selected developer origin for downloads, not arbitrary remote frame HTML.
- Fold Compass and Developer gallery install from separate catalogs without
  rebuilding simulator source. Link their examples and measured evidence;
  distinguish Chromium tests from the bounded native WKWebView checks in stage
  reports. The independent catalog workflow requires no source contribution here.

Before public npm distribution or deployment, the owner must choose release
versions/provenance, replace placeholder app metadata/icons where appropriate,
and obtain authorization for publication. Accounts, payments, ranking, reviews and expanded
store features are not prerequisites for the developer workflow.
