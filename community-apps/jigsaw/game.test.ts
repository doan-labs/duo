// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).

import { ARTS, isArtId } from './art.ts'
import { admitInput, createGamePersistence, createPrefsPersistence, PREFS0, parsePrefsDoc } from './persist.ts'
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
  const state = { game: null as Game | null, adopted: [] as string[], savesRaw: null as string | null }
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
      state.savesRaw = serializeSaves(sd)
    },
    apply(pl) {
      state.game = pl.game
      refs.game.current = pl.game
      refs.held.current = pl.held
      state.savesRaw = pl.saves
      void liveKV.set('live', pl.live)
      void savesKV.set('saves', pl.saves)
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
  await p.act(() => ({ next: mine, held: 0 }), `harbour:12:${mine.seed}`)
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

if (failures.length) {
  console.error(`${failures.length} failing checks:`)
  for (const f of failures) console.error(`  ${f}`)
  throw new Error(`${failures.length} jigsaw checks failed`)
}
console.log(`jigsaw: ${passed} checks passed`)
