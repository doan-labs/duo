# Changelog

## 1.0.0

- Create, rename and delete decks; add, edit and delete front/back cards.
- Review flow: reveal the answer, then grade Again / Good / Easy with the
  scheduled interval shown on every button; Again re-queues within the session.
- Deterministic SM-2-style scheduling with persisted absolute due times,
  bounded review history and truthful due/reviewed counts.
- Session resume: an interrupted review reopens automatically across folds and
  relaunches; the open editor draft survives a fold via session state.
- Cover-first layout with a wide rail + detail split, grouped-row cards list,
  light theme, reduced-motion support.
