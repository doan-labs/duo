# Developing an app

Current local workflow. SDK/CLI 0.0.0 and kit 0.1.0 are private previews, not published
npm packages. Start with [the review guide](review.md) for the complete external-project
recipe and [the CLI reference](../../packages/cli/README.md) for command options.

## Packages and commands

`bun scripts/package-platform.ts <output-directory>` prepares local archives and
`artifacts.json`. Pass that file to CLI `create --packages`; install the resulting
project's dependencies before running its scripts. External projects consume installed
SDK/kit exports and do not need workspace source aliases or a source contribution here.
Use a new output directory when repacking unchanged private versions to avoid stale caches.

| Command | Purpose |
| --- | --- |
| `create` | Manifest, React entry, changelog, placeholder icon and package dependencies |
| `check` | Metadata, lane/import/type/token checks and bundle validation |
| `build` | Immutable release and catalog in the output directory |
| `serve` | Serve an existing catalog with CORS for Store installation |
| `dev` / `preview` | Build and serve policy-bearing previews; dev also watches source |

Strict source/import validation and the 4 MiB document cap apply to external consumers.
An immutable release URL is never overwritten. Placeholder icons/metadata need attention
before any public release; current validation is not a full publication pipeline.

## Isolated preview

Run the simulator locally, then run the external app's CLI dev command with
`--simulator http://localhost:3000`. Open its printed `?dev=` URL. The supported server
is the CLI serving the same builder's immutable output, manifest and release metadata;
a plain Vite page or arbitrary URL is not a compatible preview document.

The host verifies the selected release and document, then loads an owned Blob URL of
those verified bytes in an opaque iframe. No second remote navigation response is trusted.
Explicitly reload the simulator to select a rebuild. An already-running frame keeps its
release. Ctrl-C closes the watcher/server and removes owned temporary build output.

Data is persisted under `dev:<origin>:<id>`, separate from installed data and other preview
origins. Removing `?dev=` forgets the view, not its data; remove the Store DEV row to clear
that namespace and revoke its frames. Device permissions are refused in previews. There
is no automatic browser reload or catalog polling.

Hosted-shell access to localhost remains deployment/browser verification work, including
CORS and local-network permissions. The fully local path remains supported.

## SDK use

```ts
import { os } from '@doan-labs/duo-sdk'

await os.connect()
// Render the app and finish any owner migration, then signal its first painted frame:
os.ready()

await os.storage.set('lastTab', 'today') // durable after acknowledgment
await os.session.set('selectedNote', 'field-note') // shared within this session
const view = os.view // display, placement, width, height, visible, active, focused, angle
const stop = os.onView((next) => console.log(next.display, next.angle))
// Call stop() when this subscription is no longer needed.
```

The app owns connect/ready and effect cleanup. The kit's `Screen` and `useDisplay` only
subscribe; they do not connect or signal readiness. Use `useKV` from
`@doan-labs/duo-sdk/react` for hydration, optimistic edits, ordered writes and visible
saving/error states. A timeout does not prove a write failed. See [the SDK reference](../../packages/sdk/README.md)
and [contract](contract.md) for snapshot/watch, retries, ownership and commands.

Each iframe is a separate document. Share persistence through `os.storage`, navigation
through `os.session`, and nonowner intent through acknowledged commands. Ownership is
sticky across folding; it does not follow the active display. Apps remain responsible
for idempotent effects and cleanup. `os.open` uses app ids; Escape is forwarded by the SDK.

## Install and update

Serve a built catalog, select its `index.json` in Store, then GET/OPEN. External catalogs
accept no device permissions. Refresh and updates are explicit; an update must come from
the installed app's source origin. Running sessions retain their release until activation
is safe. See [Store](store.md), [updates](updates.md) and the [review guide](review.md).
