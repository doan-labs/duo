# Changelog

## 1.0.0

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
