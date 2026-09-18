# Developing an app

## Current stage 3 workflow

Stage 3 lifted the stage-2 deferral of local development and explicit updates
after their safety checks passed ([stage 3](progress/stage-3.md)).
CLI `create`, `check`, `build`, `serve`, `dev` and `preview` now exist. Package
local artifacts with `bun scripts/package-platform.ts`; use create's `--packages`
option while these versions remain unpublished. The builder consumes installed
SDK/kit packages from an external project. `dev` prints a `?dev=` URL and watches
source; `preview` serves one build. Reload explicitly after changes. Remove the
DEV row in Store to clear its private data. No device permissions in previews.
See the [CLI reference](../../packages/cli/README.md) and [stage 3 evidence](progress/stage-3.md).

The remaining sections preserve the broader plan. Published `npx` packages and
hosted-shell development are not claimed; the fully local workflow is verified.
The implemented dev server uses immutable release paths under `/apps/`; plain
Vite or an arbitrary framed URL is not a compatible development server.
Stage-5 clarification: the shell downloads and validates that document once,
then gives its verified bytes a Blob URL for iframe `src`. It never trusts a
second server navigation response. This supersedes direct server-src wording
below while preserving the original developer-origin namespace.

The simulator is a web page, so it is also the dev environment. The CLI provides
local build tools; developers do not need the native shell to start.

## `?dev=`

1. Serve the app however you like on localhost. Vite, `bun --hot`, anything.
2. Open the simulator on `https://duo.doan-labs.com` with
   `?dev=http://localhost:5173` appended to its URL. The simulator's final
   public path is still to be selected; do not assume the website root is it.
3. The shell fetches `http://localhost:5173/release.json`, verifies the release
   it names, puts the app on the
   inner home screen with a DEV badge, and opens it if `&app=<id>` is present.

The dev server is the CLI's `dev` command running the same builder CI runs:
it serves `manifest.json`, `release.json` and a policy-bearing `app.html`. The
shell loads it with `iframe.src` into the same `sandbox="allow-scripts"`
frame, the same explicit `allow` denials and the same nonce handshake an
installed release gets from `srcdoc` (progress/contract.md §2.7), and refuses
a document without `release.json` or with a `network` entry that is not an
HTTPS or loopback origin. Framing an arbitrary URL is not development mode.
A development app's storage, session and widgets live under
`dev:<origin>:<id>`, disjoint from an installed app with the same id, and dev
loading never runs a migration. Hosted-shell access to localhost and CORS on
`manifest.json` need browser verification (progress/contract.md check B).

Keep a fully local simulator plus app-server workflow available if the hosted
page cannot reach localhost. The canonical domain alone does not establish
that browser network permissions, CORS and the development loader work there.

Frame buttons, the fold, both displays, Camera Control, all come from the
hosted shell. Browser devtools inspect the iframe like any page.

## CLI

Package `packages/cli` (`@doan-labs/ipduo`, private and unpublished; run it from
the repo or from local archives), on purpose tiny. Full reference:
[packages/cli/README.md](../../packages/cli/README.md).

- `create <name>`: writes `manifest.json`, `CHANGELOG.md`, `icon.png` placeholder,
  `main.tsx` using the kit's `Nav`/`Page`, and a `package.json` that depends on
  the SDK and kit, plus their required React runtime dependencies.
- `check`: import-boundary rules, strict TypeScript and bundle validation; the
  same per-app step CI runs (publishing.md).
- `build`: writes an immutable release and `index.json` under `dist/`.
- `dev`: builds `entry` with the StyleX plugin in watch mode, serves the build
  output, prints the `?dev=` link with the port filled in.
- `preview`: one build, served without watching. `serve <dir>`: serves a built
  catalog with CORS.

## SDK

`@doan-labs/ipduo-sdk` owns the host API, protocol, and manifest schema for all
downloadable apps. Usage (implemented in `packages/sdk/client.ts`; progress/contract.md §2.7):

```ts
import { os } from '@doan-labs/ipduo-sdk'
await os.connect()                               // hello(nonce) → welcome → ack; before rendering
os.ready()                                       // first frame painted; the kit's <Screen> calls it
const { rev } = await os.storage.set('lastTab', 'today')   // durable when the ack arrives
const snap = await os.storage.snapshot()         // { rev, entries }, then
os.storage.watch(snap.rev, (e) => ...)           // ordered events; a rev gap means resnapshot
await os.session.set('note', id)                 // ephemeral, shared by this session's views
os.view                                          // { display, placement, width, height, visible, active, focused, angle }
os.owner                                         // { epoch } while this view is the designated owner, else null
os.commands.send('refresh', '')                  // any view; resolves when the owner acknowledged
os.commands.onCommand(async (c) => ...)          // owner only
os.widget.set('small', { lines: [...] })         // owner only; declarative snapshot the shell renders
os.open('labs.doan.ipduo.maps', 'q=tides')

import { useKV } from '@doan-labs/ipduo-sdk/react'
const { value, set, status } = useKV(os.storage, 'lastTab')   // hydrating | ready | saving | error
```

The SDK implements the bridge from runtime.md: connection lifecycle,
validation, ordered requests, retry by id after a timeout, revisions, errors
and limits. Its host contract is versioned independently of the kit, and
`build.sdk` in a release is the host requirement under full caret semantics;
while the SDK is 0.x, every published version is its own host contract and
prereleases run only under `?dev=`. The kit owns components and design tokens; apps bundle it
inside their document. No downloadable app receives shell objects as React
props; the legacy `{ os }` prop is for baked apps only.

## Dev mode safety

A `?dev=` app has the same sandbox as any iframe app and is never written to
the installed registry. Closing the tab forgets the view. The DEV badge is not
removable. Its storage is real but separate: writes land under
`dev:<origin>:<id>`, never under the installed app's namespace, and Remove App
on the DEV tile clears them.
