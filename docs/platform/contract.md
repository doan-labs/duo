# Runtime contract

Accepted design for enabled SDK/runtime capabilities, incorporating the implemented scope
amendments through 2026-09-18. The SDK source owns exact public types; code sketches here
explain invariants and are not an independently maintained API declaration. A discrepancy
between implementation and an invariant needs an explicit resolution, not silent weakening.

Numbered sections remain stable for existing references. “Accepted”, “Settled” and
“Recommended” inside inherited design sections describe design provenance, not a passed test.

Launch acceptance covers an independent app, isolation, visible fold/display use and
installation without simulator rebuild. Stages 3–5 subsequently enabled verified previews
and updates and completed the kit/audit. [The roadmap](roadmap.md) owns remaining work;
[the review guide](review.md) records measured coverage and explicit native limitations.

Current amendments: development src executes verified Blob bytes; app code calls ready
(the kit is passive); external catalogs and previews accept no device permissions;
camera/microphone are always refused. Updates bind to the installed catalog origin.
No periodic catalog polling or automatic native updater is enabled. These scope limits
preserve the sandbox, generation, session, transaction and lifecycle safeguards below.

Browser-builder amendment: web-only generated previews use host-derived
`dev:builder:<project>` namespaces and independently verified Blob documents. The trusted
entry owns SDK connect/ready. Explicit preview revisions quiesce old views, checkpoint data
and advance generations without reloading the shell. Failure/Undo restore matching data;
pending checkpoints recover interrupted starts. This does not alter installed-app update
activation or grant permissions. See [builder](builder.md) and decision 65.

Browser preview readiness means the generated host entry completed its first successful
React commit, including an offscreen mirrored display. This is narrower than a visible
paint guarantee: hidden frames can suspend animation callbacks. The existing startup
deadline and authority checks stay unchanged; visible painting needs separate verification.

## 1. Manifest and compatibility

### 1.1 Authored manifest

One `manifest.json` per app folder. The author writes this and nothing else
about the release; everything derived is written by the builder. Curated CI publication remains planned.

```ts
/** packages/sdk/manifest.ts */
export type Manifest = {
  /** Reverse-DNS, immutable, [a-z0-9.-], ≤ 64 chars. Official apps: labs.doan.ipduo.<name>. */
  id: string
  /** Home screen label and store title. ≤ 12 characters. */
  name: string
  /** Release version, strict semver without build metadata. Use a new version for an authored update. */
  version: string
  lane: 'official' | 'community'
  /** Source entry the builder consumes, relative to the app folder. */
  entry: string
  /** 1024 px square PNG, relative to the app folder. */
  icon: string
  /** Status bar draws dark over this app. */
  light?: boolean
  /** Draws under the status stack and pads its own top. */
  edge?: boolean
  /** Widget sizes the app publishes snapshots for (§3.6). */
  widgets?: ('small' | 'medium')[]
  /**
   * Exact HTTPS origins the app document may connect to and stream media from:
   * scheme, host, optional port; no paths, wildcards or CSP keywords (§2.6).
   */
  network?: string[]
  /** Names from the SDK permission table (§6); subject to enabled-source restrictions. */
  permissions?: PermissionName[]
  author: string
  repo: string
  license: 'MIT'
}
```

Settled: `id`, `name`, `version`, `lane`, `entry`, `icon`, `light`, `edge`,
`author`, `repo`, `license: 'MIT'`. `permissions` is decided in §6. The kit's
version is not in the manifest; it is package metadata.

Accepted: no `cover` field. Responsive cover support is a requirement of
every app, verified by check F. If F fails in one runtime, the fix is in the
runtime or the kit; a per-lane restriction is not restored.

Accepted with change (R2): `network` is validated as exact HTTPS origins.
Loopback HTTP origins are accepted only by the `?dev=` loader (§2.7).

### 1.2 Built release

The builder turns the manifest and the entry into an immutable release. The shell, the
store and the loader read `release.json`, never the authored manifest.

```ts
export type Release = {
  manifest: Manifest
  build: {
    /** SDK the app compiled against, from the resolved dependency. Not authored. */
    sdk: string
    /** Kit the app bundled, if any. Recorded for the store page; never gates. */
    kit?: string
    /** ISO time and the commit the release was built from. */
    at: string
    commit: string
    /** First 8 hex chars of sha256 over every file in `files`, in path order. */
    hash: string
  }
  /** app.html and the icon set. Paths are bare file names; no directories. */
  files: { path: string; bytes: number; sha256: string }[]
}

/** The identity the shell stores and the CDN path uses. */
export type ReleaseId = `${string}+${string}`   // `${manifest.version}+${build.hash}`
```

Recommended (R4): the **release identity is `version+hash`**. A shared-code
change that alters bytes produces a new identity under the same authored
version; the builder never writes into an existing identity's folder, so no immutable
URL is ever overwritten. The store shows `version`; the shell, the index and
the CDN path use the identity. Semver build metadata is legal and ignored by
precedence, so no author workflow changes. Alternative rejected: forcing a
version bump on thirty apps when the kit changes.

### 1.3 Compatibility rule

Recommended (R1): **the host must satisfy `^build.sdk` under full npm caret
semantics.** With `H = HOST_SDK` (the SDK version whose host side the shell
implements) and `A = build.sdk`:

```ts
/** packages/sdk/compat.ts */
export function compatible(H: SemVer, A: SemVer): boolean {
  if (H.prerelease.length || A.prerelease.length) return false   // prereleases: development only (§2.7)
  if (A.major > 0) return H.major === A.major && gte(H, A)
  if (A.minor > 0) return H.major === 0 && H.minor === A.minor && gte(H, A)
  return H.major === 0 && H.minor === 0 && H.patch === A.patch
}
```

So host 1.2.0 rejects an app built on 1.2.1; host 0.3.0 rejects 0.2.5; host
0.0.1 rejects 0.0.0. The SDK is 0.0.0 today, so the 0.x rules apply from the
first release. The SDK's README carries the discipline this implies: while
0.x, every published SDK version is its own host contract; a host bump is a
shell release.

Settled: the wire protocol has its own integer `PROTOCOL`, bumped only for
breaking message changes; the handshake checks it as a fast fail. It is not in
the manifest.

