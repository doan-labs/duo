# Changelog

## 1.1.0

- Redesigned as a dark arcade cabinet: gradient tile faces with glow, an inset
  board well, a glass keyboard tray, and a turns chip in the header.
- Added motion: staggered per-tile flips on submit, a row shake for short
  words, a win bounce on the solving row, and tinted key transitions - all off
  under prefers-reduced-motion.
- The in-progress attempt (guesses, the half-typed row, status) now syncs
  through os.session, so folding the phone continues the same puzzle mid-guess
  on the other display; daily results still persist per day.
- Rebuilt the layout on useWide: side-by-side board and keyboard with larger
  keys on the wide display, a compact stack on the cover, and padding that
  clears the home indicator.
- Added physical keyboard support (letters, Enter, Backspace).

## 1.0.1

- Built against UI kit 1.0.0 token names.

## 1.0.0

- Added a six-guess daily Wordle-style puzzle.
- Added an on-screen keyboard and local daily progress.
