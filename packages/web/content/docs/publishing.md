# Publishing

There are two ways to distribute a Duo app: submit it to the curated catalog through a pull request, or host a catalog yourself. Either way there is no account to create.

## Host your own catalog

1. `bun run build` in your app. `dist/` is a complete catalog with one app.
2. Put `dist/` on any static host that serves the files with CORS (`Access-Control-Allow-Origin: *`) and a short cache on `index.json`. GitHub Pages, an object bucket, your own server: anything that returns the right bytes and does not fall back to an HTML page for a missing path.
3. Share the URL of `index.json`. Anyone running Duo pastes it into the App Store's Developer catalog field.

To ship an update, bump `version`, add a changelog line, build, upload the new release folder, then upload the new `index.json`. Never edit a published release folder.

## Lanes

| | Community | Official |
| --- | --- | --- |
| Who | Anyone | The catalog owner, or promoted from community |
| Runtime | The same sandbox | The same sandbox |
| Store | Community ribbon, author shown | No ribbon |

Lane is a review status, not a capability. An official app has exactly the same access as a community app. `check` refuses `official` for an app the repository's trust list does not name.

## The official catalog

The curated catalog is built from source in the repository. An app is a folder under `community-apps/<app-slug>/` holding its manifest, source, icon, screenshots, readme, changelog and MIT licence, plus an entry in `community-apps/registry.json` naming the GitHub accounts allowed to maintain it.

You add that folder in a pull request opened with the `app-submission` template. CI runs `bun scripts/check-submissions.ts` over it; a passing check means the submission is eligible for review, not that it is accepted. Merging is acceptance. After the merge, the publish workflow builds the immutable release and writes it to the catalog hosted at `https://duo.doan-labs.com/catalog/index.json` — the app is live only once that run succeeds.

The full guide, including the first launch's acceptance rules, is at [/publish](/publish).

## Telemetry

The shell reports app open and close by id and nothing from inside the app. A sandboxed frame cannot be observed further by construction.
