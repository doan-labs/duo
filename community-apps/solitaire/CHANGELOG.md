# Changelog

## 1.0.0

First release.

- Classic Klondike in Draw 1 or Draw 3: stock, waste, seven tableau columns
  and four foundations, with face-down reveals and kings-only empty columns.
- Tap-select, tap-destination play on both displays: lifted runs light their
  legal landings, illegal drops shake and explain, double-tap sends a card to
  its best home.
- Full undo one move at a time, honest hints that lift the best move, an
  Auto-finish that sweeps safe cards home, and a move counter with per-mode
  plays, wins and bests.
- Original vector card art drawn for this table, a staggered deal wave, 3D
  card flips, a winning foundation hop, and quiet synthesized card sounds with
  a persisted mute.
- The match - deal seed plus the complete move log - persists in `os.storage`:
  fold, relaunch or switch displays and the same table rebuilds, undo history
  included. A corrupt record is reported, never silently reset.
- New game and mode switches ask before abandoning a live deal; the sheet
  traps focus, inerts the table and returns focus on close.
