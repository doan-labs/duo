# Publishing

Publishing a Duo app means hosting a catalog. There is no account to create and no submission form.

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

The first-party catalog that will ship with Duo is built from apps in the repository: a pull request with your app folder, the same `check` in CI, review by the maintainer, and a merge that publishes the immutable release. The lanes, checks and release format above are that workflow's; the automated publish step and the hosted catalog are not live yet. Until they are, a catalog you host is the way to distribute, and it needs no change later.

## Telemetry

The shell reports app open and close by id and nothing from inside the app. A sandboxed frame cannot be observed further by construction.
