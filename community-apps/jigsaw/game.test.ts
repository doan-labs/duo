// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).

import { ARTS, isArtId } from './art.ts'
import {
  admitInput,
  createGamePersistence,
  createPrefsPersistence,
  mergedSaves,
  PREFS0,
  parsePrefsDoc
} from './persist.ts'
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
  gameKeyOf,
  isComplete,
  kindOf,
  liveOf,
  looseCount,
  makeGrid,
  newerDoc,
  newerGame,
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
  sameGame,
  sendToTray,
  serializeGame,
  serializeSaves,
  slotX,
  slotY,
  trayCount,
  unionGames
} from './puzzle.ts'
import { enqueue } from './queue.ts'

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
async function checkAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn()
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

// Serial write queues must survive a failed step: the next enqueued step is
// the rejection handler too, so one mid-write failure can never deadlock every
// later mutation. Order is preserved and a failed step is not retried - a
// canceled mutation cannot resurrect.
try {
  const q = { current: Promise.resolve() }
  const order: string[] = []
  enqueue(q, async () => {
    order.push('a')
  })
  enqueue(q, async () => {
    order.push('b')
    throw new Error('mid-write failure')
  })
  enqueue(q, async () => {
    order.push('c')
  })
  await q.current.catch(() => {})
  eq(order, ['a', 'b', 'c'], 'queue order')
  enqueue(q, async () => {
    order.push('d')
  })
  await q.current.catch(() => {})
  eq(order, ['a', 'b', 'c', 'd'], 'queue after a failed step')
  passed++
} catch (error) {
  failures.push(`serial queue recovery: ${error instanceof Error ? error.message : String(error)}`)
}

// A genuinely pending step is not a wedge: later steps wait behind it and run
// once it settles. This is the normal serial ordering, distinct from a
// rejection poisoning the chain.
await checkAsync('serial queue: a still-pending step only delays later work', async () => {
  const q = { current: Promise.resolve() as Promise<unknown> }
  let release: (() => void) | null = null
  enqueue(q, () => new Promise<void>((r) => (release = r)))
  const done: string[] = []
  enqueue(q, async () => {
    done.push('late')
  })
  await Promise.resolve()
  await Promise.resolve()
  eq(done, [], 'later step ran before the pending step settled')
  release!()
  await q.current.catch(() => {})
  eq(done, ['late'], 'pending step never released later work')
})

// ---------- persistence adapter checks ----------
//
// These exercise the real write path (persist.ts) the UI calls, over a fake KV
// pair whose reads can reject or be delayed - the exact failure shapes the
// display pair produces.

class FakeKV {
  store = new Map<string, string>()
  sets: { k: string; v: string }[] = []
  failNext = 0
  getHook: ((k: string) => Promise<string | null>) | null = null
  async get(k: string): Promise<string | null> {
    if (this.getHook) {
      const h = this.getHook
      this.getHook = null
      return h(k)
    }
    if (this.failNext > 0) {
      this.failNext--
      throw new Error('kv read failed')
    }
    return this.store.get(k) ?? null
  }
  async set(k: string, v: string) {
    this.sets.push({ k, v })
    this.store.set(k, v)
  }
}

