# Circuit Lab

A community app for the Duo folding device: a pocket digital-logic sandbox.
Place input switches, AND/OR/NOT/XOR gates and output bulbs on a perfboard
canvas, wire them by tapping pins, and watch HIGH signals travel the curved
traces to light the bulbs. A live truth table enumerates every input row, and
a challenge shelf asks for real combinational builds.

This is a teaching toy about Boolean logic, not an electronics simulator:
wires carry pure HIGH/LOW values, gates are ideal, and nothing here models
voltage, current, timing hazards or any real hardware.

## Layouts

- **Cover (closed):** the canvas fills the display and a bottom tray switches
  between Build (parts palette plus the selected part's controls), Table (the
  live truth table), Tasks (challenges) and Saved (the circuit library). A
  chevron grows the tray when the inspector or the table needs room.
- **Unfolded:** the canvas grows beside a floating panel holding the palette,
  the inspector, and a segmented Table/Tasks/Saved switch.
- Both layouts recompose at any width, and the open circuit follows the fold
  through `os.session` so a mid-build fold never splits the work. Node cards
  counter-scale so labels stay readable at fit zoom, and first sight opens at
  a legible zoom rather than a whole-graph overview.

## Controls

- **Tap a switch** to flip it. Its wires light amber and the HIGH state
  ripples downstream, gate by gate.
- **Tap an output pin** (right side of a part) to arm a wire - it follows
  your finger - then **tap an input pin** on another part to land it. Every
  pin is a constant 44pt target anchored just outside its part's body, so a
  switch body tap still flips it and a pin tap is unambiguous. Crowded pads
  repel; the ones that cannot reach clear space retire to a dot
  deterministically, and every pin still lands through the inspector.
- The inspector also wires without the canvas: pick a part, tap **Wire from
  output**, then pick the target and tap its input row. Tapping a fed input
  row disconnects it.
- **Tap a part or a wire** to select it; the inspector renames parts and
  deletes the selection (with a second-tap confirm for parts, a sheet for
  whole circuits). **Tap bare canvas** to clear the selection.
- **Drag** a part to move it (it snaps to the grid on release); **drag the
  canvas** to pan; the dock zooms and fits.
- **Undo/redo** buttons or Cmd/Ctrl+Z, +Shift/Ctrl+Y: every structural edit
  is one step. Switch positions are play state and stay put through undo.
- **Keyboard:** Delete/Backspace removes the selection; Escape drops an armed
  wire or closes a sheet, otherwise goes home. Tab through pins and Enter to
  arm and land wires without a pointer.
- Only the visible copy takes input: gestures, keys and armed intent on the
  folded display cancel instead of mutating, so a fold mid-gesture is safe.
- Each display keeps its own camera (`view:<doc>:<display>` in storage), so
  cover Fit and pinch-pan never drag the unfolded view along, a stored frame
  restores on reopen, and remote edits update the circuit without moving
  this display's view.

## Rules of the board

- Up to four switches, four bulbs, twenty-two gates and sixty-four wires.
- One wire feeds one input pin; an output pin fans out freely.
- **A disconnected input pin reads LOW (0).** It is stated in the palette so
  every circuit evaluates cleanly.
- Feedback loops are refused when you wire them, and any loop that still
  reaches storage is cut on load and its gates flagged in the canvas.

## Challenges

Nine fixed-I/O builds: First Light, Two Keys, Either Door, The Opposite,
Different (with the XOR chip off the shelf), All Agree, Majority, Half Adder
(two bulbs at once) and Four Doors. A challenge scaffolds its switches and
bulbs for you and locks that row; the banner counts matching truth-table rows
live and banks a solve stamp the moment every row agrees.

## Persistence

Circuits, solve stamps and the mute switch persist in `os.storage`; the open
circuit, selection and undo history ride `os.session` across the fold and
survive app relaunch through the library. Both displays run their own copy of
the app - whichever copy is visible owns sound, the marching signal dashes
and every input. If an occluded copy still writes from an older revision, the
holder merges that write's edit into the newer doc instead of losing it.

Every durable write goes through the conditional contract (`persist.ts`): a
write reads `storage.entry` for the space revision and generation, computes an
intent over the freshest library, and commits with `set`/`del` guarded by that
token. A moved space refuses with `E_CONFLICT` and the intent re-derives on
the fresh entry - it never resubmits frozen bytes - so a late full-snapshot
from a stale copy can no longer overwrite a peer's delete or drop a confirmed
circuit. Deletes are tombstones (`tombs[id]` floors at the removed doc's
`updated`), which lets a genuine recreate win while a stale snapshot of the
deleted doc is refused. A timed-out ack is verified by reading the key back
and comparing bytes; a dead generation (`E_GONE`) or a corrupt stored blob
fails honestly instead of seeding an empty library. The status chip reports
the queue itself, so an unwritable save reads failed rather than Saved.
