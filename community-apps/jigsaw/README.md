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
- `art.ts` - the three bundled illustrations as standalone SVG documents.
- `board.tsx` - the felt board (SVG pieces, pan/pinch/zoom, snap preview) and
  the tray rail.
- `audio.ts` - the cue synth.
- `main.tsx` - the app: shared session state, durable saves, sheets, veil.
- `game.test.ts` - logic checks over the rules and wire formats.
- `styles.ts` - StyleX styles built on the kit's tokens and themes.

## Verification

```sh
bun game.test.ts          # logic checks (also runs under bun test)
bun run check             # manifest, token gate, strict typecheck, build
```

Screenshots in `screenshots/` are captured from the dev preview on both
displays.
