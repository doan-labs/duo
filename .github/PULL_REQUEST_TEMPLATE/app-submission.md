---
name: App submission
about: Add a community app to the Duo App Store, or update one
---

<!-- For both a new app and an update to one you already maintain. -->

## The app

- **Kind:** new app / update
- **App id (manifest `id`):**
- **Version:**
- **Folder:** `community-apps/<app-slug>/`
- **Registry entry:** added / already present and unchanged
- **Network origins declared in `network`:** (none, or list them)
- **Dependencies beyond `@doan-labs/duo-sdk`, `@doan-labs/duo-uikit`, `@stylexjs/stylex`, `react`, `react-dom`:** (none, or list each one and why it is needed)

## What changed

<!-- New app: what it does and what the cover shows. Update: the changelog entry. -->

## Screenshots

<!-- Attach both. A submission without them cannot be reviewed. -->

- Inner display:
- Cover:

## Checklist

- [ ] Runs on both displays; the cover is supported, not a placeholder.
- [ ] Uses only public `@doan-labs/duo-sdk` and `@doan-labs/duo-uikit` exports — no shell imports, no imports from another app.
- [ ] Complete metadata: 1024 px `icon.png`, `screenshots/inner.png`, `screenshots/cover.png`, `README.md`, `CHANGELOG.md`.
- [ ] `LICENSE` is MIT.
- [ ] Manifest has `"lane": "community"`.
- [ ] `permissions` is empty.
- [ ] Every origin the app contacts is declared in `network`.
- [ ] The built document is under the 4 MiB cap.
- [ ] `bun.lock` is included if and only if there are dependencies beyond the platform set.
- [ ] I ran `bun scripts/check-submissions.ts community-apps/<app-slug>` locally and it passed.
- [ ] I am listed in `community-apps/registry.json` as a maintainer of this app id, or this PR adds a new id I own.
- [ ] I have the right to contribute this code under MIT.

A passing check means the submission is **eligible for review**, not that it is accepted.
Merging is acceptance; the app is live only once the publish workflow run succeeds.
