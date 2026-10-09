# Jigsaw

Piece-assembly puzzles from three original SVG illustrations - Harbour Dawn,
Alpine Meadow and Lantern Night - at 12, 24 and 48 pieces. Every puzzle is
cut by a seeded shared-edge grid so neighbouring tabs and blanks complement
each other exactly, then shuffled into the tray.

## How to play

- Pick a picture and a piece count from the photo button. Each of the nine
  combinations saves separately, so an abandoned 48 is waiting when you come
  back.
- On the cover display, switch between `Board` and `Pieces`. Tap a piece to
  pick it up, then tap where it belongs; arrows nudge it and Enter drops it.
  On the inner display the board and tray sit side by side - drag pieces
  anywhere on the felt, or drag one back to the rail.
- A piece locks when its centre lands near its slot; the target outline glows
  when it will. `Corners` and `Edges` filters shrink the tray, the eye toggles
  the faint picture guide, and the dock zooms, pans and fits the board.
- `Start over` asks, then re-scatters the same cut. `Collect board pieces`
  sweeps loose pieces back to the tray. Sound cues mark lifts, drops, snaps
  and the finish; the speaker toggle is remembered.
- Folding the phone hands the running game to the other display; closing and
  reopening the app resumes where it stopped.

## Files

- `puzzle.ts` - edge grid, piece paths, placement/snap rules, filters and the
  session and storage wire shapes. No React and no SDK.
- `persist.ts` - the mutation pipeline: confirmed reads before every rebase,
  foreign adoption by revision, view admission and intent binding. No React.
- `queue.ts` - the serial write chain that survives a failed step.
- `art.ts` - the three bundled illustrations as standalone SVG documents.
- `board.tsx` - the felt board (SVG pieces, pan/pinch/zoom, snap preview) and
  the tray rail.
- `audio.ts` - the cue synth; `setAdmission` gates it on the live display.
- `main.tsx` - the app: shared session state, durable saves, sheets, veil.
- `game.test.ts` - logic checks over the rules, wire formats and the
  persistence adapter (failed reads, delayed dual-boot, admission).
- `styles.ts` - StyleX styles built on the kit's tokens and themes.

## Persistence rules

Two copies of this app run at once (one per display), so writes follow rules
that differ from a single-display app:

- A KV read that resolves `null` means the key is empty; a read that REJECTS
  means the settled state is unknown. `persist.ts` never writes from a
  rejected read - it fails the step instead, so a one-game library can never
  overwrite the other saved puzzles, and later mutations retry on their own
  confirmed reads. Do not add `.catch(() => null)` to store reads.
- New input (taps, drags, keys, sheet confirms, prefs) is admitted only while
  `os.view` reports the copy both `active` and `visible`; a hidden copy keeps
  hydrating and reconciling shared docs but drops gestures before they
  schedule work. Internal reconciliation (repair, boot seeding) is not input
  and never passes the gate. The clock and the audio path obey the same two
  flags. Callbacks that resolve later (sheet onClose, cancel/play, hover,
  the timer tick) re-read the synchronous `os.view` snapshot at fire time,
  not the admission captured when they were scheduled.
- Escape is consumed at the pre-connect guard while a sheet or a held piece
  is on top, so the SDK's later capture listener never forwards it to Home;
  with nothing open it stays unconsumed and parks the copy as designed.
- Gestures that outlive their admission bind to the puzzle they were aimed
  at (`gameKeyOf` - art, count, seed and incarnation): if a different puzzle
  is live when the step runs, the intent is dropped rather than applied to a
  piece index in another game. `resetGame` bumps the incarnation so intents
  and stale saves admitted before the reset die at the bind check instead of
  mutating the new puzzle - keep `gameKeyOf` on every bind.
- While a modal sheet is open, every mutation entry point (keyboard, tray
  and board pointer, held-piece callbacks) rejects: only Escape may act, and
  it closes the sheet at the pre-connect guard. Gate on `sheetRef.current`,
  not on visibility - a sheet is a modal even while fully visible.
- First boot seeds inside the queued step, after the confirmed reads: a peer
  that already seeded or saved wins by adoption, never by being overwritten.
- Repairs are heals, not blind writes: a stale foreign doc on the mirror
  queues `heal()`/`healSaves()`/`healPrefs()`, each re-reading its own doc
  first. A peer doc already at-or-past our clock is adopted and nothing is
  written; otherwise the heal commits a conditional write on the entry it
  just read and retries on a moved revision. A repair that wrote
  `clock + 1` straight off the mirror event regresses below whatever the
  peer just landed, and each regression re-wakes the peer's stale check -
  an endless cross-doc ping-pong.
- `queue.ts` keeps the serial chain alive after a failed step; a step that
  genuinely never settles only delays later writes - do not add timeouts or
  reload workarounds on top of it.
- The library is always a per-key union of the confirmed store doc and the
  accepted mirror (`unionGames`, newest incarnation then finished then
  moves), and adoption merges into the mirror (`mergedSaves`) instead of
  replacing it: pending games survive an equal-revision racer whose
  envelope wins the writer tie-break but lacks our exclusive keys.
- Every durable write is a CAS attempt: the step reads `entry()` (value +
  `{rev, gen}` token) of both spaces, commits the intent synchronously via
  `apply` (optimistic UI only), then lands `set(v, expect)` on each space.
  An `E_CONFLICT` means a peer committed inside our window - the step
  re-reads fresh entries, re-unions their facts, and re-runs the intent on
  the rebased base, never resubmitting the frozen doc. `E_GONE` means the
  generation that admitted the intent is dead - the step refuses. An
  `E_TIMEOUT` or other unknown failure is answered by a same-operation
  `entry()` readback: payload present means the write landed (resolve, no
  resubmit), absent means it never applied (fail honestly, durable
  untouched). Writes with no `expect` - and the fire-and-forget
  `useKV`/`KVMirror` setters - are not a durable acknowledgement and must
  never carry committed state.
- The tray count's denominator is `game.tray.length`, not the loose board
  count: felt pieces are not in the tray even with no filter applied.

## Verification

```sh
bun game.test.ts          # logic checks (also runs under bun test)
bun run check             # manifest, token gate, strict typecheck, build
```

Screenshots in `screenshots/` are captured from the dev preview on both
displays.