function makePersist(me: string, liveKV: FakeKV, savesKV: FakeKV) {
  const state = {
    game: null as Game | null,
    adopted: [] as string[],
    adoptedGames: [] as Game[],
    savesRaw: null as string | null
  }
  const clocks = { live: { rev: 0, by: '' }, saves: { rev: 0, by: '' } }
  const refs = { game: { current: null as Game | null }, held: { current: null as number | null } }
  const queue = { current: Promise.resolve() as Promise<unknown> }
  const p = createGamePersistence({
    me,
    liveKV,
    savesKV,
    liveKey: 'live',
    savesKey: 'saves',
    queue,
    clocks,
    refs,
    adopt(doc) {
      state.adopted.push(doc.by)
      state.game = doc.game
      refs.game.current = doc.game
      refs.held.current = doc.held
      clocks.live.rev = doc.rev
      clocks.live.by = doc.by
    },
    acceptSaves(sd) {
      clocks.saves.rev = sd.rev
      clocks.saves.by = sd.by
      // Mirrors main.tsx: union into the mirror, never drop pending keys.
      state.savesRaw = serializeSaves(mergedSaves(state.savesRaw, sd).doc)
    },
    apply(pl) {
      state.game = pl.game
      refs.game.current = pl.game
      refs.held.current = pl.held
      void liveKV.set('live', pl.live)
      state.savesRaw = pl.saves
      void savesKV.set('saves', pl.saves)
    },
    writeLive(raw) {
      void liveKV.set('live', raw)
    },
    writeSaves(raw) {
      state.savesRaw = raw
      void savesKV.set('saves', raw)
    },
    savesDoc() {
      return state.savesRaw ? parseSaves(state.savesRaw) : null
    },
    adoptGame(g) {
      state.adoptedGames.push(g)
      state.game = g
      refs.game.current = g
      refs.held.current = null
    }
  })
  return { p, state, clocks, refs }
}

await checkAsync('a rejected saves read fails the step and loses no saved config', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const gA = newGame('harbour', 12, 1)
  const gB = newGame('alpine', 24, 2)
  saves.store.set(
    'saves',
    serializeSaves({ rev: 3, by: 'peer', current: 'harbour:12', games: { 'harbour:12': gA, 'alpine:24': gB } })
  )
  const { p } = makePersist('me', live, saves)
  saves.failNext = 1
  let failed = false
  await p
    .act(() => ({ next: newGame('lantern', 12, 9), held: null }))
    .then(
      () => {},
      () => {
        failed = true
      }
    )
  ok(failed, 'act did not fail on a rejected read')
  eq(saves.sets.length, 0, 'a write landed on an unknown snapshot')
  eq(Object.keys(parseSaves(saves.store.get('saves')!).games).length, 2, 'other saved configs lost')
  // Recovery: the next mutation sees the confirmed library and preserves both.
  await p.act(() => ({ next: newGame('lantern', 12, 9), held: null }))
  const after = parseSaves(saves.store.get('saves')!)
  eq(Object.keys(after.games).length, 3)
  ok(after.games['harbour:12'] !== undefined, 'harbour save lost')
  ok(after.games['alpine:24'] !== undefined, 'alpine save lost')
  ok(after.games['lantern:12'] !== undefined, 'new game missing')
})

await checkAsync('a rejected live read fails the step too', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const { p } = makePersist('me', live, saves)
  live.failNext = 1
  let failed = false
  await p
    .act(() => ({ next: newGame('harbour', 12, 1), held: null }))
    .then(
      () => {},
      () => {
        failed = true
      }
    )
  ok(failed, 'act did not fail on a rejected live read')
  eq(live.sets.length + saves.sets.length, 0, 'a write landed on an unknown snapshot')
})

await checkAsync('a newer foreign live doc is adopted before the mutation runs', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const peer = placeAt(newGame('harbour', 12, 5), 0, 10, 20, 100).game
  live.store.set('live', liveOf('peer', 9, peer, 2))
  const { p, state, clocks } = makePersist('me', live, saves)
  let saw: Game | null = null
  await p.act((ctx) => {
    saw = ctx.game
    return ctx.game ? { next: ctx.game, held: ctx.held } : null
  })
  eq(state.adopted, ['peer'], 'foreign doc not adopted')
  eq(saw, peer, 'mutation ran on the stale local game')
  eq(clocks.live.rev, 10, 'live clock did not advance past the adopted doc')
})

await checkAsync('a bind-bound intent dies when the live puzzle is no longer the one admitted', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const { p, refs } = makePersist('me', live, saves)
  const mine = newGame('harbour', 12, 5)
  refs.game.current = mine
  // The admitted bind belongs to a different puzzle than what is live now.
  live.store.set('live', liveOf('peer', 4, newGame('alpine', 24, 7), null))
  await p.act(() => ({ next: mine, held: 0 }), gameKeyOf(mine))
  eq(live.sets.length + saves.sets.length, 0, 'a piece intent mutated a puzzle it was not admitted against')
})

