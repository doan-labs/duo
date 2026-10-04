# Nonogram

Picture logic puzzles: ink the cells the row and column clues describe and the
hidden image appears. Ten original puzzles ship with the app - five gentle
5 x 5 boards and five 10 x 10 boards - and every one is verified by the solver
in `game.ts` to have exactly one solution, so each board is solvable by logic
alone.

## How to play

- Pick a puzzle from the list. `Puzzles` returns to the list at any time.
- Choose a tool: `Fill` inks a square, `Mark` places an X on a square you know
  is empty, `Erase` clears. Tools toggle: Fill on an inked cell un-inks it.
- Drag across cells to apply the tool in one stroke; a stroke is one undo step.
- `Undo` rolls back a stroke (or a clear), `Clear` asks once and then empties
  the board - still undoable. Keyboard: arrows move, Space applies, 1/2/3
  switch tools, Ctrl/Cmd+Z undoes.
- The clock starts on the first mark and stops when the board matches the
  picture. Solves and best times are recorded per puzzle and survive
  relaunches; folding the phone moves the board, tool and undo history to the
  other display.

## Files

- `game.ts` - clue generation, the uniqueness solver, cell/undo rules and the
  session and storage wire shapes. No React and no SDK.
- `puzzles.ts` - the curated pack. Rows are `#` for ink and `.` for blank.
- `main.tsx` - the app: shared session state, durable saves, board and rail.
- `styles.ts` - StyleX styles built on the kit's tokens and themes.

## Verification

```sh
bun game.test.ts          # logic checks (also runs under bun test)
bun run check             # manifest, token gate, strict typecheck, build
```

Screenshots in `screenshots/` are captured from the dev preview on both
displays.
