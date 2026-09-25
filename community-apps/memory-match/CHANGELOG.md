# Changelog

## 1.1.0

- Redesigned with a dark arcade look on UI kit token scales.
- Split the deck logic into `game.ts` and the styles into `styles.ts`.
- Added reduced-motion-gated animations: card flip, match pulse, mismatch shake, and a board-cleared celebration.
- Rebuilt the layout on `useWide`: stats and New game sit beside the board on the inner display and stack on the cover.
- Persisted a best (fewest moves) score through `os.storage`.
- Synced the live board through `os.session`, so folding to the other display continues the identical shuffle.

## 1.0.1

- Built against UI kit 1.0.0 token names.

## 1.0.0

- Added a twelve-card memory matching game.
- Added move tracking and a compact cover-friendly board.
