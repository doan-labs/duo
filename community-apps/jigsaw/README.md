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
  flags.
- Gestures that outlive their admission bind to the puzzle they were aimed
  at (`gameKeyOf` - art, count and seed): if a different puzzle is live when
  the step runs, the intent is dropped rather than applied to a piece index
  in another game.
- First boot seeds inside the queued step, after the confirmed reads: a peer
  that already seeded or saved wins by adoption, never by being overwritten.
- `queue.ts` keeps the serial chain alive after a failed step; a step that
  genuinely never settles only delays later writes - do not add timeouts or
  reload workarounds on top of it.

## Verification

```sh
bun game.test.ts          # logic checks (also runs under bun test)
bun run check             # manifest, token gate, strict typecheck, build
```

Screenshots in `screenshots/` are captured from the dev preview on both
displays.
