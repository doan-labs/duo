# Changelog

## 1.0.0

- Named trips with start/end date ranges, statuses computed from real dates,
  and a stat overview (days, stops, legs, stays, packing progress).
- Ordered day-by-day stops on a timeline with optional time, address and
  notes; add, edit, delete with confirmation, Arrange-mode reorder, and a
  "Later" lane for unscheduled ideas.
- Editable travel legs (flight, train, drive, bus, ferry, walk, other) with
  route, date, departure/arrival times and reference, plus stays with
  check-in/check-out validation.
- Packing checklist with progress bar, one-tap clear-packed and undo.
- Per-stop inspector: cover pushes a full detail page, inner shows a glass
  rail with stop details or the trip overview.
- Editor drafts, selection, undo and mute preference survive folds and
  relaunches; deletes offer an 8 second undo on both displays.
- Quiet action cues (check, save, delete, undo, error) with a persisted mute
  toggle, unlocked on first gesture and silent when audio is unavailable.
- Light and dark themes, reduced-motion support, roving-arrow day chips and
  44pt targets throughout.
- Ordered storage commits with no reads, no rollback and no app-level
  retry: record writes land first, then retained tomb markers, then the
  index - a peer edit landing mid-commit is preserved (orphan recovery),
  never erased by old work. Each planned write is issued once (the SDK
  owns same-request-ID timeout retry; re-sending a payload as a new
  request could clobber a peer's confirmed edit). Refusals report
  'missed'; timeouts/closes/transport failures report 'unknown', so a
  commit resolves 'applied', 'failed' (provably nothing landed) or
  'partial' (landed or ambiguous data preserved, honestly reported).
  Records are never deleted; tombs are ~16 bytes each but retained per
  historical delete - the platform quota, not the trip cap, is the bound.
  Nothing accepted silently vanishes across a fold or a storage outage,
  and an acknowledged delete can never resurrect.
