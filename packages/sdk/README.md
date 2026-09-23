# SDK

Private SDK at 0.0.0. `legacy.ts` remains the host-only API for baked apps.
The sandbox API exports `os` from `index.ts` and the async `useKV` adapter from
`react.ts`. The shell host is integrated under `packages/shell/runtime/`;
verification scope and reproduction are documented in `docs/platform/review.md`.

The host must satisfy the full caret range of the exact SDK version recorded
in the app release. While 0.x, every published SDK version is its own host
contract and a host bump requires a shell release. Prereleases are accepted
only in development. Protocol version and SDK version are separate checks.

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
size and hinge angle. Ownership stays with the first view across folding;
`os.onOwner` reports handover if that view closes. Session storage is shared
between an app's views and persistent storage is private to its app id.

Commands resolve after the owner callback acknowledges. Internally the ordered
request acknowledges admission first, then a separate command-result event
settles the SDK promise; this allows owner callbacks to await storage safely.

Camera/microphone declarations are rejected and frame policy always denies
them. Other permission adapters remain, but external developer catalogs accept
no device permissions at the MVP gate. This is not a claim of full browser or
native support for the broader permission roadmap.
