# SDK

Private SDK at 0.1.0. `legacy.ts` remains the host-only API for baked apps.
The sandbox API exports `os` from `index.ts` and the async `useKV` adapter from
`react.ts`. The shell host is integrated under `packages/shell/runtime/`;
verification scope and reproduction are documented in `docs/platform/review.md`.

The host must satisfy the full caret range of the exact SDK version recorded
in the app release. While 0.x, every published SDK version is its own host
contract and a host bump requires a shell release. Prereleases are accepted
only in development. Protocol version and SDK version are separate checks.
This host additionally declares audited legacy contracts as profiles
(`HOST_PROFILES` = 0.0.0): a profiled bundle launches against its own
contract exactly, so `entry`/`expect` requests from it are refused
`E_UNSUPPORTED` rather than silently falling back to unconditional writes.

Call `await os.connect()` before rendering, then `os.ready()` after the first
frame. Storage is asynchronous and strings-only. Snapshot and watch revisions
prevent hydration gaps. `useKV` keeps edits made during hydration, serializes
writes, and exposes hydrating/ready/saving/error states. A timeout does not
prove a write failed: the client retries a mutation once using the same
request ID, then the app must read back before starting a new operation.

`useJSON(space, key, fallback)` is `useKV` for a key holding JSON: it parses on
read, stringifies on write and keeps every other field, so the state is still
there. `fallback` stands in until something is written, which is what a fresh
install looks like, so an app seeds itself in one place rather than at each
call site. Storage stays strings-only; this is the encoding, not a new type.

`os.storage.entry(k)` returns `{ v, rev, gen }` read atomically with the
space's revision and app generation. Pass that token as `expect` to
`set`/`del` to make the write conditional: the host checks it inside the
write's own transaction next to the authority and quota checks, and rejects
with `E_CONFLICT` when the space moved since the read - a stale copy's write
can no longer erase a newer committed value, and a conflict mutates nothing.
`rev` counts every write in the space, not just the key read, so a sibling
key conflicts too, and `gen` keeps a pre-restore token dead even when a
restore regresses `rev`. Recover by reading `entry()` again, recomputing
from that value and retrying with the fresh token; never resend a stale
whole-document write. `useKV`, `cell` and `KVMirror.write` stay optimistic
fire-and-forget: they carry no durable ack and are not the conditional path.
Conditional updates call `os.storage` directly.

`transition(fn)` runs `fn` inside a same-document view transition, so the
screen cross-fades to whatever it changes; it is a plain call where the API
is missing or motion is reduced. `useKV` already applies it to changes that
arrive from the other display or another view, so a stored selection swaps
smoothly with no app code. Wrap an app's own big swaps (a city pick, a page
change) the same way; leave per-keystroke writes alone.

Migration convention: keep a `schema` key in app storage, migrate forward,
tolerate unknown keys, and finish migration before calling ready. The host
delivers migration context only to the designated owner.

`os.view` and `os.onView` expose actual display, placement, visibility, focus,
size and hinge angle. Changes to display, placement, visibility, activity and
focus reach subscribers on receipt - never gated on a repaint callback or a
throttled timer, so a folded-away view still hears a hide immediately. Size and
angle updates coalesce to once per animation frame, with a short bounded delay
when frames never run - never trust a cached copy over `os.view` for gating work.
Ownership stays with the first view across folding;
`os.onOwner` reports handover if that view closes. Session storage is shared
between an app's views and persistent storage is private to its app id.

Commands resolve after the owner callback acknowledges. Internally the ordered
request acknowledges admission first, then a separate command-result event
settles the SDK promise; this allows owner callbacks to await storage safely.

`os.device.on(type, cb)` hears the hardware and returns the unsubscribe: `volume`
and `camera-control` (taken from the system while a visible, active view listens),
`side` (heard, never taken), and the states `orientation` (`{ yaw, hinge }`) and read-only
`switches`, which deliver their current value first. Only watched types cross the bridge.

`os.notify.post({ title, body, arg })` posts an OS notification, ungated like
`os.open`: a banner over whatever is showing, then a card in Notification Center
on the lock screen. A tap unlocks and opens the app with `arg`, delivered to a
running session like a launch arg. `os.notify.clear(id?)` removes this app's own
cards. The center is in-memory; a reload clears it.

Camera/microphone declarations are rejected and frame policy always denies
them. Other permission adapters remain, but external developer catalogs accept
no device permissions at the MVP gate. This is not a claim of full browser or
native support for the broader permission roadmap.
