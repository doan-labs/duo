# Changelog

## 1.0.0

First release.

- Tap-to-place fleet deployment with bearing rotation, a live legal-position
  ghost, pickup-and-relay by tapping a placed hull, and one-tap Auto and
  Clear.
- Turn-based firing on the enemy grid with hit, miss and sunk pegs, kill
  reveals of sunk enemy hulls, and a last-shot marker.
- A hunt-and-target bot that chases damaged hulls along their axis and never
  fires twice at the same cell.
- Shot history log, both fleet rosters with per-hull damage, and victory or
  defeat states with a match summary card.
- Match and win tally persisted in `os.storage`: resume after reopening or
  folding, on either display.
- Inner display lays fleet and targeting grids side by side with a control
  rail; the cover keeps the whole match playable behind a board toggle.
