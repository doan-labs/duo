# Changelog

## 1.1.0

- Redesigned the app: dark arcade look with gradient tile faces, glass score
  chips, an inset board well, a d-pad tray, and a settled board overlay for
  win and game over.
- Board state now syncs through session storage, so folding the phone hands
  the same game to the other display.
- Fixed "won" firing again on moves made while a 2048 tile was already on
  the board; the game-over test now reads settled tile values.
- Bottom padding clears the home indicator; the New game button no longer
  sits under it.

## 1.0.4

- Built against UI kit 1.0.0 token names.

## 1.0.3

- Both merging tiles now glide into the target cell; the merged value appears on arrival.

## 1.0.2

- Added responsive tile reveals, press feedback, and a gentle game-state transition.

## 1.0.1

- Constrained the board, controls, and game-over message to the active display.

## 1.0.0

- Added the 2048 puzzle with swipe, keyboard, and on-screen controls.
- Added responsive layouts for the inner and cover displays.
