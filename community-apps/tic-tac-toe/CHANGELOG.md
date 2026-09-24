# Changelog

## 1.1.0

- Redesigned the app: dark arcade look with glass score chips, an inset
  board well, glowing X and O marks, and a floating result card that clears
  the home indicator.
- Rebuilt the layout on `useWide`: on wide boxes the controls sit on a rail
  beside the board; on the cover they stack under it.
- Added a mark pop, a board-in entrance, a win-line reveal, and a reset
  transition; every animation is one-shot, composited, and gated behind
  reduced-motion.
- Live game state (board, turn, scores) now syncs through session storage,
  so folding the phone hands the same in-progress match to the other
  display. The win tally stays persisted across launches.
- Split the source into game.ts (pure logic and wire helpers), styles.ts
  (StyleX on the UI kit token scales), and main.tsx (wiring).

## 1.0.1

- Built against UI kit 1.0.0 token names.

## 1.0.0

- Added a two-player Tic-Tac-Toe board.
- Added round reset and persistent win tracking.
