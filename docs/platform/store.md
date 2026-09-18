# Store

Current Store supports explicit catalog selection/Refresh, compatible GET/OPEN,
UPDATE/remove, staging while sessions run, restore/retry and DEV namespace removal.
The local builder generates catalogs. Curated shelves and automated publication remain
[roadmap](roadmap.md); there is no catalog polling, Update All or native Software Update.

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

OPEN launches the stored document through the sandbox. Notes and Weather are seeded
from separate bundled releases once. A removed preinstalled app is not silently seeded
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
