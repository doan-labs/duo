# Publication: submission, review and the curated catalog

Status: the source-in-repository flow is implemented, 2026-09-18. Community apps live in
[`community-apps/`](../../community-apps/README.md), are validated by
`scripts/check-submissions.ts` on pull requests, and after merge are published by
`.github/workflows/publish.yml` to the `catalog` branch. The same workflow creates a
traceable empty commit on `main` after a changed catalog push so the static website build
reloads that branch and serves it at `https://duo.doan-labs.com/catalog/`. Public npm
packages remain unpublished; developers use the local archive workflow in [development](dev.md).
A separately hosted developer catalog stays supported and needs no source contribution.

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

## Developer profiles

The registry also holds who publishes each app. `developers` maps a kebab-case handle to
a profile: `name` (1-32 characters), `description` (1-160 characters, shown under the name
on the developer's tab on /apps), `imageUrl` (https), optional `website` (https) and
optional `github` (a login); no other fields are accepted. The image stays where the URL
points: the repository and the catalog carry no copy, so a change at that URL changes the
picture without review. Every app entry names its `developer`,
and `officialDeveloper` is the profile official-lane apps list under. A developer is not
a maintainer: the Devin-built apps list under `devin` while `mnismt` maintains them.
The manifest `author` must equal the developer's handle or name. Profiles are
maintainer-controlled through the registry's CODEOWNERS entry, so a profile edit needs a
repository maintainer. `scripts/registry.ts` validates them for the gate, the publisher
and the website build alike.

## Automated checks

`bun scripts/check-submissions.ts [folder] [--base origin/main]` checks every
changed folder (or the named ones) and writes `.cache/submissions/<slug>/` with
`report.json` and the built release under `catalog/`.

| Group | Verified |
| --- | --- |
| Developer profiles | Every profile's fields, every app's developer and `officialDeveloper` resolve; checked on every run, even when no app folder changed; the manifest `author` matches the app's developer |
| Identity and version | Valid manifest, kebab-case folder, registry entry and folder match, reserved namespaces, id unchanged against the base branch, version above the base branch and absent from the published index (`DUO_CATALOG_URL`, default the hosted catalog; unavailable history fails in CI). The two version gates apply only when the authored folder changed; an untouched folder re-run at the same version is a republication candidate, decided by the publisher's provenance gate below |
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
files and pushes the `catalog` branch. After a changed catalog push, it makes one empty
`main` commit to trigger the static website builder; that commit does not touch
`community-apps/**`, so it cannot recursively trigger publication. No contributor install
or build script runs in the publishing job. Three states: checks passed → merged → catalog
published → website deployed.

## Publisher behavior

`bun scripts/publish-catalog.ts <built> <tree> [--delist id@version+hash]` copies new
releases into `tree/apps/<id>/<version>+<hash>/` (release.json last, staged then renamed),
verifies uploaded hashes, reuses an
identical existing release without touching its metadata or timestamp, records delisted
identities in `delisted.json`, then assembles `index.json` from every release in the tree,
newest version first. A second identity under one authored version is admitted only as a
shared-deps rebuild that proves its provenance (below); anything else at that version is
refused as `already published`. With `--registry community-apps/registry.json` it also snapshots the
developer profiles into `developers.json`; the index gains `developers` (handle to profile)
and a `developer` handle on each app. Without the flag, the tree's last snapshot stands. Invalid profiles
refuse the whole run before the index is touched. The workflow passes the registry on every
call and ends with one release-free run, so a profile edit publishes on its own. One publication never drops another app or its history; a failure
before the rename leaves the tree unchanged and a retry finishes. `git push` rejection is
the conflict detection between close merges; rerun the workflow to publish on top.
`scripts/checks/publish/publisher.mjs` exercises these cases.

### Republication under one authored version

Contract R4 lets a shared-code change produce a new release identity under the same
authored version (`1.0.0+newhash` next to `1.0.0+oldhash`), which is how an SDK or UI kit
bump republishes every app without forcing a version bump on unchanged source. The
publisher admits the second identity only when all of these hold against the newest
release already published at that version, and refuses otherwise:

- the built `manifest.json` is byte-identical to the published one (no authored metadata moved),
- both recorded `build.commit` values resolve to real commits and the new one is the old
  one or a descendant (`merge-base --is-ancestor`),
- the manifest committed at the new build commit equals the built one, so the recorded
  commit is genuinely what the app was built from,
- the registry maps a community id to the same folder at both recorded commits and that
  equals the live registry's mapping (`git show <commit>:community-apps/registry.json`),
  so repointing an id to a different folder between builds cannot reuse a version -
  absent, malformed or divergent mappings refuse, and folder mappings must be kebab-case
  relative paths inside `community-apps`,
- the app's source tree is identical between the two commits (`git ls-tree` hash over
  `packages/apps/<name>` for officials or the registry folder for community apps), while
  the commit range changed something at all,
