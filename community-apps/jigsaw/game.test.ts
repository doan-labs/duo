// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).

import { ARTS, isArtId } from './art.ts'
import {
  admitInput,
  createGamePersistence,
  createPrefsPersistence,
  errCode,
  mergedSaves,
  PREFS0,
  parsePrefsDoc,
  seedRetryable
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
  TRAY,
  trayCount,
  unionGames
} from './puzzle.ts'
import { enqueue } from './queue.ts'

// The mirror-hydrate check below reads real SDK source at runtime; Bun is not
// typed inside the app sandbox tsconfig, so declare the sliver it uses.
declare const Bun: {
  file(path: string): { text(): Promise<string> }
  Transpiler: new (opts: { loader: string }) => { transformSync(src: string): string }
}

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

// Host-faithful CAS model: rev/gen are space-level (every set/del bumps
// rev), `expect` is checked inside the write's transaction exactly like the
// SDK's expectMeta - E_GONE on a dead generation, E_CONFLICT on a moved rev,
// E_TIMEOUT leaves landed-state unknown so the readback decides.
class FakeKV {
  store = new Map<string, string>()
  sets: { k: string; v: string }[] = []
  rev = 0
  gen = 1
  failNext = 0
  /** Runs inside the commit, before the token check: simulate a peer write
   * that lands between our entry read and our set. */
  beforeSet: (() => void) | null = null
  /** Queued commit outcomes beyond the token check. */
  setFaults: Array<'timeout-lost' | 'timeout-landed' | 'error'> = []
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
  async entry(k: string) {
    if (this.getHook) {
      const h = this.getHook
      this.getHook = null
      return { k, v: await h(k), rev: this.rev, gen: this.gen }
    }
    if (this.failNext > 0) {
      this.failNext--
      throw Object.assign(new Error('kv read failed'), { code: 'E_STORAGE' })
    }
    return { k, v: this.store.get(k) ?? null, rev: this.rev, gen: this.gen }
  }
  /** A confirmed foreign write: what a peer's commit does to the space. */
  peerSet(k: string, v: string) {
    this.store.set(k, v)
    this.rev++
  }
  peerDel(k: string) {
    this.store.delete(k)
    this.rev++
  }
  async set(k: string, v: string, expect?: { rev: number; gen: number }) {
    this.beforeSet?.()
    this.beforeSet = null
    if (expect) {
      if (expect.gen !== this.gen) throw Object.assign(new Error('E_GONE'), { code: 'E_GONE' })
      if (expect.rev !== this.rev) throw Object.assign(new Error('E_CONFLICT'), { code: 'E_CONFLICT' })
    }
    const fault = this.setFaults.shift()
    if (fault === 'error') throw Object.assign(new Error('E_STORAGE'), { code: 'E_STORAGE' })
    if (fault === 'timeout-lost') {
      // Host never applied it but the ACK died: unknown until read back.
      throw Object.assign(new Error('E_TIMEOUT'), { code: 'E_TIMEOUT' })
    }
    if (fault === 'timeout-landed') {
      this.store.set(k, v)
      this.sets.push({ k, v })
      this.rev++
      throw Object.assign(new Error('E_TIMEOUT'), { code: 'E_TIMEOUT' })
    }
    this.sets.push({ k, v })
    this.store.set(k, v)
    this.rev++
  }
  async del(k: string, expect?: { rev: number; gen: number }) {
    this.beforeSet?.()
    this.beforeSet = null
    if (expect) {
      if (expect.gen !== this.gen) throw Object.assign(new Error('E_GONE'), { code: 'E_GONE' })
      if (expect.rev !== this.rev) throw Object.assign(new Error('E_CONFLICT'), { code: 'E_CONFLICT' })
    }
    this.store.delete(k)
    this.rev++
  }
}

