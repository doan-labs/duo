# Solitaire

Classic Klondike for Duo: seven columns, a stock and waste, four foundations,
kings up to aces down. Draw 1 for a relaxed game or Draw 3 for the classic
grind - the mode is part of the deal, and switching deals fresh so a mode is
never half-changed underneath a spread.

The deck is Duo's own: faces, courts and the two-fold back are drawn in the app,
in kit colours, at whatever size the display gives them.

## Playing

- Everything works tap-tap: tap a card (or the top of a run) to lift it, then
  tap a lit destination to set it down. Tapping the lifted card again sets it
  back. Illegal landings shake and explain themselves.
- Tap the stock to draw; when it runs dry, tap the empty well to turn the
  waste back over. A waste fan shows the last three cards in Draw 3.
- Double-tap a card to send it to its best home - foundations first.
- Undo steps back one move at a time, all the way to the deal. Hint lifts the
  best move's cards and lights its landing, and says when only sideways
  shuffles remain. Auto walks every safe card home, one hop at a beat.
- Keyboard: arrows move between cards and piles spatially, Enter/Space picks
  or places, U undoes, H hints, R/N asks for a new game, Space draws when
  nothing is focused.
- A deal with moves played is never silently discarded: New game, a mode
  switch or R/N first asks "Abandon this deal?" with explicit Keep playing and
  start actions; Escape also cancels. Re-picking the running mode is a no-op,
  and after a win replay is direct.
- The counter tracks moves; the rail shows per-mode plays, wins and best.

## The two displays

Cover (the small screen) is the full game: the same toolbar, the same
radiogroup drawn as segments, complete tap-select play. Opened wide, the table
spreads out, the mode picker becomes a grouped list, and a rail holds the
controls and personal bests.

Folding or relaunching never loses the match: the deal's seed and the whole
move log persist in `os.storage`, so the other display (or tomorrow) rebuilds
the exact table - undo history included. Sound and timers only run on the copy
you are looking at, and the mute flag persists too.

## Engine

`game.ts` is the whole ruleset with no UI: a seeded deal, every legal-move
check, the move log, hints, auto-finish, and the saved record. A stored game
is the seed plus the log; loading replays it and any entry that no longer
applies marks the record corrupt - it never silently resets a board.
