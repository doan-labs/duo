# Manifest

One `manifest.json` per app. The author writes this and nothing else about a
release; CI derives the rest into `release.json`, which is what the shell, the
store and the loader read. The SDK owns both types (`packages/sdk/manifest.ts`).
The schema below is revision 2 of the stage 2 contract,
[progress/contract.md](progress/contract.md) §1, awaiting acceptance.

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

The built `release.json` wraps the manifest with `build.sdk` (the SDK version
the app resolved, which is its host requirement), `build.kit` (recorded, never
gating), the commit, `build.hash` over every file, and the hashed file list of
the single-file app document and icons. The release identity the shell, index
and CDN path use is `version+hash`, so a shared-code rebuild is a new identity
and no published URL is ever overwritten. See progress/contract.md §1.2.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Reverse-DNS, immutable, the key everywhere. Official apps use `labs.doan.ipduo.*`. `name` is display only; two apps may share a name, never an id. |
| `name` | yes | Home screen label, store title. Under 12 characters or it truncates on the cover display. |
| `version` | yes | Semver. The CDN path and the Updates tab key on it. |
| `lane` | yes | `official` or `community`. Set by review, not by the author; CI rejects a PR that sets `official` outside the maintainer's list. |
| Runtime compatibility | derived, not authored | `build.sdk` in `release.json`, the SDK version the app compiled against. The shell is compatible when its host SDK satisfies `^build.sdk` under full npm caret semantics, including 0.x rules; prereleases are development-only (progress/contract.md §1.3). Independent of the kit version. |
| UI kit dependency | package metadata | Apps that use the kit bundle their selected version. `build.kit` records it for the store page; it never gates installation. |
| `entry` | yes for store apps | Source in this repo, built by CI into one immutable `app.html` with inline script, styles and data-URI assets (progress/contract.md §2.1). Arbitrary external `url` entries are not store releases; `?dev=` remains a development feature. |
| `icon` | yes | One 1024 px PNG, square, no mask. The builder copies it as `icon-1024.png`; no other sizes are generated yet. |
| `light` | no | The status bar draws dark on this app. Same as the existing `App.light`. |
| `edge` | no | Draws under the status stack. Same as the existing `App.edge`. |
| `cover` | removed (accepted) | Every view is the app's own document at its own box; responsive cover support is a requirement of every app, verified by progress/contract.md check F. |
| `widgets` | no | Sizes the app publishes declarative snapshots for through `os.widget.set`. The shell renders the snapshot; no widget code runs in the shell (progress/contract.md §3.6). |
| `network` | no | Exact HTTPS origins (scheme, host, optional port; no paths or wildcards) the app document may connect to. CI writes them into the document's `connect-src` and `media-src`, which bounds fetch, XHR, WebSocket and media, not every form of egress (progress/contract.md §2.6). |
| `permissions` | no | Names from the SDK permission table (progress/contract.md §6): `geolocation`, `clipboard-read`, `clipboard-write`, and the host service `photos`. Review is the grant; undeclared means refused at runtime. Camera/microphone capture is deferred; native services are reserved. |
| `author`, `repo`, `license` | yes | Shown in the store. `license` must be `MIT`. |

## Rules

- `id` never changes. Renaming an app changes `name` only. Deleting and re-adding
  under a new id loses every user's data, which is the point.
- `version` must increase in every PR that touches the app folder. CI diffs it.
- The manifest is the only place a field like `light` lives. The shell's registry
  derives app metadata from SDK types rather than maintaining another public
  contract in the UI kit.