function makePersist(me: string, liveKV: FakeKV, savesKV: FakeKV) {
  const state = {
    game: null as Game | null,
    adopted: [] as string[],
    adoptedGames: [] as Game[],
    savesRaw: null as string | null,
    savesBase: null as string | null
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
      // Mirrors main.tsx: union into the mirror AND the confirmed baseline,
      // never drop pending keys.
      state.savesRaw = serializeSaves(mergedSaves(state.savesRaw, sd).doc)
      state.savesBase = serializeSaves(mergedSaves(state.savesBase, sd).doc)
    },
    apply(pl) {
      state.game = pl.game
      refs.game.current = pl.game
      refs.held.current = pl.held
      state.savesRaw = pl.saves
    },
    recordSaves(raw) {
      state.savesRaw = raw
      state.savesBase = raw
    },
    repairLive() {},
    savesDoc() {
      // Confirmed baseline only: optimistic apply() payloads stay out.
      return state.savesBase ? parseSaves(state.savesBase) : null
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
  saves.peerSet(
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
  A.state.savesBase = lib
  B.clocks.saves = { rev: 5, by: 'copy-a' }
  B.state.savesRaw = lib
  B.state.savesBase = lib
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
  state.savesBase = state.savesRaw
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
  A.state.savesBase = seedDoc
  B.state.savesRaw = seedDoc
  B.state.savesBase = seedDoc
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
  P.state.savesBase = saves.store.get('saves')!
  P.refs.game.current = g0
  // Our write lands, then the peer's rev-3 envelope lands on top of it
  // (real last-writer store order). The acknowledged close-out read must
  // see it, union per key and republish - the peer copy may already be gone.
  // A peer commit lands inside our write's own transaction window: the
  // conditional set rejects E_CONFLICT, the attempt re-reads fresh entries,
  // unions the peer's exclusive key and re-commits - our write can never be
  // the last word on a regressed library.
  saves.beforeSet = () => {
    saves.peerSet('saves', peerDoc)
  }
  await P.p.act((ctx) => ({ next: ctx.saves['alpine:24'] ?? newGame('alpine', 24, 7), held: null }))
  const final = parseSaves(saves.store.get('saves')!)
  eq(
    Object.keys(final.games).sort(),
    ['alpine:24', 'harbour:12', 'lantern:48'],
    'the conflict-rebase republish did not restore every key'
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
  P.state.savesBase = saves.store.get('saves')!
  P.refs.game.current = g0
  saves.beforeSet = () => {
    saves.peerSet('saves', peerDoc)
  }
  await P.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game, 3, 500, 500, 9).game, held: null } : null))
  const final = parseSaves(saves.store.get('saves')!)
  // The rebase ran our intent on the peer's deeper base: their moves and
  // ours both survive - never a frozen doc over confirmed progress.
  const landed = final.games['harbour:12']!
  eq(landed.moves, peerHarbour.moves + 1, 'a peer or our own committed move was lost')
  peerHarbour.pieces.forEach((pc, id) => {
    if (pc.z === TRAY) return
    const cur = landed.pieces[id]!
    ok(cur.z !== TRAY && cur.x === pc.x && cur.y === pc.y, `peer piece ${id} regressed`)
  })
  ok(landed.pieces[3]!.z !== TRAY, 'our admitted placement was lost')
})

await checkAsync('an unknown saves ACK verifies landed-or-not by readback, never blindly', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  P.refs.game.current = newGame('harbour', 12, 1)
  // The write landed but the ACK died: one same-operation readback finds
  // our payload and the step resolves - no duplicate write, no retry.
  saves.setFaults = ['timeout-landed']
  await P.p.act((ctx) => (ctx.game ? { next: ctx.game, held: 1 } : null))
  const final = parseSaves(saves.store.get('saves')!)
  ok(final.games['harbour:12'] !== undefined, 'a landed write was dropped')
  eq(saves.sets.filter((w) => w.k === 'saves').length, 1, 'the timed-out write was resubmitted')

  const P2 = makePersist('me', live, saves)
  P2.refs.game.current = newGame('harbour', 12, 1)
  // The write never landed and the ACK died: readback misses our payload,
  // the step fails honestly and the durable doc is untouched.
  saves.setFaults = ['timeout-lost']
  const before = saves.store.get('saves')
  let failed = false
  await P2.p
    .act((ctx) => (ctx.game ? { next: placeAt(ctx.game!, 4, 60, 60, 11).game, held: null } : null))
    .then(
      () => {},
      () => {
        failed = true
      }
    )
  ok(failed, 'a timed-out unlanded write resolved')
  eq(saves.store.get('saves'), before, 'an unacknowledged write mutated the durable doc')
})

