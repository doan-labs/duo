# Color Lab

A community app for the Duo folding device: a colour analysis bench for
designers. Type or paste a colour in almost any notation, tune it on live
HSL tracks, fan it out into harmonies and tint ladders, and check the result
against WCAG contrast with an honest pass or fail - then save the strip as a
named palette that survives the fold and relaunch.

## Layouts

- **Cover:** the colour owns the top card - its hex code set in whichever ink
  actually contrasts it - with the code field, HEX/RGB/HSL copy chips, three
  painted HSL tracks, the harmony chooser and its strip, the tint ladder and
  the saved-palette library. The contrast and preview inspector is one tap
  away and slides in like a page.
- **Inner:** the editor keeps the left column and the inspector docks as a
  right rail - pair pickers, the live ratio, the four WCAG verdicts and a
  sample card rendered in the inspected pair's own colours, with the palette
  library underneath.

## Editing

- The code field takes `#abc`, `#aabbcc` (with or without `#`), 4/8-digit
  alpha forms, `rgb()`/`rgba()` in comma or space syntax with percent
  channels, and `hsl()`/`hsla()` with `deg`, `turn`, `rad` or `grad` hues.
  A valid code commits the colour live; Enter or leaving the field settles
  it as one undo step, and Escape while editing restores the pre-edit colour.
- Sliders commit live too and record a single undo step per drag; keyboard
  arrows nudge, Page keys jump by tens.
- Undo and redo sit in the header and on the usual mod+Z / mod+shift+Z keys.

## Contrast

- The pair pickers offer the current colour, both anchors, the active
  harmony and the ladder; Swap flips text and surface in one tap.
- The ratio uses the WCAG 2.x relative-luminance formula and reports all
  four thresholds honestly: AA large 3:1, AA body 4.5:1, AAA large 4.5:1
  and AAA body 7:1 - no rounding up a borderline result.
- The preview paints a real title/body/button/link/caption card in the
  inspected pair so a pass is something you can see, not just a number.

## Palettes, copying and sounds

- Save current stores the whole harmony strip under a name you pick; rows
  reopen into the editor, and per-palette actions cover rename, export and a
  two-step delete.
- Tapping the hero, a copy chip or Export tries the clipboard first. If the
  app sandbox refuses, a sheet offers the code in a selectable field - the
  app says so instead of pretending the copy worked.
- Quiet cues mark picks, applies, saves, deletes and copies. The speaker
  button mutes them, and the choice persists. The colour, harmonies, pair,
  field text, open page and palettes all follow the fold through `os.session`
  and `os.storage`.

## Persistence

`os.storage` writes committed state only: the applied colour document, the
saved palette library and the mute flag. A relaunch restores exactly those.
The half-typed code-field draft is session view state - it follows the fold
through `os.session` so the other display keeps typing, but a hard relaunch
returns the last committed colour rather than an unfinished draft.
