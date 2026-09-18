# Publishing

The [2026-09-18 scope amendment](stage-2-mvp.md) allows a separately authored,
separately built developer catalog for the launch proof. The in-repo PR/CI
workflow below remains a curated-catalog roadmap and does not block this gate.

**Implemented:** the per-app `check` rules (lane, CHANGELOG, caps, icon, import
boundary, strict types, tokens) and `.github/workflows/platform.yml`, which runs
`scripts/check-platform.ts` only. **Not implemented:** published `npx` packages,
merge-triggered catalog builds and uploads, id uniqueness and version-bump
checks, PR comments, icon variants, per-submission Puppeteer isolation runs.

Every app is a folder under `packages/apps/`, MIT, in this repo. Publishing is
a pull request.

## Lanes

| | Official | Community |
| --- | --- | --- |
| Who | The maintainer, or promoted from community | Anyone |
| Downloadable runtime | Sandboxed bundle | Sandboxed bundle |
| Direct `native.ts` access | No; baked shell components are a separate boundary | No |
| Cover display | Required of every app, verified by contract check F | Same |
| Review | Maintainer | Maintainer, with author participation |
| Store | No ribbon | Community ribbon, author shown |

Lane is set in the manifest but enforced by CI: `official` outside
`OFFICIAL.txt` at the repo root fails the build. Promotion is a one-line PR to
that file. Promotion changes maintenance/review status, not execution privileges.
Protect the trust list and publishing configuration with maintainer review;
CODEOWNERS listing multiple people does not require approval from each of them.

## The PR

1. `npx @doan-labs/ipduo create` or copy an existing folder.
2. `npx @doan-labs/ipduo check` locally.
3. Open the PR. The template asks for a screenshot on the inner display and,
   if `cover: true`, one on the cover display.
4. CI runs the checks below. Human review covers code and behavior as well as
   icon, name, and summary. Static checks do not prove arbitrary code safe.
5. Merge publishes: CI builds the immutable bundle from reviewed source,
   uploads the complete release, and publishes `index.json` afterward.

## What CI checks

Everything a machine can decide, so the human review stays short:

- Manifest matches the schema. `id` is reverse-DNS and unique. `license` is MIT.
  `permissions` names rows of the SDK permission table; the PR comment lists
  them in words ("Can use: Location, Photos") so the reviewer's approval is
  the grant (progress/contract.md §6).
- `version` increased if any file in the folder changed.
- `CHANGELOG.md` has a line for that version.
- Build succeeds with declared SDK and kit dependencies. Host compatibility
  is checked separately through the SDK contract.
- Measure the full bundle, including runtime dependencies and assets. The
  earlier 100 KB JS / 20 KB CSS proposal needs reevaluation for isolated apps;
  final limits and override policy remain open.
- No native API imports or direct host-internal access in downloadable apps.
  The SDK owns parent-window messaging. Network declarations and static checks
  aid review but do not provide runtime isolation.
- No hex colours or font literals; tokens only.
- `icon.png` is 1024 square. CI generates every variant.
- Typecheck passes against SDK and kit exports.
- The app mounts as a mirror without throwing and without starting audio
  (a Puppeteer smoke run, `docs/debug.md` already drives the shell headless).
  Explicitly check isolation, sender validation, teardown, and native IPC denial;
  a successful mount is not evidence of those properties.

## Removal

An author may remove their app by PR. The maintainer may remove an app that
breaks the rules above after merge; the folder goes, the CDN keeps old
versions, and `index.json` drops the listing. Delisting, disabling an installed
app, and deleting its data are separate actions. Installed-app revocation and
recovery behavior remain open decisions.

## Telemetry

The shell already reports to PostHog. For apps it reports open and close by id
and nothing from inside the app. Iframe apps cannot be observed further by
construction. This sentence appears on the Developers page.
