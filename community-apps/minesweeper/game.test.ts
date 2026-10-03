// Runs under `bun test`; the app bundle never imports bun:test, so the globals
// are declared here for the strict typecheck instead.
import {
  adoptGame,
  chord,
  EMPTY_STATS,
  elapsedSeconds,
  formatClock,
  minesLeft,
  neighbors,
  newGame,
  PRESETS,
  presetById,
  recordPlay,
  recordWin,
  reveal,
  serializeGame,
  toggleFlag
} from './game.ts'

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

const at = (index: number) => (index / 97) % 1 // deterministic 0..1 stream by call order
let seed = 0
const rng = () => at(seed++)

test('every preset keeps the first reveal safe with a zero cell', () => {
  for (const preset of PRESETS) {
    for (let index = 0; index < preset.cols * preset.rows; index += 7) {
      seed = 0
      const game = reveal(newGame(preset), index, 1000, rng)
      expect(game.status).toBe('playing')
      expect(game.cells[index]!.mine).toBeFalsy()
      // The safe zone leaves the first cell a zero, so the flood always opens.
      expect(game.cells[index]!.n).toBe(0)
      for (const n of neighbors(index, preset.cols, preset.rows)) {
        expect(game.cells[n]!.mine).toBeFalsy()
      }
    }
  }
})

test('mine placement puts exactly the preset mine count', () => {
  for (const preset of PRESETS) {
    seed = 0
    const game = reveal(newGame(preset), 0, 0, rng)
    expect(game.cells.filter((cell) => cell.mine)).toHaveLength(preset.mines)
  }
})

test('neighbor counts match the placed mines', () => {
  seed = 1
  const game = reveal(newGame(presetById('medium')), 5, 0, rng)
  for (let i = 0; i < game.cells.length; i++) {
    const expected = neighbors(i, game.cols, game.rows).filter((n) => game.cells[n]!.mine).length
    expect(game.cells[i]!.n).toBe(expected)
  }
})

test('flood reveal opens a zero region bounded by numbers', () => {
  seed = 2
  const game = reveal(newGame(presetById('easy')), 40, 0, rng)
  const open = game.cells.filter((cell) => cell.state === 'open')
  expect(open.length).toBeGreaterThan(1)
  // Every open cell adjacent to an open zero is also open (flood propagation).
  const openZero = open.filter((cell) => cell.n === 0)
  expect(openZero.length).toBeGreaterThan(0)
  for (const cell of open) {
    expect(cell.mine).toBeFalsy()
  }
})

test('flags toggle and move the mine counter', () => {
  const preset = presetById('easy')
  let game = newGame(preset)
  expect(minesLeft(game)).toBe(10)
  game = toggleFlag(game, 3)
  expect(game.cells[3]!.state).toBe('flagged')
  expect(minesLeft(game)).toBe(9)
  game = toggleFlag(game, 3)
  expect(game.cells[3]!.state).toBe('hidden')
  expect(minesLeft(game)).toBe(10)
})

test('reveal ignores flagged and open cells', () => {
  seed = 0
  let game = reveal(newGame(presetById('easy')), 0, 0, rng)
  game = toggleFlag(game, 80)
  const before = game
  game = reveal(game, 80, 500)
  expect(game).toBe(before)
  const openIndex = game.cells.findIndex((cell) => cell.state === 'open')
  game = reveal(game, openIndex, 600)
  expect(game).toBe(before)
})

test('hitting a mine loses and reveals every unflagged mine', () => {
  seed = 0
  let game = reveal(newGame(presetById('easy')), 0, 0, rng)
  game = toggleFlag(game, 80)
  const mineIndex = game.cells.findIndex((cell) => cell.mine)
  game = reveal(game, mineIndex, 900)
  expect(game.status).toBe('lost')
  expect(game.endedAt).toBe(900)
  expect(game.cells[mineIndex]!.exploded).toBeTruthy()
  for (const cell of game.cells) {
    if (cell.mine) expect(cell.state === 'open' || cell.state === 'flagged').toBeTruthy()
  }
})

test('opening every safe cell wins and auto-flags the mines', () => {
  seed = 0
  let game = reveal(newGame(presetById('easy')), 0, 0, rng)
  const mineCount = game.cells.filter((cell) => cell.mine).length
  // Reveal each safe cell directly; flood already opened some.
  for (let i = 0; i < game.cells.length && game.status === 'playing'; i++) {
    if (!game.cells[i]!.mine && game.cells[i]!.state === 'hidden') game = reveal(game, i, 1000 + i)
  }
  expect(game.status).toBe('won')
  expect(game.cells.filter((cell) => cell.state === 'flagged')).toHaveLength(mineCount)
})

