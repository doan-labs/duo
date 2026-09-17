# Security

There is no money and no account, so the assets are the user's machine and the
user's local data. Downloadable apps must not directly access native services
or another app's data. Access to their own data goes through the SDK.

## Tauri IPC

All downloadable apps run outside the shell's JavaScript context. Three
controls have different responsibilities:

1. **Iframe apps** run with `sandbox="allow-scripts allow-forms"` and no
   `allow-same-origin`. They cannot read the parent DOM or shell storage.
   A parent-window reference is available for the SDK's messaging bridge.
2. **Lint and review** reject app imports of native APIs and direct use of host
   internals. These checks help enforce conventions; they are not a sandbox.
   There is no downloadable module tier executing in the shell window.
3. **Tauri capabilities** restrict the commands and contexts allowed to invoke
   native services. Custom commands need explicit ACL configuration too.
   Window-level capabilities cannot distinguish two scripts in the same
   shell context. Verify frame access denial in the actual desktop runtime.

`native.ts` remains the shell's native bridge. Official lane membership does
not grant access. Baked shell components may use shell services; any future
native service exposed to downloadable apps needs an explicit SDK permission
contract. Permissions remain empty in v1.

## SDK bridge

The host derives app identity from the frame connection, never a claimed app
id in a message. Validate the sender and payload, bind replies to the same
connection, and tear down authorization when a frame navigates or closes.
Opaque origins are not unique app identities. Request ids, errors, timeouts,
quotas, and lifecycle semantics must be specified before release.

## Content Security Policy

The shell must not load app scripts into its own document. Its frame policy
should permit the configured artifact loader and approved development origins;
the previous blanket `frame-src *` is not a required architecture choice.
Each app document needs its own policy. Exact directives depend on the chosen
CDN and offline loader and remain open; a parent frame policy does not by
itself constrain every network request made inside a remote document.

## Storage

`localStorage` is one bag today. The planned SDK exposes namespaced storage
through the host, with ownership derived from the connection. Prefixing alone
would not isolate scripts sharing the shell window; the iframe boundary is
essential. Opaque-origin app documents cannot rely on localStorage, so their
persistence uses the SDK. Uninstall deletes app-owned host storage. Limits,
failure behavior, and synchronization remain to be specified.

## Permissions

Reserved in the manifest, empty in v1 for downloadable apps in either lane.
Configure and test Permissions Policy alongside the sandbox for applicable
browser features; sandbox flags alone are not a blanket permissions system.
When a native service is added, it needs declaration, authorization, and host
enforcement. The eventual prompt and Settings → Privacy flow remains future work.

## Network

Apps may need public APIs. The allowed hosts and runtime network policy remain
open. Static URL checks cannot prove where arbitrary JavaScript will send data;
a repository host is not automatically an authorized API host. The iframe
boundary protects shell access, not a promise of no network traffic.

## Supply chain

App builds include the SDK and, when used, React, React DOM, the kit, and their
approved runtime dependencies. Additional dependency policy remains constrained
by the repository's no-new-dependencies rule. CI builds immutable artifacts
from reviewed source in this repo. Source review, artifact integrity, and
release credentials are separate concerns; the signing/recovery design is open.
