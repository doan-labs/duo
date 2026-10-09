# Changelog

## 1.0.1

- A copy that fails to open now recovers instead of sitting on a blank
  screen: a settled failed seed or a failed storage hydrate shows a legible
  "Could not open your puzzle" state on both displays, and a quiet
  "Opening" line while a load is still in flight. Retry stays hidden while
  a seed attempt is pending or queued.
- Retry remounts the copy, resubscribing the storage mirrors and re-reading
  authoritative entries, so a saved library can never be replaced by a fresh
  random game.
- A proven pre-apply read failure re-derives the seed automatically, bounded
  to two attempts. A dead generation or an ambiguous commit outcome is
  terminal for that copy: no automatic or manual retry is offered in the
  same session, only Close and reopen.

## 1.0.0

- First release: three original SVG illustrations (Harbour Dawn, Alpine
  Meadow, Lantern Night) at 12, 24 and 48 pieces, each config saved
  separately with resume.
- Interlocking piece geometry from a seeded shared-edge grid: neighbours are
  complementary by construction, drawn as clipped art slices.
- Full play on the cover display via Board/Pieces switching and
  tap-select/tap-place; the inner display shows board and tray together with
  drag-and-drop onto the board or back to the rail.
- Snap placement with a live target preview, tray filters (all, corners,
  edges), picture guide toggle, pan/pinch/wheel zoom with a fit control, and
  keyboard placement (arrows nudge, Enter drops, Backspace returns).
- Soft lift/drop/snap/complete cues from a WebAudio synth with a persisted
  mute; destructive reset asks first; completion detection raises the result
  card; shared session state carries the game across a fold and os.storage
  keeps it across relaunches.
