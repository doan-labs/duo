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
contains. A storage event is adopted only at a newer `rev`, covered intents
confirm, and every uncovered intent is replayed on top - a stale echo, a
racing write or a rejected get/set can never lose an accepted op, and deletes
survive through the document's tombstones (`gone`). Input mutates only while
the copy is both visible and active; timers, audio and focus follow the same
gate, and the UI reports `retrying` rather than pretending a failed write
landed. `sync.test.ts` drives the same `DocStore` surface deterministically:
delayed echoes, out-of-order delivery, interleaved writers, delete-vs-edit,
rejected calls, resync and reload.
