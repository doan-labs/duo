# Changelog

## 1.0.0

- Initial release.
- Canvas 2D game loop with the Duo as the player character; obstacles are labelled glass slabs.
- Per-run and lifetime fold counters; best score, folds and money spent persisted via `os.storage`.
- Difficulty steps at 3, 6, 9 and 13 points: oscillating gaps, periodic blur, notification banners, 30% speed increase.
- Cartoon cameo on every fifth slab with a toast on pass.
- Game-over dialog with score, best and medal tier; restart and purchase actions.
- Payment sheet confirmed by a double-click of the frame side button, claimed through the SDK while the sheet is open; adds $2,399 to the spent total and shows a notification.
- Small home-screen widget via `os.widget.set`.
- Synthesised flap, score, crash and payment cues via Web Audio.
- Supports the inner and cover displays.