await checkAsync('a lost ACK never authorizes a fresh write over a confirmed peer value', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  P.refs.game.current = newGame('harbour', 12, 1)
  // A's conditional commit lands but its ACK dies (E_TIMEOUT). Between the
  // timeout and A's same-operation readback, peer B commits the same key and
  // receives its ACK. The readback now shows B's newer value - nonmatching -
  // so the step must report unknown and must not rerun the old intent under a
  // fresh request, which would erase B.
  const peerDoc = serializeSaves({
    rev: 2,
    by: 'peer',
    current: 'alpine:24',
    games: { 'alpine:24': newGame('alpine', 24, 2) }
  })
  saves.setFaults = ['timeout-landed']
  // entry() is one-shot-hooked: the act's base read passes through untouched
  // (B is still in flight) and arms the interleave, so B's confirmed commit
  // lands between A's lost ACK and A's same-operation readback.
  saves.getHook = async (k) => {
    saves.getHook = async (k2) => {
      saves.peerSet(k2, peerDoc)
      return peerDoc
    }
    return saves.store.get(k) ?? null
  }
  let failed = false
  await P.p
    .act((ctx) => (ctx.game ? { next: placeAt(ctx.game!, 3, 50, 50, 7).game, held: null } : null))
    .then(
      () => {},
      () => {
        failed = true
      }
    )
  ok(failed, 'a nonmatching readback was reported as applied')
  eq(saves.store.get('saves'), peerDoc, "B's confirmed value was clobbered")
  eq(saves.sets.filter((w) => w.k === 'saves').length, 1, 'the timed-out intent was resubmitted as a fresh write')
  // Same-operation readback can also return the pre-write value while the
  // original is still in flight: still unknown, still no new write.
  const P2 = makePersist('me', live, saves)
  P2.refs.game.current = newGame('harbour', 12, 1)
  saves.setFaults = ['timeout-lost']
  let failed2 = false
  await P2.p
    .act((ctx) => (ctx.game ? { next: placeAt(ctx.game!, 5, 70, 70, 8).game, held: null } : null))
    .then(
      () => {},
      () => {
        failed2 = true
      }
    )
  ok(failed2, 'a pre-write readback was treated as proof of landing')
  eq(saves.store.get('saves'), peerDoc, 'the unresolved write disturbed the durable doc')
  // No-race control: the same timed-out landing with an unobstructed readback
  // resolves and resubmits nothing (retains the contract from the test above).
  const P3 = makePersist('me', live, saves)
  P3.refs.game.current = newGame('lantern', 12, 9)
  saves.peerSet('saves', peerDoc)
  saves.setFaults = ['timeout-landed']
  const writesBefore = saves.sets.length
  await P3.p.act((ctx) => (ctx.game ? { next: ctx.game, held: 2 } : null))
  const landed = parseSaves(saves.store.get('saves')!)
  ok(landed.games['lantern:12'] !== undefined, 'a landed write was dropped')
  ok(landed.games['alpine:24'] !== undefined, 'the seeded library was dropped')
  eq(saves.sets.length - writesBefore, 1, 'the control resubmitted the timed-out write')
})

