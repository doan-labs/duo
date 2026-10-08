# Room Planner

A scaled 2D floor-layout tool for Duo: draw a rectangular room, drop furniture
onto it, and rearrange until the plan works. Everything runs at true scale -
move a sofa and read exactly how many centimetres (or inches) sit between it
and each wall.

## Features

- **True-scale canvas** - the room is a measured rectangle on a snap grid, with
  pan, pinch/wheel zoom, one-tap fit and live wall-gap callouts on the selected
  piece.
- **16-piece furniture catalogue** - sofas, tables, chairs, beds, storage and
  decor with real footprints; pieces rotate in 90° turns.
- **Clear problem flags** - pieces outside the walls or overlapping are marked
  with a dashed red outline and a counted header badge (rugs are exempt from
  overlap, not containment).
- **Editable room** - name, width and depth accept forgiving input
  (`4.6 m`, `460 cm`, `15'6"`), with metric and imperial units and per-system
  snap steps.
- **Undo/redo** - a local history that also records changes arriving from the
  other display, so undo steps back through everything this copy saw.
- **Named layouts** - keep alternatives in the library, duplicate the current
  plan, and delete with a confirmation. The open plan syncs across the fold and
  persists across relaunch.
- **Quiet synth cues** - placement, settle, rotate, delete and error sounds,
  with a persisted mute toggle. Only the visible copy makes a sound.

## Displays

- **Cover**: the whole room framed legibly, an Add/Edit/Plans tray, undo/redo,
  mute and the issue badge.
- **Inner**: the canvas beside a live inspector - palette, selected-piece
  measurements, room settings and the layout library.

## Keyboard

Arrows nudge the selection by one snap step (or 1 cm, Shift for 10 cm), `R`
rotates (Shift+R the other way), `Delete` removes, `Cmd/Ctrl+Z` undoes and
`Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redoes.

## Persistence

`os.storage` writes are whole-blob last-writer-wins with no compare-and-set,
so the library lives behind `LibStore` (`library.ts`): mutations are pure
intents that stay pending until observed inside the stored value, every
drain re-offers this copy's committed union (`mine`), and `repair()` runs on
each library-key change event so a delayed foreign set that lands on top of
a local commit is folded back instead of silently lost. A failed read is
'unknown' (never an implied-empty library to seed over), and the bootstrap
shows a plan only after the seed write is confirmed.

Input admission follows the live view flags: keys, pointer, buttons, sheets,
prefs, plan selection, audio and focus are admitted only while
`os.view.visible && os.view.active`, checked synchronously at the call site.
Work admitted while live - a drag in flight, the wheel-zoom settle, a queued
storage write - still completes across a hide; storage adoption and repair
stay ungated.

## Testing

`bun community-apps/room-planner/plan.test.ts` - pure checks for units,
rotated bounds, snapping, containment/overlap, undo/redo, identifiers and
persistence.

`bun community-apps/room-planner/library.test.ts` - adapter checks for the
convergence protocol: delayed successful-set races (foreign add and foreign
delete acknowledged inside a gated set, both landing orders), independent
queues per copy, dual cold seeds after a welcome tombstone, failed-read vs
missing-key, unconfirmed-write honesty and throwing-intent terminals.