Settled (R1): the handshake's `sdk` must **equal** `release.build.sdk` of the
release the host launched. An app cannot claim a lower requirement to pass a
check the release failed; a mismatch is `E_PROTOCOL` and revokes the view.

### 1.4 Incompatible apps

Compatibility is evaluated against the **current host**, every time; it is
never persisted as a global state, so an old tab cannot block a newer one.

| Where | Check | Outcome |
| --- | --- | --- |
| Store shelf | Newest release in `index.json` whose `sdk` the current host satisfies | GET installs that identity. None: the row reads "Requires a newer platform version" with the Software Update action on desktop or Reload on web. If the index maps the requirement to a shell release, that version is named; otherwise it is not invented |
| Install / activation | Re-check `release.json` after download, before commit | Not committed; GET reappears with the same one-line reason |
| Launch | `hello.protocol === PROTOCOL`, `hello.sdk === release.build.sdk`, `compatible(HOST_SDK, hello.sdk)` | `refused` with `E_INCOMPATIBLE`; the launch screen reads "Requires a newer platform version"; the tile badges in this host only |

A store update does not repair an old host. When no compatible host exists
for an installed app, the panel says so and offers the platform update action;
it does not offer a reinstall that would fail the same way.

### 1.5 Catalog

Settled (R1): `index.json` lists **every published release identity** per
app, newest first, with `sdk`, `bytes` and the hash of its `release.json`.
A latest-only catalog cannot implement the shelf rule above. See store.md.

## 2. Sandbox and bridge

### 2.1 App document

Implementation clarification (2026-09-18, stage-5 audit): direct developer
server navigation was superseded by decision 49. Development still uses
`iframe.src`, but its Blob URL contains the exact downloaded and verified HTML.
The developer origin remains the storage namespace and release source. No SDK,
sandbox, ownership or generation contract changes.

Accepted: a release's app document is one file, `app.html`, with its script
and styles inline and its assets as data URIs. Installed apps load through
`iframe.srcdoc` from the stored string; `?dev=` apps load through `iframe.src`
from an owned Blob URL of verified downloaded HTML. The complete builder and both loaders are proven
in Chromium and WKWebView by experiment E0 before anything depends on them
(§5).

Settled: `<iframe sandbox="allow-scripts">` and nothing else in `sandbox`. No
`allow-same-origin`, `allow-forms`, `allow-popups`, `allow-modals`,
`allow-top-navigation`. The document has an opaque origin.

Accepted with change (R2): the `allow` attribute is **built from the
permission table (§6)**: every policy-controlled feature is listed, `*` for a
feature the manifest declares, `'none'` for everything else:

```
allow="camera 'none'; microphone 'none'; geolocation *; clipboard-read 'none'; clipboard-write 'none';
       display-capture 'none'; fullscreen 'none'; payment 'none'; usb 'none'; midi 'none';
       autoplay 'none'; screen-wake-lock 'none'; xr-spatial-tracking 'none'"
```

`*` rather than `'src'` because the frame's origin is opaque and `'src'` would
never match it. An empty attribute inherits the shell's policy; it is not a
denial. Where the deployment can set a `Permissions-Policy` response header on
the shell document (the web host can; whether Tauri's custom protocol can is
check B), it carries the same list with the granted features allowed. Check B
asserts by calling the APIs, not by reading attributes; check M asserts that
a declared feature actually works from the opaque origin in both runtimes.

Accepted: the shell paints a launch screen (icon on a dark surface) from open
until `ready`, or until the failure sheet replaces it. A failed start revokes
the view (§2.4); keeping the failed document alive for inspection is a
`?debug`-only option, never the default.

### 2.2 Launch record and bootstrap

Recommended (R2): every view starts from a **launch record** the host owns:

```ts
/** packages/shell/runtime/bridge.ts */
type Launch = {
  sessionId: string
  viewId: string
  /** Increments every time this view slot gets a new document. */
  generation: number
  /** The release identity this document must be; dev views carry the dev origin instead. */
  release: ReleaseId | { dev: string }
  /** 128-bit random, single use, given to the intended document only. */
  nonce: string
  state: 'created' | 'bootstrapping' | 'connected' | 'ready' | 'revoked'
  port?: MessagePort
  ownerEpoch?: number
}
```

The nonce reaches the document through the iframe's `name` attribute, which
the sandboxed document reads as `window.name` and nothing else can read. It is
not in the document bytes, so the hash-pinned `app.html` stays immutable.

```
host                                          app document (SDK)
 create iframe{name: nonce, sandbox, allow}
 state = bootstrapping, start T_hello = 10 s
                                               connect(): assert event.source === window.parent on replies
                                               parent.postMessage(hello{protocol, sdk, nonce}, '*')  every 1 s until welcome, ≤ 10 s
 on message: source === iframe.contentWindow
             && nonce matches && state ∈ {bootstrapping}
             && protocol/sdk pass §1.3, §1.4
   → new MessageChannel; discard any earlier port for this generation
   → postMessage(welcome{...}, '*', [port2])
   (a duplicate hello here is an idempotent retry: fresh welcome, fresh port)
                                               on welcome: keep port, post ack over the port
 on ack over port: state = connected; further hellos for this generation → refuse + revoke
                                               render, then app calls os.ready() → {ev:'ready'}
 on ready: state = ready, T_ready cleared
```

A hello whose nonce or source does not match gets no reply. A hello arriving
while `connected` or `ready` means the document is not the one the host
bootstrapped (navigated, or a second script); the view is revoked and the
scene shows the failure sheet. A replacement document is always a new iframe
element with a new generation and nonce; the host never reuses an element.

Settled (R2): a `MessagePort` is an authority-bearing object, not an identity
proof. Identity is the launch record; the port is the capability bound to it.
Nothing is ever inferred from an app-supplied id.

### 2.3 Messages

