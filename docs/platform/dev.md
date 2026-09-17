# Developing an app

The simulator is a web page, so it is also the dev environment. The CLI provides
local build tools; developers do not need the native shell to start.

## `?dev=`

1. Serve the app however you like on localhost. Vite, `bun --hot`, anything.
2. Open `https://iphoneduo.app/?dev=http://localhost:5173`.
3. The shell fetches `http://localhost:5173/manifest.json`, puts the app on the
   inner home screen with a DEV badge, and opens it if `&app=<id>` is present.

The dev server serves an app document plus its compiled scripts, styles, and
assets. Every development app uses the same iframe boundary and SDK contract
as its downloadable build. Arbitrary `url` entries are not a store format.
Hosted-shell access to localhost, CORS, opaque-origin script loading, and HMR
need browser verification. A fully local shell is the recommended fallback,
pending final CLI design.

Frame buttons, the fold, both displays, Camera Control, all come from the
hosted shell. Browser devtools inspect the iframe like any page.

## CLI

`npx @doan-labs/ipduo`, package `packages/cli`, on purpose tiny:

- `create <name>`: writes `manifest.json`, `icon.png` placeholder, `index.tsx`
  with a `List` and a `NavigationStack`, and a `package.json` that depends on
  the SDK and kit, plus their required React runtime dependencies.
- `dev`: builds `entry` with the StyleX plugin in watch mode, serves the folder,
  opens the `?dev=` link with the port filled in.
- `check`: runs the same validation CI runs (publishing.md) so a PR is green
  before it is opened.

## SDK

`@doan-labs/ipduo-sdk` owns the host API, protocol, and manifest schema for all
downloadable apps. Proposed usage; exact lifecycle/display types remain open:

```ts
import { os } from '@doan-labs/ipduo-sdk'
os.open('labs.doan.ipduo.maps', 'q=tides')
os.storage.get('lastTab')
os.onFold((angle) => ...)
os.display          // 'cover' | 'inner' | 'half', updates on fold
os.mirror
```

The SDK implements the bridge from runtime.md, including connection lifecycle,
validation, request/reply correlation, errors, and timeouts. Its host contract
is versioned independently of the kit. The kit owns components and design tokens;
apps may bundle it inside their iframe. No downloadable app receives direct
shell objects as React props.

## Dev mode safety

A `?dev=` app has the same sandbox as any iframe app and is never written to
`os.installed`. Closing the tab forgets it. The DEV badge is not removable.
