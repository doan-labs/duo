# Contributing

## Submitting an app

Community apps are contributed as source and reviewed through pull requests.

1. Put your app in its own kebab-case folder under `community-apps/<app-slug>/`:
   `manifest.json`, `main.tsx` and its other sources, `package.json` (plus `bun.lock`
   only if you depend on something beyond `@doan-labs/duo-sdk`, `@doan-labs/duo-uikit`,
   `@stylexjs/stylex`, `react` and `react-dom`), a 1024 px `icon.png`,
   `screenshots/inner.png` and `screenshots/cover.png`, `README.md`, `CHANGELOG.md`
   and an MIT `LICENSE`. Copy the shape from `community-apps/fold-compass/`.
2. Add your entry to `community-apps/registry.json`: the manifest's reverse-DNS id,
   the folder, and the GitHub accounts allowed to maintain it. That list — not the
   `author` or `repo` strings in a manifest — is what proves ownership. Identity
   changes, ownership transfers and releases need a review from those accounts.
3. Run the check CI runs: `bun scripts/check-submissions.ts community-apps/<app-slug>`.
4. Push a branch and open a pull request with the `app-submission` template
   (`?template=app-submission.md` on GitHub's compare view). Attach both screenshots.

Reviewers read the manifest, the diff, the dependencies you added, the origins you
declared in `network`, and how the app behaves across the fold. Three states, and they
are not the same thing:

| State | Means |
| --- | --- |
| Checks passed | Eligible for review. Not acceptance. |
| Merged | Accepted; the source is in the repository. |
| Published | The publish workflow run succeeded and the release is in the catalog at `https://duo.doan-labs.com/catalog/index.json`. Only now is the app installable. |

To ship an update, bump `version`, add a changelog entry, and open a new pull request.
The full guide is at [duo.doan-labs.com/publish](https://duo.doan-labs.com/publish).

## Everything else

Read [AGENTS.md](AGENTS.md) for the stack, the commands and the conventions the whole
repository follows, and the [documentation index](docs/README.md) for the page that owns
whatever you are about to change. Run `bun run typecheck` before opening a pull request.
