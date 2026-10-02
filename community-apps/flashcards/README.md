# Flashcards

A small spaced-repetition app for the Duo. Create named decks, add front/back
cards, and work through a daily review queue. It starts empty: the first screen
offers to create your first deck, and there is no bundled dataset, no account
and no network use.

## What it does

- **Decks**: create, rename and delete named decks. Each deck lists its cards
  with an honest due count.
- **Cards**: add, edit and delete front/back cards. Card text wraps naturally
  and keeps your line breaks.
- **Review**: tap the card to reveal the answer, then grade yourself Again,
  Good or Easy. Each button shows the exact interval it will schedule, so the
  choice is never a surprise. `Again` sends the card out for its 10 minute
  relearn delay: it leaves the session and becomes available for a subsequent
  review once it is actually due. A session serves the queue captured when it
  started; cards that become due while it is open wait for the next review.
- **Scheduling**: a deterministic SM-2 variant (see below). Due times are
  absolute instants, so a timezone change can shift the "reviewed today"
  counter's window but can never make a graded card come back early or late.
- **Counts**: "N due" and per-deck due badges are computed live from card due
  times, and "N reviewed today" is a stored per-day grade counter, so a capped
  history can never shrink it. An open review works through the queue it
  captured at start, which is why its remaining count can differ from the
  live due number.
- **Pause anywhere**: each deck keeps its own review session - how far
  through its queue you are persists across folding the phone or closing and
  relaunching the app, and starting another deck's review never erases it.
  A deck that gains a paused review shows a resume row on the decks list.

## Scheduling

Every card stores `due` (epoch ms), `interval`, `ease`, `reps`, `reviews` and a
`lastReview` instant. Grading applies:

| Grade | Effect |
| --- | --- |
| Again | due = now + 10 min, reps reset to 0, ease - 0.2 (floor 1.3) |
| Good  | first review: +1 day, second: +6 days, then interval x ease |
| Easy  | first review: +4 days, ease + 0.15, then interval x ease x 1.3 |

Intervals cap at 365 days. Every grade appends a review event (card, deck,
grade, instant, resulting interval) to a bounded history (newest 500).

## Persistence

The whole library (decks, cards, history, per-deck review sessions and daily
grade counts) is one JSON document in `os.storage`, so a fold or relaunch
restores everything, including mid-card reveal state. Pane navigation and the
open editor draft live in `os.session`: they follow the fold but reset on a
cold launch, at which point a paused review re-opens automatically. Daily
counts are stored per day rather than read back from history, so the capped
history can never shrink what "reviewed today" reports.

## Layout

The 387 pt cover shows one pane at a time (decks, deck, review) with an iOS
push transition. At wider sizes the app splits into a deck browser rail plus a
detail pane showing the selected deck, the live review, or a due overview when
nothing is selected. Reduced-motion is honoured for every animation.

## Development

```sh
bun ../../packages/cli/index.mjs check .   # manifest, imports, typecheck, tokens
bun ../../packages/cli/index.mjs build .   # dist bundle, <4 MiB
bun cards.test.ts                          # scheduler/state tests
```

Verified: `bun check`, `bun build`, `bun cards.test.ts` (scheduler math, due
queue ordering, review flow, deletes, serialization round-trip), and manual
exercise of the full create/edit/review/delete loop in the simulator on the
cover display and the wide inner layout.