```ts
/** packages/sdk/protocol.ts */
export const PROTOCOL = 1

export type Hello = { t: 'hello'; protocol: number; sdk: string; nonce: string }
export type Welcome = {
  t: 'welcome'
  view: ViewInfo
  session: { arg?: string; argSeq: number; migration?: { from: string } }
  owner: { epoch: number } | null
  limits: Limits
}
export type Refused = { t: 'refused'; e: 'E_INCOMPATIBLE' | 'E_PROTOCOL' | 'E_BLOCKED'; msg: string }

// Over the port. Requests are answered in order per view.
export type Req = { id: number; m: Method; p?: unknown; epoch?: number }
export type Res =
  | { id: number; ok: true; v?: unknown }
  | { id: number; ok: false; e: ErrCode; msg?: string }
export type Evt =
  | { ev: 'view'; p: ViewInfo }
  | { ev: 'kv'; p: { space: 'storage' | 'session'; rev: number; k: string; v: string | null } }
  | { ev: 'arg'; p: { arg: string; argSeq: number } }
  | { ev: 'owner'; p: { epoch: number } | null }
  | { ev: 'side'; p: { action: 'double' } }                 // only to a view that claimed it, §3.8
  | { ev: 'cmd'; p: { cmdId: string; type: string; payload: string } }
  | { ev: 'command-result'; p: { cmdId: string } }
  | { ev: 'bye'; p: { reason: 'closed' | 'uninstalled' | 'updating' | 'error' | 'revoked' } }
export type AppEvt =
  | { ev: 'ack' } | { ev: 'ready' }
  | { ev: 'error'; p: { message: string; stack?: string } }
  | { ev: 'key'; p: { key: 'Escape' } }

export type Method =
  | 'storage.get' | 'storage.set' | 'storage.del' | 'storage.keys' | 'storage.snapshot' | 'storage.watch' | 'storage.unwatch'
  | 'session.get' | 'session.set' | 'session.del' | 'session.keys' | 'session.snapshot' | 'session.watch' | 'session.unwatch'
  | 'cmd.send' | 'cmd.ack'
  | 'widget.set'
  | 'open' | 'home'
  | 'side.claim' | 'side.release'
  | ServiceMethod                                       // §6, gated by the manifest's permissions

export type ErrCode =
  | 'E_ARGS' | 'E_QUOTA' | 'E_RATE' | 'E_CLOSED' | 'E_TIMEOUT' | 'E_PROTOCOL' | 'E_DENIED'
  | 'E_STALE'      // epoch or generation no longer current
  | 'E_GONE'       // the app was uninstalled or its generation changed under this view
  | 'E_STORAGE'    // the database refused or is unavailable; nothing was written
```

### 2.4 Lifecycle states and revocation

```
created ──hello ok──▶ bootstrapping ──ack──▶ connected ──ready──▶ ready
   │                      │                     │                   │
   └──────────────────────┴─────────────────────┴───────────────────┴──▶ revoked
```

Revocation, in this order, for every reason (scene closed, no hello in 10 s,
no ready within 10 s of being visible, `error` before ready, `E_PROTOCOL`, navigation, uninstall,
update activation, split collapse):

1. `state = revoked`; the record's generation is retired. From here the host
   drops every message from this port and rejects every request with
   `E_CLOSED`.
2. Cancel outstanding host work for the view. A database transaction already
   in flight is allowed to finish, but its completion is checked against the
   retired generation and its result is discarded, never delivered.
3. Best-effort `bye` with the reason. The host does not assume it arrives or
   that promise rejections run in the document.
4. Close the port. Remove the iframe element from the DOM. Setting `src` on a
   `srcdoc` iframe does not replace the document, so removal is the only
   accepted teardown.
5. Drop the view from the session; if it was the owner, hand over (§3.4); if
   the session has no views, end it (§3.1).

Settled (R2): a failed start (no `ready`, or `error` first) revokes and
removes the view. It never leaves a document running with storage authority.

### 2.5 Request semantics, limits and idempotency

Settled: requests from one view are processed and answered in order. A
mutating request is acknowledged only after its database transaction
`complete` event, never on the `put` request's success.

Recommended (R2): **retry after timeout is by request id, and the host
deduplicates.** Every `Req.id` is unique per view generation. The host keeps
the last 256 completed ids with their results per view; a repeated id returns
the recorded result without re-executing. The SDK's timeout (5 s) retries a
mutating request once with the same id, then surfaces `E_TIMEOUT`; the app
then reads back (`get`) to reconcile, because a timeout does not prove the
write failed. `open`, `home`, `side.claim` and `side.release` are never retried.

| Limit | Value | Error |
| --- | --- | --- |
| Envelope | 300 KiB of UTF-8 after `JSON.stringify` | `E_ARGS` |
| Key | ≤ 128 UTF-8 bytes, no control characters | `E_ARGS` |
| Value | ≤ 256 KiB of UTF-8 | `E_ARGS` |
| Keys per app | ≤ 4096; `keys` and `snapshot` page 256 entries with a cursor | `E_ARGS` |
| Storage per app | 5 MiB of keys plus values, checked in the write transaction | `E_QUOTA` |
| Session per session | 64 KiB total | `E_QUOTA` |
| Widget snapshot | ≤ 8 lines of ≤ 64 chars, `arg` ≤ 256 | `E_ARGS` |
| Command payload | ≤ 16 KiB; ≤ 32 unacknowledged per session | `E_ARGS` |
| In-flight requests per view | 64 | `E_ARGS` |
| Request rate per view | 200 per second sustained, burst 400 (token bucket) | `E_RATE`, with `retryAfterMs` in `msg` |

Sizes are bytes, not characters; the envelope limit is the value limit plus
headroom for the frame. The SDK enforces the same limits locally first. These are the current SDK limits in `packages/sdk/protocol.ts`. Document caps are
1 MiB soft / 4 MiB hard; complete release downloads are capped at 8 MiB.

### 2.6 App document policy

Accepted with change (R2): the builder writes a `<meta http-equiv="Content-Security-Policy">`
as the first child of `<head>`, before any script or style:

```
default-src 'none';
script-src 'sha256-<inline script>';
style-src 'sha256-<inline style>';        includes the builder-authorized CSSOM stylesheet
img-src data:;
font-src data:;
connect-src <network origins>;        omitted when network is empty, which is 'none' under default-src
media-src data: <network origins>;
frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'
```

What this enforces, stated exactly: `connect-src` bounds `fetch`, XHR,
WebSocket, EventSource and beacons. It is not a general egress control. A
document can still navigate itself to a URL (the sandbox prevents navigating
anything else), and a request already sent before teardown has been sent.
Static checks and review read the same short `network` list; the CSP is
the runtime bound on connections, and that is all it claims.

