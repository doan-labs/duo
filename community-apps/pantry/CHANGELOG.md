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
- Persisted the whole document through `os.storage`; soft synth cues on add,
  use, restock, check and delete, gated on the active display, with a visible
  persisted mute toggle.
