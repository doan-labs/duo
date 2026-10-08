# Changelog

## 1.0.0

- Six beginner models with original step diagrams: Dart, Boat, Cup, Helmet,
  Tulip and Balloon.
- Flat origami-diagram language: dashed blue valley folds, dash-dot orange
  mountain folds, green motion arrows and faint landing outlines, with an
  in-app legend sheet.
- Back / Next / Finish transport, replay, per-model saved step progress, and
  a result screen that suggests the next un-folded model.
- Cover shows one large diagram plus the current instruction; the inner
  display pairs the diagram with a tappable steps overview rail.
- Gentle paper-step sound cues with a visible, persisted mute toggle; a
  persisted motion toggle joins the OS reduced-motion setting.
- Admission gate: a hidden or inactive copy rejects new user intent
  (input, steps, prefs, legend, audio unlock) before any state moves;
  transport resolves from the best-known step and drops intents a peer
  switched away from.
- Durable writes are conditional on the SDK 0.1 atomic API (`entry` +
  `{ rev, gen }` tokens): typed conflicts rebase the intent on the exact new
  value, ambiguous outcomes report unknown and retry through the deduped
  reconcile instead of a blind second write, E_GONE stops a dead
  generation, and reset tombstones carry an incarnation so max merge cannot
  resurrect erased progress.
- Shared step position across both displays via session state; progress and
  preferences persist in device storage.
- Durable progress: bounded per-model receipts are now the only written
  record - the whole-map aggregate is never overwritten by ordinary
  writes, so a stale writer has nothing left to clobber (peer write
  landing late, old acknowledged flight, reload mid-flight). Every receipt
  write is read-modify-verify: it unions the committed record, stores
  once, and re-reads to catch a racing commit; `hi` only grows and `done`
  never unlatches, so a regressed same-model write is a no-op. A live copy
  unions aggregate plus receipts on every observed change and repairs
  whichever durable side lacks the facts, deduped by observed content and
  re-armed when a copy becomes live; an unacked write schedules one
  deduped retry instead of silently dropping.
