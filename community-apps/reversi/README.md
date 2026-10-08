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
  control that asked. If the board changed between the ask and the confirmed
  run - another display moved the match on, or a different match arrived -
  the write is refused and the Sheet asks again against the board now
  showing.
- Keyboard: arrows move the cell focus, Enter/Space places, U undoes, N asks
  for a new game, H toggles hints, M mutes.
- The match tally card counts black wins, white wins and draws across games.

## Persistence

The running match (mode, level, your colour and the full move list), the
tally and the preferences persist to app storage as conditional writes: every
mutation reads the entry (value plus its {rev,gen} token), derives the next
document and its write token from that exact read, and sets only if nothing
moved in between. A peer landing mid-commit refuses E_CONFLICT and the
intent is recomputed on the fresh entry - a moved document is never
overwritten by a stale base, and a checkpoint-restored generation is dead
outright - E_GONE ends the commit, never rebases. An acknowledgement the
wire cannot account for reads the same operation back once: a matching
value confirms the write landed, anything else settles honestly unknown -
a different readback cannot prove the write missed (a peer may have
overwritten it), so the intent is never replayed under a fresh token. Folding the phone
hands the identical position to the other display and relaunching resumes
it. Passes are never stored - they are forced, so the replay inserts them
itself.

The bot only thinks on the display being looked at, and it re-reads the latest
wire state inside its think timer: an undo, reset or foreign write during the
beat cancels the reply, so no stale or duplicate bot turns exist.

## Store failures

An unread store is an unknown store, never an empty one. While the SDK mirror
is still hydrating the app shows a Loading card; if the hydration retries run
out it shows an error card instead, explaining that the match and tally are
kept safe and offering Retry. No board, tally or default preferences are
invented from a failed read, so a later write can never clobber real progress
with an imagined empty store.

Retry re-reads the match, tally and preferences directly through the storage
adapter and adopts whatever actually answers - no reload needed. Simply
becoming visible and active again re-reads the wire document the same way, so
a transient outage self-heals on the next visit. A store that genuinely is
empty still seeds a fresh solo game normally - the same canonical opening on
every copy, so two recovering displays agree on one match rather than forking
invented boards. Confirmed-empty is authoritative at every read, not just the
first: when the store answers empty while a stale match is still rendered,
the board reseeds the canonical opening instead of keeping a document the
store no longer holds.

Adoption compares the whole history, not just its length: a same-id document
with an equal number of different plies is an unseen branch, so it is adopted
and shown before any re-asked confirmation is armed against it - a refused
swap can therefore always be re-confirmed once against the board actually
standing.

An answered-but-unreadable game document is a third case, honest corruption:
a card says the saved match could not be read and offers Retry plus an
explicit Start fresh. The card takes over the whole surface - corruption
found after a match was already rendered does not leave the stale board on
screen posing as durable authority, while bot, focus and timer paths stop
with it. Nothing is adopted as an invented fallback board (which would mint
a different random match per read and churn every guard), and only the
user's own click ever overwrites the unreadable bytes. Even that click is
guarded twice: Start fresh re-reads the wire, seeds only while it is still
unreadable or empty, and binds the write to that read's token - a healthy
match a peer stored after the card (or between the read and the write) is
recovered and shown instead of destroyed. Move lists stay readable on a
best-effort basis: entries that are not real cells are dropped and the
replay stops at the first illegal ply, while documents without a string id
or a moves array are corrupt.

Destructive intents - new match, mode or colour switch, or a confirmed Sheet
run - carry a guard: the match id AND the exact move history the user saw.
The queued commit re-checks the freshest settled document and lands only
when the wire still shows the confirmed history itself or a real prefix of
it - a peer's undo to a seen position - and the write itself is conditional
on that read, so the same rule holds against anything landing mid-commit. Unseen work refuses: newer plies, a different
match, or an unseen alternate branch of the same match (a peer undid and
replayed a different line), no matter how few plies it has. A refusal re-asks
against the board now showing instead of overwriting. Confirmed-empty stores
still start fresh instantly.

## Input admission

Every keyboard, pointer, button, confirmation, preference, focus, audio and
timer path is admitted synchronously at its own handler, checking the SDK's
live `os.view` snapshot - `active && visible` - rather than a React prop that
can lag in a frame that no longer renders. Input fired at a hidden copy is
rejected before it can schedule work, so it can never slip in through a later
activation. Once admitted, an intent validates exactly once against the settled
wire document and then completes: a tap taken the instant before a fold still
lands, while a stale write validates and rejects instead of clobbering the
board the other display moved to.

## Sound and motion

A soft knock places a disc, a second tick rides the flip cascade, a low double
tap marks a pass, and a short win/lose/draw jingle lands once per game on the
active display only. Audio unlocks on the first real gesture on the live
display - a hidden copy never opens or resumes an AudioContext - and the
speaker button mutes everything, persisted. Discs flip over with a staged
rotateY cascade that honours reduced-motion by dropping to instant colour
changes.

## Verification

- `bun test community-apps/reversi` - deterministic engine, replay, undo,
  wire-hydration, bot-legality and call-time admission tests, including an
  all-eight-directions capture, a real forced pass, a played-out 60-ply game
  and same-turn fold admission flips. The durable-storage checks run against
  a controlled wire adapter: exhausted snapshot hydration with working
  get/set, transient read failures, ambiguous writes and read-backs, record
  and prefs failure and recovery, both display copy orders, peer progress or
  a whole new match landing between an ask and its queued write, same-id
  unseen undo-and-replay branches refusing at equal or fewer plies and
  adopting before the re-ask, corrupt wire documents surfacing instead of
  minting random boards, guarded corrupt-wipe writes refusing to clobber
  unseen healthy progress, canonical confirmed-empty seeding on every copy
  including over a stale rendered match, stale fallback guards, legal and
  malformed tail classification, and admitted finite writes completing
  across a fold. The conditional-write checks run against a controlled
  CAS adapter: a peer commit between read and write refusing and rebasing,
  two initial-null seeds converging on one shared opening, a dead
  generation ending the commit outright, ambiguous acknowledgements read
  back once and settling wrote or honest unknown (landed-once, missed,
  peer-overwritten-same-field), failed reads never
  seeding, stale undos and equal-length alternate branches refusing,
  unbounded conflicts exhausting the bound instead of falling back
  unconditionally, and cold reopen preserving confirmed facts.
- `bun packages/cli/index.mjs check community-apps/reversi` - manifest,
  source, design-token and strict typecheck gates.
- `bun packages/cli/index.mjs build community-apps/reversi` - bundle well
  under the 4 MiB cap.
- `bun scripts/check-app-tokens.ts` - zero design literals.
- `bun scripts/check-platform.ts` - platform contract checks.
- `bun scripts/check-submissions.ts community-apps/reversi` - required files,
  registry entry and screenshots.
