# Changelog

## 1.0.0

- First release: ten original puzzles (five 5 x 5, five 10 x 10), each verified
  to have exactly one solution by the solver in game.ts.
- Fill, mark and erase tools with drag strokes, a per-stroke undo stack, an
  undoable two-tap clear, and keyboard play (arrows move, Space applies,
  1/2/3 switch tools, Ctrl/Cmd+Z undoes).
- Puzzle picker with live progress and per-puzzle stats: solves and best time,
  persisted across relaunches through os.storage.
- Cover-first layout; the wide layout adds a side rail with stats. Shared
  session state keeps both displays on the same board through a fold.
- Adaptive light and dark themes via the device switches, solved banner with
  replay/next, reduced-motion aware animations.
