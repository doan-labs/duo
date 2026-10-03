# Pixel Studio

A pocket pixel-art editor for the Duo. Draw on a 16 x 16 or 32 x 32 canvas with a palette
built from the UI kit's own colour tokens, then keep named creations in a local gallery.

## Features

- Paint, flood fill, erase and eyedropper on a pointer-captured grid - touch drags draw
  instead of scrolling the page.
- Undo and redo as diff-based strokes, capped at 48 entries, plus Clear with a
  confirmation that stays undoable.
- Editable palette of up to 16 token swatches: re-slot a colour, add or remove slots, and
  painted pixels keep their slot index so artwork re-themes with the palette.
- A live preview mosaic at true pixel size, and a saved gallery with open, rename and
  delete, each behind a confirmation where it can destroy work.
- The working draft - including undo history - persists in app storage and mirrors through
  `os.session`, so a fold or relaunch restores the canvas exactly.

## Verify

From the repository root:

```sh
bun scripts/check-submissions.ts community-apps/pixel-studio
```

That runs the CLI `check` (manifest, imports, strict types, 4 MiB cap), the submission
rules (files, registry entry, empty permissions, version increase) and builds the release
into a temporary directory. Logic tests live in `.tests/` and run with `bun test ./.tests`
inside this folder: flood-fill boundaries, stroke dedupe, undo/redo, palette remaps and
the draft/gallery schema round trips.

In the simulator (`bun packages/cli/index.mjs dev community-apps/pixel-studio`): paint a
stroke on the cover, fold open and the same canvas appears on the inner display; open the
gallery sheet, save the canvas, quit and relaunch - the draft returns with its undo stack.

## Layout

| File | Purpose |
| --- | --- |
| `manifest.json` | Identity `com.mnismt.duo.pixelstudio`, version, author, license |
| `main.tsx` | App markup: board gestures, sheets, both display layouts, session mirror |
| `pixel.ts` | Pure document model: cells, palette slots, flood fill, undo history, schemas |
| `styles.ts` | Token-based layout, board grid and reduced-motion-safe entrance |
| `.tests/pixel.test.ts` | Bun tests for the editing algorithms and schema round trips |
| `package.json` | Platform dependencies only, so no lockfile is needed |
| `icon.png` | 1024 px square PNG |
| `screenshots/inner.png`, `screenshots/cover.png` | Both displays, captured from the simulator |
