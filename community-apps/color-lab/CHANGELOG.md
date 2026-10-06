# Changelog

## 1.0.0

First release.

- Colour code field that parses hex (3, 4, 6 and 8 digits, hash optional),
  `rgb()`/`rgba()` and `hsl()`/`hsla()` in comma or space syntax, percent
  channels and deg/turn/rad/grad hues, with live commit and an honest error
  hint.
- Painted HSL tracks with pointer and keyboard control; every drag or edit
  session lands on the undo stack exactly once, with redo alongside.
- Complementary, analogous, triadic, split-complementary and tetradic
  harmonies plus an eight-step tint-and-shade ladder; tapping any swatch
  makes it the working colour.
- WCAG 2.x relative-luminance contrast for a chosen text/surface pair:
  live ratio, all four AA/AAA verdicts reported without rounding, a swap
  shortcut and a sample card preview rendered in the pair's colours.
- Named saved palettes in on-device storage with rename, export and a
  two-step delete; the working colour, pair, field text, inspector page and
  mute follow the fold and relaunch through `os.session` and `os.storage`.
- Copy that tries the clipboard first and falls back to a selectable field
  when the sandbox says no; quiet synth cues with a persisted mute.
