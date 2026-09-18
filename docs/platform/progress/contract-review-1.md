# Stage 2 contract, review of revision 1

2026-09-17. Verbatim record of the gate review of the first contract proposal.
The revised specification that incorporates these amendments is
[contract.md](contract.md); its "Review disposition" appendix maps every
verdict below to the section that resolves it. Kept so the reasoning behind
each change survives the rewrite.

**Gate review, 2026-09-17: changes requested.** Every recommendation has an
Accept or Change verdict in the review tables below. Accept approves the design
direction, not an unrun runtime check. Change specifies a required revision.
The review amendments take precedence over the original proposal and sketches
above them, including claims labelled Settled. The original proposal is retained
for comparison; it is not yet an approved implementation specification.
No implementation is authorized by this review.

## Settled, recommended, open

**Settled by earlier decisions and current code**

- Same iframe boundary for official, community and `?dev=` apps; no Tauri IPC,
  no shell context, `sandbox="allow-scripts"`, no `allow-same-origin`.
- Sender identity from the frame, never the message; hand-written validation;
  `E_PROTOCOL` tears the view down.
- One session per app id; both displays hold a view at every angle; the fold
  tears nothing down except the split collapse.
- Strings-only KV; `arg` is session state; uninstall deletes release bytes,
  app data and widget snapshots; baked apps are not installable.
- Kit version recorded, never gating; `permissions: []`; `license: 'MIT'`.

**Review of every recommended decision**

| Decision | Verdict | Accepted choice or required change |
| --- | --- | --- |
| Compatibility | **Change** | Keep CI-derived `build.sdk`, but implement actual full-version caret semantics, including patch floors and 0.x rules. Do not present an SDK version as a shell release version. See R1. |
| App document | **Accept** | Single-file `app.html`, installed `srcdoc`, and local-dev `src` are a reasonable first delivery format. Prove the complete asset/CSP path in both runtimes before building the dependent features. See R2. |
| Bridge transport | **Change** | Keep postMessage bootstrap and MessagePort transport; add launch-bound identity, idempotent retries, explicit lifecycle states and revocation. A port is a bearer capability, not an untransferable identity. See R2. |
| Network policy | **Change** | Use validated origins for `connect-src`, but state its scope accurately: it controls connection APIs, not every possible outbound navigation. Include opaque-origin CORS, dev policy and media requirements. See R2. |
| Effect ownership | **Change** | Keep one sticky designated owner per host session. Remove promises of exactly-once effects, precise hidden timers and uninterrupted audio. Define handover and test user activation and suspension. See R3. |
| State sync | **Change** | Keep persistent and ephemeral KV spaces. Complete the wire methods, revisioned snapshot/subscription contract, write ordering, and asynchronous React adapter. See R3. |
| Widgets | **Accept** | Declarative snapshots keep app code outside the shell and work for both DOM and baked rendering. Validate bounded text-only data, authorize owner writes, and expose snapshot age. No background refresh is promised. |
| Storage engine | **Change** | Use IndexedDB as the authoritative registry as well as data/artifact storage. localStorage may be a boot hint only. Add atomic lifecycle transitions and coordination across host tabs. See R4. |
| Release history | **Change** | Retain one known-good previous release and its matching data checkpoint after `ready`; replace that recovery pair only when the next candidate succeeds. `ready` alone is not evidence of long-term health. See R4. |
| Rollback trigger | **Change** | Two failed launch attempts may offer recovery, counted per session attempt rather than per mirrored view. Restore a compatible code/data pair and block the failed release from automatic reactivation. See R4. |
| Legacy data | **Change** | Keep host-side migration, but make the copy transactional, idempotent and verified before deleting source keys. Retain a recovery copy and define concurrent old-tab behavior. See R4. |
| `cover` field | **Accept** | Drop the per-lane restriction and make responsive cover support an app requirement, verified by F. Do not silently restore a community restriction if the runtime test fails. |
| `allow-forms` | **Accept** | Leave native form submission disabled; controlled inputs and prevented-submit React forms can still work. This does not make an empty Permissions Policy a deny-all policy; see R2. |
| First app | **Accept** | Notes first, then Weather. Preserve real Notes data and exercise Weather's actual API/widget behavior before claiming those contracts are verified. See R5. |

Recommendations made in the prose but absent from the original summary table:

