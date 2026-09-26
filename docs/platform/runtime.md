# Runtime

Current responsibilities and invariants. [contract.md](contract.md) contains the detailed
accepted design; [current platform verification](review.md) states what has been verified.

## Execution boundary

The web-only [browser builder](builder.md) adds verified preview bundles under
`dev:builder:<project>` with the same opaque frames and generation-checked SDK storage.
Its activation path checkpoints and replaces preview views without reloading the phone.
Installed-app activation is unchanged.

| Kind | Execution | Access |
| --- | --- | --- |
| Trusted baked component | Shell React tree | Existing shell services through `native.ts` |
| Installed app | Verified immutable document from bundled assets or a selected catalog | SDK through an opaque sandbox; no shell DOM/storage or direct Tauri IPC |
| Development app | Verified CLI document in a separate development namespace | Same sandbox and SDK; device permissions refused |

Calculator, Calendar, Clock, Freeform, News, Notes, Photos, Reminders and Weather are separately built,
preinstalled sandbox apps (`scripts/build-preinstalled.ts` builds every `packages/apps/*/manifest.json`).
Camera, Voice Memos, Maps, Safari and App Store remain trusted baked components:
the document policy allows no camera, microphone or frames. Voice Memos reaches the
microphone the way sandboxed apps do - the host-mediated `mic` service and `appfiles`
blob store, exposed to baked code as `os.mic`/`os.files` props - so the device's
`getUserMedia` stays in one reviewed module (`runtime/mic.ts`). Lane does not grant privileges. Apps may bundle React
and the kit but never share the shell's JavaScript, stylesheet or import map.

## Responsibilities

`packages/shell/runtime/database.ts` owns IndexedDB transactions; `storage.ts` owns
revisioned KV; `releases.ts` downloads and verifies artifacts; `lifecycle.ts` owns
installation, generations, leases, activation, migration, restore and removal.
`sessions.ts` owns sessions, sticky effect ownership and commands. `bridge.ts` owns
launch records and nonce/MessagePort authority. `device-events.ts` routes the frame's
buttons, the pose and the switches to the views that watch them. `notifications.ts`
owns the in-memory notice store `notify.post`/`notify.clear` dispatch into; every
display's SpringBoard renders it as a banner and as the lock screen's Notification
Center. `display.ts` derives view information;
`sandbox.tsx` renders loading/failure states. `registry.ts` combines installed apps with
the shell registry and seeds bundled releases once. `development.ts` owns preview bytes
and namespaces; `catalog.ts` owns explicit catalog operations.

## Documents and bridge

Installed HTML comes from IndexedDB into `iframe.srcdoc`. Development HTML is downloaded
and verified once, then executed through an owned Blob `src`; a second server response
cannot replace verified bytes. Both use `sandbox="allow-scripts"`, without
`allow-same-origin`, and explicit feature policy. The document carries a verified CSP
with hashed script/styles and embedded assets. See [security](security.md).

A single-use nonce in `window.name` binds hello/welcome/ack to a host launch record.
The host checks sender, protocol and release SDK; the port is a capability, not identity.
Revocation retires authority before teardown, discards stale completions, closes the port
and removes the frame. Requests are ordered, bounded and deduplicated by request ID;
mutations acknowledge transaction completion. See contract §§2.2–2.5.

## Sessions and displays

One session exists per app id per shell document; each display copy is a separate view.
Different tabs have separate sessions/owners and share only persistent data. Baked apps
can share module state; isolated documents use `os.session` and `os.storage` instead.
Revisioned snapshot/watch subscriptions prevent hydration gaps. Unshared component state
stays local. A split collapse replaces views within the session.

Ownership is sticky until revocation, not transferred by folding or visibility. The
host checks epochs on owner-only methods; nonowners send acknowledged commands. This
promises at most one designated owner per session, not exactly-once network effects or
uninterrupted audio. Hidden timers and user activation remain browser constraints.

Both display roots attach before sandbox documents load. Folding updates existing views,
not frame parents or document URLs. The renderer keeps open panels live, clipped, blurred
and darkened; the bake draws the shell. `os.view` provides display, placement, box size,
visibility, activity, focus and angle. Layout should follow the box; a split half is as
narrow as the cover. Visibility derives from render-loop state and sleep, not angle alone.

`os.device.on(type, cb)` hears volume, Camera Control and the side button, the phone's
pose and the read-only switches. A button press goes to the first watching view that is
visible and active. Volume and Camera Control are then taken from the system; the side
button and the side+volume chord never are. See contract §3.8.

## Persistence and lifecycle

IndexedDB is launch/data authority. Per-app locks and cross-tab leases coordinate durable
transitions; BroadcastChannel only invalidates cached observations. Staging preserves
running generations. Activation, restoration and removal retire launch authority;
reinstall cannot revive old writers. First-boot seed/migration markers survive removal.
See [updates](updates.md) and contract §4 for checkpoint, rollback and cleanup rules.

The SDK exposes app-id `open` and session `home`; Escape is forwarded explicitly because
iframe keyboard events do not bubble to the shell. A custom `duo://` scheme remains
roadmap work. Existing trusted components retain their legacy adapter.
