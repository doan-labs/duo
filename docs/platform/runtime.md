# Runtime

How the shell turns a manifest into something on glass.

## Execution boundary

| Tier | Where the code is | Who | Access |
| --- | --- | --- | --- |
| Baked shell component | Shipped with the shell | Selected core components; final list open | Shell-owned services through `native.ts` |
| Downloadable app | Immutable document bundle built from this repo | Official and community alike | SDK over an isolated bridge; no direct Tauri IPC |
| Development app | Local development server | Every `?dev=` app | The same sandbox and SDK contract as downloadable apps |

Lane is maintenance and review status, not permission to execute in the shell.
Shipping an isolated bundle in the dmg for offline use does not require granting
it shell privileges. The precise split between baked components and preinstalled
isolated apps remains open.

## The registry

`APPS` in the shell stops being a constant. It becomes a small registry:

- Seeded at boot from the baked list (the old `index.ts`), with default grid
  positions for a fresh install.
- Extended from the `installed` object store in the shell's IndexedDB, the
  only authority (progress/contract.md §4.1: `generation`, `state`, `current`,
  `candidate`, `recovery`, `failedVersion`, `attempts`). A `localStorage` cache
  lets the grid lay out before the database answers but grants no launch.
  Each record becomes an `App` whose view launches the stored release in a
  sandboxed iframe.
- `byName` becomes `byId`. `os.open` takes an id. A name lookup stays for Siri
  and Spotlight, which search by display name.

Uninstall follows progress/contract.md §4.9, under a per-app lock: mark
`removing`, revoke every view in every tab, wait for leases to clear, delete
release bytes, app data, checkpoints, recovery and legacy copies and widget
snapshots, then the record; a non-data marker prevents reimport. Baked apps cannot be
uninstalled; they can be hidden.

## Loading an app bundle

```
repository source → CI build → release.json + one app.html (inline script, styles, data-URI assets) + icons
installed release → IndexedDB → <iframe sandbox="allow-scripts" allow="…'none'" name=nonce srcdoc> → hello(nonce) / welcome + MessagePort / ack
?dev= app         → verified CLI document → Blob URL <iframe … src> → same handshake, dev: namespace
```

Apps may bundle React and the UI kit inside their own documents. They do not
share the shell's React tree, stylesheets, or import map. No downloadable app
module, including a widget, is imported into the shell's JavaScript context.
The single-file document and `srcdoc` loader are the stage 2 recommendation
(progress/contract.md §2.1); they make offline storage one record and integrity one hash.

## Loading an iframe app

One component, `Sandbox` (`packages/shell/runtime/sandbox.tsx`). `sandbox="allow-scripts"`,
no `allow-same-origin`, and an `allow` attribute that explicitly denies every
policy-controlled feature the manifest does not declare (security.md). The app cannot read the parent document or shell
storage, but holds a parent-window reference for the `hello` message. Every
view starts from a host launch record with a single-use nonce handed to the
document as `window.name`. The SDK owns the host API and versioned protocol;
progress/contract.md §2 is the specification. In outline:

```
app → shell   hello { protocol, sdk, nonce }          window.postMessage, retried each second until welcome
shell → app   welcome { view, session, owner, limits } reply, transfers a MessagePort
              refused { e: E_INCOMPATIBLE | E_PROTOCOL | E_BLOCKED }
app → shell   { ev: 'ack' } over the port              connected; a later hello revokes the view
over the port
app → shell   { id, m: 'storage.*' | 'session.*' | 'cmd.send' | 'cmd.ack' | 'widget.set' | 'open' | 'home', p, epoch? }
              { ev: 'ready' } | { ev: 'error', p } | { ev: 'key', p: { key: 'Escape' } }
shell → app   { id, ok, v } | { id, ok: false, e, msg }
              { ev: 'view' | 'kv' | 'arg' | 'owner' | 'cmd' | 'bye', p }
```

The host identifies the view from its launch record: `event.source` must be
the frame it created and the nonce must match; the port is the capability
bound to that record, never an identity proof, and nothing is inferred from an
app-supplied id. Requests are answered in order, mutations are acknowledged
after the database transaction completes, and a retry after timeout reuses
the request id so the host can deduplicate. Lifecycle states, revocation
order, limits and rate are in progress/contract.md §2.4 and §2.5. See
security.md for the boundary the acceptance check asserts.

## Two instances

Every display runs its own springboard, and while the phone folds the other
display holds a mirror copy of the open app. Every app therefore runs twice,
sometimes three times. This is the single fact community developers will trip
on, so:

- Existing baked apps share module state in the shell document; Music's `deck`
  does. Downloadable apps cannot: each iframe is its own document.
- The stage 2 contract (progress/contract.md §3) names the copies: one
  **session** per open app per shell document, one **view** per document on
  glass, all views sharing `os.session` (ephemeral) and `os.storage`
  (persistent) through the host, with revisions. One view is the designated
  **owner** of effects, chosen first, sticky until revoked, and identified by
  an epoch the host checks on owner-only calls. Ownership is cooperative: the
  platform promises at most one designated owner, not exactly-once effects,
  precise hidden timers or uninterrupted audio. Intent that must happen once
  travels as an acknowledged command. `os.owner` replaces the legacy `os.mirror`.
- The fold tears no view down. The one exception is the split collapse at 40°,
  where the inner display reopens the first app full as a new view of the same
  session.

Checks G and G2 in progress/contract.md §5 record how hidden owner views
behave for timers and for audio activation in both runtimes; the results
become documented limits, and a refused audio activation opens a media
contract before any audio app moves to the sandbox.

## Mid-fold

The current renderer bakes the home screen, but keeps open app panels live,
clipped, blurred, and darkened through the fold. It does not bake an app-icon
snapshot (docs/decisions.md 24). The earlier community cover restriction was
based on that stale snapshot description. The stage 2 review accepted lifting
it and dropping the manifest `cover` field; responsive cover support is a
requirement of every app, verified by progress/contract.md check F in Chromium
and WKWebView, and no per-lane restriction returns if a runtime fails it.

## Fold-aware layout

The SDK owns display information supplied by the host; the kit consumes it for
layout. The shape is `ViewInfo` in progress/contract.md §3.2: `display`
(`inner` | `cover`), `placement` (`full` | `left` | `right`), `width`,
`height`, `visible` (derived from the render loop's own visibility, opacity
and clip writes plus sleep, not from the angle), `active`, `focused`, `angle`.
Layout still follows the box (a split half is as narrow as the cover);
`display` is for behaviour that is truly per glass. `view` events are
coalesced to one per frame and sent only on change.

## Inter-app links

Today's `os.open` takes a display name. The planned SDK call uses an immutable
app id and gains a URL form, `iphoneduo://<id>?<arg>`, parsed
by the shell into the same call, so a link in an iframe app, in Safari, or in
the terminal (`?app=`) all land in the same place. The shell owns the scheme
and does not let apps register their own.
