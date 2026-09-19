# Changelog

## 1.0.0

- Initial release.
- Canvas 2D game loop with the Duo as the player character; obstacles are labelled glass slabs.
- Per-run fold counter; best score and money spent persisted via `os.storage`.
- Difficulty keyed to game number and score: oscillating gaps, periodic blur, notification banners, slabs that snap shut, thrown accessories, speed increase; each game narrows the gap and adds speed.
- Game-over dialog with score, best and medal tier; the only action is the purchase.
- Payment sheet confirmed by a double-click of the frame side button, claimed through the SDK while the sheet is open. A glow marks the button position; confirmation runs processing, an animated check and a dismiss transition, then adds the price to the spent total and shows a notification with avatar from Tim Cook, John Ternus or Apple on purchases two to four only. The price rises 25% per game from $2,399.
- Small home-screen widget via `os.widget.set`.
- Synthesised flap, score, crash and payment cues via Web Audio.
- Supports the inner and cover displays.
