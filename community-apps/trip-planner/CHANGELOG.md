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
- Ordered, repairable storage commits: record writes land before the index
  and the index before tomb markers, which are retained permanently -
  records are never deleted, so old cleanup can never erase a restored
  same-id trip behind a stale read. Already-applied keys are restored on
  failure with honest applied/failed/partial terminals - nothing accepted
  silently vanishes across a fold or a storage outage, and an acknowledged
  delete can never resurrect.
