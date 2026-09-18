# Publication plan and current validation

Status: local validation exists; public package/catalog publication is not implemented.
Use [development](dev.md) and [the local review guide](review.md) to distribute a separately
built developer catalog today. Apps do not need to contribute source to this repository
for that workflow. Public release requires separate authorization and release decisions.

## Implemented checks

CLI check validates manifest metadata, lane membership, CHANGELOG, icon, strict types,
import boundaries, tokens and bundle size. `official` is checked against `OFFICIAL.txt`.
The document hard cap is 4 MiB; runtime release download caps are 8 MiB. Isolation is
provided by the sandbox and bridge, not static source checks.

`.github/workflows/platform.yml` runs `scripts/check-platform.ts`: types, SDK tests,
API freshness, token/negative validation checks, app/shell builds and the isolated gallery.
The gate passed locally; a remote CI pass is not claimed by the implementation reports.

## Proposed curated catalog

A reviewed source-in-repository workflow remains proposed for the curated catalog:
MIT apps, maintainer-controlled official/community lanes, reviewed dependencies,
inner/cover screenshots and explicit permission review. Lane is maintenance status,
never permission to execute in the shell. Protect trust lists and release configuration.

Before enabling merge-to-publication, implement and verify id uniqueness/version-bump
checks, per-submission isolation tests, immutable artifact upload followed by catalog
publication, release metadata and failure handling. Every app supports the cover;
there is no `cover` flag. Icon variants and PR comments remain unimplemented.

Public SDK/kit/CLI distribution needs versions, provenance and credentials. Use the existing
local toolchain; no published `npx` workflow is promised. Catalog hashes are not signatures.
Publisher authentication and signing remain separate design/release decisions.

## Removal and privacy decisions

Delisting a catalog entry, disabling an installed app and deleting its data are different
actions. Existing user uninstall is implemented; maintainer revocation and distribution
recovery policy remain open. Do not treat a removed listing as revoked execution authority.

Any public telemetry statement must be checked against actual instrumentation and approved
before publication. This document makes no new claim about deployed analytics. See [roadmap](roadmap.md) for outstanding release work.
