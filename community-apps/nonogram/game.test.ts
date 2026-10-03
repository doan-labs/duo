// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import {
  applyCell,
  type Cell,
  clueLine,
  clues,
  countSolutions,
  FILLED,
  freshCells,
  isComplete,
  linePatterns,
  lineSatisfied,
  MARKED,
  targetFor,
  UNKNOWN,
  undoOnce
} from './game.ts'
import { gridFor, PUZZLES } from './puzzles.ts'

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

check('clueLine run-length encodes', () => {
  eq(clueLine([true, true, false, true]), [2, 1])
  eq(clueLine([true, true, true]), [3])
  eq(clueLine([false, false]), [0])
  eq(clueLine([true, false, true]), [1, 1])
})

check('clues cover every row and column', () => {
  for (const puzzle of PUZZLES) {
    const grid = gridFor(puzzle)
    const c = clues(grid)
    eq(c.rows.length, grid.rows)
    eq(c.cols.length, grid.cols)
    eq(
      c.rows.flat().reduce((a, b) => a + b, 0),
      grid.cells.filter(Boolean).length
    )
  }
})

check('linePatterns honours runs and gaps', () => {
  eq(linePatterns(5, [0]), [[]])
  eq(linePatterns(3, [3]), [[0, 1, 2]])
  eq(linePatterns(4, [1, 1]), [
    [0, 2],
    [0, 3],
    [1, 3]
  ])
  eq(linePatterns(5, [5]), [[0, 1, 2, 3, 4]])
  eq(linePatterns(2, [3]), [])
})

check('every shipped puzzle has exactly one solution', () => {
  for (const puzzle of PUZZLES) {
    const grid = gridFor(puzzle)
    eq(countSolutions(grid, 2), 1)
  }
})

check('the shipped solution satisfies its own clues', () => {
  for (const puzzle of PUZZLES) {
    const grid = gridFor(puzzle)
    const { rows, cols } = clues(grid)
    for (let r = 0; r < grid.rows; r++) eq(clueLine(grid.cells.slice(r * grid.cols, (r + 1) * grid.cols)), rows[r])
    for (let c = 0; c < grid.cols; c++)
      eq(clueLine(Array.from({ length: grid.rows }, (_, r) => grid.cells[r * grid.cols + c]!)), cols[c])
  }
})

check('applyCell and targetFor fill, mark, toggle and erase', () => {
  const cells = freshCells(gridFor(PUZZLES[0]!))
  eq(targetFor('fill', UNKNOWN), FILLED)
  eq(targetFor('fill', FILLED), UNKNOWN)
  eq(targetFor('mark', UNKNOWN), MARKED)
  eq(targetFor('erase', MARKED), UNKNOWN)
  eq(applyCell(cells, 0, FILLED), [{ i: 0, prev: UNKNOWN }])
  eq(cells[0], FILLED)
  eq(applyCell(cells, 0, FILLED), [])
  eq(applyCell(cells, -1, FILLED), [])
  eq(applyCell(cells, 999, FILLED), [])
})

check('undo restores a whole stroke in order', () => {
  const cells = freshCells(gridFor(PUZZLES[0]!))
  const edits = [...applyCell(cells, 0, FILLED), ...applyCell(cells, 1, MARKED), ...applyCell(cells, 0, UNKNOWN)]
  eq(cells[0], UNKNOWN)
  eq(cells[1], MARKED)
  undoOnce(cells, { applied: UNKNOWN, edits })
  ok(
    cells.every((c) => c === UNKNOWN),
    'undo left cells dirty'
  )
})

check('isComplete needs the exact picture and lineSatisfied reads lines', () => {
  const puzzle = PUZZLES.find((p) => p.id === 'heart')!
  const grid = gridFor(puzzle)
  const cells: Cell[] = grid.cells.map((w) => (w ? FILLED : UNKNOWN))
  eq(isComplete(cells, grid), true)
  cells[0] = UNKNOWN
  eq(isComplete(cells, grid), false)
  cells[0] = FILLED
  cells[2] = FILLED // an extra wrong fill blocks completion
  eq(isComplete(cells, grid), false)
  cells[2] = MARKED
  eq(isComplete(cells, grid), true) // an X where the picture is empty counts as correct
  eq(lineSatisfied(cells.slice(0, grid.cols), grid.cells.slice(0, grid.cols)), true)
  eq(
    lineSatisfied(
      cells.slice(0, 4).map(() => UNKNOWN),
      grid.cells.slice(0, 4)
    ),
    false
  )
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`game.test.ts: ${passed} checks passed`)
