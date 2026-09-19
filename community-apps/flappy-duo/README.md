# Flappy Duo

A Flappy Bird clone for the iPhone Duo. The player character is the Duo itself; each tap folds the two halves as a flap. Obstacles are glass slabs with labels. Score increases by one per slab passed.

## Gameplay

- Tap, click or press Space, ArrowUp or W to fold.
- Folds are counted per run and shown in the HUD.
- Difficulty is keyed to the game number within the session and the score. Game 1 at 2 points: slab gaps oscillate. Game 2: a periodic blur filter from 1 point, notification banners from 3. Game 3: every other slab snaps shut as the phone approaches from 1 point, scroll speed rises 30% from 4, and labelled accessories are thrown from the right edge from 1 point. Each game after the first also narrows the gap and adds 5% speed, capped at 35%.
- Death shows a Hinge Failure dialog with score, best and medal tier.
- The only way out of the dialog is Buy another, which opens a payment sheet. While it is open the app claims the frame side button (`os.sideButton`); a double-click confirms instead of opening Wallet. The price starts at $2,399 and rises 25% per game, rounded to end in 99. The purchase adds it to a persisted total and shows a notification with the sender avatar: Tim Cook after the first purchase, John Ternus after the second, Apple after the third. Later purchases show none.

## Platform integration

- `os.storage` persists best score and money spent.
- `os.widget.set('small', …)` publishes best score and money spent.
- `os.sideButton.claim()` while the payment sheet is open; `onDouble` confirms the purchase, `release()` on close.
- Renders on both the inner and cover displays via `useDisplay()`.

## Source layout

- `main.tsx`: React component, game loop, input, storage and widget calls.
- `world.ts`: simulation (`newWorld`, `step`, `flap`).
- `draw.ts`: canvas rendering.
- `config.ts`: types, tuning constants and copy.
- `audio.ts`: Web Audio cues.
- `styles.ts`: StyleX styles.

No assets or third-party dependencies beyond the platform packages.
