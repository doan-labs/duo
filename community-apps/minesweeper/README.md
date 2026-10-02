# Minesweeper

Classic Minesweeper for Duo: open cells, flag mines, clear the field. The first
tap is always safe - mines are placed after it, outside the tapped cell and its
neighbours, so a region always opens. Zero cells flood open, numbers count the
mines around them, and a wrong flag can cost the game when you chord.

Three square boards fit the cover without panning: Easy 9x9 with 10 mines,
Medium 12x12 with 24, Hard 16x16 with 40. Boards are honest - no "no-guess"
claims: later guesses are part of the game.

## Playing

- Tap a cell to open it. A number counts the mines it touches; an empty cell
  floods open until numbers stop it.
- Tap an open number whose neighbours are already flagged (a chord) to open
  the rest at once.
- Tap mode is a segmented control: Reveal or Flag is always visible, never a
  hidden toggle. On a mouse, right-click flags directly; on touch, a 400 ms
  long-press flags too.
- Keyboard: arrows move the focus, Enter/Space opens, F flags the focused
  cell, G toggles flag mode, R/N asks for a new game.
- A board with opened or flagged cells is never silently discarded: New game,
  a different difficulty or R/N first asks "Discard this board?" with explicit
  Cancel and labelled start actions; Escape also cancels. Re-picking the
  current difficulty is a no-op, and after a win or loss replay is direct.
- The counter shows mines minus flags and the clock starts on the first
  reveal. Winning auto-flags every remaining mine; losing reveals the field
  and slashes the flags that were wrong.
- Cell size is a grid constraint, not a choice: a 16x16 board cannot give each
  cell the 44 pt touch target the surrounding buttons keep, so precision comes
  from the roving arrow-key focus, F/G/R/N shortcuts and the long-press.

## Persistence

The running board (cells, flags, timer timestamps and status) is written to
app storage on every change, so folding the phone hands the identical game to
the other display and relaunching resumes it. Flag mode lives in session
storage, so it follows a fold but resets on a fresh launch. Per-preset plays,
wins and best times persist in storage; each display renders the clock from
the shared timestamps, so the hidden copy runs no timer of its own.

## Verification

- `bun test community-apps/minesweeper` - 15 unit tests covering first-tap
  safety, mine counts, neighbour counts, flood reveal, flags, chords,
  win/loss, serialization round-trips and the timestamp clock.
- `bun packages/cli/index.mjs check community-apps/minesweeper` - manifest,
  source, design-token and strict typecheck gates.
- `bun packages/cli/index.mjs build community-apps/minesweeper` - bundle well
  under the 4 MiB cap.
- `bun scripts/check-app-tokens.ts` - zero design literals.
- `bun scripts/check-platform.ts` - platform contract checks.
- `bun scripts/check-submissions.ts community-apps/minesweeper` - required
  files, registry entry and screenshots.
