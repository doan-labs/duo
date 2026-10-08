# Paper Fold

An origami coach for Duo. Six beginner models - Dart, Boat, Cup, Helmet,
Tulip and Balloon - each walked through with original flat diagrams in the
classic convention: dashed blue lines for valley folds, dash-dot orange for
mountain folds, green arrows for where the paper moves, and faint outlines
for where a flap lands.

## Using it

- Pick a model from the list. Back and Next step through the folds; Finish
  lands on a preview of the completed model.
- The cover shows one large diagram with its instruction. On the inner
  display the same diagram sits beside a steps overview you can tap to jump.
- ArrowLeft / ArrowRight also move between steps; the steps rail supports
  arrow-key navigation.
- Per-model progress is saved on the device, so a folded or reopened app
  resumes where you left off. The current step is shared between displays.
- Sound effects have a visible toggle in the model list and in the coach
  header; motion has a matching toggle. Both preferences persist.
- The legend sheet (info button, or the Fold legend row) explains every
  mark. Escape dismisses it; otherwise Escape leaves the app as usual.

## Data

`os.session` key `ui` holds the shared `{ model, step }` position.
`os.storage` key `progress` holds per-model `{ hi, done, at }` records and
`prefs` holds `{ muted, motion }`. No network, no accounts, no other
permissions.

Progress is stored durably, not just mirrored: each model keeps a causal
receipt at `progress.m.<id>` with its own `{ hi, done, at }`, and receipts
are the only records new writes touch. The whole-map `progress` aggregate
is still read (legacy v1 docs migrate into the union) and a live copy
repairs it if it is observed lacking facts, but it is never overwritten by
ordinary writes - a stale writer can only clobber a whole-map value, and
there is no whole-map write left to clobber. Every receipt write
(`receiptWrite` in `progress.ts`) is read-modify-verify: it re-reads the
committed record, unions it with the intent so a writer that never saw a
peer's fact emits the union, stores once, then re-reads to catch a
concurrent commit that raced in between. `hi` is a per-model high-water
mark and `done` a latch, so a regressed late write (`hi 1, done false`)
is a no-op against a durable `done: true`. On every observed receipt or
aggregate change a live copy runs `reconcileProgress`: it adopts the union
and repairs whichever durable side lacks those facts, deduped by the
signature of what it last read so repairs fire once per observation and
re-fire if the doc is clobbered again. A write the store never acked
(timeout or rate limit) schedules one deduped retry through the same pass,
never an idle storm. Receipts are bounded to the six catalog ids, the
write path never throws (corrupt JSON and missing records parse into the
union), and a hidden copy still adopts but writes nothing. A cold boot
unions aggregate and receipts, so progress survives a clobbered aggregate
as long as any receipt held the fact.

## Two copies, one session

The app runs on both displays at once and shares state. Admission and
completion are deliberately different:

- **Admission**: a copy takes new user intent - taps, clicks, transport,
  rail jumps, arrow keys, Escape, toggles, legend, audio unlock - only
  while `os.view.visible && os.view.active` at the instant the event
  arrives (`live.ts`). An occluded, parked, or zero-area copy rejects the
  intent before any ref, UI, KV, session, progress or audio state moves.
  Converged shared state is not authorization.
- **Completion**: an intent admitted while live finishes its storage
  writes even if the copy hides a moment later. Deferred focus work is
  not completion: a rail key schedules a frame that re-admits against the
  current `os.view` and the bound model (`stillBound` in `live.ts`), so a
  stale callback cannot focus a copy that hid or a model the session has
  since left. Hydration and foreign adoption keep rendering on both
  copies; only repair writes also require the copy to be live.
- Relative transport (`Next`/`Back`/arrows) resolves against the
  best-known step so rapid accepted inputs cannot reuse a stale rendered
  step, and every model-bound intent is dropped if a peer has since moved
  the session to another model.

## Sequences

The fold sequences are the traditional, widely published ones; all diagrams
and text are drawn and written for this app. They are verified as coherent
2D diagrams against the standard instructions, not against physical paper.