The builder hashes static styles and lifts dynamic StyleX values into CSSOM classes in
an initially empty, hash-authorized stylesheet. Runtime values are parsed as individual
properties, not interpolated as stylesheet source. Kit icons/fonts are embedded as data
URIs; documents have no shell-relative asset dependency. The earlier hashes-versus-classes
experiment is resolved by [project decision 38](../decisions.md#38-isolated-documents-carry-assets-and-lift-dynamic-styles-into-classes).

Requests from an opaque origin carry `Origin: null`; the API must answer with
`Access-Control-Allow-Origin: *` and the app must not send credentials. This
is verified against Open-Meteo's real endpoints in E0 and check L; the answer
is never `allow-same-origin`.

### 2.7 Development apps

Settled: a `?dev=` view has the same sandbox, `allow` list and handshake as an
installed view. The dev server, which is the CLI's `dev` command, serves the
**same builder's output**: an `app.html` with the policy already inside it,
plus `manifest.json` and `release.json`. Framing an arbitrary URL does not
give it a policy, so the loader refuses a document whose `release.json` is
missing or whose `network` contains anything other than HTTPS origins or
loopback HTTP origins.

Recommended (R2): a development app's data lives in a **separate namespace**.
Its storage, session, widget and checkpoint records are keyed by
`dev:<origin>:<id>`, never by `<id>`. Dev loading never runs a migration and
never reads or writes an installed app's data, even with an identical authored
id. Removing the `?dev=` parameter and reloading forgets the view but keeps
its namespace until Remove App on the DEV tile clears it.

Settled: prerelease SDK versions (`0.1.0-dev.3`) are accepted only by the
`?dev=` loader; `compatible()` rejects them for installed releases.

### 2.8 The boundary, stated for the check

A sandboxed app document must observe all of these, from `srcdoc` and from
`src`, in Chromium and in the Tauri WKWebView (check B):

- `window.__TAURI_INTERNALS__` and `window.__TAURI__` are undefined, and an
  attempt to reach the IPC transport (`fetch('ipc://localhost/...')`, and the
  `window.ipc` object if present) is refused.
- `window.parent.document` throws; `window.parent.localStorage` throws.
- `localStorage`, `indexedDB` and `caches` throw or are unavailable.
- `navigator.mediaDevices.getUserMedia` always rejects; `navigator.geolocation.getCurrentPosition`
  rejects with a permissions error unless the manifest declares the feature;
  `document.fullscreenEnabled` is false. A service method the manifest did not
  declare answers `E_DENIED` and nothing else happens.
- `fetch()` to an undeclared origin is refused by the document's CSP, and to a
  declared origin succeeds without credentials.
- A forged `hello` from a second iframe, and a `hello` with a wrong nonce from
  the right iframe, get no reply.
- A `hello` sent after `ack` revokes the view; the scene shows the failure sheet.

### 2.9 SDK surface

```ts
/** packages/sdk/index.ts — what an app imports */
export const os: {
  /** Resolves after welcome and ack. Call before rendering. */
  connect(): Promise<void>
  /** App signals its first painted frame after initialization/migration; the kit does not call this. */
  ready(): void
  view: ViewInfo
  onView(cb: (v: ViewInfo) => void): () => void
  /** Non-null while this view is the owner; the epoch is passed to owner-only calls by the SDK. */
  owner: { epoch: number } | null
  onOwner(cb: (o: { epoch: number } | null) => void): () => void
  session: KV & { arg?: string; onArg(cb: (arg: string) => void): () => void; migration?: { from: string } }
  storage: KV & { limits: Limits }
  commands: {
    /** Any view. Resolves when an owner acknowledged the command. */
    send(type: string, payload: string): Promise<void>
    /** Owner only. Return to acknowledge; throw to leave it queued for the next owner. */
    onCommand(cb: (cmd: { type: string; payload: string }) => Promise<void> | void): () => void
  }
  widget: { set(size: 'small' | 'medium', snapshot: WidgetSnapshot): Promise<void> }   // owner only
  open(id: string, arg?: string): Promise<void>
  home(): Promise<void>
  /** The frame's side button (§3.8). While claimed and this view is visible and active, a double-click reaches onDouble instead of opening Wallet. */
  sideButton: { claim(): Promise<void>; release(): Promise<void>; onDouble(cb: () => void): () => void }
  /** Host services (§6). Present on the object; each call is E_DENIED unless declared. */
  photos: { list(): Promise<Photo[]>; get(id: string): Promise<Blob>; add(blob: Blob): Promise<Photo> }
}

export type KV = {
  get(k: string): Promise<string | null>
  set(k: string, v: string): Promise<{ rev: number }>
  del(k: string): Promise<{ rev: number }>
  keys(cursor?: string): Promise<{ keys: string[]; cursor?: string }>
  /** Atomic snapshot with the revision it is current at. */
  snapshot(cursor?: string): Promise<{ rev: number; entries: [string, string][]; cursor?: string }>
  /** Events with rev > since, in order. A gap in rev means resnapshot. */
  watch(since: number, cb: (e: { rev: number; k: string; v: string | null }) => void): () => void
}
```

Settled: strings only. JSON is the app's business, as `localStorage` is today.

The React adapter (§3.7) lives in `packages/sdk/react.ts` so Notes and every
kit component read state the same way.

## 3. App session and displays

### 3.1 One session, many views

Settled: an **app session** is one open app in one shell document. A **view**
is one document of that session on one piece of glass. Two browser tabs are
two shell documents and therefore two sessions with two owners; they share
persistent app data through the database (§4) and nothing else.

- Opening an app creates the session and its first view. `follow()` adding the
  copy on the other display adds a view to the same session.
- One session per app id per shell document. Opening an app already on stage
  focuses it, as `launch()` already does; two halves cannot hold the same app.
- The session ends when its last view is revoked. Session state and unacked
  commands are cleared then; storage is not.
- `arg` is session state. `welcome` carries the current `arg` and `argSeq`. A
  new deep link to an already-open session raises `argSeq` and sends `arg` to
  every view; the app decides what to do with it, as `os.arg` today is read
  once by Safari.
- The session survives view replacement: the split collapse revokes the two
  half views and creates a new full view of the same session, which reads
  `session.snapshot()` to restore what the app chose to share.

What survives a fold: every view, because the fold tears none down. The inner
view stays through the whole fold and back (decisions.md 24); the cover view
exists from open and is hidden at 180°.

### 3.2 View information

```ts
export type ViewInfo = {
  display: 'inner' | 'cover'
  placement: 'full' | 'left' | 'right'
  /** CSS px of this document's box. Also what ResizeObserver reports. */
  width: number
  height: number
  /**
   * The shell is actually showing this view: the panel is facing the camera,
   * not clipped away entirely, opacity above zero, and the device is awake.
   * Derived from the render loop's own visibility and opacity writes, not from the angle.
   */
  visible: boolean
  /** This display is the one in use; frame buttons go here. Flips at 40°. */
  active: boolean
  /** This view has keyboard focus. Only one view on a display has it when two apps split it. */
  focused: boolean
  /** Hinge angle, 0 closed to 180 flat. */
  angle: number
}
```

Accepted: display and placement are separate fields; `visible` is derived from
the same `visible`/`opacity`/`clip-path` values main.ts writes on the panel and
from `device.asleep`, so it is true exactly when a person could see the view.
`focused` is separate from `active` because two half views share one active
display.

Accepted: `view` events are coalesced to one per view per animation frame and
sent only when a field changed. The SDK stores the latest and notifies
subscribers once per frame; the kit's layout hooks read `width`/`height` and
ignore `angle`, so an angle sweep rerenders nothing that did not ask for it.
If a view's port backlog exceeds 60 undelivered `view` events, the host drops
the older ones; only the latest matters.

### 3.3 State synchronization

Accepted with change (R3): two key-value spaces with one interface, brokered
by the host, with **revisions**.

- `os.storage` persists per app (§4). Each write receives a monotonic `rev`
  per app, stored in the same transaction as the value (`meta` record). The
  ack carries the `rev`; the `kv` event carries the same `rev` to every view of
  every session of that app in this shell document, and a `BroadcastChannel`
  posts `{ id, rev }` to other tabs as an **invalidation signal only**; a tab
  that receives it rereads from the database. Nothing is inferred from the
  channel's content or ordering.
- `os.session` is ephemeral per session, in host memory, same interface, its
  own `rev` sequence, cleared when the session ends.

Ordering and loss: the host applies one view's writes in request order. A
client that calls `snapshot()` gets `{ rev, entries }` atomically and then
`watch(rev)`; the host replays any event with a higher `rev` that happened in
between, so a write between the snapshot and the subscription is never lost.
A client that sees `rev` jump by more than one resnapshots. Deletion is an
event with `v: null`. Quota is checked inside the write transaction against
the `meta.used` counter that the same transaction updates; an over-quota
write aborts and nothing changes.

Not synchronized: component state. What a view does not write to a KV space
stays local. This is the only rule that does not require the shell to
understand the app.

### 3.4 Effect ownership

Accepted with change (R3): **one designated owner view per session, sticky,
with an epoch.** The first view of a session is the owner. Ownership moves
only when the owner view is revoked, to the oldest surviving view. It does not
follow the active display.

What the host enforces: owner-only operations (`widget.set`, `cmd.ack`, and
any future media or native service) carry the owner `epoch`; the host rejects
a request whose epoch is not current with `E_STALE`. Handover: the host
retires the old epoch, then sends `owner: null` to the old view if it still
exists, then grants `owner: { epoch: n+1 }` to the new view, then redelivers
every unacknowledged command to it. No two views hold a live epoch.

What the host does not and cannot guarantee: that a non-owner view never calls
`fetch` or `setInterval`. Ownership is cooperative; it tells a well-behaved
app which of its documents should act. The platform therefore promises
**at-most-one designated owner**, not exactly-once effects. Apps make their
effects idempotent; apps subscribe to `os.onOwner`, start effects only while designated owner, and clean
up on revocation. Cleanup cannot recall a request already sent. A public
`useOwnerEffect` helper is not promised by the current kit.

Timers: browsers throttle timers in hidden and background frames, and no CSS
change alters that. The contract asks apps to schedule by **deadline**
(`Date.now()` against a target) and to reconcile when `view.visible` turns
true or when `owner` is granted, instead of counting ticks. Check G measures
what happens, in both runtimes, through fold, split collapse, tab
background, window minimize and sleep/wake; its output is documentation, not
a threshold.

Audio: a `Play` tap lands in whichever view is visible, often not the owner. A
command to a hidden owner may not carry user activation, so autoplay policy
may refuse it. Check G2 tries exactly that in both runtimes. If it fails, the
media contract is revised (a host-owned media service is the likely shape)
before any audio app moves to the sandbox; the sandbox is not weakened and the
behaviour is not silently dropped. No audio app is in the first two
migrations.

### 3.5 Commands

Recommended (R3): intent that must be acted on once goes through **commands**,
not through a last-write-wins key.

```
any view:  cmd.send { cmdId (client uuid), type, payload }
host:      append to the session queue in arrival order; deliver {ev:'cmd'} to the current owner
owner:     cmd.ack { cmdId, epoch }        → host removes it; resolves the sender's promise
           (throws / never acks)           → stays queued; redelivered on handover or after 5 s
sender:    send() resolves on ack, rejects E_CLOSED if the session ends first
```

Two rapid taps are two commands with two ids; an owner replaced mid-way sees
the unacked ones again, in order, and a duplicate `cmdId` is ignored by the
host. Notes does not need commands; Weather's "refresh now" from a non-owner
view is the first user.

Implementation wire detail: the ordered `cmd.send` response acknowledges queue
admission. A `command-result { cmdId }` event is sent only after owner ack, and
the SDK's public `send()` promise waits for that event. This keeps requests and
responses ordered without deadlocking when a sender is itself the owner and
its command callback awaits a storage write before acknowledging. Session
closure still rejects pending sends with `E_CLOSED`.

### 3.6 Widgets

Accepted: a widget is data the app publishes, not code the shell runs. The
owner calls `os.widget.set(size, snapshot)`; the host validates it (text
only, bounded by §2.5), stores it with `updatedAt`, renders it on the home
screen through the kit's `Widget` renderer, and `screen.ts` draws the same
record into the baked texture. The record persists, so after a restart the
widget shows the last data with its age; the renderer shows "Updated 2 h ago"
past one hour and "Open to refresh" past a day. Tapping opens the app with the
snapshot's `arg`. Widgets do not refresh while the app has no session; that is
stated on the store page and not promised otherwise.

```ts
export type WidgetSnapshot = {
  arg?: string
  lines: { text: string; role: 'label' | 'value' | 'caption' }[]
  tint?: 'glass' | 'dark'
}
```

### 3.7 Asynchronous React adapter

Recommended (R3): `packages/sdk/react.ts` exports `useKV(space, key)`:

```ts
export function useKV(space: KV, key: string): {
  value: string | null
  /** Optimistic: updates `value` now, persists in order, reports failure. */
  set(v: string): void
  del(): void
  status: 'hydrating' | 'ready' | 'saving' | 'error'
  error?: ErrCode
}
```

Internals: one in-memory mirror per space, hydrated once by `snapshot()` then
kept current by `watch(rev)`; `useSyncExternalStore` reads the mirror; `set`
writes the mirror, appends to an ordered persistence queue, and marks the key
`saving` until the ack's `rev` arrives. A failed ack (`E_QUOTA`, `E_STORAGE`,
`E_TIMEOUT` after the one retry) keeps the optimistic value on screen, sets
`status: 'error'`, and the component shows it; the value is never reported
durable before the transaction completed. A `kv` event for a key with a
pending local write is applied only if its `rev` is above the ack the queue
is waiting for, so a view's own echo never clobbers a newer local edit.