- `build.sdk` and `build.kit` equal the versions in `packages/sdk` and
  `packages/uikit` `package.json` at the recorded commit, so a forged SDK claim on a
  new hash cannot produce an identity the real toolchain never built.

All checks fail closed: unresolvable folders, missing or 'local' commits, backwards
commit order and consumer dependencies outside the in-repo tree all refuse, and the
checks are data-only git reads - the publishing job still never executes app code.
Identical rebuilt bytes stay on the reuse path and keep the original metadata, so a
forged `build.sdk` on an unchanged artifact never reaches the index. Index rows list
every admitted identity newest-build first, and the shell's `supports()` picks the first
its host satisfies, so a host with legacy support and a pre-bump host each keep a
compatible row. The index-level safety net still rejects one version published under
different manifests.

Deploy order for a shared-SDK republication: merge the SDK change (the host carries
explicit legacy support), let the site build merge the rebuilt officials through the
same provenance gate, republish the community folders via `workflow_dispatch`, then the
workflow's redeploy commit triggers the website build that serves the updated catalog.
With legacy support on the host the interim catalog (old-sdk rows only) stays launchable,
so the window between the host deploy and the catalog redeploy breaks nothing.

Delisting stops offering a release to new installs; it does not downgrade, revoke or delete
installed apps or their data. A faulty release is superseded by a corrective version.
Retry a failed publication with `workflow_dispatch` and the folder name.

## Hosting

The website build runs `packages/web/scripts/catalog.ts`: it unpacks `origin/catalog` into
`public/catalog/` when reachable and merges the bundled official releases from
`dist/cdn` with the same publisher, so the hosted Store lists official and community apps
from one origin. The Store loads `/catalog/index.json`, then `/cdn`, then `/preinstalled`.
The release trees run through the site Worker (`run_worker_first` in
wrangler.jsonc, `packages/web/worker.ts`) because their Cache-Control must be
status-conditional, which the asset layer's `_headers` cannot express: a flat
immutable rule would stamp year-long freshness on a 404 and let a client cache
the absence of a release it asked for before publication. Committed hits get
`Cache-Control: public, max-age=31536000, immutable, no-transform` - `no-transform`
forbids edge rewriting of the bytes the downloader hashes, which is how the
hosted production symptom presented; misses, redirects and errors get
`no-store`. Only Cache-Control is overridden; bodies and other headers pass
through. `scripts/checks/publish/headers.mjs` asserts the routing contract
(`run_worker_first` covers exactly the three trees and `assets.binding` stays
`ASSETS`, the name `worker.ts` dereferences), and resolves `assets.directory`
to the real build output rather than matching a substring. `_headers` never
applies to Worker-served responses, so release-tree rules there are dead
config; the checker still validates any `_headers` file present (grammar,
comma-join and detach, directive values, and conflicting same-name directives
in the joined value on probed paths) because broken directives are defects
wherever they sit, and drives the real Worker handler over canned statuses;
live edge behavior is verified against the deploy itself.
Site Created/Updated dates are the release `build.at` for community apps but the first
and last package commit for official apps: their `dist/cdn` release is rebuilt on every
site build, so its timestamp is only the deploy minute. For the same reason the script
completes shallow checkouts (`git fetch --unshallow`) before reading commit history -
a single-commit checkout would date every package to the deploy commit.
Catalog hashes are integrity checks, not signatures; publisher identity and signing remain
release decisions, as does any public telemetry statement.
