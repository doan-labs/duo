# SDK

Private SDK at 0.0.0. `legacy.ts` remains the host-only API for baked apps.
The sandbox API exports `os` from `index.ts` and the async `useKV` adapter from
`react.ts`. The shell host is integrated under `packages/shell/runtime/`;
verification is recorded in `docs/platform/progress/stage-2.md`.

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
