# Chess

A full game of chess against a real engine, on both displays. Tap a piece to
see its legal moves, tap a target to play, and the bot answers after a short
beat. All the rules are in: castling both ways, en passant, promotion with a
picker for queen, rook, bishop or knight, checkmate, stalemate, the
fifty-move rule, insufficient material and threefold repetition.

Three levels: Casual thinks two plies and deliberately picks among near-equal
answers, Club searches about half a second deep, and Tournament thinks a
little over a second per move. The engine is a negamax alpha-beta search with
quiescence on captures, iterative deepening, killer and history move
ordering, and a material plus piece-square evaluation with bishop-pair and
doubled-pawn terms - around club strength on the top level.

Undo rolls back to your turn, the scoresheet tracks every move in SAN, and a
running tally counts your wins, the bot's, and draws across sessions. The
board flips when you play Black, folding hands the whole game to the other
display mid-think, and every rule lives in `engine.ts`, which is checked
against the standard perft positions up to depth 4.