| Decision | Verdict | Accepted choice or required change |
| --- | --- | --- |
| Launch screen | **Accept** | Keep the icon/loading/failure surfaces. Startup failure must revoke bridge authority and stop the failed view; inspection is an explicit development-only option. |
| Message and storage limits | **Change** | Keep bounded messages/quotas, but specify UTF-8 bytes and envelope overhead, chunk or paginate responses, and bound request rate as well as concurrency. A 256 KB value cannot fit inside a 256 KB message with its envelope. |
| Physical display, placement, active and visible | **Accept** | Keep separate fields. Derive visibility from actual facing/clipping/sleep state; hinge angle alone is insufficient. Define input focus separately from display activity when two apps share the inner display. |
| Fold angle in view events | **Accept** | Keep coalesced updates, at most once per frame, only when changed. Layout subscriptions should avoid rerendering every app for every angle update; bound backlog for a slow view. |
| CI-generated CSP | **Change** | Retain hashed scripts/styles, but make the policy compatible with the assembled document and the embedding shell, and apply the explicit limits in R2. Test behavior, not just the presence of a meta tag. |

### R1. Compatibility must be precise

`HOST_SDK` must satisfy `^build.sdk` using full semver comparison for stable
releases. For example, host 1.2.0 must reject an app built against 1.2.1;
host 0.3.0 must reject 0.2.5; host 0.0.1 must reject 0.0.0. Prereleases are
development-only until an explicit compatibility rule is defined. The current
SDK is 0.0.0, so pre-1.0 behavior is relevant immediately. This is a conservative
host requirement, not proof that every SDK implementation change changes the
host API. The SDK must document its host-contract versioning discipline.

Require the installed handshake's SDK/protocol to agree with verified release
metadata; an app cannot lower its claimed requirement to bypass activation
checks. Keep the shelf, activation and launch checks. An incompatible old tab
must not persist a global `blocked` state that prevents a newer compatible tab
from launching the app. Compatibility is evaluated against the current host.

User-facing text should say "Requires a newer platform version" unless release
metadata maps the runtime requirement to an actual shell release. An app Store
update does not necessarily repair an old host; provide the relevant Software
Update or web reload action and an honest result when no compatible host exists.
The catalog needs immutable release history to select the newest compatible
release; a latest-only catalog cannot implement the proposed shelf rule.