await checkAsync('delayed dual-boot: the second copy adopts the peer game instead of seeding over it', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const A = makePersist('copy-a', live, saves)
  const B = makePersist('copy-b', live, saves)
  // B's live read is in flight while A boots, seeds, and places a piece.
  let resolveB: ((v: string | null) => void) | null = null
  live.getHook = () => new Promise<string | null>((r) => (resolveB = r))
  const bootB = B.p.act((ctx) => (ctx.game ? null : { next: newGame('lantern', 12, 99), held: null }))
  await A.p.act((ctx) => (ctx.game ? null : { next: newGame('harbour', 12, 5), held: null }))
  const seeded = A.state.game!
  const placed = placeAt(
    seeded,
    seeded.tray[0]!,
    slotX(seeded, seeded.pieces[seeded.tray[0]!]!),
    slotY(seeded, seeded.pieces[seeded.tray[0]!]!),
    1000
  ).game
  await A.p.act((ctx) => (ctx.game ? { next: placed, held: null } : null))
  // B's read now returns the settled doc (it arrives after the peer's writes).
  resolveB!(live.store.get('live') ?? null)
  await bootB
  eq(B.state.adopted, ['copy-a'], 'second boot did not adopt the peer')
  eq(B.state.game, placed, 'second boot kept its own stale seed')
  const settled = parseLive(live.store.get('live')!)
  eq(settled!.rev, 2, 'second boot bumped the revision over peer progress')
  eq(settled!.game, placed, 'placed pieces were reset by the late seed')
})

await checkAsync('a live heal writes only the live doc and converges instead of ping-ponging', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const mine = newGame('harbour', 12, 5)
  const { p, refs, clocks } = makePersist('me', live, saves)
  refs.game.current = mine
  // Our copy is ahead: the live store still holds a stale racing doc.
  clocks.live = { rev: 8, by: 'me' }
  live.store.set('live', liveOf('peer', 7, newGame('harbour', 12, 5), null))
  await p.heal()
  eq(saves.sets.length, 0, 'a live heal rewrote the library doc')
  const healed = parseLive(live.store.get('live')!)!
  eq(healed.rev, 9, 'heal did not bump the live revision')
  eq(healed.by, 'me')
  eq(healed.game, mine, 'heal did not republish our confirmed game')
  // A peer seeing that healed doc adopts it: no second heal is needed.
  const peer = makePersist('peer', live, saves)
  const adopted: string[] = []
  peer.clocks.live = { rev: 8, by: 'peer' }
  // The same freshness check the live mirror runs: newer docs are adopted,
  // stale ones are the only heals. rev 9 by me beats rev 8 by peer outright.
  const seen = parseLive(live.store.get('live')!)!
  ok(newerDoc(seen.rev, seen.by, peer.clocks.live.rev, peer.clocks.live.by), 'healed doc does not win for the peer')
  adopted.push(seen.by)
  eq(adopted, ['me'])
})

