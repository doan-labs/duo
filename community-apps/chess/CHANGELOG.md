# Changelog

## 1.0.0

- Added a complete chess engine: legal move generation with castling, en
  passant and promotion, plus checkmate, stalemate, the fifty-move rule,
  insufficient material and threefold repetition detection. Verified against
  the standard perft positions through depth 4.
- Added a real bot: negamax alpha-beta search with quiescence, iterative
  deepening, killer and history ordering, and a material plus piece-square
  evaluation. Three levels - Casual (shallow, blunders like a human), Club
  (~0.5 s a move) and Tournament (~1.4 s a move).
- Dark arcade look: an inset ivory-and-slate board well, glowing selection
  and last-move marks, legal-target dots and capture rings, a pulsing check
  alarm, and glass score chips for the You/Draw/Bot tally.
- Tap-to-play with a floating promotion picker, an Undo that rolls back to
  your turn, a SAN scoresheet (a column on the inner display, a strip on the
  cover), and Play-as-White-or-Black switching.
- Game state syncs through session storage, so folding mid-think hands the
  board to the other display and the bot picks up there. The tally stays in
  persistent storage across launches.
- Synth cues for quiet moves, captures, checks and results, with a rumble
  and `navigator.vibrate` beat on a decisive finish.
