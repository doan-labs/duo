# Store

Current Store supports explicit catalog selection/Refresh, compatible GET/OPEN,
UPDATE/remove, staging while sessions run, restore/retry and DEV namespace removal.
The default catalog is the curated one published from `community-apps/` ([publication](publishing.md));
curated shelves remain [roadmap](roadmap.md); there is no catalog polling, Update All or native Software Update.

## The screen

`packages/apps/appstore/index.tsx`, a baked `light` app inside a kit `Nav`, laid out like the
App Store. The root page has the large title with the search field and Refresh on one line
(the field wraps under the title in a narrow box; Refresh turns orange on a developer
catalog, whose host also shows in a banner), then the Apps/Updates segment behind
`stageUpdates` beside the lane chips **All**, **Official**, **Community** and, with a developer
catalog loaded, **Local previews**, each with its count. A Today card features one compatible
official release per day, rotating: the release's own icon, blown up and blurred, is the
artwork, with the icon floating over it when the box is wider than 600 px. Then one group per
lane, **From Doan Labs**, **Community** and **Local previews**, its rows in two columns in a wide box
and one in a narrow one. A row is a
60 px icon, name, `author · version`, a lane tag (a green tick for Official) and permission tags
with glyphs, and the GET / OPEN /
UPDATE / Retry update capsule or a download ring. Notices (errors as `role="alert"`, "Updates
when … closes") sit under the row. Tapping an icon or name pushes
a detail page: version, size, lane, licence and access facts, a Privacy list of the granted
permissions, View source (the manifest repo, through the native bridge), **Restore previous
version** when a previous release is kept, and **Remove App**. Rows carry `data-store-app`; the checks drive those buttons by their text. The runtime gives
each row `icon` (a catalog file, or an object URL for a locally installed release), `repo`,
`bytes` and the optional release `note`.

## Default and developer catalogs

At boot and on Refresh the Store loads the first available of `/catalog/index.json` (the
hosted curated catalog), `/cdn/index.json` (a local build) and `/preinstalled/index.json`,
caching the last good default. The current source is shown in the Store; a developer catalog
loaded by URL replaces the rows and shows **Back to Duo catalog**, which discards the selection
and reloads the default. A compact **For developers** section groups the developer catalog
field with **Submit your app**, which opens the website guide through the native bridge.

An app installed from one origin never inherits an update from another: the install refuses
with the two origins named and the supported transition (Remove App, then GET from the new
catalog). Installed source identity is preserved across catalog switching.

## Catalog and immutable releases

A catalog `index.json` lists release identities and metadata hashes. Release files live
under `apps/<id>/<version>+<hash>/`: `release.json`, one `app.html` and `icon-1024.png`.
The builder emits one icon size. Rebuilds that change bytes get a different identity;
previous release URLs cannot be overwritten. See [manifest](manifest.md).

The Store selects a compatible release using the current host SDK's full caret rule;
kit versions do not gate it. No compatible release means a platform-version requirement,
not an invented shell version. A browser tab can retain an older host until reloaded.
Catalog refresh happens at boot or explicitly, never periodically.

External developer catalogs are supported and accept no device permissions. Hashes
verify integrity against the selected catalog, not author identity. Updates bind to the
origin recorded at installation. A different unsigned origin cannot inherit an installed
id's data. Provenance-less records accept only the shell origin.

## Install and remove

GET downloads bounded metadata and artifacts, checks identities, compatibility, hashes
and the exact document policy, then commits release bytes and the installed record in
one IndexedDB transaction. Interrupted downloads create no partial installation.
Document size is 1 MiB soft / 4 MiB hard; complete releases have an 8 MiB hard cap.

OPEN launches the stored document through the sandbox. The preinstalled official apps
are seeded from separate bundled releases once. A removed preinstalled app is not silently seeded
again. Native bundled assets can support offline installation; a network URL on the web
is not an offline cache guarantee.

Remove marks the record as removing and bumps generation before revoking views. After
cross-tab leases clear, it deletes release/data/checkpoint/recovery/legacy/widget state,
retaining non-data markers that prevent legacy reimport or revived launch authority.
Installed and development namespaces are removed separately. Trusted baked components
are not downloadable installations. See [contract §4](contract.md#4-storage-and-release-lifecycle).

## Updates and limits

An explicit update downloads a candidate; activation waits until no live session lease
remains. Code/data checkpoints, trial readiness, failed-release blocking and explicit
restore/retry use the shared lifecycle safeguards in [updates.md](updates.md).
Background reconciliation finishes committed transitions; it is not catalog discovery.

[The review guide](review.md) reproduces the actual flow. [current platform verification](review.md)
separates Chromium lifecycle coverage from bounded native evidence. Categories, curated
Today shelves, recommendations, ranking, reviews, commerce, automatic updates, badges,
release-note publication and icon variants remain planned or deferred.
