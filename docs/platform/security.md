# Security

There is no money and no account, so the assets are the user's machine and the
user's local data. Downloadable apps must not directly access native services
or another app's data. Access to their own data goes through the SDK.

## Tauri IPC

All downloadable apps run outside the shell's JavaScript context. Three
controls have different responsibilities:

1. **Iframe apps** run with `sandbox="allow-scripts"`, no `allow-same-origin`,
   and an `allow` attribute that names every policy-controlled feature: `'none'`
   unless the manifest declares it (camera and microphone are always `'none'`;
   geolocation and clipboard are `*` only when declared, as Weather declares
   geolocation; display capture, fullscreen, payment, USB, MIDI, autoplay and
   more are always `'none'`; `packages/sdk/permissions.ts`). An empty
   attribute would inherit the shell's policy, not deny. They cannot read the
   parent DOM or shell storage. A parent-window reference carries the `hello`
   message; everything after rides a transferred `MessagePort`.
2. **Lint and review** reject app imports of native APIs and direct use of host
   internals. These checks help enforce conventions; they are not a sandbox.
   There is no downloadable module tier executing in the shell window.
3. **Tauri capabilities** restrict the commands and contexts allowed to invoke
   native services. Custom commands need explicit ACL configuration too.
   Window-level capabilities cannot distinguish two scripts in the same
   shell context. Verify frame access denial in the actual desktop runtime.

`native.ts` remains the shell's native bridge. Official lane membership does
not grant access. Baked shell components may use shell services; a native
service for downloadable apps would be a `native` row in the permission table
with its own Rust command and capability entry, and no such row ships yet.

## SDK bridge

The host derives identity from its own launch record, never from a message:
`hello` must come from the frame the host created and carry the single-use
nonce that frame received as `window.name`; the `MessagePort` handed back is
the capability bound to that record, not proof of identity. A repeated `hello`
before the app's `ack` is an idempotent retry; one after it revokes the view,
and a replacement document is always a new element, generation and nonce.
Payloads pass hand-written type guards; a failure is `E_PROTOCOL` and revokes.
Revocation retires the generation before anything else, discards stale
completions, sends `bye` best-effort, closes the port and removes the element.
A failed start revokes too; no document keeps storage authority after failing.
States, limits, rate and retry-by-id are in progress/contract.md §2.4 and §2.5.

The acceptance check for the boundary (progress/contract.md §2.8, check B)
asserts from inside a sandboxed document, from `srcdoc` and from `src`, in
Chromium and WKWebView: no Tauri globals and a refused IPC transport,
`parent.document` throws, `localStorage` throws, camera, geolocation and
fullscreen APIs refuse, an undeclared `fetch` is refused by CSP and a declared
one succeeds without credentials, a forged or wrong-nonce `hello` gets no
reply, and a `hello` after `ack` revokes the view.

## Content Security Policy

The shell must not load app scripts into its own document. Its frame policy
should permit `srcdoc` frames and, in development, verified `blob:` documents; the
previous blanket `frame-src *` is not a required architecture choice. The
shell's own directives remain open. Stage-5 decision 49 supersedes direct
development-origin frame navigation: a second response cannot replace verified
code or CSP. Developer release downloads still need the selected origin.

Each app document carries its own policy, written by CI as the first child
of `<head>` in `app.html` (progress/contract.md §2.6): `default-src 'none'`,
script and style pinned by hash to the bytes CI built, `img-src` and
`font-src data:`, `connect-src` and `media-src` from the manifest's `network`
origins, and no frames, objects, workers or form actions. Because the document
is immutable and CI-generated, this is runtime enforcement of the connection
policy. Its scope is stated exactly: it bounds fetch, XHR, WebSocket and
media, not self-navigation, and a request sent before teardown has been sent.
The dev server emits the same policy-bearing document; framing an arbitrary
URL does not give it one.

## Storage

`localStorage` is one bag today. The SDK exposes per-app storage through the
host, keyed by the namespace the launch record resolved to (`<id>` for an
installed app, `dev:<origin>:<id>` for a `?dev=` app, which never touch each
other), in the shell's IndexedDB, the single authority (progress/contract.md
§4.1). Prefixing alone would not isolate scripts sharing the shell window; the
iframe boundary is what isolates, and the host key is what namespaces.
Opaque-origin app documents cannot use `localStorage`, so all persistence is
the SDK. Every write checks the app's install generation inside its
transaction, so a tab cannot write after another tab uninstalled. Uninstall
deletes the namespace's data, checkpoints, recovery and legacy copies. Limits
(bytes, provisional), error codes and the revisioned change model are in
progress/contract.md §2.5 and §3.3.

## Permissions

Day one, for downloadable apps in either lane (progress/contract.md §6). One
table in the SDK names every permission and its kind. **Browser features**
(geolocation, clipboard) are delegated through the iframe's
`allow` attribute, `*` for a declared feature because the frame's origin is
opaque, `'none'` for every other policy-controlled feature; sandbox flags alone
are not a permissions system. **Host services** (`photos` on day one) are
bridge methods the host gates by the manifest: undeclared answers `E_DENIED`
before any argument is read, and mutating methods carry the owner epoch.

The review team is the grant: CI validates the names and lists them on the
PR, the store row shows the same list, and there is no runtime prompt or
Settings → Privacy screen. The browser and macOS still show their own
location prompts. Camera/microphone are always denied: opaque-origin capture
failed the experiment and is deferred pending a host-mediated media contract.
`allow` is fixed when the iframe is created,
which is fine because a grant never changes while a view runs. Native services
are a reserved third kind with a Rust command and a capability entry each;
check M proves geolocation delegation from an opaque-origin frame in
Chromium and WKWebView before any feature is promised.

## Network

Apps may need public APIs. The policy (progress/contract.md §2.6): the
manifest's `network` list of exact HTTPS origins becomes the app document's
`connect-src` and `media-src`, so the browser refuses connections to any
origin the author did not declare, and review reads one short list. Requests
leave with `Origin: null`, so the API must allow `*` and the app sends no
credentials; this is verified against Weather's real endpoint. Static URL
checks in CI remain a review aid; the CSP is the enforcement of connections,
and only connections. The iframe boundary protects shell access.

## Supply chain

App builds include the SDK and, when used, React, React DOM, the kit, and their
approved runtime dependencies. Additional dependency policy remains constrained
by the repository's no-new-dependencies rule. CI builds immutable artifacts
from reviewed source in this repo. Source review, artifact integrity, and
release credentials are separate concerns; the signing/recovery design is open.
