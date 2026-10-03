# Battleship

Battleship is a single-player naval duel against a bot for Duo. Place your
five hulls on open water, then trade shots with the enemy until one fleet
goes to the bottom.

On the inner display your fleet and the enemy's targeting grid sit side by
side with a rail for controls, both ship rosters, and the running shot log.
On the cover a Target/Fleet toggle keeps the same match fully playable, so a
game started unfolded continues on the cover without losing a move.

## Playing

- Placement is tap to berth: a ghost outline previews the next hull, Rotate
  flips the bearing, and tapping a placed hull picks it back up. Auto deals
  a legal fleet and Clear starts the grid over.
- Shots are tap to fire. White pegs mark misses, burning orange pegs mark
  hits, and a sunk enemy hull surfaces on the targeting grid so you can see
  what you killed. The breathing ring marks the most recent shot.
- The bot hunts: once it scores a hit it chases that hull along its axis,
  and it can never fire twice at the same cell.

## Data

The live match and the win tally persist in `os.storage`, so reopening or
folding mid-round hands the same placement, pegs, and history to the other
display and back to you later. A local tally keeps You/Bot wins and the last
six results. Nothing leaves the device: the manifest asks for no network and
no permissions.

## Sound

Placements thud, shots blip, misses splash, hits clang, a sinking groans,
and the final blow plays a victory arpeggio (or a three-note descent on a
loss), with `navigator.vibrate` backing each on hardware that has it.
