# Reversi

The classic 8x8 disc-flipping game for Duo. Play solo against three honestly
differentiated engines, or hand the phone over for local pass-and-play.

## Playing

- Black moves first. Tap any cell showing a hint dot to place a disc; every
  bracketed run of the other colour flips over. Hovering a legal cell ghosts
  the disc and rings the discs that would flip.
- Solo mode plays Easy, Medium or Hard. The label is the real engine: Easy
  picks a uniformly random legal move, Medium greedily evaluates the board one
  ply deep with a positional table plus a little noise, and Hard runs a
  negamax alpha-beta search with iterative deepening that reads traps, forced
  passes and endgames - and solves the last squares exactly.
- Two players is local pass-and-play on the same board.
- When the side to move has no legal move it passes automatically and the
  other side plays on; when nobody can move the game ends and the score
  stands, draw included.
- Undo takes back a ply in two-player mode; solo it rewinds to your turn - two
  plies after the bot answered, one while it has not. It is disabled while the
  bot is thinking.
- New game, a mode switch or a colour switch with a live match always asks
  first; Escape, the scrim or Cancel backs out and focus returns to the
  control that asked.
- Keyboard: arrows move the cell focus, Enter/Space places, U undoes, N asks
  for a new game, H toggles hints, M mutes.
- The match tally card counts black wins, white wins and draws across games.

## Persistence

The running match (mode, level, your colour and the full move list) is written
to app storage on every change, so folding the phone hands the identical
position to the other display and relaunching resumes it. Hints and the mute
switch persist the same way. Passes are never stored - they are forced, so the
replay inserts them itself.

The bot only thinks on the display being looked at, and it re-reads the latest
wire state inside its think timer: an undo, reset or foreign write during the
beat cancels the reply, so no stale or duplicate bot turns exist.

## Sound and motion

A soft knock places a disc, a second tick rides the flip cascade, a low double
tap marks a pass, and a short win/lose/draw jingle lands once per game on the
active display only. Audio unlocks on the first real gesture and the speaker
button mutes everything, persisted. Discs flip over with a staged rotateY
cascade that honours reduced-motion by dropping to instant colour changes.

## Verification

- `bun test community-apps/reversi` - deterministic engine, replay, undo,
  wire-hydration and bot-legality tests, including an all-eight-directions
  capture, a real forced pass and a played-out 60-ply game.
- `bun packages/cli/index.mjs check community-apps/reversi` - manifest,
  source, design-token and strict typecheck gates.
- `bun packages/cli/index.mjs build community-apps/reversi` - bundle well
  under the 4 MiB cap.
- `bun scripts/check-app-tokens.ts` - zero design literals.
- `bun scripts/check-platform.ts` - platform contract checks.
- `bun scripts/check-submissions.ts community-apps/reversi` - required files,
  registry entry and screenshots.
