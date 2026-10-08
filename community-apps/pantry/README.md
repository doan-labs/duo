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

Both displays are separate copies writing one document, and every durable
write is conditional: `os.storage.entry` returns the value with its `{rev,
gen}` token in one atomic read, and `os.storage.set`/`del` carry that token as
a precondition checked inside the store's own transaction. A write that loses
the race rejects `E_CONFLICT` with zero effects - a stale whole-blob payload
can never land over a peer's confirmed commit - and a token bound to a dead
generation rejects `E_GONE`. On conflict the engine re-reads and rebases the
same intents (same writer ids, same seqs) onto the moved base; it never
resubmits a frozen document under a fresh token. An ambiguous outcome
(`E_TIMEOUT`, transport loss) is resolved by reading the key back and checking
the same operation's identity - a committed document covering the journal, or
the receipt entry carrying the op's seq - before retrying, so a retry can
never double-land. A failed or unknown read is never treated as empty.

`sync.ts` owns the invariant: every accepted mutation is a journaled intent
stamped with this copy's `seq`; a write commits base + replayed intents plus
per-writer high-watermarks (`high`), so a settled document provably shows
which ops it contains.

Adoption is a causal union, never a wholesale replacement - and the union is
gated by coverage. The engine keeps the last settled base
separate from the view; when a newer `rev` folds in, the view's rows merge
into the base only where they carry information the base lacks: a document
whose `high` marks are wholly covered by the current one contributes nothing
(everything it attests is already applied, so a row only it carries was
dropped on purpose - tombstoned or cap-evicted, never resurrected), and a
row whose `src` provenance is already covered was deliberately absent. Rows
without provenance are adopted conservatively. Tombstones union so real
deletes stay dead, and each writer's mark takes the max. When the view then
carries content the base lacks, a repair write re-commits it.

Every op run also stamps its `{writer: seq}` onto the row it touched, which
makes same-batch convergence exact: a replayed add that merges into a peer's
row would otherwise leave the replaying copy's own-id row behind and
double-count the op. Merge folds rows in the same batch (name, unit, shelf,
date): a row whose `src` is a subset of a sibling's is a replayed duplicate
and drops; rows with disjoint `src` are genuinely concurrent adds and sum
onto the lowest-id canonical row - the same result journal replay produces,
so both displays settle on one row with the exact accepted quantity.

Dead-writer teardowns ride operation receipts. A stale in-flight write that
lands after every engine disposed would erase a peer's confirmed op even
though a copy had observed it - the in-memory journal dies with its copy.
Each display therefore keeps one bounded whole-value receipt log
(`pantry-ops-cover` / `pantry-ops-inner`), written under the same conditional
contract *before* its document commit: a stale slot write unions onto the
re-read log instead of clobbering it, so a relaunched copy replays receipt
entries the settled document does not cover, then covers them and the next
slot write trims them. The log only holds what the doc has not yet covered, so
it stays bounded; covered entries are dropped lazily on the next write.

Two edges stay honest: only attested documents adopt or merge - every
protocol write stamps `{by, s}` and `high`, so a blob with rows but no marks
is forged or corrupt and folds empty - and legacy pre-protocol documents
(`v != 2`) still adopt wholesale, because last-writer-wins is the only
honest reading of a blob that cannot say what it covered. Bare mark advances
never trigger a write on their own, so two copies cannot ping-pong over
provenance. The residual hole is narrow and stated: with conditional writes a
stale payload rejects instead of landing, so even a single-key store preserves
confirmed peer progress; the only op still lost is one no receipt carried and
no surviving copy ever observed before a dead writer's stale commit rejected -
a property of the storage shape, not a waived defect.

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
legacy boot. `causality.test.ts` pins the three causal regressions: same-batch
replay dedupe in both writer orders and repeated equivalent batches,
shared-row stepper/edit races, dead-writer teardown recovery through the
receipt slots in both orders (plus the honest single-key limit), tombstone
cap replay never resurrecting, receipt coverage trimming, malformed slot
blobs and shopping-row receipts. `.tests/admission.test.ts` pins the
admission contract: the truth table, same-turn flips, and the committed
`live` callback evaluated against a stale React ref - the reviewer's
original probe shape.