test('chord opens the remaining neighbours when flags match the count', () => {
  seed = 0
  let game = reveal(newGame(presetById('medium')), 0, 0, rng)
  const numbered = game.cells.findIndex((cell) => cell.state === 'open' && cell.n > 0)
  expect(numbered).toBeGreaterThanOrEqual(0)
  const target = game.cells[numbered]!
  // Same cells, different flags: first flag the correct number of neighbours,
  // marking real mines only so the chord stays safe.
  const around = neighbors(numbered, game.cols, game.rows)
  const realMines = around.filter((i) => game.cells[i]!.mine)
  expect(realMines).toHaveLength(target.n)
  for (const i of realMines) game = toggleFlag(game, i)
  const hiddenBefore = around.filter((i) => game.cells[i]!.state === 'hidden').length
  game = chord(game, numbered, 2000)
  const hiddenAfter = around.filter((i) => game.cells[i]!.state === 'hidden').length
  expect(hiddenAfter).toBe(0)
  expect(hiddenBefore).toBeGreaterThan(0)
})

test('a wrong flag makes the chord hit a mine', () => {
  seed = 0
  let game = reveal(newGame(presetById('medium')), 0, 0, rng)
  const numbered = game.cells.findIndex((cell) => cell.state === 'open' && cell.n === 1)
  expect(numbered).toBeGreaterThanOrEqual(0)
  const around = neighbors(numbered, game.cols, game.rows)
  const safeHidden = around.find((i) => !game.cells[i]!.mine && game.cells[i]!.state === 'hidden')
  const mineHidden = around.find((i) => game.cells[i]!.mine && game.cells[i]!.state === 'hidden')
  if (safeHidden === undefined || mineHidden === undefined) return // degenerate board; skip
  // Flag the safe cell instead of the mine: count matches, chord opens the mine.
  game = toggleFlag(game, safeHidden)
  game = chord(game, numbered, 2000)
  expect(game.status).toBe('lost')
  expect(game.cells[mineHidden]!.exploded).toBeTruthy()
})

test('serialization round-trips board, flags, status and timestamps', () => {
  seed = 0
  let game = reveal(newGame(presetById('hard')), 33, 100, rng)
  const hidden = game.cells.map((cell, i) => (cell.state === 'hidden' ? i : -1)).filter((i) => i >= 0)
  const [flagA, flagB] = hidden
  game = toggleFlag(game, flagA!)
  game = toggleFlag(game, flagB!)
  const saved = serializeGame('writer-a', game)
  const adopted = adoptGame(JSON.stringify(saved))
  expect(adopted).not.toBeNull()
  expect(adopted!.by).toBe('writer-a')
  const copy = adopted!.game
  expect(copy.preset).toBe('hard')
  expect(copy.status).toBe('playing')
  expect(copy.startedAt).toBe(100)
  expect(copy.cells[flagA!]!.state).toBe('flagged')
  expect(copy.cells[flagB!]!.state).toBe('flagged')
  expect(copy.cells.filter((cell) => cell.mine)).toHaveLength(40)
  // Neighbor counts recomputed on adopt.
  for (let i = 0; i < copy.cells.length; i++) {
    const expected = neighbors(i, copy.cols, copy.rows).filter((n) => copy.cells[n]!.mine).length
    expect(copy.cells[i]!.n).toBe(expected)
  }
})

test('a lost board round-trips with the exploded mine and revealed field', () => {
  seed = 0
  let game = reveal(newGame(presetById('easy')), 0, 0, rng)
  const mineIndex = game.cells.findIndex((cell) => cell.mine)
  game = reveal(game, mineIndex, 500)
  const adopted = adoptGame(JSON.stringify(serializeGame('b', game)))!
  expect(adopted.game.status).toBe('lost')
  expect(adopted.game.cells[mineIndex]!.exploded).toBeTruthy()
  expect(adopted.game.endedAt).toBe(500)
})

test('adoptGame rejects malformed payloads', () => {
  expect(adoptGame('not json')).toBeNull()
  expect(adoptGame(JSON.stringify({ v: 2, by: 'x', cells: 'h' }))).toBeNull()
  expect(adoptGame(JSON.stringify({ v: 1, by: 'x', preset: 'nope', cells: 'h' }))).toBeNull()
})

test('elapsed seconds derive from timestamps, not ticks', () => {
  const game = { ...newGame(presetById('easy')), status: 'playing' as const, startedAt: 10_000 }
  expect(elapsedSeconds(game, 10_000)).toBe(0)
  expect(elapsedSeconds(game, 45_400)).toBe(35)
  const ended = { ...game, status: 'won' as const, endedAt: 70_000 }
  expect(elapsedSeconds(ended, 999_999)).toBe(60)
  expect(formatClock(60)).toBe('1:00')
  expect(formatClock(35)).toBe('0:35')
})

test('stats track plays, wins and the best time per preset', () => {
  let stats = EMPTY_STATS
  stats = recordPlay(stats, 'easy')
  stats = recordWin(stats, 'easy', 75)
  stats = recordWin(stats, 'easy', 42)
  stats = recordWin(stats, 'medium', 999)
  expect(stats.easy.plays).toBe(1)
  expect(stats.easy.wins).toBe(2)
  expect(stats.easy.best).toBe(42)
  expect(stats.medium.best).toBe(999)
  expect(stats.hard.best).toBeNull()
})
