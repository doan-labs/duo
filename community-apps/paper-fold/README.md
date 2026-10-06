# Paper Fold

An origami coach for Duo. Six beginner models - Dart, Boat, Cup, Samurai
Helmet, Tulip and Water Balloon - each walked through with original flat
diagrams in the classic convention: dashed blue lines for valley folds,
dash-dot orange for mountain folds, green arrows for where the paper moves,
and faint outlines for where a flap lands.

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

## Sequences

The fold sequences are the traditional, widely published ones; all diagrams
and text are drawn and written for this app. They are verified as coherent
2D diagrams against the standard instructions, not against physical paper.