### 3.8 Shell shortcuts and input

Settled (R3): keyboard events inside an iframe do not reach the shell. The SDK
listens for `Escape` in the app document and posts `{ev:'key', p:{key:'Escape'}}`;
the host maps it to `goHome()` exactly as the shell's own listener does. Only
that key is forwarded; typed text never crosses the bridge. `open(id, arg)`
from a view swaps the app in place on that view's display, as `swap()` does
today, and `follow()` brings the other display along; `home()` closes the
session's views on both displays.

The frame's side button double-click opens Wallet. A view may claim it with
`side.claim` while it shows something a double-click should confirm, such as a
payment sheet. On the next double-click the shell asks each claiming view in
claim order; the first whose `ViewInfo` is visible and active receives
`{ev:'side', p:{action:'double'}}` and Wallet does not open. If no claiming view
qualifies, Wallet opens as before. Single clicks, long press and the volume
buttons are never forwarded. `side.release` drops the claim; revocation drops
it too, so a closed or crashed app cannot keep the button.

## 4. Storage and release lifecycle

### 4.1 One authority

Accepted with change (R4): **IndexedDB is the only authority.** Database
`ipduo`, object stores:

| Store | Key | Value |
| --- | --- | --- |
| `installed` | `id` | `Installed` below |
| `releases` | `ReleaseId` | `{ release: Release; html: string; icons: Blob[]; committedAt }` |
| `appdata` | `[ns, key]` | `string`; `ns` is `<id>` or `dev:<origin>:<id>` |
| `meta` | `ns` | `{ rev: number; used: number; schema?: string }` |
| `checkpoints` | `[ns, ReleaseId]` | `{ entries: [string, string][]; meta; widgets; takenAt }` |
| `recovery` | `[ns, ReleaseId]` | data written by a release that was later rolled back, bounded to one per app |
| `legacy` | `id` | the snapshot of shell `localStorage` keys a migration imported |
| `widgets` | `[ns, size]` | `WidgetSnapshot & { updatedAt: number; epoch: number }` |
| `leases` | `[id, tabId]` | `{ views: number; heartbeat: number }` |
| `marks` | `id` | `{ seeded?: true; migrated?: true }`, non-data markers that survive uninstall |

