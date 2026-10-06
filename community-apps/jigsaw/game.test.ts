// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).

import { ARTS, isArtId } from './art.ts'
import {
  BOARD_H,
  BOARD_W,
  COUNTS,
  cleanGame,
  collectBoard,
  configKey,
  filterTray,
  type Game,
  GRIDS,
  isComplete,
  kindOf,
  liveOf,
  looseCount,
  makeGrid,
  newerDoc,
  newGame,
  parseGame,
  parseLive,
  parseSaves,
  pieceEdges,
  piecePath,
  placeAt,
  placedCount,
  resetGame,
  type Saves,
  SNAP,
  sendToTray,
  serializeGame,
  serializeSaves,
  slotX,
  slotY
} from './puzzle.ts'

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
function eq(actual: unknown, want: unknown, what?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`${what ? `${what}: ` : ''}got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}
function ok(cond: boolean, what: string) {
  if (!cond) throw new Error(what)
}

check('piece ids are unique and cover the grid', () => {
  for (const count of COUNTS) {
    const g = newGame('harbour', count, 7)
    const spec = GRIDS[count]!
    eq(g.pieces.length, spec.cols * spec.rows)
    const ids = new Set(g.pieces.map((p) => p.i))
    eq(ids.size, spec.cols * spec.rows)
    for (let i = 0; i < g.pieces.length; i++) {
      const p = g.pieces[i]!
      eq(p.i, i)
      eq(p.r, Math.floor(i / spec.cols))
      eq(p.c, i % spec.cols)
    }
  }
})

check('neighbouring pieces share complementary edges', () => {
  for (const seed of [1, 7, 42]) {
    const g = makeGrid(4, 3, seed)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const e = pieceEdges(g, r, c)
        if (c + 1 < 4) eq(e.right.s, -pieceEdges(g, r, c + 1).left.s)
        if (r + 1 < 3) eq(e.bottom.s, -pieceEdges(g, r + 1, c).top.s)
        if (c > 0) eq(e.left.s, -pieceEdges(g, r, c - 1).right.s)
        if (r > 0) eq(e.top.s, -pieceEdges(g, r - 1, c).bottom.s)
      }
    }
  }
})

check('grid edges are deterministic per seed and differ across seeds', () => {
  eq(makeGrid(4, 3, 5), makeGrid(4, 3, 5))
  ok(JSON.stringify(makeGrid(4, 3, 5)) !== JSON.stringify(makeGrid(4, 3, 6)), 'same edges across seeds')
})

check('piece paths form one closed outline per piece', () => {
  const g = makeGrid(4, 3, 3)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const d = piecePath(g, r, c)
      ok(d.startsWith('M0 0'), `piece ${r},${c} path does not start at origin`)
      ok(d.endsWith('Z'), `piece ${r},${c} path is not closed`)
    }
})

check('corner and edge classification matches flat-edge counts', () => {
  const g = makeGrid(4, 3, 9)
  eq(kindOf(g, 0, 0), 'corner')
  eq(kindOf(g, 0, 3), 'corner')
  eq(kindOf(g, 2, 0), 'corner')
  eq(kindOf(g, 2, 3), 'corner')
  eq(kindOf(g, 0, 1), 'edge')
  eq(kindOf(g, 1, 0), 'edge')
  eq(kindOf(g, 1, 1), 'middle')
  for (const count of COUNTS) {
    const spec = GRIDS[count]!
    const gg = makeGrid(spec.cols, spec.rows, 11)
    const kinds = Array.from({ length: spec.rows * spec.cols }, (_, i) =>
      kindOf(gg, Math.floor(i / spec.cols), i % spec.cols)
    )
    eq(kinds.filter((k) => k === 'corner').length, 4)
    eq(kinds.filter((k) => k === 'edge').length, spec.cols * 2 + spec.rows * 2 - 8)
  }
})

check('a fresh game keeps every piece in the tray', () => {
  const g = newGame('alpine', 24, 5)
  eq(g.tray.length, g.pieces.length)
  ok(
    g.pieces.every((p) => p.z === 0),
    'some piece did not start in the tray'
  )
  eq(looseCount(g), 0)
  eq(placedCount(g), 0)
  ok(!isComplete(g), 'fresh game reads complete')
})

check('placeAt snaps a piece onto its slot inside the radius', () => {
  let g = newGame('harbour', 12, 3)
  const p = g.pieces[0]!
  const cellMin = Math.min(BOARD_W / g.cols, BOARD_H / g.rows)
  const res = placeAt(g, 0, slotX(g, p) + cellMin * (SNAP - 0.05), slotY(g, p), 1000)
  ok(res.snapped, 'piece within the snap radius was rejected')
  ok(res.game.pieces[0]!.z === 2, 'snapped piece is not locked')
  eq(res.game.pieces[0]!.x, slotX(g, p))
  eq(res.game.pieces[0]!.y, slotY(g, p))
  eq(res.game.moves, 1)
  eq(res.game.startedAt, 1000)
  eq(placedCount(res.game), 1)
  g = res.game
  const again = placeAt(g, 0, 0, 0, 2000)
  eq(again.game, g, 'a locked piece still moves')
})

check('placeAt parks far drops on the felt instead of locking', () => {
  const g = newGame('harbour', 12, 3)
  const p = g.pieces[1]!
  const res = placeAt(g, 1, slotX(g, p) + 300, slotY(g, p), 1000)
  ok(!res.snapped, 'piece outside the snap radius locked in')
  eq(res.game.pieces[1]!.z, 1)
  eq(res.game.tray.includes(1), false)
  // Felt clamp: the piece never leaves the margin around the board.
  const far = placeAt(g, 2, -500, -500, 1000)
  ok(far.game.pieces[2]!.x > -100 && far.game.pieces[2]!.y > -100, 'piece escaped the felt')
})

check('sendToTray and collectBoard conserve pieces', () => {
  let g = newGame('alpine', 24, 8)
  for (const [i, x] of [0, 1, 2, 5].entries()) {
    g = placeAt(g, [0, 1, 2, 5][i]!, 10 + x * 20, 260, 100).game
  }
  eq(looseCount(g), 4)
  g = sendToTray(g, 0)
  eq(looseCount(g), 3)
  ok(g.tray.includes(0), 'returned piece missing from tray list')
  const every = new Set([...g.pieces.filter((p) => p.z !== 0).map((p) => p.i), ...g.tray])
  eq(every.size, g.pieces.length)
  g = collectBoard(g)
  eq(looseCount(g), 0)
  const conserved = new Set([...g.pieces.map((p) => p.i)])
  eq(conserved.size, g.pieces.length)
  eq(new Set(g.tray).size, g.tray.length)
  eq(g.tray.length, g.pieces.filter((p) => p.z === 0).length)
})

check('finishing the last piece completes the game', () => {
  let g = newGame('lantern', 12, 4)
  for (const p of g.pieces) {
    const res = placeAt(g, p.i, slotX(g, p), slotY(g, p), 500 + p.i)
    g = res.game
    ok(res.snapped, `piece ${p.i} did not snap home`)
  }
  ok(isComplete(g), 'all pieces locked but the game is not complete')
  eq(g.finishedAt, 500 + g.pieces.length - 1)
  const late = placeAt(g, 0, 0, 0, 9999)
  eq(late.game, g, 'a finished game still accepts moves')
})

check('resetGame re-scatters everything but keeps the puzzle identity', () => {
  let g = newGame('harbour', 12, 4)
  g = placeAt(g, 0, slotX(g, g.pieces[0]!), slotY(g, g.pieces[0]!), 100).game
  const reset = resetGame(g, 77)
  ok(
    reset.pieces.every((p) => p.z === 0),
    'reset left pieces on the board'
  )
  eq(reset.moves, 0)
  eq(reset.finishedAt, null)
  eq(reset.startedAt, null)
  eq(reset.art, g.art)
  eq(reset.seed, g.seed)
  eq(reset.pieces.length, g.pieces.length)
})

check('filterTray picks corners and edge pieces correctly', () => {
  const g = newGame('harbour', 12, 3)
  eq(filterTray(g, 'all').length, 12)
  eq(filterTray(g, 'corner').length, 4)
  // 4x3 grid: 4 corners + (4+3)*2-8 = 6 non-corner edges = 10.
  eq(filterTray(g, 'edge').length, 10)
  const spec = GRIDS[48]!
  const g48 = newGame('harbour', 48, 3)
  eq(filterTray(g48, 'edge').length, 4 + spec.cols * 2 + spec.rows * 2 - 8)
  // Locked pieces disappear from every filter.
  const locked = placeAt(g, g.tray[0]!, slotX(g, g.pieces[g.tray[0]!]!), slotY(g, g.pieces[g.tray[0]!]!), 1).game
  eq(filterTray(locked, 'all').length, 11)
})

check('serializeGame/parseGame roundtrips live state', () => {
  let g = newGame('alpine', 24, 12)
  g = placeAt(g, 3, 50, 60, 500).game
  g = placeAt(g, 4, slotX(g, g.pieces[4]!), slotY(g, g.pieces[4]!), 600).game
  const back = parseGame(serializeGame(g))
  eq(back, g)
  // Corrupted storage drops to null instead of crashing the app.
  eq(parseGame('not json'), null)
  eq(parseGame('{"v":9}'), null)
  eq(parseGame(null), null)
})

check('cleanGame repairs a damaged tray list but keeps conservation', () => {
  let g = newGame('harbour', 12, 2)
  g = placeAt(g, 1, 30, 40, 1).game
  const broken = JSON.parse(serializeGame(g)) as Game
  broken.tray = [...broken.tray, 1]
  const cleaned = cleanGame(broken)
  ok(cleaned !== null, 'cleaner dropped a repairable game')
  eq(cleaned!.tray.includes(1), false)
  const ids = new Set([...cleaned!.tray, ...cleaned!.pieces.filter((p) => p.z !== 0).map((p) => p.i)])
  eq(ids.size, cleaned!.pieces.length)
})

check('cleanGame rejects shape violations', () => {
  eq(cleanGame(null), null)
  eq(cleanGame({ count: 13 }), null)
  const g = newGame('harbour', 12, 2)
  const dup = JSON.parse(serializeGame(g)) as Game
  dup.pieces[0] = { ...dup.pieces[0]!, i: 5 }
  eq(cleanGame(dup), null)
})

check('liveOf/parseLive roundtrips and marks foreign writers', () => {
  const g = newGame('lantern', 12, 9)
  const raw = liveOf('writer-a', 7, g, 3)
  const doc = parseLive(raw)
  ok(doc !== null, 'live doc did not parse')
  eq(doc!.by, 'writer-a')
  eq(doc!.rev, 7)
  eq(doc!.held, 3)
  eq(doc!.game, g)
  eq(parseLive('{}'), null)
  eq(parseLive(null), null)
})

check('newerDoc orders shared envelopes by revision then writer', () => {
  ok(newerDoc(2, 'a', 1, 'z'), 'higher rev loses')
  ok(!newerDoc(1, 'z', 2, 'a'), 'lower rev won')
  ok(newerDoc(3, 'b', 3, 'a'), 'writer tiebreak lost')
  ok(!newerDoc(3, 'a', 3, 'b'), 'writer tiebreak won')
  ok(!newerDoc(3, 'a', 3, 'a'), 'same doc beat itself')
})

check('saves keep one game per art:count and survive a roundtrip', () => {
  const a = newGame('harbour', 12, 1)
  const b = placeAt(newGame('alpine', 24, 2), 0, 5, 5, 9).game
  const s: Saves = {
    rev: 4,
    by: 'writer-b',
    current: configKey('alpine', 24),
    games: { [configKey('harbour', 12)]: a, [configKey('alpine', 24)]: b }
  }
  const back = parseSaves(serializeSaves(s))
  eq(back.rev, 4)
  eq(back.by, 'writer-b')
  eq(back.current, s.current)
  eq(back.games, s.games)
  // Malformed and empty docs hydrate to the rev-0 empty envelope.
  const empty = parseSaves(null)
  eq(empty.rev, 0)
  eq(Object.keys(empty.games).length, 0)
  // A saved game keyed under the wrong config is dropped.
  const bad = parseSaves(JSON.stringify({ current: 'x', games: { 'wrong:key': a } }))
  eq(bad.current, null)
  eq(Object.keys(bad.games).length, 0)
})

check('isArtId gates the art catalog', () => {
  for (const a of ARTS) ok(isArtId(a.id), `${a.id} is not an art id`)
  ok(!isArtId('mona-lisa'), 'unknown art id accepted')
})

check('reset produces a different tray order only via its seed', () => {
  const g = newGame('harbour', 12, 4)
  const a = resetGame(g, 10)
  const b = resetGame(g, 10)
  eq(a, b)
  const c = resetGame(g, 11)
  ok(JSON.stringify(a.tray) !== JSON.stringify(c.tray) || JSON.stringify(a) !== JSON.stringify(c), 'reseed did nothing')
})

if (failures.length) {
  console.error(`${failures.length} failing checks:`)
  for (const f of failures) console.error(`  ${f}`)
  throw new Error(`${failures.length} jigsaw checks failed`)
}
console.log(`jigsaw: ${passed} checks passed`)
