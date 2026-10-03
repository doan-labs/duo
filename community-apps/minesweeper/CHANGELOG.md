# Changelog

## 1.0.0

- Added classic Minesweeper on three cover-friendly boards: Easy 9x9,
  Medium 12x12 and Hard 16x16, all sized to fit the square well.
- First reveal is always safe and always opens a region: mines are placed
  only after the first tap, outside that cell and its neighbours.
- Added flag mode as an explicit toggle button, with right-click and
  touch long-press as the mouse/keyboard alternatives.
- Added a mine counter, a running timer derived from shared timestamps,
  win/loss reveal and restart, plus per-preset plays, wins and best times.
- The running board, flags, status and clock persist in app storage, so a
  fold mid-game hands the identical board to the other display and a
  relaunch resumes it; flag mode mirrors through the session.
- Added a wide layout: difficulty, controls, per-preset stats and the hint
  sit in a rail beside a larger board on the inner display.
- Keyboard play: arrows move the focused cell, Enter/Space opens, F flags,
  G toggles flag mode, R/N starts a new game.