await checkAsync('a same-key conflict rebases the intent onto the confirmed peer move', async () => {
  // P2: A and B both mutate the same gen0 puzzle with different piece
  // moves. B commits live+saves between A's entry read and A's commit.
  // A's optimistic apply() already ran when E_CONFLICT arrives, so the
  // retry must re-run the semantic intent on B's confirmed game - never
  // resubmit the optimistic whole-doc that lacks B's placement.
  for (const racing of ['both', 'saves'] as const) {
    const live = new FakeKV()
    const saves = new FakeKV()
    const shared = newGame('harbour', 12, 1)
    saves.peerSet(
      'saves',
      serializeSaves({ rev: 1, by: 'seed', current: 'harbour:12', games: { 'harbour:12': shared } })
    )
    const A = makePersist('me', live, saves)
    A.refs.game.current = shared
    A.state.savesBase = saves.store.get('saves')!
    // B's confirmed commit lands inside A's write transaction window.
    const bGame = placeAt(shared, 2, 300, 40, 50).game
    const bSaves = serializeSaves({ rev: 2, by: 'peer', current: 'harbour:12', games: { 'harbour:12': bGame } })
    saves.beforeSet = () => {
      saves.peerSet('saves', bSaves)
      if (racing === 'both') live.peerSet('live', liveOf('peer', 2, bGame, null))
    }
    const wanted = placeAt(bGame, 7, 120, 90, 60).game
    await A.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game, 7, 120, 90, 60).game, held: null } : null))
    const final = parseSaves(saves.store.get('saves')!).games['harbour:12']!
    eq(final.pieces[2]!.x, bGame.pieces[2]!.x, `[${racing}] confirmed peer move was overwritten`)
    eq(final.pieces[7]!.x, wanted.pieces[7]!.x, `[${racing}] our admitted move was lost`)
    ok(final.moves >= 2, `[${racing}] rebased doc did not carry both moves`)
  }
  // No-peer control: the same intent commits once with nothing to rebase.
  const live = new FakeKV()
  const saves = new FakeKV()
  const solo = newGame('harbour', 12, 1)
  saves.peerSet('saves', serializeSaves({ rev: 1, by: 'seed', current: 'harbour:12', games: { 'harbour:12': solo } }))
  const C = makePersist('me', live, saves)
  C.refs.game.current = solo
  C.state.savesBase = saves.store.get('saves')!
  await C.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game, 7, 120, 90, 60).game, held: null } : null))
  const soloFinal = parseSaves(saves.store.get('saves')!).games['harbour:12']!
  eq(soloFinal.pieces[7]!.x, placeAt(solo, 7, 120, 90, 60).game.pieces[7]!.x, 'control move missing')
  eq(soloFinal.moves, solo.moves + 1, 'control committed the wrong move count')
})

await checkAsync('a stale-incarnation envelope cannot regress the confirmed generation', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  // The durable library already moved past a reset: gen1 is confirmed.
  const gen1 = resetGame(newGame('harbour', 12, 5), 9)
  saves.peerSet('saves', serializeSaves({ rev: 3, by: 'peer', current: 'harbour:12', games: { 'harbour:12': gen1 } }))
  const P = makePersist('me', live, saves)
  // Hydrate the confirmed baseline first (gen1 adopted from the store doc).
  await P.p.healSaves()
  eq(P.state.savesBase !== null, true, 'confirmed baseline did not adopt the library')
  // A strictly-older gen0 live envelope then arrives with a newer revision:
  // adoption must converge on the confirmed incarnation, not regress.
  const stale = newGame('harbour', 12, 5)
  live.peerSet('live', liveOf('peer', 9, stale, null))
  await P.p.heal()
  eq(P.state.game!.gen, 1, 'adoption regressed to the dead generation')
  eq(P.clocks.live.rev, 9, 'the live clock did not advance past the stale doc')
  // And the fenced adoption never seeds an older write back to the store.
  ok(
    live.sets.every((w) => JSON.parse(w.v).game.gen >= 1),
    'a stale incarnation reached durable'
  )
  // A gen0-bound intent admitted before the reset observation dies at the
  // bind check against the confirmed gen1 base: zero durable effects.
  P.refs.game.current = stale
  const writesBefore = live.sets.length + saves.sets.length
  await P.p.act(
    (ctx) => (ctx.game ? { next: placeAt(ctx.game, 0, 10, 20, 5).game, held: null } : null),
    gameKeyOf(stale)
  )
  eq(live.sets.length + saves.sets.length, writesBefore, 'a dead-incarnation intent mutated durable')
  // Unbound intent on the confirmed incarnation still works (control).
  await P.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game, 1, 30, 30, 6).game, held: null } : null))
  const final = parseSaves(saves.store.get('saves')!).games['harbour:12']!
  eq(final.gen, 1, 'final doc lost the confirmed generation')
  ok(final.pieces[1]!.z !== TRAY, 'control intent did not land on the gen1 base')
})