```ts
export type Installed = {
  id: string
  /** Launch authority revision: bumps on activation, restoration and removal, not staging or bookkeeping. */
  generation: number
  state: 'installing' | 'ready' | 'trial' | 'removing'
  current: ReleaseId
  /** Downloaded, verified, waiting for the session to end. */
  candidate?: ReleaseId
  /** Known-good code plus its matching data checkpoint. Replaced only by the next proven candidate. */
  recovery?: { release: ReleaseId; checkpoint: [string, ReleaseId] }
  /** A candidate that failed to start twice. Never auto-activated; explicit Retry only. */
  failedVersion?: ReleaseId
  /** Per launch attempt of `current`, host-side, ignoring duplicate error events. */
  attempts: number
  migration?: { from: ReleaseId; to: ReleaseId; done: boolean }
  installedAt: number
}
```

`localStorage['os.installed.cache']` may hold `{ id, name, icon, cell }` for
each installed app so the home grid can lay out before the database answers.
It grants nothing: a tile whose `installed` record has not loaded shows the
launch screen with a spinner and launches only from the record. Boot shows a
brief registry-loading state instead of two sources of truth.

Clarification accepted 2026-09-17: `generation` revisions launch authority.
Candidate staging and launch-attempt/readiness bookkeeping preserve it;
activation, restoration and removal increment it. This lets staged updates
wait for existing sessions to close without revoking their views.

Every lifecycle transaction (`readwrite` over the stores it touches) begins by
reading `installed[id]` and aborts with `E_STALE` if `generation` is not the
one the operation started from. Every app-data write reads it too and aborts
with `E_GONE` if the record is missing or `removing`. Completion is the
transaction's `complete` event; `E_STORAGE` is raised on `error`, `abort` or
`QuotaExceededError`, the working release is left untouched, and the sheet
says so.

Measured: native IndexedDB persisted a 1 MiB value across process restart; Web Locks
and holder destruction were verified. See [the review guide](review.md). This is not complete eviction or
native recovery parity. No filesystem fallback or new plugin was introduced.

### 4.2 Cross-tab coordination

Recommended (R4): lifecycle operations for one app (install, activation,
migration, rollback, removal, orphan sweep) run under
`navigator.locks.request('ipduo:app:<id>', { mode: 'exclusive' })`. Web Locks
are held by a tab and released when it dies, which is the crash behaviour a
database flag cannot give. Check H2 verified the API in WKWebView; no fallback was required. The historical
heartbeat-lock proposal is not a second enabled coordinator.

Sessions are counted with **leases**: a tab writes `leases[[id, tabId]]` with
its view count and a heartbeat every 10 s and deletes it when the session
ends; a lease older than 30 s is stale. "The session has ended everywhere"
means no fresh lease for the id in any tab. Activation and removal wait for
that; they do not trust a notification.

