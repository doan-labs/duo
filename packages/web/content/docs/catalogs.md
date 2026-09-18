# Catalogs

Apps do not ship with Duo. They install from a catalog: a static `index.json` next to immutable release folders, served with CORS from any origin. You can host one yourself today.

## index.json

```json
{
  "apps": {
    "dev.example.tides": {
      "name": "Tides",
      "lane": "community",
      "author": "Ada",
      "repo": "https://github.com/ada/tides",
      "permissions": ["geolocation"],
      "releases": [
        { "release": "1.2.0+9f3ab21c", "sdk": "0.0.0", "bytes": 412000, "sha256": "…", "note": "Tide tables offline" },
        { "release": "1.1.0+02cc7e10", "sdk": "0.0.0", "bytes": 398000, "sha256": "…" }
      ]
    }
  }
}
```

One entry per app, releases newest first. Each release names its identity, its SDK requirement, the size of `app.html` and the hash of its `release.json`. `build` writes this file for you; to publish several apps, merge their entries.

## Layout

```
index.json                                    mutable; keep its cache short
apps/<id>/<version>+<hash>/release.json       immutable
apps/<id>/<version>+<hash>/app.html           immutable
apps/<id>/<version>+<hash>/icon-1024.png      immutable
```

Publish the complete release before the index references it. Never rewrite a published release folder; the identity includes the hash, so a rebuild is a new folder.

## What the store does

Paste the index URL into the Developer catalog field. The store loads it once and on explicit Refresh; there is no polling. For each app it picks the newest release whose `sdk` the running shell satisfies. With none compatible the row reads "Requires a newer platform version".

Get downloads `release.json`, checks its hash against the index, validates it, streams `app.html` with progress and a size bound, verifies its hash against the release, fetches the icon, then writes the release and the install record in one transaction. Interrupted before that commit, nothing is written. Open launches the stored bytes; the catalog is not consulted again until you refresh.

## Updates

A newer compatible release in the same catalog shows as an update. Updates bind to the catalog origin the app was installed from. A downloaded update is staged while a view of the app is open and activates once none is; an update that fails to start twice is held back and offered as Retry. Remove deletes the release, the app's data and its widgets.

## Bundled apps

The simulator seeds Notes and Weather from its own preinstalled catalog on first run so the store is never empty. They are installed apps like any other and can be removed.
