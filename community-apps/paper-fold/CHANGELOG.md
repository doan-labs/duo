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
- Shared step position across both displays via session state; progress and
  preferences persist in device storage.
- Durable progress: the aggregate doc is backed by bounded per-model
  receipts so a stale or foreign whole-doc overwrite (peer write landing
  late, an old acknowledged flight, a reload mid-flight) can no longer
  erase completed models. Every write re-reads and unions durable state
  first; `hi` only grows and `done` never unlatches; a live copy repairs
  whichever durable side lacks the facts, deduped by the observed durable
  content and re-armed when a copy becomes live.
