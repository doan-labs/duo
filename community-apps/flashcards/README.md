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

The library lives in bounded records under the platform's per-key limit, not
one big document: a `meta` index lists each deck with its chunk count,
`deck.<id>.<i>` records hold cards in shards that each stay under the limit,
`review.<id>` heads plus `queue.<id>.<i>` shards keep paused reviews,
and `activity` holds the bounded history (newest 500) and per-day grade
counters. Every record is measured in UTF-8 bytes of the exact string written,
so a collection that outgrew the old single 256 KiB document keeps saving.
Writes run content-first, index-last, deletes-last inside one serialized
batch, so an interrupted save can leave an orphaned shard or a stale index
but never an index pointing at a chunk that was not committed; the next save
or launch reconciles and sweeps. Saves report honestly (hydrating, saving,
ready, error in the footer), a rejected write keeps the editor open with the
draft intact, and a queued older value can never overwrite a newer edit.

The previous single `library` document migrates on first launch: its cards,
scheduling, history, daily counters and every paused review are rewritten
into the shard layout, and the old document is deleted only after the new
index commits, so a failed migration simply retries next launch instead of
dropping data. If the committed index ever references a missing shard the
app surfaces an error rather than sealing the loss behind a fresh index.

Remaining honest limits: one card still must fit a single record (~256 KiB of
text), the deck index itself caps around two thousand decks, the review
history keeps the newest 500 grades, and everything lives under the
platform's 5 MiB total app storage quota. Hitting any of them reports the
failure instead of silently dropping content.

Pane navigation and the open editor draft live in `os.session`: they follow
the fold but reset on a cold launch, at which point a paused review re-opens
automatically. Daily counts are stored per day rather than read back from
history, so the capped history can never shrink what "reviewed today"
reports. Both display copies watch the same records and converge on writes
from either side.

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
bun storage.test.ts                        # sharded-storage tests
```

Verified: `bun check`, `bun build`, `bun cards.test.ts` (scheduler math, due
queue ordering, review flow, deletes, serialization round-trip),
`bun storage.test.ts` (a >256 KiB library with multibyte text, a deck split
across shards, index and record bounds, save + grade + relaunch equivalence,
legacy migration, injected write failures with safe retry, stale-write
ordering and two live display copies), and manual exercise of the full
create/edit/review/delete loop in the simulator on the cover display and
the wide inner layout.