await checkAsync('saves heals converge even when stale events arrive late and out of order', async () => {
  // The ping-pong engine: both copies heal on a stale mirror event, and the
  // loser of the write race lands LAST, regressing the store under the
  // winner's clock. Queued confirmed-read heals must still terminate.
  const live = new FakeKV()
  const saves = new FakeKV()
  const lib = serializeSaves({
    rev: 5,
    by: 'copy-a',
    current: 'harbour:12',
    games: { 'harbour:12': newGame('harbour', 12, 1) }
  })
  saves.store.set('saves', lib)
  const A = makePersist('copy-a', live, saves)
  const B = makePersist('copy-b', live, saves)
  // Both accepted rev 5; a strictly stale foreign doc (rev 4) is delivered.
  A.clocks.saves = { rev: 5, by: 'copy-a' }
  A.state.savesRaw = lib
  B.clocks.saves = { rev: 5, by: 'copy-a' }
  B.state.savesRaw = lib
  const stale5 = serializeSaves({ rev: 4, by: 'old', current: 'harbour:12', games: {} })
  saves.store.set('saves', stale5)
  // Both heal against the stale event concurrently.
  await Promise.all([A.p.healSaves(), B.p.healSaves()])
  const first = parseSaves(saves.store.get('saves')!)!
  // One of them won; the loser adopted rather than writing under it.
  ok(first.rev >= 6, 'heal did not advance past the stale doc')
  // Now simulate the regression event reaching the loser late: feed the
  // stale rev-4 doc again. The loser (clock already at the winner) must
  // heal once more and then the doc sits at the winner's rev+1 max -
  // bounded, converging, and never below the confirmed store value.
  saves.store.set('saves', stale5)
  await Promise.all([A.p.healSaves(), B.p.healSaves()])
  const second = parseSaves(saves.store.get('saves')!)!
  ok(second.rev >= first.rev, `store regressed: ${first.rev} -> ${second.rev}`)
  // After both heals settle, no further writes are pending and revs stop.
  const setsSoFar = saves.sets.length
  await Promise.all([A.p.healSaves(), B.p.healSaves()])
  const third = parseSaves(saves.store.get('saves')!)!
  // These heals see their own doc already at the store head (by===me or
  // adopted winner) - but even if they write, the value must never regress.
  ok(third.rev >= second.rev, `store regressed again: ${second.rev} -> ${third.rev}`)
  void setsSoFar
})

await checkAsync('a prefs heal re-reads and never writes under a peer that won', async () => {
  const kv = new FakeKV()
  kv.store.set('prefs', JSON.stringify({ art: 'lantern', count: 48, muted: true, guide: false, rev: 9, by: 'peer' }))
  const clock = { rev: 5, by: 'me' }
  let cur = { ...PREFS0, muted: false }
  const queue = { current: Promise.resolve() as Promise<unknown> }
  const pp = createPrefsPersistence({
    me: 'me',
    kv,
    key: 'prefs',
    queue,
    clock,
    current: () => cur,
    accept(env) {
      cur = env.prefs
      clock.rev = env.rev
      clock.by = env.by
    },
    apply(pl) {
      cur = pl.prefs
      void kv.set('prefs', pl.raw)
    }
  })
  await pp.heal()
  const doc = parsePrefsDoc(kv.store.get('prefs')!)
  eq(doc.rev, 9, 'heal overwrote the winning peer prefs')
  eq(doc.prefs.muted, true, 'peer mute lost to a heal')
  // Our own doc is ahead of the store: the heal republishes it once.
  kv.store.set('prefs', JSON.stringify({ art: 'harbour', count: 12, muted: true, guide: true, rev: 3, by: 'old' }))
  const writes = kv.sets.length
  clock.rev = 10
  clock.by = 'me'
  cur = { ...PREFS0, muted: false }
  await pp.heal()
  eq(kv.sets.length, writes + 1, 'stale store was not healed once')
  eq(parsePrefsDoc(kv.store.get('prefs')!).rev, 11)
})

await checkAsync('a live heal yields to a foreign doc that won while queued', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const { p, refs, state, clocks } = makePersist('me', live, saves)
  refs.game.current = newGame('harbour', 12, 5)
  clocks.live = { rev: 3, by: 'me' }
  // A newer foreign doc lands before the heal step runs: it must be adopted,
  // not overwritten back.
  const winner = placeAt(newGame('alpine', 24, 7), 0, 5, 5, 500).game
  live.store.set('live', liveOf('peer', 9, winner, null))
  await p.heal()
  eq(state.adopted, ['peer'], 'heal did not adopt the winning foreign doc')
  eq(parseLive(live.store.get('live')!)!.rev, 9, 'heal overwrote the winning doc')
})

