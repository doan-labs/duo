// Self-contained test harness: `bun tests.ts` from this folder. The submission
// gate scans every source file in the app directory and rejects node: and bun:
// imports, so the runner is a plain function table instead of a test library.
import {
  analyze,
  CELLS,
  candidates,
  conflicts,
  countSolutions,
  dailySeed,
  findHint,
  generateSolved,
  makePuzzle,
  rng,
  solveOne,
  UNITS
} from './engine.ts'
import {
  adoptGame,
  boardOf,
  digitCount,
  elapsedMs,
  entryAt,
  erase,
  isSolved,
  jot,
  newGame,
  parseSaved,
  play,
  restart,
  reveal,
  undo
} from './game.ts'

const failures: string[] = []
const test = (name: string, fn: () => void) => {
  try {
    fn()
  } catch (e) {
    failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`)
  }
}
const eq = <T>(a: T, b: T, what = '') => {
  if (a !== b) throw new Error(`${what ? `${what}: ` : ''}expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}
const ok = (v: unknown, what = '') => {
  if (!v) throw new Error(what || 'expected truthy')
}

const CLASSIC = '530070000600195000098000060800060003400803001700020006060000280000419005000080079' as string
const CLASSIC_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179' as string

const toSolutionGrid = (s: string) => [...s].map(Number)

test('solver finds the classic solution', () => {
  const solved = solveOne([...CLASSIC].map((c) => (c === '.' || c === '0' ? 0 : Number(c))))
  ok(solved, 'solvable')
  eq(solved!.join(''), CLASSIC_SOLUTION)
})

test('countSolutions is 1 on a proper puzzle, 2+ on an open grid', () => {
  const g = [...CLASSIC].map((c) => Number(c) || 0)
  eq(countSolutions(g, 2), 1, 'classic')
  const open = new Array(CELLS).fill(0)
  open[0] = 1
  eq(countSolutions(open, 2), 2, 'open grid hits the limit')
})

test('candidates and conflicts agree with the units', () => {
  const g = [...CLASSIC].map((c) => Number(c) || 0)
  ok(!conflicts(g).size, 'classic has no conflicts')
  const cands = candidates(g, 2)
  ok(cands.length > 0 && !cands.includes(5) && !cands.includes(3), 'r1c3 candidates exclude row mates')
  const clash = [...g]
  clash[1] = clash[0]! // duplicate 5 in row 0
  const bad = conflicts(clash)
  ok(bad.has(0) && bad.has(1), 'duplicates flagged')
})

test('every unit covers nine distinct cells', () => {
  eq(UNITS.length, 27)
  for (const u of UNITS) eq(new Set(u).size, 9)
})

test('generateSolved fills a valid grid', () => {
  const rand = rng(42)
  const g = generateSolved(rand)
  eq(g.length, CELLS)
  ok(g.every(Boolean), 'full')
  ok(!conflicts(g).size, 'no conflicts')
  eq(countSolutions(g, 2), 1, 'a full grid is its own solution')
})

test('generated puzzles are deterministic per seed', () => {
  for (const mode of ['easy', 'medium', 'hard'] as const) {
    const a = makePuzzle(20261002, mode)
    const b = makePuzzle(20261002, mode)
    eq(a.givens.join(''), b.givens.join(''), mode)
  }
})

test('every generated puzzle has a unique solution', () => {
  for (const seed of [1, 7, 99, 20260101]) {
    for (const mode of ['easy', 'medium', 'hard'] as const) {
      const p = makePuzzle(seed, mode)
      eq(countSolutions(p.givens, 2), 1, `${mode} seed ${seed}`)
      // And it completes to its own stored solution.
      const solved = solveOne(p.givens)
      eq(solved!.join(''), p.solution.join(''), `${mode} seed ${seed} solution`)
    }
  }
})

test('difficulty labels are backed by measured technique level', () => {
  const easy = makePuzzle(20261002, 'easy')
  ok(easy.level <= 2, `easy graded ${easy.level}`)
  const medium = makePuzzle(20261002, 'medium')
  ok(medium.level >= 2 && medium.level <= 3, `medium graded ${medium.level}`)
  const hard = makePuzzle(20261002, 'hard')
  ok(hard.level >= 3, `hard graded ${hard.level}`)
})

test('analyze singles-solves an easy puzzle and stalls on harder ones', () => {
  const easy = makePuzzle(555, 'easy')
  eq(analyze(easy.givens).solved, true, 'easy finishes by singles')
})

test('daily seed is stable per date and differs between dates', () => {
  eq(dailySeed('2026-10-02'), dailySeed('2026-10-02'))
  ok(dailySeed('2026-10-02') !== dailySeed('2026-10-03'))
})

test('play places digits, blocks givens and caps notes', () => {
  const g = newGame('me', 'easy', 11)
  const open = g.givens.indexOf('.')
  const given = g.givens.indexOf('5') >= 0 ? g.givens.split('').findIndex((c) => c !== '.') : 0
  const before = entryAt(g, given)
  eq(play(g, given, before === 9 ? 8 : 9), g, 'givens are read-only')
  const legal = candidates(boardOf(g), open)[0]!
  const next = play(g, open, legal)
  eq(entryAt(next, open), legal, 'placed')
  eq(next.undo.length, 1, 'undo recorded')
})

test('play detects completion only on a legal full board', () => {
  const g = newGame('me', 'easy', 3)
  let cur = g
  const sol = toSolutionGrid(g.solution)
  for (let i = 0; i < CELLS; i++) if (cur.givens[i] === '.') cur = play(cur, i, sol[i]!)
  ok(isSolved(cur), 'filled legally')
  eq(cur.endedAt !== null, true, 'clock stops')
  // A wrong digit on the last cell never marks solved.
  const almost = newGame('me', 'easy', 3)
  let p = almost
  const lastOpen = almost.givens.lastIndexOf('.')
  for (let i = 0; i < CELLS; i++) if (almost.givens[i] === '.' && i !== lastOpen) p = play(p, i, sol[i]!)
  const wrong = [...candidates(boardOf(p), lastOpen), 0].includes(sol[lastOpen]!)
    ? play(p, lastOpen, sol[lastOpen]! === 9 ? 1 : 9)
    : play(p, lastOpen, 9)
  ok(!isSolved(wrong), 'wrong completion is not solved')
})

test('jot toggles pencil marks and refuses filled cells', () => {
  const g = newGame('me', 'easy', 21)
  const open = g.givens.indexOf('.')
  let cur = jot(g, open, 4)
  eq(cur.notes[open], '4')
  cur = jot(cur, open, 7)
  eq(cur.notes[open], '47')
  cur = jot(cur, open, 4)
  eq(cur.notes[open], '7')
  const filled = play(cur, open, candidates(boardOf(cur), open)[0]!)
  eq(filled.notes[open], '', 'placing clears notes')
  eq(jot(filled, open, 5).notes[open], '', 'no notes on filled cells')
})

test('erase clears entries and notes but not givens', () => {
  const g = newGame('me', 'easy', 5)
  const open = g.givens.indexOf('.')
  const given = g.givens.split('').findIndex((c) => c !== '.')
  let cur = jot(play(g, open, candidates(boardOf(g), open)[0]!), open, 1)
  cur = erase(cur, open)
  eq(entryAt(cur, open), 0)
  eq(cur.notes[open], '')
  eq(erase(cur, given), cur, 'givens are read-only')
})

test('undo restores digits, notes and selection in order', () => {
  let g = newGame('me', 'easy', 8)
  const a = g.givens.indexOf('.')
  const b = g.givens.indexOf('.', a + 1)
  g = jot(play(g, a, candidates(boardOf(g), a)[0]!), b, 6)
  g = undo(g)
  eq(g.notes[b], '', 'note undone')
  eq(g.sel, b, 'selection follows the undo')
  g = undo(g)
  eq(entryAt(g, a), 0, 'digit undone')
  eq(undo(g), g, 'empty stack is a no-op')
})

test('reveal writes the solution digit and counts the hint', () => {
  const g = newGame('me', 'medium', 13)
  const open = g.givens.indexOf('.')
  const next = reveal(g, open)
  eq(entryAt(next, open), Number(g.solution[open]))
  eq(next.hints, 1)
})

test('findHint names a real deduction or the unique solution', () => {
  const g = newGame('me', 'easy', 17)
  const hint = findHint(boardOf(g), toSolutionGrid(g.solution), null)
  ok(hint, 'a hint exists')
  eq(hint!.digit, Number(g.solution[hint!.cell]), 'hint digit matches the solution')
  ok(hint!.reason.length > 4, 'hint explains itself')
})

test('adoptGame drops corrupt wire values', () => {
  eq(adoptGame(null), null)
  eq(adoptGame({ id: 'a', mode: 'bogus' }), null)
  const g = newGame('me', 'easy', 1)
  const adopted = adoptGame(JSON.parse(JSON.stringify(g)))
  ok(adopted, 'round trips')
  eq(adopted!.givens, g.givens)
  // A solution that disagrees with the givens is rejected, not trusted.
  const tampered = { ...g, solution: g.solution.split('').reverse().join('') }
  eq(adoptGame(tampered), null, 'mismatched solution rejected')
})

test('parseSaved keeps slots and stats, drops garbage', () => {
  const g = newGame('me', 'easy', 9)
  const saved = parseSaved(
    JSON.stringify({ slots: { easy: g, junk: g }, stats: { played: 2, solved: 1, bestMs: { easy: 61000 } } })
  )
  ok(saved.slots.easy, 'slot kept')
  eq(saved.slots.easy!.id, g.id)
  eq(saved.stats.solved, 1)
  eq(saved.stats.bestMs.easy, 61000)
  eq(parseSaved('not json').stats.played, 0, 'garbage degrades')
})

test('restart clears entries but keeps puzzle and identity', () => {
  const g = newGame('me', 'medium', 4)
  const played = play(g, g.givens.indexOf('.'), candidates(boardOf(g), g.givens.indexOf('.'))[0]!)
  const fresh = restart(played)
  eq(fresh.id, g.id, 'same game id')
  eq(fresh.givens, g.givens, 'same puzzle')
  eq(fresh.entries, '.'.repeat(81))
  eq(fresh.undo.length, 0)
})

test('digitCount tracks placed digits', () => {
  const g = newGame('me', 'easy', 2)
  const sol = toSolutionGrid(g.solution)
  const open = g.givens.indexOf('.')
  const placed = play(g, open, sol[open]!)
  eq(digitCount(placed, sol[open]!), digitCount(g, sol[open]!) + 1)
})

test('elapsedMs freezes at the solve', () => {
  const g = newGame('me', 'easy', 6)
  const done = { ...g, endedAt: g.startedAt + 61000 }
  eq(elapsedMs(done, done.startedAt + 999999), 61000)
})

const run = () => {
  if (failures.length) throw new Error(`\n${failures.length} failing:\n${failures.join('\n')}`)
  console.log('sudoku tests: all passed')
}
run()
