# Changelog

## 1.0.0

First release.

- Digital-logic sandbox: up to four input switches, AND/OR/NOT/XOR gates and
  output bulbs on a pannable, zoomable canvas with a dotted perfboard grid.
  Node cards counter-scale for legibility at fit zoom; the cover tray grows
  on a chevron when the inspector needs room.
- Tap an output pin, then an input pin, to wire them - every pin is a
  constant 44pt target anchored outside its part's body so a body tap is
  never absorbed. Crowded pads repel; the ones that still cannot land on
  clear space retire to dots deterministically, and the inspector wire row
  stays the always-reachable path. Landing on a wired pin replaces it.
  Cycles are refused at write time and repaired on load.
- Each display keeps its own camera under `view:<doc>:<display>`: pan, zoom
  and Fit on the cover never clobber the unfolded view, stored cameras
  restore on reopen, and a remote edit refreshes content without moving this
  display's frame. The welcome circuit seeds with constant node and wire
  ids, so both displays seeding the same blank store still converge on one
  half adder. New work admits only on `os.view.visible && os.view.active`
  read live - an occluded copy can still report active, so visibility alone
  is not enough and every pointer, key, control, confirm, audio, focus and
  timer path takes both flags; writes and gestures already in flight finish
  their own completion.
- The cover tray's Build tab pins the parts palette above the inspector's
  own scroll, so selecting a part can never slide the grid out from under a
  tap already in flight. Tray segments and the zoom dock meet the 44pt
  touch bar.
- Live evaluation: HIGH signals propagate down the wires with a travelling
  glow and marching dashes; open input pins read LOW, stated everywhere.
- Live truth table enumerates every input row, bounded to the first eight
  switches so a tampered document can never ask for billions of rows, with
  the current switch pattern highlighted.
- Nine challenges with fixed I/O rows - from a straight wire to a half adder
  to a four-switch door lock - validated row by row; solved stamps persist.
- Undo/redo per structural edit, one step per drag; selection, deletion with
  confirmation, per-part labels.
- Saved circuits in an on-device library; the open circuit and selection
  follow the fold through `os.session`, the library through `os.storage`.
  Every durable write is a conditional `rev`/`gen` commit that re-derives its
  intent on conflict instead of resubmitting a stale snapshot: deletes are
  tombstones a stale writer cannot resurrect, a lost ack is verified by
  reading the key back, and a failed read or corrupt blob reports failed
  rather than seeding an empty library or claiming Saved.
- Quiet connect, switch, undo and solve sounds with a persisted mute toggle;
  audio unlocks on the first gesture and only the visible copy plays.