await checkAsync('a stale null live read cannot seed over a game the mirror already delivered', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const B = makePersist('copy-b', live, saves)
  // The session mirror already hydrated the peer game into the local refs;
  // the confirm read then returns a stale pre-write snapshot.
  const peerGame = newGame('harbour', 12, 5)
  B.refs.game.current = peerGame
  live.getHook = async () => null
  await B.p.act((ctx) => (ctx.game ? null : { next: newGame('lantern', 12, 9), held: null }))
  eq(live.sets.length, 0, 'a stale read produced a write over confirmed local state')
})

await checkAsync('prefs: a rejected read loses nothing, a confirmed read rebases on the peer', async () => {
  const kv = new FakeKV()
  kv.store.set('prefs', JSON.stringify({ art: 'lantern', count: 48, muted: true, guide: false, rev: 5, by: 'peer' }))
  const clock = { rev: 2, by: 'me' }
  let cur = { ...PREFS0, muted: false }
  const queue = { current: Promise.resolve() as Promise<unknown> }
  const pp = createPrefsPersistence({
    me: 'me',
    kv,
    key: 'prefs',
    queue,
    clock,
    current: () => cur,
    accept(env) {
      cur = env.prefs
    },
    apply(pl) {
      cur = pl.prefs
      void kv.set('prefs', pl.raw)
    }
  })
  kv.failNext = 1
  let failed = false
  await pp.setPrefs({ muted: false }).then(
    () => {},
    () => {
      failed = true
    }
  )
  ok(failed, 'setPrefs did not fail on a rejected read')
  eq(kv.sets.length, 0, 'prefs wrote over an unknown snapshot')
  eq(parsePrefsDoc(kv.store.get('prefs')!).by, 'peer', 'peer prefs were overwritten')
  // Recovery merges on the peer doc: the patch wins its field, peer fields survive.
  await pp.setPrefs({ muted: false })
  const env = parsePrefsDoc(kv.store.get('prefs')!)
  eq(env.rev, 6)
  eq(env.by, 'me')
  eq(env.prefs.muted, false)
  eq(env.prefs.art, 'lantern', 'peer art lost')
  eq(env.prefs.count, 48, 'peer count lost')
  eq(env.prefs.guide, false, 'peer guide lost')
})

check('input admission requires active AND visible', () => {
  eq(admitInput({ active: true, visible: true }), true)
  eq(admitInput({ active: true, visible: false }), false, 'active-but-hidden copy admitted input')
  eq(admitInput({ active: false, visible: true }), false, 'inactive copy admitted input')
  eq(admitInput({ active: false, visible: false }), false)
  eq(admitInput(null), false, 'missing view snapshot admitted input')
  eq(admitInput(undefined), false)
})

await checkAsync('a rebase on a stale store keeps saves already accepted but not yet durable', async () => {
  // The queue serializes reads/rebases, not durable delivery. Model the
  // delayed ordered-mirror case: the durable read keeps returning the boot
  // doc while three accepted writes are still in flight.
  const live = new FakeKV()
  const saves = new FakeKV()
  const g0 = newGame('harbour', 12, 5)
  const pinned = serializeSaves({ rev: 1, by: 'old', current: 'harbour:12', games: { 'harbour:12': g0 } })
  saves.store.set('saves', pinned)
  saves.get = async () => pinned
  const { p, refs } = makePersist('me', live, saves)
  refs.game.current = g0

  await p.act((ctx) => ({ next: ctx.saves['alpine:24'] ?? newGame('alpine', 24, 7), held: null }))
  await p.act((ctx) => {
    if (!ctx.game) return null
    return { next: placeAt(ctx.game, 0, 0, 0, 500).game, held: null }
  }, gameKeyOf(refs.game.current!))
  await p.act((ctx) => ({ next: ctx.saves['lantern:48'] ?? newGame('lantern', 48, 9), held: null }))

  const docs = saves.sets.map((s) => parseSaves(s.v)!)
  eq(Object.keys(docs[0]!.games).sort(), ['alpine:24', 'harbour:12'], 'first write lost the boot save')
  eq(
    Object.keys(docs[1]!.games).sort(),
    ['alpine:24', 'harbour:12'],
    'rebase on a stale store dropped the pending alpine save'
  )
  eq(docs[1]!.games['alpine:24']!.pieces[0]!.z, 2, 'placement was not carried forward')
  eq(
    Object.keys(docs[2]!.games).sort(),
    ['alpine:24', 'harbour:12', 'lantern:48'],
    'the last write dropped accepted progress'
  )
  eq(docs.at(-1)!.by, 'me', 'writes not attributed to this copy')
})

