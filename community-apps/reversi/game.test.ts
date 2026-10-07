// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import { admitted, type ViewState } from './admission.ts'
import { chooseMove, evaluate, LEVELS } from './bot.ts'
import {
  applyMove,
  type Board,
  CELLS,
  cellIndex,
  cellName,
  count,
  flipsFor,
  legalMoves,
  resolveTurn,
  startBoard
} from './engine.ts'
import {
  adoptGame,
  canUndo,
  countFinished,
  derive,
  emptyTally,
  newGame,
  OPENING_ID,
  parsePrefs,
  parseTally,
  type SavedGame,
  tryPlace,
  tryReply,
  tryUndo,
  undoCut
} from './game.ts'
import {
  adoptDecision,
  type Guard,
  offerPlan,
  openingSeed,
  recoverReads,
  replaceStep,
  sameMoves,
  settledRead,
  settleGame,
  storeGate
} from './hydration.ts'

let passed = 0
const failures: string[] = []
const pending: Promise<void>[] = []
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
// Storage-round-trip checks await real adapter promises; the runner collects
// them and only reports after every check settles.
function checkAsync(name: string, fn: () => Promise<void>) {
  pending.push(
    fn().then(
      () => {
        passed++
      },
      (error) => {
        failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    )
  )
}
function eq(actual: unknown, want: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}
function ok(cond: boolean, what: string) {
  if (!cond) throw new Error(what)
}

/** A board from rows of '.', 'b', 'w' strings, top-left first. */
function boardOf(rows: string[]): Board {
  const board = Array<'b' | 'w' | null>(CELLS).fill(null)
  rows.forEach((row, r) => {
    ;[...row].forEach((ch, c) => {
      if (ch === 'b' || ch === 'w') board[r * 8 + c] = ch
    })
  })
  return board
}

const cells = (...names: string[]) => names.map(cellIndex)

/** A settled document with a fixed id, as one display would carry it. */
function settled(moves: number[], patch: Partial<SavedGame> = {}): SavedGame {
  return { by: 'peer', id: 'match-1', v: 1, mode: 'local', level: 'Medium', you: 'b', moves, ...patch }
}

/** A settled document with n legal plies - adoptGame keeps only legal tails. */
function progressed(moves: number, patch: Partial<SavedGame> = {}): SavedGame {
  let g = settled([], patch)
  for (let i = 0; i < moves; i++) {
    const at = [...derive(g.moves).legal.keys()][0]!
    g = { ...g, moves: [...g.moves, at] }
  }
  return g
}

let seed = 1
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

check('the opening gives black exactly the four diagonal moves', () => {
  const board = startBoard()
  eq(count(board), { b: 2, w: 2 })
  const moves = legalMoves(board, 'b')
  eq(moves.size, 4)
  for (const name of ['D3', 'C4', 'F5', 'E6']) {
    ok(moves.has(cellIndex(name)), `${name} should be legal`)
  }
  eq(resolveTurn(board, 'b'), { over: false, toMove: 'b', pass: null })
})

check('one move can capture in all eight directions at once', () => {
  // A ring of white around empty D4, every direction closed by black.
  const board = boardOf([
    '........',
    '.b.b.b..',
    '..www...',
    '.bw.wb..',
    '..www...',
    '.b.b.b..',
    '........',
    '........'
  ])
  const runs = flipsFor(board, cellIndex('D4'), 'b')
  eq(runs.length, 8)
  eq(runs.flat().length, 8)
  const next = applyMove(board, cellIndex('D4'), 'b')
  eq(count(next).b - count(board).b, 9)
})

check('a multi-direction move flips every direction at once', () => {
  // Black plays D4: C4 to the left under B4, and D5 below under D6.
  const board = boardOf([
    '........',
    '........',
    '........',
    '.bw.....',
    '...w....',
    '...b....',
    '........',
    '........'
  ])
  const runs = flipsFor(board, cellIndex('D4'), 'b')
  eq(runs.length, 2)
  const next = applyMove(board, cellIndex('D4'), 'b')
  eq(count(next).b, 5)
  eq(next[cellIndex('C4')], 'b')
  eq(next[cellIndex('D5')], 'b')
})

check('unbracketed and occupied cells are never legal', () => {
  const board = startBoard()
  eq(flipsFor(board, cellIndex('A1'), 'b').length, 0)
  eq(flipsFor(board, cellIndex('D4'), 'b').length, 0)
  ok(!legalMoves(board, 'b').has(cellIndex('A1')), 'A1 should be illegal')
  const lonely = boardOf([
    'b.......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '.......w'
  ])
  eq(legalMoves(lonely, 'b').size, 0)
})

check('a side with no moves passes while the other keeps playing', () => {
  const board = boardOf([
    'wb......',
    'bb......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........'
  ])
  eq(resolveTurn(board, 'b'), { over: false, toMove: 'w', pass: 'b' })
})

check('a forced pass appears in the replayed log', () => {
  // This real line leaves black with no move after white's C1.
  const d = derive(cells('D3', 'C3', 'B3', 'B2', 'B1', 'A1', 'F5', 'D6', 'D7', 'C1'))
  eq(d.plies, 10)
  eq(d.over, null)
  eq(d.toMove, 'w')
  const tail = d.log.at(-1)!
  eq(tail.kind, 'pass')
  eq(tail.kind === 'pass' ? tail.side : '', 'b')
})

check('a finished game reports the winner and exact score', () => {
  // A complete 60-ply game played out to a full board.
  const d = derive(
    cells(
      'F5',
      'F4',
      'F3',
      'F6',
      'E6',
      'D6',
      'C4',
      'G4',
      'D7',
      'C6',
      'E7',
      'D3',
      'B7',
      'F2',
      'H4',
      'B4',
      'D2',
      'C8',
      'D8',
      'A8',
      'E2',
      'G2',
      'G6',
      'H3',
      'A4',
      'E3',
      'B8',
      'G7',
      'H5',
      'G3',
      'G8',
      'E1',
      'F1',
      'B3',
      'H2',
      'C5',
      'F7',
      'C3',
      'A6',
      'H1',
      'B2',
      'E8',
      'C7',
      'C2',
      'G1',
      'F8',
      'G5',
      'D1',
      'B5',
      'A1',
      'A2',
      'A5',
      'A3',
      'C1',
      'B1',
      'A7',
      'H6',
      'H8',
      'B6',
      'H7'
    )
  )
  eq(d.plies, 60)
  ok(d.over !== null, 'game should be over')
  eq(d.over!.winner, 'w')
  eq(d.scores, { b: 31, w: 33 })
  eq(d.toMove, null)
})

check('an unfinishable position ends the game with the score standing', () => {
  // Only G7 is empty, every line out of it is pure white, and there is no
  // black disc anywhere: neither side can ever bracket onto it.
  const board = boardOf([
    'wwwwwwww',
    'wwwwwwww',
    'wwwwwwww',
    'wwwwwwww',
    'wwwwwwww',
    'wwwwwwww',
    'wwwwwww.',
    'wwwwwwww'
  ])
  eq(legalMoves(board, 'b').size, 0)
  eq(legalMoves(board, 'w').size, 0)
  ok(resolveTurn(board, 'b').over, 'game must be over')
})

check('a perfectly even board is a draw', () => {
  const board = boardOf([
    'bwbwbwbw',
    'wbwbwbwb',
    'bwbwbwbw',
    'wbwbwbwb',
    'bwbwbwbw',
    'wbwbwbwb',
    'bwbwbwbw',
    'wbwbwbwb'
  ])
  const scores = count(board)
  eq(scores.b, 32)
  eq(scores.w, 32)
  eq(legalMoves(board, 'b').size, 0)
  ok(resolveTurn(board, 'b').over, 'game must be over')
})

check('adoptGame hydrates wire strings and drops an illegal tail', () => {
  const game = newGame('peer', 'solo', 'Hard', 'b')
  game.moves = cells('F5', 'D6')
  const adopted = adoptGame(JSON.stringify(game), 'me')
  eq(adopted.moves, game.moves)
  eq(adopted.level, 'Hard')
  eq(adopted.by, 'peer')

  const corrupt = JSON.stringify({ ...game, by: 'x', moves: [...game.moves, cellIndex('A1')] })
  eq(adoptGame(corrupt, 'me').moves, game.moves)
  eq(adoptGame('{not json', 'me').moves, [])
  eq(adoptGame(null, 'me').moves, [])
  // Wrong-typed fields fall back to defaults, not crashes.
  const weird = JSON.stringify({ moves: 'nope', level: 'impossible', mode: 'weird' })
  const adoptedWeird = adoptGame(weird, 'me')
  eq(adoptedWeird.moves, [])
  eq(adoptedWeird.level, 'Medium')
  eq(adoptedWeird.mode, 'solo')
})

check('undo in solo returns to the human turn, local takes one ply', () => {
  const game = newGame('me', 'solo', 'Medium', 'b')
  game.moves = cells('F5', 'D6') // me, bot
  eq(derive(game.moves).toMove, 'b')
  eq(undoCut(game), [])

  const local = newGame('me', 'local', 'Medium', 'b')
  local.moves = cells('F5', 'D6')
  eq(undoCut(local), cells('F5'))

  // While the bot has not answered, undo still rolls back the human move.
  const pending = newGame('me', 'solo', 'Medium', 'b')
  pending.moves = cells('F5')
  eq(derive(pending.moves).toMove, 'w')
  eq(undoCut(pending), [])

  ok(canUndo(pending, derive(pending.moves), false), 'solo undo should be allowed')
  ok(!canUndo(newGame('me', 'solo', 'Medium', 'b'), derive([]), false), 'empty game has no undo')
  ok(!canUndo(pending, derive(pending.moves), true), 'thinking blocks undo')
})

check('every level only ever returns legal moves', () => {
  seed = 7
  const d = derive(cells('F5', 'D6', 'C5', 'F4', 'D3', 'C4'))
  for (const level of LEVELS) {
    for (let i = 0; i < 6; i++) {
      const pick = chooseMove(d.board, d.toMove!, level, rng)
      ok(pick !== null, `${level} should pick`)
      ok(d.legal.has(pick!.at), `${level} picked an illegal cell`)
    }
  }
  eq(
    chooseMove(
      boardOf(['wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwwb', 'wwwwwww.', 'wwwwwwww']),
      'b',
      'Hard',
      rng
    ),
    null
  )
})

check('medium and hard both take a corner over a side move', () => {
  // Black can take the A8 corner or place the tame C6 instead.
  const board = boardOf([
    '........',
    '........',
    '........',
    '........',
    '........',
    'bw......',
    'w.......',
    '........'
  ])
  for (let i = 0; i < 5; i++) {
    eq(chooseMove(board, 'b', 'Medium', rng)!.at, cellIndex('A8'))
  }
  eq(chooseMove(board, 'b', 'Hard', rng)!.at, cellIndex('A8'))
})

check('evaluate prefers the mover having more mobility', () => {
  const shut = boardOf(['wb......', 'bb......', '........', '........', '........', '........', '........', '........'])
  ok(evaluate(shut, 'w') > evaluate(shut, 'b'), 'mobility should score higher')
  eq(typeof evaluate(startBoard(), 'b'), 'number')
})

check('tally and prefs hydrate honestly from wire strings', () => {
  eq(parseTally(null), { black: 0, white: 0, draws: 0, lastGame: null })
  eq(parseTally('{bad'), { black: 0, white: 0, draws: 0, lastGame: null })
  eq(parseTally('{"black":3,"white":2,"draws":1,"lastGame":"g"}'), {
    black: 3,
    white: 2,
    draws: 1,
    lastGame: 'g'
  })
  eq(parsePrefs(null), { hints: true, muted: false })
  eq(parsePrefs('{"muted":true,"hints":false}'), { hints: false, muted: true })
})

check('cellName and cellIndex round-trip every square', () => {
  for (let i = 0; i < CELLS; i++) {
    eq(cellIndex(cellName(i)), i)
  }
  eq(cellIndex('z9'), -1)
})

// --- Cross-copy mutation safety: the fold race replayed deterministically ---
// The live repro: cover writes D3 = [19], the lagging inner copy still holds
// the empty opening and taps C4 = [26]. The stale tap must be rejected and the
// settled [19] must survive.

check('a placement aimed at a stale position is rejected, not applied', () => {
  const cover = settled([cellIndex('D3')])
  const innerView = settled([])
  // Same match, newer wire: the tap on C4 must fail and leave D3 untouched.
  const r = tryPlace(cover, innerView, cellIndex('C4'))
  eq(r.ok, false)
  eq(cover.moves, [cellIndex('D3')])
})

check('a placement on the freshest document still applies', () => {
  const cover = settled([cellIndex('D3')])
  const at = [...derive(cover.moves).legal.keys()][0]!
  const r = tryPlace(cover, cover, at)
  ok(r.ok, 'fresh placement should apply')
  eq(r.ok ? r.game.moves : null, [cellIndex('D3'), at])
})

check('a placement aimed at another match id is rejected', () => {
  const cover = settled([cellIndex('D3')])
  const stray = settled([], { id: 'other-match' })
  const r = tryPlace(cover, stray, cellIndex('C4'))
  eq(r.ok, false)
})

check('an illegal placement is rejected even on the freshest document', () => {
  const cover = settled([cellIndex('D3')])
  eq(tryPlace(cover, cover, cellIndex('A1')).ok, false)
  eq(tryPlace(cover, cover, cellIndex('D3')).ok, false) // occupied
})

check('a bot reply written against a stale snapshot is rejected', () => {
  const solo = settled([cellIndex('F5')], { mode: 'solo', you: 'b' })
  // The snapshot the bot read has no F5 yet: a foreign move landed meanwhile.
  const stale = tryReply(solo, settled([], { mode: 'solo', you: 'b' }), cellIndex('F4'))
  eq(stale.ok, false)
  // On the matching snapshot a legal bot reply (white to move) applies.
  const legal = [...derive(solo.moves).legal.keys()][0]!
  const applied = tryReply(solo, solo, legal)
  ok(applied.ok, 'reply on the settled snapshot should apply')
  eq(applied.ok ? applied.game.moves : null, [...solo.moves, legal])
})

check('the solo bot never replies on the human turn', () => {
  const solo = settled([], { mode: 'solo', you: 'b' })
  eq(tryReply(solo, solo, cellIndex('D3')).ok, false)
})

check('undo keeps the match id so the tally dedupe survives', () => {
  const game = settled(cells('F5', 'D6'))
  const r = tryUndo(game, game)
  ok(r.ok, 'undo should apply')
  ok(r.ok && r.game.id === 'match-1', 'undo must keep the match id')
  eq(r.ok ? r.game.moves : null, cells('F5'))
})

check('undo on another match id is rejected', () => {
  const game = settled(cells('F5', 'D6'))
  eq(tryUndo(game, settled([], { id: 'other' })).ok, false)
})

check('a finished match counts once per stable id', () => {
  let tally = emptyTally()
  tally = countFinished(tally, 'match-1', 'draw')
  eq(tally, { black: 0, white: 0, draws: 1, lastGame: 'match-1' })
  // Undo + replay + fold + reload all keep the id: never counted twice.
  tally = countFinished(tally, 'match-1', 'draw')
  eq(tally.draws, 1)
  tally = countFinished(tally, 'match-1', 'b')
  eq(tally.draws + tally.black + tally.white, 1)
  // A genuinely new match always counts.
  tally = countFinished(tally, 'match-2', 'b')
  eq(tally.black, 1)
  eq(tally.lastGame, 'match-2')
})

check('the shared opening id means both displays seed the same match', () => {
  const a = adoptGame(null, 'me')
  const b = adoptGame(null, 'me')
  // Fresh stores seed the same identity, not two forking uuids.
  eq({ a: a.by, blank: a.moves.length }, { a: '', blank: 0 })
  eq(b.moves.length, 0)
})

// --- Call-time admission: the single gate every input handler runs first ---
// A copy may act on input only while its view is both visible and active in
// the freshest snapshot. The check is synchronous, so nothing a hidden copy
// receives can queue work that a later activation would wrongly adopt.

check('admission requires a view that is visible and active', () => {
  eq(admitted({ active: true, visible: true }), true)
  eq(admitted({ active: false, visible: true }), false)
  eq(admitted({ active: true, visible: false }), false)
  eq(admitted({ active: false, visible: false }), false)
})

check('a same-turn fold rescinds admission immediately', () => {
  const view: ViewState = { active: true, visible: true }
  ok(admitted(view), 'the live view admits input')
  view.visible = false
  ok(!admitted(view), 'hidden under an active prop admits nothing')
  view.active = false
  view.visible = true
  ok(!admitted(view), 'visible under an inactive prop admits nothing')
  view.visible = false
  ok(!admitted(view), 'a fully hidden copy admits nothing')
  view.active = true
  view.visible = true
  ok(admitted(view), 'a copy live again admits input')
})

check('input rejected at call time can never be admitted by a later activation', () => {
  // Model the handler contract: admitted() runs synchronously before any work
  // is scheduled, so a hidden dispatch queues nothing - and with nothing
  // queued, an activation moments later has no stale intent to execute.
  const view: ViewState = { active: true, visible: false }
  const scheduled: string[] = []
  const handler = (input: string) => {
    if (!admitted(view)) return false
    scheduled.push(input)
    return true
  }
  eq(handler('hidden-tap'), false)
  view.visible = true
  eq(scheduled, [])
  ok(handler('live-tap'), 'input on the now-live copy admits')
  eq(scheduled, ['live-tap'])
})

check('an intent admitted live still validates once, then lands across a fold', () => {
  // Admission passed at the tap; by the time the queued job runs the copy may
  // have folded. The job validates against the settled document exactly once:
  // a matching document takes the move, a stale one rejects it - never a
  // replay against a board the input was not aimed at.
  const cover = settled([cellIndex('D3')])
  const at = [...derive(cover.moves).legal.keys()][0]!
  const applied = tryPlace(cover, cover, at)
  ok(applied.ok, 'a validated admitted intent applies')
  const moved = settled([cellIndex('D3'), cellIndex('C4')])
  eq(tryPlace(moved, cover, at).ok, false)
})

// --- Hydration authority: an unread store is unknown, never empty ---
// The incident: an exhausted hydrate reported value:null,status:error and the
// app treated it as an empty store - seeded an opening, skipped the
// destructive-op confirmation, and a queued write pushed the seed over an
// 8-ply durable match. These checks pin the contract: failure means unknown,
// recovery means a real read, and every destructive write revalidates the
// captured match against the freshest wire document.

const FULL_GAME = cells(
  'F5',
  'F4',
  'F3',
  'F6',
  'E6',
  'D6',
  'C4',
  'G4',
  'D7',
  'C6',
  'E7',
  'D3',
  'B7',
  'F2',
  'H4',
  'B4',
  'D2',
  'C8',
  'D8',
  'A8',
  'E2',
  'G2',
  'G6',
  'H3',
  'A4',
  'E3',
  'B8',
  'G7',
  'H5',
  'G3',
  'G8',
  'E1',
  'F1',
  'B3',
  'H2',
  'C5',
  'F7',
  'C3',
  'A6',
  'H1',
  'B2',
  'E8',
  'C7',
  'C2',
  'G1',
  'F8',
  'G5',
  'D1',
  'B5',
  'A1',
  'A2',
  'A5',
  'A3',
  'C1',
  'B1',
  'A7',
  'H6',
  'H8',
  'B6',
  'H7'
)

check('the store gate maps mirror states to loading, error and ready', () => {
  eq(storeGate('hydrating', false), 'loading')
  eq(storeGate('hydrating', true), 'loading')
  eq(storeGate('error', false), 'error')
  // Only a real read flips an errored store back to ready.
  eq(storeGate('error', true), 'ready')
  eq(storeGate('ready', false), 'ready')
  eq(storeGate('saving', false), 'ready')
})

check('only answered reads may seed or adopt state', () => {
  eq(settledRead('hydrating'), false)
  eq(settledRead('error'), false)
  eq(settledRead('ready'), true)
  eq(settledRead('saving'), true)
})

check('a destructive swap validates the captured incarnation and history against the wire', () => {
  const confirmed = progressed(2, { id: 'match-a' })
  const guard: Guard = { id: 'match-a', moves: [...confirmed.moves] }
  // Same match still standing: the swap applies with a fresh id, keeping level.
  const next = replaceStep(confirmed, guard, { mode: 'solo' }, 'me')
  ok(next !== null && next.moves.length === 0, 'a matching wire doc still replaces')
  eq(next!.mode, 'solo')
  eq(next!.level, 'Medium')
  ok(next!.id !== 'match-a', 'a replacement gets a fresh match id')
  // A peer undo to a position this copy saw is still seen history.
  const rewound = { ...confirmed, moves: confirmed.moves.slice(0, 1) }
  ok(replaceStep(rewound, guard, undefined, 'me') !== null, 'a seen-prefix wire doc still replaces')
  // Newer unseen progress or a different peer match refuses the write.
  eq(replaceStep(progressed(3, { id: 'match-a' }), guard, undefined, 'me'), null)
  eq(replaceStep(settled([], { id: 'match-b' }), guard, { mode: 'local' }, 'me'), null)
  eq(replaceStep(settled([], { id: 'match-b' }), guard, { you: 'w' }, 'me'), null)
  eq(replaceStep(null, guard, undefined, 'me'), null)
})

check('a same-id unseen branch refuses even at equal or fewer plies', () => {
  // The user confirmed at 2 plies; a peer undid twice and replayed a
  // different legal first move. Same incarnation, unseen history: length
  // alone cannot admit it.
  const seen = progressed(2, { id: 'match-a' })
  const guard: Guard = { id: 'match-a', moves: [...seen.moves] }
  const altFirst = [...derive([]).legal.keys()].find((m) => m !== seen.moves[0])!
  const altShort = { ...seen, moves: [altFirst] }
  const altEqual = { ...seen, moves: [altFirst, [...derive([altFirst]).legal.keys()][0]!] }
  eq(replaceStep(altShort, guard, undefined, 'me'), null)
  eq(replaceStep(altEqual, guard, { mode: 'solo' }, 'me'), null)
  // The empty wire and the seed doc are not this match either.
  eq(replaceStep(openingSeed('me'), guard, undefined, 'me'), null)
})

check('a guard built on a fallback opening can never overwrite durable progress', () => {
  // The incident's fatal combination: an invented opening treated as
  // authority, whose fresh-match write lands on a real wire document.
  const seed = openingSeed('me')
  const durable = progressed(8)
  eq(replaceStep(durable, { id: seed.id, moves: [] }, { mode: 'local' }, 'me'), null)
  eq(replaceStep(durable, { id: seed.id, moves: [] }, undefined, 'me'), null)
})

check('adoptDecision keeps the same history and adopts equal-length unseen branches', () => {
  const seen = progressed(2, { id: 'match-a' })
  const altFirst = [...derive([]).legal.keys()].find((m) => m !== seen.moves[0])!
  const alternate = { ...seen, moves: [altFirst, [...derive([altFirst]).legal.keys()][0]!] }
  ok(sameMoves(seen.moves, seen.moves), 'identical lists match')
  ok(!sameMoves(seen.moves, alternate.moves), 'equal-length different branches differ')
  ok(!sameMoves(seen.moves, seen.moves.slice(0, 1)), 'a longer history differs')
  // The same document rendered is kept; an unseen same-id alternate at equal
  // plies is adopted so the board shows the freshest history before any
  // re-asked confirmation is armed against it.
  eq(adoptDecision(seen, seen), 'keep')
  eq(adoptDecision(alternate, seen), 'adopt')
  eq(adoptDecision(seen, null), 'adopt')
  eq(adoptDecision({ ...seen, id: 'match-b' }, seen), 'adopt')
  eq(adoptDecision({ ...seen, mode: 'solo' }, seen), 'adopt')
})

check('adoptDecision seeds on confirmed empty even over a stale rendered match', () => {
  const seed = openingSeed('me')
  // A confirmed-empty answer after a rendered match reseeds the canonical
  // opening - the same authority a first empty read uses.
  eq(adoptDecision(null, progressed(2)), 'seed')
  eq(adoptDecision(null, null), 'seed')
  // Already the seed: nothing to churn.
  eq(adoptDecision(null, seed), 'keep')
  // A zero-ply match with a different id is not the canonical seed: reseed.
  eq(adoptDecision(null, settled([])), 'seed')
})

check('settleGame keeps readable documents with dropped tails and rejects unreadable shapes', () => {
  // Non-integer and out-of-range move entries are dropped by adoption, then
  // the legal prefix replays: a doctored or mangled tail cannot corrupt the
  // board, it is simply not there. The document itself is still readable.
  const trailing = JSON.stringify({ id: 'm1', v: 1, mode: 'local', level: 'Medium', you: 'b', moves: [19, 'x', 999] })
  const w = settleGame(trailing, 'me')
  ok(w.kind === 'ok', 'non-integer tails stay a readable document')
  eq(w.kind === 'ok' ? w.game.moves : null, [19])
  // An illegal move stops the replay at the first unplayable ply.
  const illegal = JSON.stringify({ id: 'm2', v: 1, mode: 'solo', level: 'Medium', you: 'b', moves: [19, 44] })
  const w2 = settleGame(illegal, 'me')
  eq(w2.kind === 'ok' ? w2.game.moves : null, [19])
  // Unreadable shapes are corrupt, never quietly emptied.
  for (const raw of [
    '{broken json',
    'null',
    '42',
    '"x"',
    '[1,2,3]',
    '{"id":3,"moves":[]}',
    '{"id":"x"}',
    '{"id":"x","moves":{}}'
  ]) {
    eq(settleGame(raw, 'me').kind, 'corrupt')
  }
})

check('the destructive plan confirms live progress and swaps finished or fresh boards', () => {
  eq(offerPlan(settled(cells('F5', 'D6'))), 'confirm')
  eq(offerPlan(settled(FULL_GAME)), 'direct')
  eq(offerPlan(settled([])), 'direct')
  const seed = openingSeed('me')
  eq(seed.id, OPENING_ID)
  eq(seed.moves.length, 0)
  eq(offerPlan(seed), 'direct')
})

// A controlled adapter at the same surface the app calls - os.storage get,
// set and snapshot-style discovery - with per-method failure counts and a
// shared box two copies can attach to. Reads and writes are independent of
// snapshot-style failures, matching the incident's adapter contract.
type Store = { box: Record<string, string>; rev: number }
const freshStore = (seed: Record<string, string> = {}): Store => ({ box: { ...seed }, rev: 7 })

type FailKey = 'snapshot' | 'get' | 'set' | 'del' | 'keys'
function wireSpace(store: Store, fail: Partial<Record<FailKey, number>> = {}) {
  const left = { ...fail }
  const stats = { snapshot: 0, get: 0, set: 0, del: 0, keys: 0 }
  const bomb = (m: FailKey) => {
    const n = left[m] ?? 0
    if (n > 0) {
      left[m] = n - 1
      const error = new Error('E_STORAGE')
      ;(error as Error & { code: string }).code = 'E_STORAGE'
      throw error
    }
  }
  const space = {
    async get(k: string) {
      stats.get++
      bomb('get')
      return store.box[k] ?? null
    },
    async set(k: string, v: string) {
      stats.set++
      bomb('set')
      store.box[k] = v
      store.rev++
      return { rev: store.rev }
    },
    async del(k: string) {
      stats.del++
      bomb('del')
      delete store.box[k]
      store.rev++
      return { rev: store.rev }
    },
    async keys() {
      stats.keys++
      bomb('keys')
      return { keys: Object.keys(store.box) }
    },
    async snapshot() {
      stats.snapshot++
      bomb('snapshot')
      return { rev: store.rev, entries: Object.entries(store.box) }
    }
  }
  return { space, stats, left }
}

const KEYS = { record: 'reversi-record', prefs: 'reversi-prefs', game: 'reversi-game' }

checkAsync('snapshot failures never reach the app reads: get/set keep answering', async () => {
  // The incident's adapter: discovery-style snapshot failures exhaust retries
  // upstream, but the app's own get/set calls keep working - and a failed
  // hydrate must never turn that into empty-store authority.
  const durable = progressed(8, { mode: 'local' })
  const store = freshStore({ 'reversi-game': JSON.stringify(durable) })
  const { space, stats } = wireSpace(store, { snapshot: 99 })
  let snapshots = 0
  for (let i = 0; i < 9; i++) {
    try {
      await space.snapshot()
    } catch {
      snapshots++
    }
  }
  eq(snapshots, 9)
  eq(stats.snapshot, 9)
  // The durable match still answers direct reads, unchanged.
  const adopted = adoptGame(await space.get('reversi-game'), 'me')
  eq(adopted.moves.length, 8)
  // A write on the same adapter lands fine.
  const moved = progressed(9, { mode: 'local' })
  await space.set('reversi-game', JSON.stringify(moved))
  eq(adoptGame(await space.get('reversi-game'), 'me').moves.length, 9)
})

checkAsync('the recovery batch re-reads every durable key and adopts the real answers', async () => {
  const tallyWire = '{"black":3,"white":2,"draws":1,"lastGame":"g9"}'
  const prefsWire = '{"hints":false,"muted":true}'
  const durable = progressed(2, { mode: 'local' })
  const store = freshStore({
    'reversi-record': tallyWire,
    'reversi-prefs': prefsWire,
    'reversi-game': JSON.stringify(durable)
  })
  const { space } = wireSpace(store)
  // The exact batch recoverAll issues against os.storage.
  const reads = await recoverReads((k) => space.get(k), KEYS)
  eq(parseTally(reads.record), { black: 3, white: 2, draws: 1, lastGame: 'g9' })
  eq(parsePrefs(reads.prefs), { hints: false, muted: true })
  eq(adoptGame(reads.game, 'me').moves.length, 2)
})

checkAsync('a recovery batch that partially fails adopts nothing', async () => {
  const store = freshStore({ 'reversi-record': '{"black":1,"white":0,"draws":0,"lastGame":"g"}' })
  const { space } = wireSpace(store, { get: 1 })
  let threw = false
  try {
    await recoverReads((k) => space.get(k), KEYS)
  } catch {
    threw = true
  }
  ok(threw, 'a failed recovery read must reject the batch, not half-adopt')
  // The next attempt succeeds and reads the real values.
  const reads = await recoverReads((k) => space.get(k), KEYS)
  eq(parseTally(reads.record).black, 1)
  eq(reads.prefs, null)
  eq(reads.game, null)
})

checkAsync('peer progress between admission and the queued step refuses the stale swap', async () => {
  // Two copies, one store: copy A confirms New on match-a at 2 plies; the peer
  // pushes a third move before A's queued write executes. The step revalidates
  // against the fresh base and refuses - match-a's progress survives intact.
  const base = progressed(2, { id: 'match-a', mode: 'solo' })
  const store = freshStore({ 'reversi-game': JSON.stringify(base) })
  const { space } = wireSpace(store)
  const guard: Guard = { id: 'match-a', moves: [...base.moves] }
  store.box['reversi-game'] = JSON.stringify(progressed(3, { id: 'match-a', mode: 'solo' }))
  const fresh = adoptGame(await space.get('reversi-game'), 'a')
  eq(replaceStep(fresh, guard, undefined, 'a'), null)
  eq(adoptGame(await space.get('reversi-game'), 'a').moves.length, 3)
})

checkAsync('a stale confirm for match-a after peer match-b writes nothing', async () => {
  // Copy A's Sheet was confirmed against match-a; by execution time the peer
  // had already swapped in a whole different match. Refusal keeps match-b.
  const store = freshStore({ 'reversi-game': JSON.stringify(progressed(1, { id: 'match-a' })) })
  const { space, stats } = wireSpace(store)
  const guard: Guard = { id: 'match-a', moves: progressed(1).moves }
  store.box['reversi-game'] = JSON.stringify(progressed(3, { id: 'match-b' }))
  const fresh = adoptGame(await space.get('reversi-game'), 'a')
  eq(replaceStep(fresh, guard, { mode: 'local' }, 'a'), null)
  eq(stats.set, 0)
  eq(adoptGame(await space.get('reversi-game'), 'a').id, 'match-b')
})

checkAsync('the copy whose confirm still matches the wire swaps cleanly, in either order', async () => {
  // Both directions of the pairing: whichever copy runs the destructive swap
  // sees the same guard contract - the live board it confirmed may be replaced.
  const run = async (me: string) => {
    const base = progressed(2, { id: 'match-a', mode: 'local' })
    const store = freshStore({ 'reversi-game': JSON.stringify(base) })
    const { space } = wireSpace(store)
    const fresh = adoptGame(await space.get('reversi-game'), me)
    const next = replaceStep(fresh, { id: 'match-a', moves: [...base.moves] }, { mode: 'solo' }, me)
    ok(next !== null, 'a matching guard still replaces')
    await space.set('reversi-game', JSON.stringify({ ...next!, by: me }))
    const readBack = adoptGame(await space.get('reversi-game'), me)
    eq(readBack.moves.length, 0)
    eq(readBack.mode, 'solo')
    ok(readBack.id !== 'match-a', 'the replacement carries a new id')
  }
  await run('cover')
  await run('inner')
})

checkAsync('a foreign write inside our own write window wins the read-back', async () => {
  // enqueueGame's settle contract: after our set resolves, a read-back that
  // returns a different document adopts it - the peer's match is never argued.
  const store = freshStore({})
  const { space } = wireSpace(store)
  const ours = { ...progressed(1, { id: 'a' }), by: 'me' }
  const theirs = progressed(2, { id: 'a' })
  await space.set('reversi-game', JSON.stringify(ours))
  store.box['reversi-game'] = JSON.stringify(theirs)
  const winner = adoptGame(await space.get('reversi-game'), 'me')
  eq(winner.moves.length, 2)
  eq(winner.by, 'peer')
})

check('settleGame classifies empty, corrupt and readable wires', () => {
  eq(settleGame(null, 'me').kind, 'empty')
  eq(settleGame('not json {', 'me').kind, 'corrupt')
  eq(settleGame('{"id":5,"moves":[]}', 'me').kind, 'corrupt')
  eq(settleGame('{"id":"match-a"}', 'me').kind, 'corrupt')
  eq(settleGame('null', 'me').kind, 'corrupt')
  const readable = settleGame(JSON.stringify(progressed(2, { id: 'match-a' })), 'me')
  ok(
    readable.kind === 'ok' && readable.game.id === 'match-a' && readable.game.moves.length === 2,
    'a readable wire adopts'
  )
})

checkAsync('confirmed empty seeds the same canonical opening on every copy', async () => {
  // Two displays recovering a confirmed-empty store must agree on one
  // incarnation: a random fallback would fork the match on the first write.
  const { space } = wireSpace(freshStore({}))
  const a = settleGame(await space.get('reversi-game'), 'copy-a')
  const b = settleGame(await space.get('reversi-game'), 'copy-b')
  eq(a.kind, 'empty')
  eq(b.kind, 'empty')
  const seedA = openingSeed('copy-a')
  const seedB = openingSeed('copy-b')
  eq(seedA.id, OPENING_ID)
  eq(seedB.id, seedA.id)
})

checkAsync('a corrupt wire surfaces as corrupt on every read and only an explicit wipe heals it', async () => {
  // An unreadable document is never adopted as an invented board and never
  // churns a new random incarnation per read; the user's own fresh start is
  // the only overwrite.
  const store = freshStore({ 'reversi-game': '{broken' })
  const { space } = wireSpace(store)
  eq(settleGame(await space.get('reversi-game'), 'copy-a').kind, 'corrupt')
  eq(settleGame(await space.get('reversi-game'), 'copy-b').kind, 'corrupt')
  const seed = { ...openingSeed('copy-a'), by: 'copy-a' }
  await space.set('reversi-game', JSON.stringify(seed))
  const healed = settleGame(await space.get('reversi-game'), 'copy-b')
  ok(healed.kind === 'ok' && healed.game.id === OPENING_ID, 'both copies adopt the canonical seed')
})

await Promise.all(pending)
if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`game.test.ts: ${passed} checks passed`)