`BroadcastChannel('ipduo')` carries `{ id, generation }` after any transition
and `{ id, rev }` after any data write. A receiving tab rereads
`installed[id]`; if the generation changed under a running view, that view is
revoked with `E_GONE` and the failure sheet explains (uninstalled elsewhere,
updated elsewhere). Tab B cannot recreate data after tab A uninstalls: B's
write transaction rereads the record and aborts.

### 4.3 Sources

Updates must come from the origin recorded at initial install. Legacy records without
provenance accept only the shell origin. A different unsigned catalog cannot take over
an existing id and inherit its data; catalog signing remains future work.

Settled: one install path, two sources. The store installs from the CDN
(`apps/<id>/<ReleaseId>/`). The desktop bundle ships preinstalled releases
under its own assets and installs them on first boot, offline. The web
deployment serves the same files under `/preinstalled/`, which is a network
source like any other: offline reinstall on the web is not promised.

Accepted with change (R4): first-boot seeding writes `marks[id].seeded`. A
seeded app the user removed is not seeded again; the store lists it for
reinstall.

### 4.4 Install

Under the app lock:

```
GET pressed
  1. fetch release.json (same-origin redirects followed, ≤ 64 KiB)
     sha256 equals index entry                                   mismatch → discard, GET
  2. validate: id matches, version strict semver, files are bare names, bytes bounded,
     compatible(HOST_SDK, build.sdk)                               fail → reason in the row
  3. fetch app.html as a stream; abort past files[].bytes + 1 %; progress against bytes
  4. sha256(app.html) equals release.files entry                 mismatch → discard, GET
  5. fetch each icon, same bounds and hashes
  6. one transaction: releases.put(ReleaseId)
                      installed.put({ state:'ready', current, generation: 1, attempts: 0 })
                      marks untouched
     await complete                                              ← the commit point
  7. localStorage cache updated; tile appears in the first free inner cell; OPEN
```

Trust limit, stated: hashes protect against corruption and mismatch relative
to the index the shell fetched. They do not authenticate a replaced index;
that needs index signing with a key in the shell, an external dependency.

Orphan sweep at boot, under the lock per app: a `releases` record referenced
by no `installed.current`, `candidate`, `recovery.release` or
`failedVersion`, and older than 10 minutes, is deleted. The age guard keeps a
sweep from deleting what another tab is between steps 5 and 6 of.

### 4.5 Update activation

```
UPDATE explicitly requested
  1. steps 1–5 of install for the new ReleaseId
  2. transaction: releases.put(candidate); installed.candidate = new; generation unchanged
  3. wait until no fresh lease for id in any tab            row: "Updates when Notes closes"
  4. under the lock, one transaction, generation checked:
       checkpoints.put([ns, current]) ← copy of appdata range, meta, widgets   (quiesced: no lease, no view)
       installed: recovery = { release: current, checkpoint: [ns, current] } only if current.state was 'ready'
                  current = candidate; candidate = undefined; state = 'trial'; attempts = 0; generation++
                  migration = { from: old, to: new, done: false }
     await complete
  5. next launch (§4.6): owner view gets session.migration; secondary views wait for the owner's ready
  6. on ready: state = 'ready'; migration.done = true
     the previous recovery pair (release and checkpoint from the version before) is deleted now,
     so exactly one proven pair is kept; both candidate and recovery bytes count toward disk use
```

If `current` was itself in `trial` when a new candidate arrives, the recovery
pair is left as it was: an unproven release never becomes the recovery point.

### 4.6 Launch, failure and recovery

```
launch
  installed[id] read inside the transaction that increments attempts (one per session start, not per view)
  attempts > 2 && recovery → failure sheet first, no document created
  create the owner view; if migration && !migration.done, secondary views show the launch screen until owner ready
  owner ready → attempts = 0 (transaction) → secondary views bootstrap
  error before ready | no hello | no ready → revoke (§2.4); duplicate events for the same attempt are ignored
```

After the second failed attempt of a `trial` release, the sheet offers:

- **Restore previous version**: under the lock, one transaction: current
  appdata, meta and widgets are copied into `recovery[[ns, failed]]` (one per
  app; an older recovery copy is replaced and the sheet says so); the
  checkpoint's entries, meta and widgets replace the appdata range;
  `current = recovery.release`; `failedVersion = failed`; `state = 'ready'`;
  `attempts = 0`; `generation++`. The sheet says that edits made under the
  failed version are kept aside and may be missing from what opens.
- **Try again**: attempts stay, one more launch.
- **Close**.

A `failedVersion` is never activated automatically: the Updates tab shows it
with "Retry update", which runs §4.5 from step 3 with the same bytes. A newer
candidate replaces `failedVersion`. A release without a recovery pair (a fresh
install that fails) offers Reinstall and Close.

### 4.7 Data migration

Settled: app data belongs to the app. `session.migration.from` is delivered to
the owner view only, once, while `installed.migration.done` is false; the app
reads its own `meta.schema` marker through `storage` and migrates. The SDK
documents the convention (`schema` key, migrate forward, tolerate unknown
keys). `migration.done` is set by the host on `ready`, which is the durable
marker; `previousVersion` as a bare hint is gone.

### 4.8 Legacy Notes migration

Recommended (R4): a table in the shell maps legacy prefixes to app ids
(`duo.notes.` → `labs.doan.ipduo.notes`, key unchanged minus the prefix). At
the app's first install, under the lock:

```
  1. snapshot = every localStorage key with the prefix and its value
  2. one transaction: appdata.put for each; meta.rev/used; legacy.put(id, snapshot); marks[id].migrated = true
     await complete
  3. read back every key; any mismatch → abort, leave localStorage alone, surface E_STORAGE
  4. for each key in snapshot: if localStorage still holds exactly snapshot's value, remove it; else leave it
```

Idempotent: `marks[id].migrated` short-circuits a second run. Concurrent old
tab: a shell document old enough to still run baked Notes may write legacy
keys after the marker exists; those writes are neither imported nor deleted,
and this is stated as a limit in working.md rather than reconciled. Uninstall
deletes `legacy[id]` with the app data and keeps `marks[id].migrated`, so a
later reinstall does not reimport.

### 4.9 Uninstall

Under the lock:

