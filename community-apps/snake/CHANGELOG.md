# Changelog

## 1.2.2

- Fixed the food dot rendering at the board's corner instead of its cell: the pulse animation overrode the translate used for placement, so the point could never be reached.
- Fixed instant self-collision from quick turns: steering input now queues one turn per tick instead of applying a reversal mid-tick.

## 1.2.1

- Built against UI kit 1.0.0 token names.

## 1.2.0

- Made the folded Duo mark the animated snake head using the exact product-icon geometry.
- Added a calm breathing glow and reduced-motion fallback to the logo character.

## 1.1.0

- Added smooth snake movement, a breathing food animation, score feedback and a polished game-over state.
- Added swipe steering, focus states and reduced-motion fallbacks for both displays.

## 1.0.1

- Constrained the board, controls, and game-over message to the active display.

## 1.0.0

- Added a touch-friendly Snake game with keyboard support.
- Added responsive layouts for the inner and cover displays.
