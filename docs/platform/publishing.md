# Publication: submission, review and the curated catalog

Status: the source-in-repository flow is implemented, 2026-09-18. Community apps live in
[`community-apps/`](../../community-apps/README.md), are validated by
`scripts/check-submissions.ts` on pull requests, and after merge are published by
`.github/workflows/publish.yml` to the `catalog` branch, which the website build serves at
`https://duo.doan-labs.com/catalog/`. Public npm packages remain unpublished; developers
use the local archive workflow in [development](dev.md). A separately hosted developer
catalog stays supported and needs no source contribution.

## Submission contract

`community-apps/<app-slug>/` holds manifest, source, `package.json` (plus `bun.lock` when it
depends on more than the platform set), a 1024 px `icon.png`, `screenshots/inner.png` and
`screenshots/cover.png`, `README.md`, `CHANGELOG.md` and the MIT `LICENSE`. The reverse-DNS
manifest id is the identity; the folder is a label. `community-apps/registry.json` maps ids
to folders and authorized GitHub maintainers and reserves `labs.doan.ipduo.` and
`dev.example.`. First-release rules: both displays, public SDK/kit only, complete metadata,
existing limits, `lane: community` with empty `permissions`. Approval grants no official
status and no permissions; permission-bearing submissions are a separate, verified expansion.

The registry, `OFFICIAL.txt`, `scripts/` and `.github/` are owned by maintainers through
`.github/CODEOWNERS`. `author` and `repo` strings prove nothing; identity changes,
transfers and release approval need the listed maintainers.

## Automated checks

`bun scripts/check-submissions.ts [folder] [--base origin/main]` checks every
changed folder (or the named ones) and writes `.cache/submissions/<slug>/` with
`report.json` and the built release under `catalog/`.

| Group | Verified |
| --- | --- |
| Identity and version | Valid manifest, kebab-case folder, registry entry and folder match, reserved namespaces, id unchanged against the base branch, version above the base branch and absent from the published index (`DUO_CATALOG_URL`, default the hosted catalog; unavailable history fails in CI) |
| Completeness | Required files, PNG screenshots, MIT text, changelog entry for the version |
| Source and dependencies | CLI `check` (imports, strict types, tokens, cap); dependencies beyond sdk/kit/stylex/react need `bun.lock` and are flagged for review |
| Release validity | Real builder output: size, hashes, SDK/kit versions, commit, empty permissions |

The gate is static and build-level. The headless-Chromium runtime probe was removed with
its browser driver: no automated step installs, launches or captures a submission any more, so
declared `network` origins and app-frame requests are not machine-checked. A reviewer
installs the built release in a running shell and judges it there.

Screenshot presence is automated; whether the interface is usable is review. A pass means
eligible for review, not accepted. Reviewers weigh behavior, dependency necessity, network
access, content rights and the contributor's screenshots.
`scripts/checks/submission/negatives.mjs` proves representative invalid submissions fail
for the stated reason.

## Trust boundary and workflows

`submissions.yml` runs on pull requests touching `community-apps/**` with `contents: read`
and no secrets; evidence is uploaded as the `submission-evidence` artifact and the step
summary. `publish.yml` runs on pushes to `main` touching the same paths, serialized by a
concurrency group: a `build` job (read-only) validates and builds the changed folders; a
`publish` job with `contents: write` only runs `scripts/publish-catalog.ts` over the built
files and pushes the `catalog` branch. No contributor install or build script runs in the
publishing job. Three states: checks passed → merged → published; only a green `publish` run
means the release is live, on the site's next deploy.

## Publisher behavior

`bun scripts/publish-catalog.ts <built> <tree> [--delist id@version+hash]` copies new
releases into `tree/apps/<id>/<version>+<hash>/` (release.json last, staged then renamed),
verifies uploaded hashes, refuses a version already published with different bytes, reuses an
identical existing release without touching its metadata or timestamp, records delisted
identities in `delisted.json`, then assembles `index.json` from every release in the tree,
newest version first. One publication never drops another app or its history; a failure
before the rename leaves the tree unchanged and a retry finishes. `git push` rejection is
the conflict detection between close merges; rerun the workflow to publish on top.
`scripts/checks/publish/publisher.mjs` exercises these cases.

Delisting stops offering a release to new installs; it does not downgrade, revoke or delete
installed apps or their data. A faulty release is superseded by a corrective version.
Retry a failed publication with `workflow_dispatch` and the folder name.

## Hosting

The website build runs `packages/web/scripts/catalog.ts`: it unpacks `origin/catalog` into
`public/catalog/` when reachable and merges the nine bundled official releases from
`dist/cdn` with the same publisher, so the hosted Store lists official and community apps
from one origin. The Store loads `/catalog/index.json`, then `/cdn`, then `/preinstalled`.
Catalog hashes are integrity checks, not signatures; publisher identity and signing remain
release decisions, as does any public telemetry statement.