```
Remove App
  1. transaction: installed.state = 'removing'; generation++    ← boot resumes here if interrupted
     broadcast; every tab revokes its views (E_GONE) and deletes its lease
  2. wait for no fresh lease
  3. transaction: delete releases current/candidate/recovery/failedVersion,
                  appdata range, meta, checkpoints, recovery, legacy, widgets for ns;
                  delete installed; marks untouched
     await complete
  4. localStorage cache, icon blob URLs, grid cell
```

Settled: baked apps offer Remove from Home Screen only. Preinstalled isolated
apps uninstall fully; the store offers them again from the local source on
desktop and from the network on the web.

## 5. First integrated app: Notes

### 5.1 Choice

Accepted: **Notes first, then Weather.** Notes brings real persisted data,
two instances that already synchronize, wide and narrow layouts chosen by its
own box, the kit inside an isolated document, and text input in the cover view
mid-fold. Weather brings `network`, opaque-origin CORS against a real API,
owner-only fetch, commands, the widget snapshot and its stale and offline
states. Neither is an audio app; audio waits on check G2. Weather declares
`geolocation`, so its location button works in the sandbox and is the first
real use of a permission (check M).

What changes in Notes, stated plainly (R3): `store.ts` moves to the SDK's
`useKV` adapter with hydration, optimistic edits and a visible save state;
`index.tsx` changes so the selected note and the pushed page are written to
`os.session` and restored by a replacement view. That amends decision 32,
which kept navigation local; the amendment is recorded in docs/decisions.md
when the code lands. Empty-string overrides and reset-to-shipped keep their
current meaning through the adapter.

### 5.2 Experiments before dependent work

Committed document, storage, ownership and permission probes remain under `scripts/checks/`.
Screenshots/logs are local, gitignored artifacts. The [review guide](review.md) provides
current reproduction commands and measured limits.

### 5.3 Implementation sequence

Stages 2–5 are complete within their recorded scope. The broader one-day target is not
an outstanding instruction; [roadmap.md](roadmap.md) separates remaining work.

### 5.4 Acceptance checks

The four launch outcomes are an independent app, isolation, visible fold/display behavior
and installation without rebuilding the simulator. The review guide records their proof
and the broader lifecycle/kit checks. Full native permissions, background-media and
update/recovery parity remain unverified. Historical check identifiers elsewhere in this
contract refer to these areas: B isolation; F cover; G/G2 owner timers/audio; H/H2 native
storage/locks; I updates/recovery; J uninstall; L Weather; M permissions. They are requirement
identifiers, not a claim that every check passed. Run the corresponding committed scripts
and record the actual runtime and coverage when extending verification.

## 6. Permissions

The retained permission design covers browser features and host services. Enabled
scope is narrower than the original day-one proposal: previews and external developer
catalogs reject all device permissions. Trusted bundled releases may declare supported
permissions, as Weather declares geolocation. Camera/microphone cannot be declared.
Browser/OS permission prompts are additional to host authorization; no new runtime
permission UI or broad native/browser support is claimed.

### 6.1 One table

```ts
/** packages/sdk/permissions.ts — the single source of truth */
export type PermissionName = keyof typeof PERMISSIONS
export type ServiceMethod = 'photos.list' | 'photos.get' | 'photos.add'

export const PERMISSIONS = {
  // kind 'feature': a browser API the document calls itself; the shell delegates it through `allow`.
  geolocation:     { kind: 'feature', allow: 'geolocation' },
  'clipboard-read':  { kind: 'feature', allow: 'clipboard-read' },
  'clipboard-write': { kind: 'feature', allow: 'clipboard-write' },
  // kind 'service': shell-owned data reached over the bridge; the host gates each method.
  photos:          { kind: 'service', methods: ['photos.list', 'photos.get', 'photos.add'], mutating: ['photos.add'] }
  // kind 'native' (a Rust command behind native.ts and a Tauri capability) is reserved, not shipped.
} as const
```

The table drives manifest validation, Store permission labels, the iframe `allow`
attribute (§2.1) and the host method gate. New capabilities require explicit scope,
security and compatibility review, with implementation and verification for their
handlers and guards. The table is not authorization to expand the current permission set.

### 6.2 Rules

- **Undeclared means refused.** A feature not declared is `'none'` in `allow`;
  a service method not declared answers `E_DENIED` before any argument is read.
- **Publication review is planned.** The SDK validates permission names and the host
  gates methods. A future curated publication flow must review grants; external catalog
  selection does not authorize permissions. Browser/OS prompts still apply.
- **Fixed per document.** `allow` is set when the iframe is created, from the
  installed release's manifest. Without runtime prompts, a grant never changes
  while a view runs, so this costs nothing.
- **Mutating service methods are owner-only** (`photos.add` carries the epoch,
  §3.4); reads are any view.
- **Dev apps** and external developer catalogs accept no device permissions. A
  nonempty declaration is refused before a preview launches or an external app installs.
- **Versioning.** Table membership is part of the SDK version. A manifest that
  names a permission the host's table lacks fails `check` in CI and, if it
  reaches an older shell, is refused at install with "Requires a newer platform
  version" (§1.4), because its `build.sdk` is newer.
- **Native services** are a third `kind` with a Rust command and a capability
  entry. The row shape is reserved; no row ships until a service needs one and
  its command has been reviewed on its own.

### 6.3 Day-one services

`photos` is the retained host-service adapter because the data already exists: the
shell keeps the stills the Camera app takes (`shots`). The host handler lists
them, returns one as a Blob over the port, and appends one. Files, contacts
and notifications have no enabled host-service contract; they remain roadmap work.

```ts
export type Photo = { id: string; takenAt: number; width: number; height: number }
```

### 6.4 Open, closed by check M

Permissions Policy delegation to an opaque-origin sandboxed frame (`allow="geolocation *"`)
must actually let the API run in Chromium and in WKWebView under Tauri. Check
M proves geolocation with declared and undeclared test apps. Capture is deferred:
the Chromium experiment returned SecurityError for an opaque origin even with
camera policy and browser permission granted. The sandbox remains unchanged;
camera and microphone need a separately reviewed host-mediated media contract.

## Current verification limits

Hidden-owner timing/audio, full native permission/recovery coverage, deployment headers
and signing remain unverified or deferred as listed in [roadmap.md](roadmap.md). Native
storage/locks, CSSOM dynamic styles and bundle caps were measured and implemented.
See [the review guide](review.md) for reproduction and bounded verification claims.
