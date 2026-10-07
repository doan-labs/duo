# Pantry

Pantry is a food inventory for Duo - what you have, where it lives, and what
needs eating first. The cover keeps the whole loop - quick add, the use-soon
list, consume/restock steppers and the shopping checklist - within thumb
reach, while the inner display puts the entry form and use-soon card beside a
fuller inventory and the shopping list.

## Using it

- **Stock an item:** type a name and quantity (`2` or `1.5`), pick a unit and a
  shelf, optionally set a best-before date, then Add item. Enter submits too.
  Stocking the same name, unit, shelf and date merges into that batch instead
  of duplicating it.
- **Use or restock:** the `-` and `+` steppers on each row take one unit step
  (1 pc, 0.1 kg, 100 g...). Quantity clamps at zero - an emptied item shows an
  "Out" badge and stays on the shelf as a reminder.
- **Watch the clock:** Use soon lists dated stock expiry-first. Badges say it
  in words - Expired, Today, N days, Out - so urgency never depends on colour.
- **Edit or delete:** tap a row to open the editor. Delete asks once more
  inside the sheet before the item is gone for good.
- **Find things:** the search field filters by name; the chips filter by shelf
  or show everything expiring soon; the sort toggle flips between expiry order
  and A-Z.
- **Shop:** the checklist is independent of the stock - jot a need, tick it
  when bought, sweep bought rows with Clear bought.
- **Sound:** soft cues answer each action; the pill in the header mutes them
  and remembers the choice.

## Data

Quantities are stored as integer milli-units, so steppers and merges never
drift on floating point. Dates are local calendar days - expiry is counted in
days at midnight, not 24-hour spans, so a "Today" badge is right at DST edges.
The whole document persists through `os.storage` under `pantry-v1`; the shelf
filter, search and sort travel through `os.session` under `pantry-view`, so a
fold hands the same view to the other display. Nothing leaves the device: the
app declares no permissions and uses no network.

### Persistence protocol

Both displays are separate copies writing one last-writer-wins document, and
watch events may arrive late, replayed or out of order. `sync.ts` owns the
invariant: every accepted mutation is a journaled intent stamped with this
copy's `seq`; a write commits base + replayed intents plus per-writer
high-watermarks (`high`), so a settled document provably shows which ops it
contains.

Adoption is a causal union, never a wholesale replacement. A whole-blob write
commits the payload it was staged on, so a set flight staged before a peer's
commit landed can physically erase rows the store had already confirmed.
The engine keeps the last settled base separate from the view; when a newer
`rev` folds in, the view's attested rows, tombstones and coverage union into
the base rather than regressing, and an event at an older `rev` still merges
any committed content the view lacks - delivery order is not causal order.
When the view then carries rows, tombstones or muted state the base lacks, a
repair write re-commits them, so a peer's confirmed op stays immortal in
every copy that observed it (and in any copy its surviving peers keep
carrying). Two edges stay honest: only attested documents adopt or merge -
every protocol write stamps `{by, s}` and `high`, so a blob with rows but no
marks is forged or corrupt and folds empty - and legacy pre-protocol
documents (`v != 2`) still adopt wholesale, because last-writer-wins is the
only honest reading of a blob that cannot say what it covered. Bare mark
advances never trigger a write on their own, so two copies cannot ping-pong
over provenance. The one residual hole is inherent to a mutable whole blob
with no per-writer keys: an op committed on the wire and then erased by a
stale flight cannot be recovered if no surviving copy ever observed it and
its own event never reaches a live engine - durability lives in what live
copies have seen.

Admission is decided by `admission.ts` from the SDK's synchronous `os.view`
(visible AND active) with `document.visibilityState` as a supplemental
backstop - never the React `view` state, which lags a render behind and would
admit input the shell already disowned. Every input path (add, step, edit,
delete, search/filter/sort, shopping, roving-chip keys, sheet traps) calls
`live()` before touching state, refs, session, storage, rAF, focus, audio or
timers - including inside `mutate`, so denied events have zero side effects -
and deferred callbacks re-check at execution: the midnight tick, the sheet
focus restore and notice timers simply do not run on a hidden copy. An op
already admitted when its copy folds still finishes its write once; reads and
remote convergence are never gated.

Status reporting is honest about terminals: `loading` only until the first
settled read, `synced` once a base document is adopted and the journal has
drained (an empty journal after a successful read is genuinely done),
`retrying` while storage calls keep failing. An optimistic submit updates the
list immediately, so confirmations say the row was added or updated - durable
persistence is what `synced` reports, not what a tap claims.

`sync.test.ts` drives the same `DocStore` surface deterministically: delayed
echoes, out-of-order delivery, interleaved writers, delete-vs-edit, rejected
calls, resync, reload, raced-out refreshes, admitted-before-hide completion,
the held-set-flight peer-loss cases in both writer orders and both watch
timings, delete-vs-stale-write, tombstone recovery through merges, a dispose
with an in-flight write plus a re-kick parked, replay storms and a mixed
legacy boot. `.tests/admission.test.ts` pins the admission contract: the
truth table, same-turn flips, and the committed `live` callback evaluated
against a stale React ref - the reviewer's original probe shape.
