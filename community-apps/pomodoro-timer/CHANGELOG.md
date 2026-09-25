# Changelog

## 1.1.0

- Fixed the countdown tick: the phase flip no longer hides inside a `setSeconds` updater. The timer now runs off a single end timestamp, so focus-to-break rollovers are deterministic under StrictMode and concurrent rendering.
- Rebuilt the layout on `useWide`: the inner display puts the controls beside the timer card, the cover stacks them clear of the home bar.
- Restyled on the UI kit token scales (radius, shadow, easing, space, typeScale, weight, tracking, leading, glass) in the dark arcade look, with `cardIn`/`modeIn` motion gated behind `prefers-reduced-motion`.
- Split the single file into `main.tsx`, `timer.ts` and `styles.ts`.
- Made the fold sync real: mode, running state and the countdown itself publish through `os.session`, so folding mid-block continues the same timer on the other display.

## 1.0.1

- Built against UI kit 1.0.0 token names.

## 1.0.0

- Added a fold-aware Pomodoro focus and break timer.
- Added a large inner-display timeline and compact cover controls.
