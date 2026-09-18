# Security

Downloadable apps cannot directly access the shell, native services or another app's data.
Their own persistent data goes through the SDK. These requirements apply equally to
official, community and development documents; lane grants no execution privilege.

## Isolation and bridge authority

Frames use only `sandbox="allow-scripts"`, never `allow-same-origin`. The opaque document
cannot read parent DOM/storage or use origin storage directly. Explicit iframe feature
policy denies undeclared capabilities; camera and microphone are always denied.
`packages/sdk/permissions.ts` owns the permission table and denial list.

A host launch record binds the expected frame, nonce, release, SDK and generation.
The SDK checks parent replies; the host checks sender and nonce. A MessagePort carries
authority but does not establish identity. Duplicate pending hello retries are handled;
a hello after acknowledgment revokes the view. Invalid protocol payloads revoke too.
Revocation retires authority first, cancels pending work, ignores stale completions,
closes the port and removes the frame. A failed startup retains no storage authority.
See [contract §§2.2–2.5](contract.md#22-launch-record-and-bootstrap).

`native.ts` is the trusted shell's native bridge. Import validation and Tauri capabilities
support isolation but cannot distinguish scripts sharing the shell context; they are not
substitutes for the sandbox. Native API denial must be tested in the actual native runtime.

## Verified documents and connection policy

The builder emits one immutable HTML document with embedded script/styles/assets and a
first-head-child CSP. The downloader checks metadata identity, size and hashes, then
recomputes script/style hashes and validates the exact policy against the manifest.
Dynamic StyleX values become CSSOM classes in a hash-authorized stylesheet; the sandbox
does not rely on unrestricted inline styles.

Default resources are denied. Images/fonts use data URIs; scripts/styles are hash-pinned;
connection/media origins come from validated exact HTTPS origins. Frames, workers,
objects, base URLs and form submission are denied. Development allows its documented
loopback exceptions. CSP bounds connection APIs, not all egress: self-navigation is a
separate concern, and teardown cannot recall requests already sent. Opaque-origin APIs
must support the required CORS behavior; apps must not send credentials.

Installed documents execute verified stored bytes through `srcdoc`. Preview documents
execute verified bytes through an owned Blob `src`, avoiding a validation/second-fetch
gap. Replacement/removal revokes old URLs under the app lock. Shell hosting policy must
permit these frames and selected-source downloads; deployment-specific header verification
is still required. See [website deployment](web.md#deployment).

## Storage and lifecycle

Host namespaces are installed app id or `dev:<origin>:<id>`. Preview storage is disjoint
from installed data, even for the same id. Host authorization never derives from an
app-supplied namespace. Every persistent write checks current installed generation/state
inside its transaction; acknowledgments mean transaction completion. Uninstall revokes
views and clears app data, artifacts, snapshots and recovery copies after leases clear.
Non-data markers prevent legacy reimport and stale authority after reinstall.

Locks serialize lifecycle work; leases coordinate tabs; BroadcastChannel is only an
invalidation signal. Request/storage quotas, rate limits and retries are specified in
[the contract](contract.md). Never disable reconciliation merely to hide an optional UI.

## Enabled permissions

Camera/microphone are rejected globally pending a separate host-mediated media design.
Local previews and external developer catalogs currently accept no device permissions.
The retained table includes geolocation, clipboard and the host photos service; Weather
uses its declared geolocation. Undeclared host services fail before processing arguments;
mutating services require the current owner epoch. Browser/OS consent is additional to
the host's manifest gate. Retained adapters are not proof of full native/browser support.

The original review-as-grant and expanded permission workflow is a design for curated
publication, not an enabled permission grant for arbitrary external apps. No native
service permission is shipped. See [roadmap](roadmap.md) for remaining validation.

## Distribution trust and measured coverage

Hashes prove integrity relative to the selected catalog, not publisher identity. Catalogs
are unsigned. Updates bind to the origin recorded at installation; a different catalog
cannot take over an existing id's data. Provenance-less records accept only the shell
origin. Source review, dependency review, artifact integrity and release signing are
separate responsibilities; [publishing](publishing.md) is not a deployed service.

[current platform verification](review.md) records adversarial Chromium checks and bounded native
install/fold/persistence/preview checks. Complete native IPC, permission, background-media
and update/recovery parity is not claimed. Preserve both guarantees and verification gaps.