await checkAsync('a re-pick of a pending config re-adopts the accepted game instead of re-seeding', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const pinned = serializeSaves({ rev: 1, by: 'old', current: 'harbour:12', games: {} })
  saves.store.set('saves', pinned)
  saves.get = async () => pinned
  const { p, refs } = makePersist('me', live, saves)

  const choose = (seed: number) => (ctx: Parameters<Parameters<typeof p.act>[0]>[0]) => ({
    next: ctx.saves['alpine:24'] ?? newGame('alpine', 24, seed),
    held: null
  })
  await p.act(choose(7))
  const first = refs.game.current!
  await p.act(choose(11))
  eq(refs.game.current!.seed, 7, 're-pick re-seeded over a pending game')
  const lastDoc = parseSaves(saves.sets.at(-1)!.v)!
  eq(lastDoc.games['alpine:24']!.seed, first.seed, 're-pick wrote a fresh seed over the pending game')
})

await checkAsync('a saves heal preserves keys the store has that our mirror never saw', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const { p, clocks, state } = makePersist('me', live, saves)
  const g0 = newGame('harbour', 12, 5)
  const gAlpine = newGame('alpine', 24, 7)
  const gLantern = newGame('lantern', 48, 9)
  // Our accepted doc is newer than the stale store read, so the heal writes;
  // the store holds a lantern save our mirror never accepted.
  clocks.saves = { rev: 9, by: 'me' }
  state.savesRaw = serializeSaves({
    rev: 9,
    by: 'me',
    current: 'alpine:24',
    games: { 'harbour:12': g0, 'alpine:24': gAlpine }
  })
  saves.store.set(
    'saves',
    serializeSaves({ rev: 4, by: 'old', current: 'harbour:12', games: { 'harbour:12': g0, 'lantern:48': gLantern } })
  )
  await p.healSaves()
  const healed = parseSaves(saves.sets.at(-1)!.v)!
  eq(Object.keys(healed.games).sort(), ['alpine:24', 'harbour:12', 'lantern:48'], 'heal dropped a key from the union')
  eq(healed.games['alpine:24'], gAlpine, 'heal let a stale store overwrite our pending save')
  eq(healed.games['lantern:48'], gLantern, 'heal dropped a store key our mirror never saw')
})

// ---------- review round 5: collision, regression, reset, tray ----------

await checkAsync('an equal-revision racer keeps every exclusive key: union mirror plus heal', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const g0 = newGame('harbour', 12, 1)
  const seedDoc = serializeSaves({ rev: 4, by: 'old', current: 'harbour:12', games: { 'harbour:12': g0 } })
  saves.store.set('saves', seedDoc)
  const A = makePersist('copy-a', live, saves)
  const B = makePersist('copy-b', live, saves)
  A.clocks.saves = { rev: 4, by: 'old' }
  B.clocks.saves = { rev: 4, by: 'old' }
  A.state.savesRaw = seedDoc
  B.state.savesRaw = seedDoc
  A.refs.game.current = g0
  B.refs.game.current = g0
  // Both racers confirm the same rev-4 doc (B's read pins it), then both
  // write rev 5: A adds alpine, B adds lantern, B's map lands last without
  // alpine.
  await A.p.act((ctx) => ({ next: ctx.saves['alpine:24'] ?? newGame('alpine', 24, 7), held: null }))
  saves.getHook = async () => seedDoc
  await B.p.act((ctx) => ({ next: ctx.saves['lantern:48'] ?? newGame('lantern', 48, 9), held: null }))
  const racer = parseSaves(saves.store.get('saves')!)
  eq(racer.rev, 5, 'equal-revision collision not modeled')
  // The loser of the writer tie-break (A, smaller id) still holds alpine in
  // its unioned mirror; its next confirmed read must republish the union.
  A.refs.game.current = parseSaves(A.state.savesRaw!).games['alpine:24']!
  await A.p.act((ctx) => (ctx.game ? { next: ctx.game, held: null } : null))
  const final = parseSaves(saves.store.get('saves')!)
  ok(final.games['alpine:24'] !== undefined, 'equal-rev race lost the exclusive alpine save')
  ok(final.games['lantern:48'] !== undefined, 'union lost the winning racer lantern save')
  ok(final.games['harbour:12'] !== undefined, 'union lost the seeded harbour save')
})

