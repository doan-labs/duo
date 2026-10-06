# Changelog

## 1.0.0

First release.

- Digital-logic sandbox: up to four input switches, AND/OR/NOT/XOR gates and
  output bulbs on a pannable, zoomable canvas with a dotted perfboard grid.
- Tap an output pin, then an input pin, to wire them; landing on a wired pin
  replaces it. Cycles are refused at write time and repaired on load.
- Live evaluation: HIGH signals propagate down the wires with a travelling
  glow and marching dashes; open input pins read LOW, stated everywhere.
- Live truth table enumerates every input row (up to sixteen) with the
  current switch pattern highlighted.
- Nine challenges with fixed I/O rows - from a straight wire to a half adder
  to a four-switch door lock - validated row by row; solved stamps persist.
- Undo/redo per structural edit, one step per drag; selection, deletion with
  confirmation, per-part labels.
- Saved circuits in an on-device library; the open circuit and selection
  follow the fold through `os.session`, the library through `os.storage`.
- Quiet connect, switch, undo and solve sounds with a persisted mute toggle;
  audio unlocks on the first gesture and only the visible copy plays.
