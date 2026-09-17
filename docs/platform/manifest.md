# Manifest

One `manifest.json` per app. The shell, the store, the CLI and CI all read this
and nothing else about an app before loading it. The SDK owns its types and
schema. The example below illustrates app metadata; runtime compatibility
fields still need a schema decision before this becomes an implementable format.

```json
{
  "id": "dev.example.tides",
  "name": "Tides",
  "version": "1.2.0",
  "lane": "community",
  "entry": "./index.tsx",
  "icon": "./icon.png",
  "light": true,
  "edge": false,
  "cover": false,
  "widgets": ["small", "medium"],
  "permissions": [],
  "author": "Ada",
  "repo": "https://github.com/ada/tides",
  "license": "MIT"
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Reverse-DNS, immutable, the key everywhere. Official apps use `labs.doan.ipduo.*`. `name` is display only; two apps may share a name, never an id. |
| `name` | yes | Home screen label, store title. Under 12 characters or it truncates on the cover display. |
| `version` | yes | Semver. The CDN path and the Updates tab key on it. |
| `lane` | yes | `official` or `community`. Set by review, not by the author; CI rejects a PR that sets `official` outside the maintainer's list. |
| Runtime compatibility | yes; field shape open | Required host protocol/API support, defined by the SDK. The Store checks this against the running shell. It is independent of the kit version. |
| UI kit dependency | package metadata | Apps that use the kit bundle their selected version. Record the resolved version in build metadata; do not gate installation on the shell's kit copy. |
| `entry` | yes for store apps | Source in this repo, built by CI into an immutable sandboxed document with its scripts, styles, and assets. Arbitrary external `url` entries are not store releases; `?dev=` remains a development feature. |
| `icon` | yes | One 1024 px PNG, square, no mask. CI generates every size and the dock variant (`scripts/icons.sh`). |
| `light` | no | The status bar draws dark on this app. Same as the existing `App.light`. |
| `edge` | no | Draws under the status stack. Same as the existing `App.edge`. |
| `cover` | no, default `false` | Requested cover-display support. The initial community restriction remains pending review; the old snapshot rationale does not match the current renderer (runtime.md). |
| `widgets` | no | Requested widget sizes. The isolated rendering/bridge contract remains open; the shell must not import an app's widget code into its own context. |
| `permissions` | no | Reserved. Only `[]` is accepted in v1; see security.md. |
| `author`, `repo`, `license` | yes | Shown in the store. `license` must be `MIT`. |

## Rules

- `id` never changes. Renaming an app changes `name` only. Deleting and re-adding
  under a new id loses every user's data, which is the point.
- `version` must increase in every PR that touches the app folder. CI diffs it.
- The manifest is the only place a field like `light` lives. The shell's registry
  derives app metadata from SDK types rather than maintaining another public
  contract in the UI kit.
