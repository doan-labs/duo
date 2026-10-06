// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
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
  parsePrefs,
  parseTally,
  type SavedGame,
  tryPlace,
  tryReply,
  tryUndo,
  undoCut
} from './game.ts'

let passed = 0
const failures: string[] = []
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
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

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`game.test.ts: ${passed} checks passed`)
