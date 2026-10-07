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
  a causal union - attested rows, tombstones and coverage merge into the new
  base and a repair write restores what a stale whole-blob flight erased - so
  a peer op stays immortal in every copy that observed it; unattested blobs
  fold empty and legacy pre-protocol documents still adopt wholesale.
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