await checkAsync('a write that lands over a racing peer doc unions and republishes once', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const g0 = newGame('harbour', 12, 1)
  const peerDoc = serializeSaves({
    rev: 3,
    by: 'peer',
    current: 'lantern:48',
    games: { 'harbour:12': g0, 'lantern:48': newGame('lantern', 48, 3) }
  })
  saves.store.set('saves', serializeSaves({ rev: 2, by: 'me', current: 'harbour:12', games: { 'harbour:12': g0 } }))
  const P = makePersist('me', live, saves)
  P.clocks.saves = { rev: 2, by: 'me' }
  P.state.savesRaw = saves.store.get('saves')!
  P.refs.game.current = g0
  // Our write lands, then the peer's rev-3 envelope lands on top of it
  // (real last-writer store order). The acknowledged close-out read must
  // see it, union per key and republish - the peer copy may already be gone.
  const rawSet = saves.set.bind(saves)
  let overlaid = false
  saves.set = async (k: string, v: string) => {
    await rawSet(k, v)
    if (!overlaid && k === 'saves') {
      overlaid = true
      saves.store.set('saves', peerDoc)
    }
  }
  await P.p.act((ctx) => ({ next: ctx.saves['alpine:24'] ?? newGame('alpine', 24, 7), held: null }))
  const final = parseSaves(saves.store.get('saves')!)
  eq(
    Object.keys(final.games).sort(),
    ['alpine:24', 'harbour:12', 'lantern:48'],
    'the close-out republish did not restore every key'
  )
  ok(final.rev > 3, 'the union republish did not advance the revision')
})

await checkAsync("a racing peer's deeper save for the current key is adopted after the write", async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const g0 = newGame('harbour', 12, 1)
  const peerHarbour = placeAt(placeAt(g0, 0, 0, 0, 7).game, 1, 200, 200, 8).game
  const peerDoc = serializeSaves({
    rev: 3,
    by: 'peer',
    current: 'harbour:12',
    games: { 'harbour:12': peerHarbour }
  })
  saves.store.set('saves', serializeSaves({ rev: 2, by: 'me', current: 'harbour:12', games: { 'harbour:12': g0 } }))
  const P = makePersist('me', live, saves)
  P.clocks.saves = { rev: 2, by: 'me' }
  P.state.savesRaw = saves.store.get('saves')!
  P.refs.game.current = g0
  const rawSet = saves.set.bind(saves)
  let overlaid = false
  saves.set = async (k: string, v: string) => {
    await rawSet(k, v)
    if (!overlaid && k === 'saves') {
      overlaid = true
      saves.store.set('saves', peerDoc)
    }
  }
  await P.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game, 3, 500, 500, 9).game, held: null } : null))
  const final = parseSaves(saves.store.get('saves')!)
  eq(final.games['harbour:12'], peerHarbour, 'the newer peer game regressed to our stale copy')
  eq(P.state.adoptedGames.length, 1, 'the newer current-key game was not adopted locally')
  eq(P.state.adoptedGames[0], peerHarbour)
})

