# Flappy Duo

A Flappy Bird clone for the iPhone Duo. The player character is the Duo itself; each tap folds the two halves as a flap. Obstacles are glass slabs with labels. Score increases by one per slab passed.

## Gameplay

- Tap, click or press Space, ArrowUp or W to fold.
- Folds are counted per run and for the lifetime of the install against a 200,000-fold hinge rating.
- Difficulty steps at 3, 6, 9 and 13 points: slab gaps oscillate vertically, a periodic blur filter is applied to the scene, notification banners are drawn over the play area, and scroll speed increases by 30%.
- Every fifth slab shows a cartoon head above the gap and a quote toast when passed.
- Death shows a Hinge Failure dialog with score, best, medal tier, and two actions: restart, or buy another Duo.
- Buy another opens a payment sheet. While it is open the app claims the frame side button (`os.sideButton`); a double-click confirms instead of opening Wallet. The purchase adds $2,399 to a persisted total and shows a notification.

## Platform integration

- `os.storage` persists best score, lifetime folds and money spent.
- `os.widget.set('small', …)` publishes best score, money spent and hinge wear.
- `os.home()` is available from the dialog.
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
