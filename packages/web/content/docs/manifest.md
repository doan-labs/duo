# Manifest

One `manifest.json` per app. You write this file and nothing else about a release; `build` derives the rest into `release.json`, which is what the shell, the store and the loader read. Both types are exported by the SDK as `Manifest` and `Release`.

```json
{
  "id": "dev.example.tides",
  "name": "Tides",
  "version": "1.2.0",
  "lane": "community",
  "entry": "./main.tsx",
  "icon": "./icon.png",
  "light": true,
  "edge": false,
  "widgets": ["small", "medium"],
  "network": ["https://api.example.com"],
  "permissions": ["geolocation"],
  "author": "Ada",
  "repo": "https://github.com/ada/tides",
  "license": "MIT"
}
```

## Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Reverse-DNS, lowercase, at most 64 characters, immutable. The key for the app's data, its releases and `os.open`. Two apps may share a name, never an id. |
| `name` | yes | Home screen label and store title. At most 12 characters, or it truncates on the cover display. |
| `version` | yes | Strict semver. Prereleases run only under `?dev=`. |
| `lane` | yes | `community` or `official`. Official is a review status set by the catalog owner, not something an author grants themselves; `check` refuses `official` for an id outside the repository's `OFFICIAL.txt`. |
| `entry` | yes | Your entry module, relative to the manifest. Built into one `app.html` with script, styles and assets inline. |
| `icon` | yes | A square 1024 px PNG. Copied as `icon-1024.png`. |
| `light` | no | The status bar draws dark on this app. |
| `edge` | no | The app draws under the status stack. |
| `widgets` | no | Sizes you publish snapshots for through `os.widget.set`: `small`, `medium`. The shell renders the snapshot; no app code runs outside the frame. |
| `network` | no | Exact HTTPS origins the document may connect to: scheme and host, optional port, no path, no wildcard. They become the document's `connect-src` and `media-src`. Loopback `http://` origins are allowed in development builds only. |
| `permissions` | no | Names from the [permission table](permissions.md): `geolocation`, `clipboard-read`, `clipboard-write`, `photos`. Undeclared means refused at runtime. |
| `author`, `repo`, `license` | yes | Shown in the store. `repo` is an `https://` URL. `license` must be `MIT`. |

## Rules

- `id` never changes. Renaming an app changes `name` only. A new id is a new app with no data.
- `version` increases with every release, and `CHANGELOG.md` must mention it; `check` reads both.
- Layout is responsive by requirement. There is no flag to opt out of the cover display: every app runs at 387 points wide.

## release.json

```json
{
  "manifest": { "...": "the file above" },
  "build": { "sdk": "0.0.0", "kit": "0.1.0", "at": "2026-09-18T09:12:00Z", "commit": "…", "hash": "9f3ab21c" },
  "files": [
    { "path": "app.html", "bytes": 412000, "sha256": "…" },
    { "path": "icon-1024.png", "bytes": 15100, "sha256": "…" }
  ]
}
```

`build.sdk` is the SDK version the app compiled against and its host requirement: the shell runs a release when its own SDK satisfies `^build.sdk` under npm's caret rules, which while the SDK is 0.x means the exact version. `build.kit` is recorded for the store page and never gates. The release identity is `version+hash`, so a rebuild that changes any byte is a new identity and a published path is never overwritten.
