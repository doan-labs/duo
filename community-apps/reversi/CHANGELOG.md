# Changelog

## 1.0.0

- Added Reversi on the classic 8x8 board with the standard opening and black
  moving first.
- Added solo play against three real engines: Easy plays randomly, Medium
  greedily evaluates a positional table, and Hard runs an alpha-beta negamax
  search with iterative deepening and an endgame solve.
- Added local pass-and-play, automatic forced passes, and game end on
  consecutive no-moves with exact scores, draws included.
- Added legal-move hints with a hover ghost that rings the discs a move would
  flip, a deliberate per-direction flip cascade for captures, and a last-move
  marker.
- Added a move history log with pass entries, a persistent match tally, live
  disc scores and a speaker mute switch.
- Added undo: one ply in two-player mode, rewind-to-your-turn solo, never
  while the bot is thinking; new game, mode and colour switches confirm before
  discarding a live match.
- The match persists in app storage, so folding mid-move hands the identical
  position to the other display and relaunching resumes it; the bot thinks
  only on the active display.
- Keyboard play: arrows rove the board, Enter/Space places, U undoes, N asks
  for a new game, H toggles hints, M mutes.