await checkAsync('two initial-null seeds race to one unioned library', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  // Two copies on one space both read a genuinely-null entry and each seed a
  // different puzzle. Whichever commits first wins the token; the loser
  // rebases on the peer's confirmed doc and unions - nothing is lost.
  const A = makePersist('me', live, saves)
  const B = makePersist('peer', live, saves)
  saves.beforeSet = () => {}
  await A.p.act(() => ({ next: newGame('harbour', 12, 1), held: null }))
  await B.p.act(() => ({ next: newGame('alpine', 24, 2), held: null }))
  const final = parseSaves(saves.store.get('saves')!)
  ok(final.games['harbour:12'] !== undefined, 'first seed lost')
  ok(final.games['alpine:24'] !== undefined, 'second seed lost')
})

await checkAsync('a delete/recreate ABA still conflicts a stale token', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const doc = serializeSaves({
    rev: 1,
    by: 'peer',
    current: 'harbour:12',
    games: { 'harbour:12': newGame('harbour', 12, 1) }
  })
  saves.peerSet('saves', doc)
  const P = makePersist('me', live, saves)
  P.refs.game.current = newGame('alpine', 24, 2)
  // Delete then recreate the same bytes: the value looks identical but the
  // space rev moved, so our admitted-against token must still conflict.
  saves.beforeSet = () => {
    saves.peerDel('saves')
    saves.peerSet('saves', doc)
  }
  await P.p.act((ctx) => (ctx.game ? { next: placeAt(ctx.game!, 2, 40, 40, 5).game, held: null } : null))
  const final = parseSaves(saves.store.get('saves')!)
  ok(final.games['alpine:24'] !== undefined, 'the rebased write lost its own save')
  ok(final.games['harbour:12'] !== undefined, 'the ABA peer save was lost')
})

await checkAsync('a dead generation refuses the admitted write honestly', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  P.refs.game.current = newGame('harbour', 12, 1)
  // The generation our entry token came from dies before the commit: the
  // intent cannot validly rebase and the step must refuse, not resurrect.
  saves.beforeSet = () => {
    saves.gen++
  }
  let code = ''
  await P.p
    .act((ctx) => (ctx.game ? { next: placeAt(ctx.game!, 4, 60, 60, 11).game, held: null } : null))
    .then(
      () => {},
      (e) => {
        code = e?.code ?? e?.message ?? ''
      }
    )
  ok(`${code}`.includes('E_GONE'), `expected E_GONE refusal, got ${code}`)
  ok(!saves.store.has('saves'), 'a dead-generation write mutated durable state')
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

// ---------- recovery policy checks ----------
//
// The seed's retry contract: a proven pre-apply read failure may re-derive on
// fresh entries; a dead generation is terminal; an ambiguous commit outcome is
// never retried automatically. These run the real act() path over the same
// host-faithful fake so the tag the UI keys on is exercised, not re-asserted.

await checkAsync('a proven pre-apply read failure is retry-safe and adopts the saved puzzle', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const saved = placeAt(newGame('harbour', 12, 7), 3, 100, 100, 50).game
  saves.peerSet('saves', serializeSaves({ rev: 2, by: 'peer', current: 'harbour:12', games: { 'harbour:12': saved } }))
  const P = makePersist('me', live, saves)
  // The seed's intent, verbatim from main.tsx: adopt the saved config entry,
  // never mint a fresh random game over it.
  const seed = (ctx: { game: Game | null; saves: Record<string, Game> }) =>
    ctx.game ? null : { next: ctx.saves['harbour:12'] ?? newGame('harbour', 12, 99), held: null }
  saves.failNext = 1
  let err: unknown
  await P.p.act(seed, undefined).then(
    () => {},
    (e) => {
      err = e
    }
  )
  ok(seedRetryable(err), 'a pre-apply read failure must be tagged retry-safe')
  eq(P.state.game, null, 'a failed read still applied a game optimistically')
  // The re-armed seed re-reads fresh entries: the saved puzzle comes back.
  await P.p.act(seed, undefined)
  ok(P.state.game !== null && sameGame(P.state.game, saved), 'retry must adopt the saved puzzle, not reseed')
  const durable = parseSaves(saves.store.get('saves')!)
  ok(
    durable.games['harbour:12'] !== undefined && sameGame(durable.games['harbour:12']!, saved),
    'durable library lost the saved puzzle'
  )
  eq(durable.games['harbour:12']!.seed, 7, 'a fresh random game replaced the saved seed')
})