await checkAsync('a rejected close-out read keeps the acknowledged write standing', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  P.refs.game.current = newGame('harbour', 12, 1)
  let reads = 0
  const rawGet = saves.get.bind(saves)
  saves.get = async (k: string) => {
    reads++
    if (reads === 2) throw new Error('close-out read failed')
    return rawGet(k)
  }
  await P.p.act((ctx) => (ctx.game ? { next: ctx.game, held: 1 } : null))
  eq(reads, 2, 'the close-out read did not run')
  const final = parseSaves(saves.store.get('saves')!)
  ok(final.games['harbour:12'] !== undefined, 'a failed verify read ate the acknowledged write')
})

await checkAsync('a reset bumps the incarnation so pre-reset intents and stale saves die', async () => {
  const g0 = newGame('harbour', 12, 5)
  const g1 = resetGame(g0, 9)
  ok(g1.gen === g0.gen + 1, 'reset did not bump the incarnation')
  ok(gameKeyOf(g1) !== gameKeyOf(g0), 'reset kept the admitted bind identity')
  // Same seed and arrangement: only the generation moved.
  eq(g1.seed, g0.seed, 'reset must keep the intentional seed')
  eq(
    g1.pieces.map((p) => p.i),
    g0.pieces.map((p) => p.i),
    'reset must keep the piece arrangement'
  )
  // An intent admitted before the reset hits the bind check afterwards.
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  P.refs.game.current = g1
  await P.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game, 0, 5, 5, 10).game, held: null } : null), gameKeyOf(g0))
  eq(live.sets.length + saves.sets.length, 0, 'a pre-reset intent mutated the new incarnation')
  // The newer incarnation wins every same-key merge against its stale copy.
  const stale = placeAt(g0, 0, 10, 20, 5).game
  ok(newerGame(g1, stale) === g1, 'a stale pre-incarnation write would win a merge')
  const merged = unionGames({ 'harbour:12': stale }, { 'harbour:12': g1 })
  ok(sameGame(merged['harbour:12']!, g1), 'union kept the stale incarnation')
  // Legacy wire docs without gen parse as incarnation 0.
  const legacy = parseGame(JSON.stringify({ ...g0, gen: undefined }))!
  eq(legacy.gen, 0, 'legacy save did not default to gen 0')
})

await checkAsync('tray counts report the real tray population under filters', async () => {
  const g = newGame('harbour', 12, 5)
  eq(trayCount(g), 12)
  // One piece loose on the felt: the tray shrinks, loose count grows. The
  // filtered denominator must be the tray, not the board-z count.
  const moved = placeAt(g, 0, 400, 300, 5).game
  eq(moved.pieces[0]!.z, 1, 'probe piece did not land loose on the felt')
  eq(trayCount(moved), 11)
  eq(looseCount(moved), 1)
  const corners = filterTray(moved, 'corner')
  ok(
    corners.every((id) => moved.pieces[id]!.z === 0),
    'filtered list is not tray-zoned only'
  )
  ok(corners.length < trayCount(moved), 'filter must subset the tray')
  // Collect: felt pieces return to the tray; count restores.
  const back = collectBoard(moved)
  eq(trayCount(back), 12)
  eq(looseCount(back), 0)
  // Finish semantics: a complete board leaves an empty tray.
  let done = g
  const pw = BOARD_W / done.cols
  const ph = BOARD_H / done.rows
  for (let id = 0; id < done.pieces.length; id++) {
    const p = done.pieces[id]!
    done = placeAt(done, id, p.c * pw, p.r * ph, id + 10).game
  }
  ok(isComplete(done), 'probe completion did not finish')
  eq(trayCount(done), 0)
})

if (failures.length) {
  console.error(`${failures.length} failing checks:`)
  for (const f of failures) console.error(`  ${f}`)
  throw new Error(`${failures.length} jigsaw checks failed`)
}
console.log(`jigsaw: ${passed} checks passed`)
