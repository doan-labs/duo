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
- Extended from `localStorage['os.installed']`: an array of `{ id, version,
  manifest }`. Each entry becomes an `App` whose view launches the installed
  bundle in a sandboxed iframe. Persistent artifact storage is a separate
  design decision; an entry in localStorage is not the installed app's bytes.
- `byName` becomes `byId`. `os.open` takes an id. A name lookup stays for Siri
  and Spotlight, which search by display name.

Uninstall removes the entry, deletes `os.storage` under that id, and drops the
cached bundle. Baked apps cannot be uninstalled; they can be hidden.

## Loading an app bundle

```
repository source → CI build → immutable document, scripts, styles, assets
installed release → sandboxed iframe → SDK handshake with the shell
```

Apps may bundle React and the UI kit inside their own documents. They do not
share the shell's React tree, stylesheets, or import map. No downloadable app
module, including a widget, is imported into the shell's JavaScript context.
How cached documents and assets are served offline in each runtime remains
part of the artifact-loader design.

## Loading an iframe app

One component, `Iframe`, in the shell. `sandbox="allow-scripts allow-forms"`
and no `allow-same-origin`. The app cannot read the parent document or shell
storage, but can hold a parent-window reference for messaging. The SDK owns the
host API and versioned protocol. This is the initial message sketch, not a
complete protocol specification:

```
shell → app:  { t: 'os', mirror, display: 'cover'|'inner'|'half', arg }
              { t: 'fold', angle }          while the hinge moves
              { t: 'button', which, kind }  frame buttons, when the app is frontmost
              { t: 'storage', key, value }  reply to a get
app → shell:  { t: 'open', id, arg }
              { t: 'home' }
              { t: 'storage', op: 'get'|'set'|'del', key, value }
```

`@doan-labs/ipduo-sdk` exposes these operations to every downloadable app. The
bridge must bind requests to the actual frame, validate payloads, and derive
app identity in the host. Request correlation, timeouts, errors, storage limits,
and connection teardown still need specification. An opaque origin alone
does not identify an app. See security.md.

## Two instances

Every display runs its own springboard, and while the phone folds the other
display holds a mirror copy of the open app. Every app therefore runs twice,
sometimes three times. This is the single fact community developers will trip
on, so:

- `os.mirror` is true on the copy. A copy draws everything and starts nothing:
  no sound, no network write, no timer with side effects.
- Existing baked apps can share module state in the shell document; Music's
  `deck` currently does. Downloadable apps cannot rely on that mechanism.
- Each iframe instance has a separate document and module state. Shared app
  data and changing active-display ownership need an SDK contract. The existing
  `mirror` flag alone does not solve synchronization or duplicate effects.

The review recommends one logical session with multiple display views. Its
state, effect ownership, and lifecycle API remain open decisions, not an
implemented or accepted guarantee of exactly-once behavior.

## Mid-fold

The current renderer bakes the home screen, but keeps open app panels live,
clipped, blurred, and darkened through the fold. It does not bake an app-icon
snapshot (docs/decisions.md 24). The earlier community cover restriction was
based on that stale snapshot description. Whether to lift it is still open;
first verify sandboxed iframe rendering, input, and state handover in Chromium
and the Tauri WKWebView.

## Fold-aware layout

The SDK owns display information supplied by the host; the kit consumes it for
layout. The original sketch was `{ display: 'cover' | 'inner' | 'half', width,
folding }`. The review recommends separating physical display from placement,
and exposing active/visible state. The exact shape remains open.

## Inter-app links

Today's `os.open` takes a display name. The planned SDK call uses an immutable
app id and gains a URL form, `iphoneduo://<id>?<arg>`, parsed
by the shell into the same call, so a link in an iframe app, in Safari, or in
the terminal (`?app=`) all land in the same place. The shell owns the scheme
and does not let apps register their own.
