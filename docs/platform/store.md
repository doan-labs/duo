# Store

Current Store supports explicit catalog selection/Refresh, compatible GET/OPEN,
UPDATE/remove, staging while sessions run, restore/retry and DEV namespace removal.
The default catalog is the curated one published from `community-apps/` ([publication](publishing.md));
curated shelves remain [roadmap](roadmap.md); there is no catalog polling, Update All or native Software Update.

## The screen

A baked `light` app in three files: `packages/apps/appstore/index.tsx` for the shell and the
sections, `app-page.tsx` for one app, `rows.tsx` for the icon, the capsule and the catalog row
they share. It is laid out like the App Store, and which of its two layouts you get depends on
the box, measured with the kit's `useWide`, not on the display: a split half of the inner
display is as narrow as the cover.

Wider than 600 px, a **sidebar** holds the search field, the sections and, at its foot, the
catalog everything came from with Refresh beside it: a white card with the Doan Labs mark,
`Doan Labs` over `Duo catalog`, where a Mac puts the account (orange, with the developer's host,
on a developer catalog, which also shows in a banner). Narrower, the sidebar becomes a **tab bar** and the search
field moves beside the large title. Both float over the pane rather than taking a column or a
strip out of it: inset from the edges, rounded concentric with the glass (`layout.screenInnerPanel`; the tab bar at `radius.xxl`), on a translucent
`appstorePanel` under [decision 18](../decisions.md)'s glass recipe and `shadow.float`. The
sidebar runs up under the status stack and stops 8 px from the top, clear of the clock on the
inner display's far right. The pane runs the full width under it and pads its scroller, and a
pushed app page, clear: the copy stays beside the glass while Discover's wash and a page sliding
in pass under it. Over plain paper the glass had nothing to carry and read as a white slab. The
tab bar crosses the scroll, so its
clearance is in the scroller and the list runs under the glass to the last row, above the home
bar's bottom 22 px.

The sections are **Discover**, **Apps**, **Official**, **Community**, **Previews** with a
developer catalog loaded, **Updates** behind `stageUpdates`, and **Develop**, each but Discover
and Develop with its count; the three lane sections have no room in the tab bar, so Apps shows
every lane there. Typing in the search field replaces the pane with **Results** whatever the
section.

**Discover** is Today cards: one compatible official release per day leads, rotating, on a
plain surface with its icon beside the copy, over a wash of that icon blown up and blurred
across the top of the page, edge to edge, faded in under the status stack and out by the shelf, and every other release gets a card whose artwork
is its own icon, blown up and blurred. A card is a kicker (what most needs saying about that
release, falling back to its lane), the name, what it reaches for, and a bar with the icon,
`author · size` and the capsule. **Apps** and the lane sections are groups of rows, two columns
across in a wide box and one in a narrow one: a 60 px icon, name, `author · version` and, where
there is one to draw, a DEV tag or permission tags with glyphs, then the GET / OPEN / UPDATE /
Retry update capsule or a download ring, with the size or version beside it. There is no lane
tag: every group is one lane and its heading says which. Notices (errors as `role="alert"`,
"Updates when … closes") sit under the row. The group that opens a pane drops its hairline, so
the pane title is not followed by a second heading saying the same thing.

Tapping a card or a row pushes the app page **inside the pane**, so the sidebar and the tab bar
stay put; picking another section drops it. The page is the icon, name, author and capsule over
a strip of version, size, lane, licence and access facts, the compatibility line, the
description beside the developer's links, an **App Privacy** card naming the device access the
release asked for (or that it asked for none), **You Might Also Like** with the rest of its
lane, **Restore previous version** when a previous release is kept, and **Remove App**. View
source opens the manifest repo through the native bridge, from the share button in the header
and from the links.

Every card and row carries `data-store-app`; the checks drive those buttons by their text. The
runtime gives each row `icon` (a catalog file, or an object URL for a locally installed
release), `repo`, `bytes` and the optional release `note`.

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
