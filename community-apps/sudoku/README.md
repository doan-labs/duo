# Sudoku

Sudoku for Duo: a deterministic daily puzzle plus easy, medium and hard
free-play, with pencil marks, undo, honest hints and per-mode stats.

Tap a cell, then a digit on the pad. The pencil toggle jots candidates into a
cell instead of committing a digit; erase clears a cell, undo walks back one
move at a time, and hint fills the selected cell (or the most useful open one)
while explaining the deduction it used. Arrow keys move the selection on a
hardware keyboard, digits play, `n` toggles pencil, `z` undoes and
Backspace erases.

## Difficulty is generated, not labeled

Every puzzle is produced by the generator in `engine.ts` and graded by the
logical solver it ships with. An easy puzzle is one the solver finishes using
naked and hidden singles alone; medium admits naked pairs and locked
candidates; hard can require the solver to give up and fall back to search. A
puzzle only ships when it still has exactly one solution - each dug-out pair
of cells is kept only while uniqueness holds, so no removal is ever arbitrary.
The label on the card therefore describes measured solving technique, not a
random removal count. The daily puzzle is the same medium recipe seeded by
the date, so every player gets the same board on the same day.

## Layouts

On the cover the board fills the width above a one-row number pad and a
compact tool strip. On the inner display (`useWide`) the board sits beside a
rail with a 3x3 pad, the tool grid and live stats (cells to go, hints used,
best time per mode, puzzles solved). Both layouts follow the kit's light and
dark themes.

## Persistence

Four durable slots - daily, easy, medium, hard - plus played/solved counts and
best times live in `os.storage`, so progress survives a relaunch. The live
game (board, pencil notes, selection, undo stack and the clock) syncs through
`os.session`, so folding the phone hands the same position to the other
display without losing the selected cell or a half-jotted candidate.

## Verified

- `bun tests.ts` - solver correctness, solution uniqueness across seeds and
  difficulties, difficulty grading bands, legal moves, pencil marks, undo,
  completion detection, save adoption and stat parsing. This is the check run
  by `bun run test` here; it is self-contained because sandboxed app folders
  may not import `node:` or `bun:` modules.
- `bun run check`, `bun run build`, `bun run typecheck`,
  `bunx biome check`, `bun scripts/check-app-tokens.ts` and
  `bun scripts/check-submissions.ts community-apps/sudoku` from the repo root.

Fully offline: no permissions, no network origins.
