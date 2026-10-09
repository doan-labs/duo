# Changelog

## 1.0.0

- Every persistence write is conditioned on the storage space's own
  revision and generation (SDK 0.1 entry/set/del): the library merge, the
  session doc mirror and preferences all re-read and rebase their intent on
  E_CONFLICT instead of letting a stale whole-doc payload land
  last-writer-wins, and report E_GONE as a terminal refusal. A timed-out
  write reads back exactly once: byte-equal evidence reports applied and
  any other stored value reports 'unknown' - the unresolved outcome is
  never resolved by replaying the request, so a peer's confirmed-later
  commit can never be overwritten by a stale intent's second flight.
  A failed read is still 'unknown', never an implied-empty library to
  seed over. Stored plan versions are a strict commit order: an
  equal-version fork (two copies editing one plan in a millisecond) is a
  second commit that binds one past the stored stamp, while a cached
  union, a timed-out re-entry or a repair re-offer of a frozen snapshot
  can never erase an acknowledged peer's equal-stamp commit.
- The width callout now pins to the room's top edge in canvas space and
  clamps below the zoom dock, so it can never slide under the dock's chrome
  on either display or theme.
- Plan deletes carry an incarnation tombstone: a peer still holding the
  deleted layout moves to a surviving plan (or one shared recovery layout)
  instead of editing a ghost whose next save would resurrect it, and stale
  callbacks/mirrors of the dead incarnation are declined. Same-id
  recreations born after the delete survive legitimately.
- Initial release: scaled floor planning with a 16-piece catalogue, drag,
  rotate and snap, wall-gap measurements, issue flags, undo/redo, named
  layouts, metric/imperial units, quiet cues and dual-display sync.
