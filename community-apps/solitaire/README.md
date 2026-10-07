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

### Admission and persistence invariants

The copy that owns the screen is the one the shell reports live. Every point
of player-driven change - taps, keyboard input, the Auto tick, sound, focus
restores - reads `os.view.visible && os.view.active` synchronously before
acting (`viewLive` in `io.ts`), never the render's cached pair: the SDK swaps
`os.view` a frame before React hears the event, so a hidden copy can
otherwise accept one last input nobody sees. Going hidden parks Auto (the
record's `auto` flag hands it to the other display) and clears every timer;
coming live flushes what parked.

Writes are intents, not fire-and-forget. A move's serialized record parks
until `os.storage.get` confirms what is there: a foreign record is adopted
(the pending intent is superseded), a confirmed slot issues `saved.set`, and
a *rejected* read means the peer's state is unknown - the intent retries
with backoff and the status line says so, rather than a blind set that could
clobber a deal it could not see. The mirror's `ready`/`error` state is the
acknowledgement that clears or requeues the intent, so an accepted move is
never silently lost and never double-applied. Stats merge the same way:
play/win counters union over the confirmed base instead of overwriting it.
Because the mirror lags and re-serves superseded records verbatim, every
record this copy issues, adopts or receives joins a `seenRaws` set and a
re-delivered old raw can never pass for a new foreign write; the repair
write that settles an adopted record re-reads the store first so it cannot
revert a newer deal.

## Engine

`game.ts` is the whole ruleset with no UI: a seeded deal, every legal-move
check, the move log, hints, auto-finish, and the saved record. A stored game
is the seed plus the log; loading replays it and any entry that no longer
applies marks the record corrupt - it never silently resets a board.