This corrects the minor-only rule to the documented
[npm caret semantics](https://github.com/npm/node-semver#caret-ranges-123-025-004).

### R2. Bootstrap, sandbox and network enforcement

Define a host record for each launch with session id, view id, launch generation,
expected release identity and a single-use bootstrap nonce supplied to the
intended app document. Bind hello/welcome to that record. Validate `event.source`
on the host, and `event.source === window.parent` on the SDK. A duplicate hello
for the same pending attempt is an idempotent retry, not evidence of navigation.
After connection, reject rebootstrap; a replacement document gets a new iframe,
generation and port. Navigation and initial-load ordering require explicit tests:
WindowProxy identity alone is not a document identity and counting load events
alone is not a complete bootstrap protocol. Treat a transferred port as an
authority-bearing object; never infer identity from an app-supplied id.

Revoke the view/generation before processing further messages or changing its
document. Cancel outstanding host work and reject stale completions before any
write commits. Send `bye` best-effort, close the port, and remove the iframe;
the host cannot guarantee that a destroyed document receives `bye` or runs
promise rejection handlers. Setting `src` is not sufficient to replace a
document while `srcdoc` is present. A no-ready timeout revokes and removes the
view too; it must not leave a failed app running with storage privileges. Define
mutating-request idempotency and status reconciliation after timeout: timeout
does not prove a write failed, and a blind retry can duplicate an effect.

An empty `allow` attribute does not explicitly disable every policy-controlled
feature. Specify `camera 'none'; microphone 'none'; geolocation 'none'` and other
restricted features explicitly, together with the appropriate host policy where
supported. Test actual API denial and native command denial, not only absent
Tauri globals. Keep `sandbox="allow-scripts"` and omit the other grants.
These distinctions follow the [iframe attribute semantics](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Validate `network` as exact HTTPS origins (scheme, host, port), rejecting
wildcards and CSP syntax; loopback HTTP exceptions belong only to development.
`connect-src` restricts fetch/XHR/WebSocket and related connection APIs. It is
not a general egress firewall: self-navigation remains a separate concern and
teardown after navigation does not undo an already-sent request. Document that
limit instead of claiming all undeclared-host traffic is impossible. Keep
nonconnection resource directives restrictive, and define `media-src` when
audio is supported; the proposed `default-src 'none'` otherwise denies it.
See the [connect-src scope](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src).

Verify API access from an opaque origin, including CORS and credential behavior,
using Weather's real endpoints. Do not add `allow-same-origin` to make it work.
The dev server must produce the policy-bearing app document; an arbitrary URL
does not acquire a policy merely by being framed. Separate development app
storage/session/widget namespaces from installed apps, even when the authored
app id is identical; dev loading must not migrate or overwrite production data.

Before the dependent implementation, exercise the exact document builder in
Chromium and WKWebView: inline scripts and compiled StyleX, dynamic styles,
rewritten kit icon/font/image URLs, no shell-relative asset dependency, inherited
host CSP, and a local dev frame. CSP must precede executable/resource content.
Test both installed srcdoc and dev src; success on one does not prove the other.

### R3. Sessions, effects and asynchronous state

Specify one session per app id **per shell document/device instance**; multiple
browser tabs have separate sessions and owners but share persistent app data.
A sticky owner designates which cooperative app view runs effects. It cannot
prevent arbitrary app JavaScript from calling fetch or setInterval in a second
view, and React effect cleanup does not undo an external request already sent.
Add owner epochs for host-authorized operations and revoke the old epoch before
granting a new owner. Commands need ids/acknowledgment; a last-write-wins intent
key is insufficient for two rapid actions or safe replay after owner replacement.

Remove the 4 Hz hidden-timer guarantee and the claimed one-line CSS cure.
Use elapsed-time/deadline calculations and reconcile after suspension; check
logical timer state and duplicate effects through fold, split collapse,
backgrounding, minimize, and sleep/wake. Browser background scheduling is
[explicitly throttled](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
Audio also needs a real test where Play is clicked in a non-owner view, since a
message to a hidden owner is not proof that media activation is permitted under
[autoplay rules](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
If that fails, revise the media-owner/service contract before migrating audio
apps; do not quietly drop the behavior or weaken the sandbox.

Complete KV methods (`session.keys` is missing from Method), subscription setup,
and revision-bearing events. Provide an atomic snapshot plus subscription cursor
so initial reads cannot lose an intervening write. Persistent writes receive a
monotonic revision in the same transaction as the value; clients discard stale
events and reread after a gap. BroadcastChannel is an invalidation signal, not
a lock or durable event log. Quota checks and writes must be one transaction.
Define ordering for rapid writes, deletion events, and request/response correlation.

Notes currently uses a synchronous `useSyncExternalStore` snapshot. Its SDK
adapter needs an in-memory snapshot, asynchronous hydration, optimistic edits,
ordered persistence, and visible save-failure recovery. A promise-returning
replacement for localStorage cannot directly implement the current hook. Do not
acknowledge a save as durable before the database transaction completes.

The proposed split-collapse restoration also changes Notes navigation: selected
note and pushed page are currently component-local (project decision 32).
Explicitly implement serializable session navigation and record the changed
behavior; remove the promise that index.tsx remains unchanged. Define open/home
across both displays, delivery of a new deep-link argument to an already-open
session, and session preservation during view replacement. Forward a narrow set
of shell shortcuts such as Escape through the bridge when focus is in an iframe;
do not assume child keyboard events bubble to the shell or forward typed text.

### R4. Atomic persistence and safe recovery

Make `installed` an IndexedDB object store. Commit verified artifact references
and registry transitions transactionally; an optional localStorage boot cache
cannot grant launch authority. Show a brief registry-loading state instead of
assuming synchronous boot is worth two competing sources of truth. Await
transaction completion, not only a successful put request. Handle quota and
unavailable/evicted storage with a visible error and preserve the working release.
The transaction boundary is defined by [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

Every operation must check a shared per-app install generation/state inside its
write transaction. Serialize install, activation, migration, rollback and removal
across tabs using a runtime-verified coordinator/locking mechanism. Reconcile
resumed or crashed hosts; notifications alone are insufficient. In particular,
tab B must not recreate app data after tab A uninstalls it, and an orphan sweep
must not delete an artifact another tab is committing. Define cross-tab session
leases before promising activation only after all old-version users close.

Hash and size-check release metadata, HTML and every icon before publication to
the registry; validate paths, ids, versions, redirects and bounded downloads.
The expected metadata hash comes from the index, artifact hashes from verified
metadata. Hash pinning protects against corruption relative to that index; it
does not authenticate a maliciously replaced index. Keep that stated trust limit.
Shared-code changes that alter bytes must produce a new app release identity,
even if no file inside its app folder changed. Do not overwrite an immutable URL.

Before activation, quiesce old-version writers and checkpoint app data/schema
and widget snapshots transactionally. Retain the known-good code plus matching
checkpoint after the new version sends ready. Replace that pair only when the
next candidate succeeds; account for both candidate and recovery bytes in disk
quota. Count startup failure once per launch attempt, not once per display;
persist the recovery state and ignore duplicate error/timeout events.

Recovery restores the matching code/data pair. Preserve newer-version data in
a bounded recovery copy until the user discards it or a later successful update
explicitly replaces it; explain that restoring the checkpoint may omit later
edits. A failed release becomes `failedVersion`, not `pending`: offer explicit
Retry update, but never immediately reactivate it on the next close or automatic
update check. Deliver migration context once to the owner before mounting
secondary views, and persist a migration marker; `previousVersion` alone is not
a durable migration protocol.

For legacy Notes migration, snapshot source keys, commit the data and a migration
marker together, verify the copy, and only then remove unchanged source keys.
Preserve a recovery copy. Define handling of an old baked-app tab still writing
the legacy keys; do not silently delete a newer value or promise coexistence
without reconciliation. Uninstall must delete migration/recovery copies too,
while preserving a non-data marker if needed to prevent accidental reimport.
Preinstalled apps need a first-boot seed marker so an intentional uninstall is
not silently undone on the next boot. Offline reinstall requires a source that
is actually present locally; shipping a public URL in a web deployment does
not itself cache that source for offline use.

### R5. Revise the implementation and evidence gate

Keep all ten implementation steps and the full one-day platform target. The
rough twelve-hour subtotal is an unmeasured estimate, not acceptance evidence
or a reservation that displaces kit harvest, app migration or the website.
Measure progress by verified deliverables. Run the installed/dev document,
bridge, native storage and owner-lifecycle experiments before the store/CLI work
that depends on them.

Commit reproducible contract/isolation/lifecycle tests in the repository; only
temporary screenshots, logs and exploratory scripts belong in `.cache/debug`.
Extend A–J with the following evidence before accepting this stage:

1. Installed and dev isolation, explicit feature denial, CSP/CORS and offline
   asset loading in Chromium and WKWebView; repeated hello, navigation, slow
   startup, stale ports, write-after-timeout and write-after-teardown cases.
2. Two-tab concurrent writes, snapshot hydration without lost events, quota
   failure, update/launch conflicts, and uninstall while the other tab writes.
3. Interrupted migration/activation/removal at each commit boundary; rollback
   after a schema-changing candidate writes then fails; failed release stays
   blocked until explicit retry; recovery survives full host restart.
4. Notes empty-string/reset persistence, typing during hydration, split route
   restoration, cover focus/IME and Escape; timer reconciliation through
   background/sleep; user-initiated audio from the non-owner view. Correct D's
   visibility expectation to match actual geometry, not "first degree" alone.
5. Native install/update/recovery/uninstall as well as B/F/G/H; Weather's real
   network and widget behavior in both runtimes, including stale snapshot and
   offline states. Dev and installed copies of the same app must not share data.

This is still a contract review: the next pass incorporates these amendments
into the original types, algorithms, tests and companion platform documents.
Return that coherent specification for acceptance before implementation.

**Open, with the check that closes each**

- Timer throttling of hidden owner views (check G).
- IndexedDB under `tauri://localhost` (check H).
- Bundle size cap: measure Notes' `app.html` in step 2, then set a soft cap
  (proposed starting point 1 MB uncompressed) and a hard cap.
- Storage limits in §2.3 are provisional until Notes' real usage is measured.
- Widget refresh without a session: no in v1; revisit with Weather.
- Shell CSP directives and the `?dev=` `frame-src` allowance (security.md).
- Index signing, native signing, CDN host and publishing access remain
  external dependencies outside this contract.
