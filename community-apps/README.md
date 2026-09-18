# Community apps

Source for apps published to the curated Duo catalog. Each folder is one independent
app project reviewed through a pull request. Built-in apps stay in `packages/apps/`;
these folders are not workspaces and do not touch the root lockfile.

The full guide with the review and publication flow is the website's
[Submit your app](https://duo.doan-labs.com/publish) page; the short version is in
[CONTRIBUTING.md](../CONTRIBUTING.md). [`fold-compass/`](fold-compass) is the example.

## Layout

`community-apps/<app-slug>/`, kebab-case. The folder name is a label; the manifest's
reverse-DNS `id` is the durable identity and never changes after the first release.

| File | Purpose |
| --- | --- |
| `manifest.json` | Stable id, version, author, MIT license, `network` origins; `lane` is `community`, `permissions` is empty |
| `main.tsx` and supporting source | The app, using only `@doan-labs/duo-sdk` and `@doan-labs/duo-uikit` exports |
| `package.json` (+ `bun.lock`) | Declared dependencies; a lockfile is required when anything beyond the platform set (sdk, kit, stylex, react, react-dom) is used |
| `icon.png` | 1024 px square PNG |
| `screenshots/inner.png`, `screenshots/cover.png` | The app on the inner display and on the cover |
| `README.md`, `CHANGELOG.md`, `LICENSE` | Usage and verification, an entry per version, the MIT text |

## Acceptance rules for the first curated release

1. **Runs on both displays.** Usable controls and readable content on the cover too.
2. **Uses the public platform.** No shell imports, no other app's source, no `__TAURI__`.
3. **Complete metadata.** Valid icon, both screenshots, changelog entry, license and accurate `network` origins.
4. **Fits the limits.** 4 MiB document, single-file build, the sandbox rules in `docs/platform/`.
5. **Community lane, empty permissions.** Approval grants no official status and no device permissions. Permission-bearing submissions are a separate, explicitly verified expansion.

## Ownership

[`registry.json`](registry.json) maps each id to its folder and authorized GitHub maintainers.
Anyone may open a fix. Identity changes, ownership transfers and release approval need review
from the listed maintainers plus a repository maintainer. An `author` string or `repo` URL
proves nothing. The registry, `OFFICIAL.txt`, `scripts/` and `.github/` are protected by
[CODEOWNERS](../.github/CODEOWNERS).

## Checks

```sh
bun scripts/check-submissions.ts community-apps/<app-slug>   # one folder
bun scripts/check-submissions.ts                              # every folder the PR touched, in CI
```

A pass means eligible for review, not accepted. Merge is acceptance; the publish workflow
run makes the release live at `https://duo.doan-labs.com/catalog/`.
