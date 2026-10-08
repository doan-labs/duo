# Changelog

## 1.0.0

- Added a food inventory: name, quantity with unit (pcs, packs, g, kg, ml, l),
  shelf (pantry, fridge, freezer) and an optional best-before date, with
  same-batch merging when a name, unit, shelf and date already exist.
- Added consume and restock steppers on every row (unit-sized steps clamped at
  zero and a maximum, never negative) plus an edit sheet with save and a
  two-step destructive delete.
- Added a "Use soon" card sorting dated stock expiry-first, with textual
  badges (Expired, Today, N days, Out) that never rely on colour alone.
- Added inventory search, shelf/soon filter chips and a "Use soon / A-Z" sort,
  mirrored across displays through `os.session`.
- Added an independent shopping checklist with notes, tick-off, bought badges
  and a Clear bought sweep.
- Cover-first layout with complete feature parity; the inner display pairs the
  entry form and use-soon card beside inventory and the shopping list through
  `useWide`.
- Persisted the whole document through `os.storage` behind a journaled sync
  engine (`sync.ts`): accepted ops carry per-copy sequence stamps and
  high-watermark coverage, replay over any adopted base, keep deletes through
  tombstones and retry honestly on storage failures, so rapid input, two-copy
  writes and delayed watch echoes cannot drop an accepted change. Adoption is
  a coverage-gated causal union - a wholly-covered document contributes no
  rows, a covered `src` provenance marks a deliberately dropped row, and a
  repair write restores what a stale whole-blob flight erased - so a peer op
  stays immortal in every copy that observed it; unattested blobs fold empty
  and legacy pre-protocol documents still adopt wholesale.
- Moved every durable write onto the SDK's conditional storage contract:
  document and receipt commits carry the `{rev, gen}` token of the base they
  were computed from, so a losing write rejects `E_CONFLICT` with zero
  effects instead of clobbering a peer's confirmed rows, a dead-generation
  token rejects `E_GONE`, and an ambiguous acknowledgement resolves by reading
  the key back and matching the same operation's identity before retrying.
  Conflicts rebase the same intents onto the moved base rather than
  resubmitting a frozen document, which closes late-write and receipt-trim
  losses (including accepted adds over-counting after a merge replay) across
  conflicts, unknown acks, trims and cold closes.
- Made same-batch merging exact under replay: ops stamp row provenance
  (`src`), and merge folds batch siblings so a replayed duplicate drops and
  genuinely concurrent adds sum onto the canonical row.
- Added per-display operation receipts (`pantry-ops-cover` /
  `pantry-ops-inner`): a bounded durable op log per display written before
  its document commit, so a confirmed op survives even when every engine
  that saw it was torn down before a stale write landed.
- Soft synth cues on add, use, restock, check and delete, gated on the SDK's
  synchronous `os.view` visible and active pair (timers, focus and every
  deferred callback re-check at execution; already-admitted writes still
  finish after a fold), with a visible persisted mute toggle.
- Legibility pass: field labels, optional hints, sort chips and badges run at
  12pt or more; badge urgency sits on a tone dot and edge with readable text
  in both themes.
- Honest status terminals: `loading` only until the first settled read,
  `synced` once the base lands and the journal drains - including an empty
  journal - and `retrying` while storage calls fail; confirmations describe
  the accepted change rather than claiming a durable save.
