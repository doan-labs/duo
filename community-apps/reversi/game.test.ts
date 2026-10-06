// Runs under `bun test`; the app bundle never imports bun:test, so the globals
// are declared here for the strict typecheck instead.
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
import { adoptGame, canUndo, derive, newGame, parsePrefs, parseTally, undoCut } from './game.ts'

declare const test: (name: string, fn: () => void) => void
declare const expect: (actual: unknown) => {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toBeNull(): void
  toBeGreaterThan(expected: number): void
  toBeGreaterThanOrEqual(expected: number): void
  toBeLessThanOrEqual(expected: number): void
  toContain(expected: unknown): void
  toBeTruthy(): void
  toBeFalsy(): void
  toHaveLength(expected: number): void
  not: { toBeNull(): void; toBe(expected: unknown): void }
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

let seed = 1
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

test('the opening gives black exactly the four diagonal moves', () => {
  const board = startBoard()
  expect(count(board)).toEqual({ b: 2, w: 2 })
  const moves = legalMoves(board, 'b')
  expect(moves.size).toBe(4)
  for (const name of ['D3', 'C4', 'F5', 'E6']) {
    expect(moves.has(cellIndex(name))).toBeTruthy()
  }
  expect(resolveTurn(board, 'b')).toEqual({ over: false, toMove: 'b', pass: null })
})

test('one move can capture in all eight directions at once', () => {
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
  expect(runs.length).toBe(8)
  expect(runs.flat()).toHaveLength(8)
  const next = applyMove(board, cellIndex('D4'), 'b')
  expect(count(next).b - count(board).b).toBe(9)
})

test('a multi-direction move flips every direction at once', () => {
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
  expect(runs.length).toBe(2)
  const next = applyMove(board, cellIndex('D4'), 'b')
  expect(count(next).b).toBe(5)
  expect(next[cellIndex('C4')]).toBe('b')
  expect(next[cellIndex('D5')]).toBe('b')
})

test('unbracketed and occupied cells are never legal', () => {
  const board = startBoard()
  expect(flipsFor(board, cellIndex('A1'), 'b').length).toBe(0)
  expect(flipsFor(board, cellIndex('D4'), 'b').length).toBe(0)
  expect(legalMoves(board, 'b').has(cellIndex('A1'))).toBeFalsy()
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
  expect(legalMoves(lonely, 'b').size).toBe(0)
})

test('a side with no moves passes while the other keeps playing', () => {
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
  expect(resolveTurn(board, 'b')).toEqual({ over: false, toMove: 'w', pass: 'b' })
})

test('a forced pass appears in the replayed log', () => {
  // This real line leaves black with no move after white's C1.
  const d = derive(cells('D3', 'C3', 'B3', 'B2', 'B1', 'A1', 'F5', 'D6', 'D7', 'C1'))
  expect(d.plies).toBe(10)
  expect(d.over).toBeNull()
  expect(d.toMove).toBe('w')
  const tail = d.log.at(-1)!
  expect(tail.kind).toBe('pass')
  expect(tail.kind === 'pass' ? tail.side : '').toBe('b')
})

test('a finished game reports the winner and exact score', () => {
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
  expect(d.plies).toBe(60)
  expect(d.over).not.toBeNull()
  expect(d.over!.winner).toBe('w')
  expect(d.scores).toEqual({ b: 31, w: 33 })
  expect(d.toMove).toBeNull()
})

test('an unfinishable position ends the game with the score standing', () => {
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
  expect(legalMoves(board, 'b').size).toBe(0)
  expect(legalMoves(board, 'w').size).toBe(0)
  expect(resolveTurn(board, 'b').over).toBeTruthy()
})

test('a perfectly even board is a draw', () => {
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
  expect(scores.b).toBe(32)
  expect(scores.w).toBe(32)
  expect(legalMoves(board, 'b').size).toBe(0)
  expect(resolveTurn(board, 'b').over).toBeTruthy()
})

test('adoptGame hydrates wire strings and drops an illegal tail', () => {
  const game = newGame('peer', 'solo', 'Hard', 'b')
  game.moves = cells('F5', 'D6')
  const adopted = adoptGame(JSON.stringify(game), 'me')
  expect(adopted.moves).toEqual(game.moves)
  expect(adopted.level).toBe('Hard')
  expect(adopted.by).toBe('peer')

  const corrupt = JSON.stringify({ ...game, by: 'x', moves: [...game.moves, cellIndex('A1')] })
  expect(adoptGame(corrupt, 'me').moves).toEqual(game.moves)
  expect(adoptGame('{not json', 'me').moves).toEqual([])
  expect(adoptGame(null, 'me').moves).toEqual([])
  // Wrong-typed fields fall back to defaults, not crashes.
  const weird = JSON.stringify({ moves: 'nope', level: 'impossible', mode: 'weird' })
  const adoptedWeird = adoptGame(weird, 'me')
  expect(adoptedWeird.moves).toEqual([])
  expect(adoptedWeird.level).toBe('Medium')
  expect(adoptedWeird.mode).toBe('solo')
})

test('undo in solo returns to the human turn, local takes one ply', () => {
  const game = newGame('me', 'solo', 'Medium', 'b')
  game.moves = cells('F5', 'D6') // me, bot
  expect(derive(game.moves).toMove).toBe('b')
  expect(undoCut(game)).toEqual([])

  const local = newGame('me', 'local', 'Medium', 'b')
  local.moves = cells('F5', 'D6')
  expect(undoCut(local)).toEqual(cells('F5'))

  // While the bot has not answered, undo still rolls back the human move.
  const pending = newGame('me', 'solo', 'Medium', 'b')
  pending.moves = cells('F5')
  expect(derive(pending.moves).toMove).toBe('w')
  expect(undoCut(pending)).toEqual([])

  expect(canUndo(pending, derive(pending.moves), false)).toBeTruthy()
  expect(canUndo(newGame('me', 'solo', 'Medium', 'b'), derive([]), false)).toBeFalsy()
  expect(canUndo(pending, derive(pending.moves), true)).toBeFalsy()
})

test('every level only ever returns legal moves', () => {
  seed = 7
  const d = derive(cells('F5', 'D6', 'C5', 'F4', 'D3', 'C4'))
  for (const level of LEVELS) {
    for (let i = 0; i < 6; i++) {
      const pick = chooseMove(d.board, d.toMove!, level, rng)
      expect(pick).not.toBeNull()
      expect(d.legal.has(pick!.at)).toBeTruthy()
    }
  }
  expect(
    chooseMove(
      boardOf(['wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwwb', 'wwwwwww.', 'wwwwwwww']),
      'b',
      'Hard',
      rng
    )
  ).toBeNull()
})

test('medium and hard both take a corner over a side move', () => {
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
    expect(chooseMove(board, 'b', 'Medium', rng)!.at).toBe(cellIndex('A8'))
  }
  expect(chooseMove(board, 'b', 'Hard', rng)!.at).toBe(cellIndex('A8'))
})

test('evaluate prefers the mover having more mobility', () => {
  const shut = boardOf(['wb......', 'bb......', '........', '........', '........', '........', '........', '........'])
  expect(evaluate(shut, 'w')).toBeGreaterThan(evaluate(shut, 'b'))
  expect(typeof evaluate(startBoard(), 'b')).toBe('number')
})

test('tally and prefs hydrate honestly from wire strings', () => {
  expect(parseTally(null)).toEqual({ black: 0, white: 0, draws: 0, lastGame: null })
  expect(parseTally('{bad')).toEqual({ black: 0, white: 0, draws: 0, lastGame: null })
  expect(parseTally('{"black":3,"white":2,"draws":1,"lastGame":"g"}')).toEqual({
    black: 3,
    white: 2,
    draws: 1,
    lastGame: 'g'
  })
  expect(parsePrefs(null)).toEqual({ hints: true, muted: false })
  expect(parsePrefs('{"muted":true,"hints":false}')).toEqual({ hints: false, muted: true })
})

test('cellName and cellIndex round-trip every square', () => {
  for (let i = 0; i < CELLS; i++) {
    expect(cellIndex(cellName(i))).toBe(i)
  }
  expect(cellIndex('z9')).toBe(-1)
})
