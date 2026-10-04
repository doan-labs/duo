# Block Drop

A polished falling-block game for Duo: stack the seven tetrominoes, clear lines,
chase a best score that survives relaunches and folds.

## Play

- Falling pieces move, rotate (both ways), soft-drop and hard-drop onto the stack.
- A ghost outline shows where the piece lands; the queue previews three pieces
  ahead, and Hold stashes a piece once per drop - a lock opens it again.
- Score follows the classic ramp (40/100/300/1200 x level), combos add 50 a
  streak, soft drops +1 and hard drops +2 per row. Every ten lines raises the
  level and the fall speed.
- Pause and resume any time; top out ends the run and offers a rematch.

## Controls

- Keyboard: Left/Right move, Up/W/X rotates, Z counter-rotates, Down/S soft-drops,
  Space hard-drops, C or Shift holds, P or Esc pauses, Enter starts or restarts.
- Touch: tap the field to rotate, drag sideways to move with the finger, drag
  down to soft-drop, flick down fast to hard-drop, tap the Hold panel to stash.
- Cover: a five-button control row under the field, plus the tappable Hold box.
- Unfolded: the field sits beside the rail - hold, next three, live stats and a
  comfortable control cluster.

## Duo behavior

- The whole game lives in one `os.session` key, so the display that is not
  driving still draws the same field. Only the `view.active` copy runs the
  gravity interval - no duplicate timers, no double falls across a fold.
- Losing the active display mid-run pauses the game instead of dropping pieces
  into a screen nobody can see; folding, parking and tab-hiding all land there.
- `os.storage` checkpoints the run on every lock, pause and top-out, plus the
  best score. Relaunching resumes paused at the last lock - never mid-fall.

## Structure

- `game.ts` - rules and wire format: pieces, rotation with kicks, gravity and
  lock grace, clears, scoring, hold, ghost, seeded bag RNG, save parsing.
- `board.tsx` - the playfield: settled blocks, ghost, falling piece, clear
  flash, score fly-up, drag gestures, hold/next minis.
- `main.tsx` - layout, session/storage sync, owner-only timer, input, overlays.
- `audio.ts` - synth cues, no assets.
- `styles.ts` - tokens-only StyleX.
