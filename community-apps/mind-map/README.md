# Mind Map

A community app for the Duo folding device: an infinite drafting table for
ideas. Each map is a tree of nodes laid out on a pannable, zoomable canvas;
every node can carry its own colour, and curved links draw the structure back
to its parent. Maps persist on device and the open map follows you across the
fold.

## Layouts

- **Cover:** the canvas fills the display and a tray at the bottom keeps the
  tools in thumb reach - add an idea, rename the selected node, recolour it,
  delete it, or open the maps sheet to switch maps or start a new one.
- **Unfolded:** the canvas grows beside a floating panel holding the map name,
  the selected node's text and palette, and the full maps library.

The map adapts live to any width: fold, unfold, or resize mid-drag and the
layout re-arranges without losing the open map or selection.

## Controls

- Drag the canvas to pan; drag a node to move it.
- The dock in the canvas corner zooms in and out, resets to 100%, or fits the
  whole map on screen.
- Tap a node to select it, then type to rename it, pick a colour, add a child,
  or delete the branch (tap Delete twice to confirm).
- New children arrive on alternating sides of their parent and nudge down
  until they stop overlapping siblings.

## Storage and sync

Maps live in `os.storage` as a small validated library, and the open map plus
the current selection travel through `os.session` so the second display sees
the same scene after the fold. On load, stored graphs are repaired rather than
rejected: dangling parents re-attach to the root, cycles break, the camera is
clamped, and oversized text is trimmed.

## Development

```sh
bun install
bun packages/cli/index.mjs dev community-apps/mind-map --simulator http://localhost:3000/
```

Then open the printed `?dev=` URL in the Duo web simulator.

## Manifest

| | |
| --- | --- |
| id | `com.mnismt.duo.mindmap` |
| lane | `community` |
| permissions | none |
| license | MIT |