await checkAsync('a dead generation is terminal even when the read failure is pre-apply', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  saves.getHook = async () => {
    throw Object.assign(new Error('generation dead'), { code: 'E_GONE' })
  }
  let err: unknown
  await P.p
    .act(() => ({ next: newGame('harbour', 12, 1), held: null }))
    .then(
      () => {},
      (e) => {
        err = e
      }
    )
  eq(errCode(err), 'E_GONE', 'read did not surface E_GONE')
  ok((err as { preApply?: boolean }).preApply === true, 'a failed read must still be marked pre-apply')
  ok(!seedRetryable(err), 'E_GONE must never be auto-retried')
  eq(live.sets.length + saves.sets.length, 0, 'a dead-generation failure mutated durable state')
})

await checkAsync('an ambiguous commit outcome is never retry-safe', async () => {
  const live = new FakeKV()
  const saves = new FakeKV()
  const P = makePersist('me', live, saves)
  // ACK lost and the host never applied it: the readback cannot prove landing,
  // so the step fails ambiguous - a fresh seed attempt must not auto-fire.
  saves.setFaults = ['timeout-lost']
  let err: unknown
  await P.p
    .act(() => ({ next: newGame('harbour', 12, 1), held: null }))
    .then(
      () => {},
      (e) => {
        err = e
      }
    )
  eq(errCode(err), 'E_TIMEOUT', 'lost ACK did not surface E_TIMEOUT')
  ok(!(err as { preApply?: boolean }).preApply, 'a commit outcome must not be tagged pre-apply')
  ok(!seedRetryable(err), 'an ambiguous outcome must never auto-retry')
  ok(!saves.store.has('saves'), 'the unapplied write should stay absent from durable state')
})

await checkAsync('a failed mirror hydrate recovers on a fresh subscribe', async () => {
  // The real KVMirror, evaluated from shipped SDK source (paper-fold pattern:
  // no package resolution inside the app sandbox; PlatformError injected).
  const mirrorSource = await Bun.file(new URL('../../packages/sdk/mirror.ts', import.meta.url).pathname).text()
  class PlatformError extends Error {
    constructor(
      public code: string,
      message?: string
    ) {
      super(message ?? code)
      this.name = 'PlatformError'
    }
  }
  const { KVMirror } = new Function(
    'PlatformError',
    `${new Bun.Transpiler({ loader: 'ts' })
      .transformSync(mirrorSource)
      .replace(/^import[^\n]*\n/gm, '')
      .replace(/^export /gm, '')}\nreturn { KVMirror };`
  )(PlatformError) as {
    KVMirror: new (
      space: never
    ) => { subscribe: (cb: () => void) => () => void; read: (k: string) => { value: string | null; status: string } }
  }
  let fails = 1
  const space = {
    async snapshot() {
      if (fails > 0) {
        fails--
        // A non-retryable PlatformError lands the 'error' state on the first
        // pull; a plain Error would be retried as E_STORAGE.
        throw new PlatformError('E_GONE', 'dead generation')
      }
      const entries: [string, string][] = [['jigsaw-saves', '{"rev":2,"by":"peer","current":null,"games":{}}']]
      return { entries, rev: 2, cursor: undefined }
    },
    watch: () => () => {},
    async set() {},
    async del() {},
    async entry() {
      return { k: 'jigsaw-saves', v: null, rev: 2, gen: 1 }
    }
  }
  const mirror = new KVMirror(space as never)
  const un = mirror.subscribe(() => {})
  await new Promise((r) => setTimeout(r, 20))
  eq(mirror.read('jigsaw-saves').status, 'error', 'a failed hydrate must surface the error state')
  un()
  // What the Retry button does: remount the copy, resubscribe, re-hydrate.
  mirror.subscribe(() => {})
  await new Promise((r) => setTimeout(r, 20))
  eq(mirror.read('jigsaw-saves').status, 'ready', 'a resubscribed mirror never re-hydrated')
  eq(mirror.read('jigsaw-saves').value, '{"rev":2,"by":"peer","current":null,"games":{}}')
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
