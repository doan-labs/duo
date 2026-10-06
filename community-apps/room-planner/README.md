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

## Testing

`bun community-apps/room-planner/plan.test.ts` - pure checks for units,
rotated bounds, snapping, containment/overlap, undo/redo, identifiers and
persistence.
