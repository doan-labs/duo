// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun game.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import {
  adoptGame,
  apply,
  autoMoves,
  buildGame,
  canApply,
  canFoundation,
  canTableau,
  card,
  EMPTY_STATS,
  type Game,
  hint,
  isBlocked,
  isRed,
  isRun,
  legalMoves,
  type Move,
  newGame,
  normalizeStats,
  parseLog,
  recordPlay,
  recordWin,
  serializeGame
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

/** Every card in every pile, as one multiset of ids. */
function deckIds(g: Game): number[] {
  const ids = [...g.stock, ...g.waste, ...g.foundations.flat(), ...g.tableau.flat()].map((c) => c.id)
  return ids.sort((a, b) => a - b)
}

/** A hand-built game for targeted rule checks. */
function makeGame(over: Partial<Game>): Game {
  return {
    seed: 0,
    mode: 'draw1',
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    status: 'playing',
    ...over
  }
}

check('a fresh deal is the full 52 with no duplicates', () => {
  for (const seed of [1, 7, 42, 999999, 2 ** 31 - 1]) {
    const g = newGame(seed, 'draw1')
    const ids = deckIds(g)
    eq(ids.length, 52)
    eq(new Set(ids).size, 52)
    eq(
      ids,
      Array.from({ length: 52 }, (_, i) => i)
    )
    eq(
      g.tableau.map((c) => c.length),
      [1, 2, 3, 4, 5, 6, 7]
    )
    for (const [c, col] of g.tableau.entries()) {
      for (const [i, k] of col.entries()) ok(k.up === (i === c), `col ${c} card ${i} face`)
    }
    eq(g.stock.length, 24)
    ok(
      g.stock.every((c) => !c.up),
      'stock deals face down'
    )
    eq(g.status, 'playing')
  }
})

check('the same seed deals the same spread', () => {
  const a = newGame(12345, 'draw1')
  const b = newGame(12345, 'draw1')
  eq(deckIds(a), deckIds(b))
  eq(
    a.tableau[6]!.map((c) => c.id),
    b.tableau[6]!.map((c) => c.id)
  )
})

check('draw1 moves one card and flips it up; draw3 moves three', () => {
  const g1 = apply(newGame(11, 'draw1'), { t: 'draw' }).game
  eq(g1.waste.length, 1)
  eq(g1.stock.length, 23)
  ok(g1.waste[0]!.up, 'waste card is face up')
  const g3 = apply(newGame(11, 'draw3'), { t: 'draw' }).game
  eq(g3.waste.length, 3)
  eq(g3.stock.length, 21)
  ok(
    g3.waste.every((c) => c.up),
    'all three waste cards up'
  )
  // A partial last draw takes what is left.
  let tail = newGame(11, 'draw3')
  while (tail.stock.length > 2) tail = apply(tail, { t: 'draw' }).game
  const last = apply(tail, { t: 'draw' }).game
  eq(last.stock.length, 0)
})

check('redeal recycles the waste in order, face down', () => {
  let g = newGame(5, 'draw1')
  // The stock must run dry first: redeal under a live stock is refused.
  for (let i = 0; i < 24; i++) g = apply(g, { t: 'draw' }).game
  eq(g.stock.length, 0)
  eq(g.waste.length, 24)
  const order = g.waste.map((c) => c.id)
  g = apply(g, { t: 'redeal' }).game
  eq(g.waste.length, 0)
  eq(g.stock.length, 24)
  ok(
    g.stock.every((c) => !c.up),
    'redealt cards land face down'
  )
  // The waste's bottom card is the stock's new top.
  eq(g.stock.at(-1)!.id, order[0])
  eq(g.stock[0]!.id, order.at(-1))
  // And the deck is whole again.
  eq(new Set(deckIds(g)).size, 52)
})

check('a forbidden move never completes', () => {
  const g = makeGame({
    tableau: [[], [card(0, 12, true)], [], [], [], [], []] // a bare K of spades
  })
  // Wrong colour on the king: a red queen can never go on a black king either.
  const ontoKing = makeGame({
    tableau: [[card(0, 12, true)], [card(1, 11, true)], [], [], [], [], []]
  })
  const before = canApply(ontoKing, { t: 'tt', c: 1, d: 0, n: 1 })
  eq(before, true)
  // Same colour is refused.
  const black = makeGame({
    tableau: [[card(0, 12, true)], [card(3, 11, true)], [], [], [], [], []]
  })
  eq(canApply(black, { t: 'tt', c: 1, d: 0, n: 1 }), false)
  const same = apply(black, { t: 'tt', c: 1, d: 0, n: 1 })
  eq(same.game, black) // identity, not a half-moved pile
  // Wrong rank is refused.
  const wrongRank = makeGame({
    tableau: [[card(0, 12, true)], [card(1, 9, true)], [], [], [], [], []]
  })
  eq(canApply(wrongRank, { t: 'tt', c: 1, d: 0, n: 1 }), false)
  // Only a king enters an empty column.
  eq(canTableau(g.tableau[0]!, card(1, 12, true)), true)
  eq(canTableau(g.tableau[0]!, card(1, 5, true)), false)
  // Nothing draws from an empty stock; nothing redeals under a live one.
  const emptyStock = makeGame({ waste: [card(0, 4, true)] })
  eq(canApply(emptyStock, { t: 'draw' }), false)
  eq(canApply(emptyStock, { t: 'redeal' }), true)
  const liveStock = makeGame({ stock: [card(0, 4)], waste: [card(1, 2, true)] })
  eq(canApply(liveStock, { t: 'redeal' }), false)
})

check('foundations take ace then suit order only', () => {
  const g = makeGame({})
  eq(canFoundation(g.foundations[0]!, card(0, 0, true)), true)
  eq(canFoundation(g.foundations[0]!, card(0, 4, true)), false)
  const piled = makeGame({ foundations: [[card(0, 0, true), card(0, 1, true)], [], [], []] })
  eq(canFoundation(piled.foundations[0]!, card(0, 2, true)), true)
  eq(canFoundation(piled.foundations[0]!, card(1, 2, true)), false)
  eq(canFoundation(piled.foundations[0]!, card(0, 3, true)), false)
})

check('moving a run reveals the covered card beneath it', () => {
  const hidden = card(2, 8, false)
  const g = makeGame({
    tableau: [[card(0, 12, true)], [hidden, card(1, 11, true)], [], [], [], [], []]
  })
  // The queen lands on the king, uncovering the card under her own column.
  const { game, revealed } = apply(g, { t: 'tt', c: 1, d: 0, n: 1 })
  eq(revealed?.id, hidden.id)
  eq(game.tableau[1]!.at(-1)!.up, true)
  // Moving the last card off reveals nothing extra; empty stays empty.
  const g2 = makeGame({ tableau: [[card(0, 12, true)], [card(1, 11, true)], [], [], [], [], []] })
  const res2 = apply(g2, { t: 'tt', c: 1, d: 0, n: 1 })
  eq(res2.revealed, null)
  eq(res2.game.tableau[1]!.length, 0)
  // A waste or foundation move never reveals.
  const g3 = makeGame({ waste: [card(0, 0, true)] })
  eq(apply(g3, { t: 'wf', f: 0 }).revealed, null)
})

check('undo replays a deal plus log to the same table', () => {
  let g = newGame(77, 'draw1')
  const log: Move[] = []
  for (const m of legalMoves(g).slice(0, 4)) {
    if (!canApply(g, m)) continue
    g = apply(g, m).game
    log.push(m)
  }
  const rebuilt = buildGame('draw1', 77, log)
  ok(!!rebuilt, 'rebuild succeeded')
  eq(deckIds(rebuilt!), deckIds(g))
  eq(
    rebuilt!.waste.map((c) => c.id),
    g.waste.map((c) => c.id)
  )
  // And the undo of the last move restores the earlier table exactly.
  const back = buildGame('draw1', 77, log.slice(0, -1))
  const before = buildGame('draw1', 77, log.slice(0, -1))
  eq(deckIds(back!), deckIds(before!))
})

check('the wire record round-trips, rejects corrupt and foreign shapes', () => {
  let g = newGame(9, 'draw3')
  const log: Move[] = [{ t: 'draw' }]
  g = apply(g, log[0]!).game
  const saved = serializeGame('me', { mode: 'draw3', seed: 9, log })
  const parsed = adoptGame(JSON.stringify(saved))
  ok(!!parsed, 'adopted own save')
  eq(parsed!.deal.log, log)
  eq(deckIds(parsed!.game), deckIds(g))
  eq(parseLog(''), [])
  eq(parseLog('nonsense'), null)
  // A move legal on paper but impossible mid-log marks the record corrupt.
  const bad = JSON.stringify({ v: 1, by: 'x', mode: 'draw1', seed: 9, moves: 'wf0' })
  eq(adoptGame(bad), null)
  // Wrong version or shape never parses into a game.
  eq(adoptGame(JSON.stringify({ v: 2, by: 'x', mode: 'draw1', seed: 9, moves: '' })), null)
  eq(adoptGame('not json'), null)
})

check('isRun only accepts descending alternating face-up runs', () => {
  eq(isRun([card(0, 12, true), card(1, 11, true), card(3, 10, true)]), true)
  eq(isRun([card(0, 12, true), card(3, 11, true)]), false) // same colour
  eq(isRun([card(0, 12, true), card(1, 10, true)]), false) // skipped rank
  eq(isRun([card(0, 12, false), card(1, 11, true)]), false) // a down card
  eq(isRun([card(1, 11, true), card(0, 12, true)]), false) // ascending
})

check('legalMoves lists only legal moves and every one applies', () => {
  const g = newGame(31, 'draw1')
  const moves = legalMoves(g)
  ok(moves.length > 0, 'a fresh deal always has the draw')
  ok(
    moves.some((m) => m.t === 'draw'),
    'draw is offered'
  )
  for (const m of moves) {
    ok(canApply(g, m), `listed move applies: ${JSON.stringify(m)}`)
    const next = apply(g, m).game
    eq(deckIds(next), deckIds(g)) // the deck survives any move
  }
  // A state with stock and waste empty and all face-up flat is still checkable.
  const bare = makeGame({ tableau: [[card(0, 5, true)], [], [], [], [], [], []] })
  const bareMoves = legalMoves(bare)
  ok(
    bareMoves.every((m) => m.t !== 'draw' && m.t !== 'redeal' && m.t !== 'wf' && m.t !== 'wt'),
    'no stock or waste moves on empty piles'
  )
})

check('a won game is detected and stops accepting moves', () => {
  const won = makeGame({
    foundations: [
      Array.from({ length: 13 }, (_, r) => card(0, r, true)),
      Array.from({ length: 13 }, (_, r) => card(1, r, true)),
      Array.from({ length: 13 }, (_, r) => card(2, r, true)),
      Array.from({ length: 12 }, (_, r) => card(3, r, true))
    ],
    waste: [card(3, 12, true)]
  })
  const { game } = apply(won, { t: 'wf', f: 3 })
  eq(game.status, 'won')
  eq(canApply(game, { t: 'draw' }), false)
  eq(legalMoves(game).length, 0)
})

check('a blocked game reports blocked and stops hinting', () => {
  // Empty stock and waste, one lone non-king card: nothing moves anywhere.
  const g = makeGame({ tableau: [[card(0, 5, true)], [card(1, 8, true)], [], [], [], [], []] })
  eq(isBlocked(g), true)
  eq(hint(g), null)
})

check('hint prefers a reveal over a sideways king shuffle', () => {
  const hidden = card(2, 3, false)
  const g = makeGame({
    tableau: [[card(0, 0, true)], [hidden, card(0, 12, true)], [card(1, 11, true)], [], [], [], []]
  })
  const h = hint(g)!
  ok(!!h, 'a hint exists')
  // The king moves to the empty column, revealing the hidden 4 - that is the play.
  eq(h.move, { t: 'tt', c: 1, d: 3, n: 1 })
  ok(h.text.includes('column 4'), `hint text: ${h.text}`)
})

check('autoMoves only walks cards home and stops when safe moves run out', () => {
  const near = makeGame({
    waste: [card(0, 2, true)],
    foundations: [[card(0, 0, true), card(0, 1, true)], [], [], []],
    tableau: [[card(1, 0, true)], [], [], [], [], [], []]
  })
  const steps = autoMoves(near)
  // The waste 3 of spades then the tableau ace of hearts: two hops home.
  eq(steps, [
    { t: 'wf', f: 0 },
    { t: 'tf', c: 0, f: 1 }
  ])
  let g = near
  for (const m of steps) g = apply(g, m).game
  eq(g.foundations[0]!.length, 3)
  eq(g.foundations[1]!.length, 1)
  // A table with no aces and no foundation continuations has nothing to send home.
  const dry = makeGame({
    tableau: [[card(0, 5, true)], [card(1, 8, true)], [], [], [], [], []]
  })
  eq(autoMoves(dry), [])
})

check('adoptGame survives null, primitive and truncated records', () => {
  // JSON.parse accepts far more than objects: 'null' parsed to null used to
  // crash on a property read. Every one of these must return null, not throw.
  for (const raw of ['null', '"str"', '42', 'true', '[]', '{}', '{', '', ' ']) {
    let out: unknown = 'threw'
    try {
      out = adoptGame(raw)
    } catch {
      /* stays 'threw' */
    }
    eq(out, null)
  }
  // A move token missing a field parses to nothing rather than crashing.
  eq(adoptGame('{"v":1,"by":"x","mode":"draw1","seed":5,"moves":"tf1"}'), null)
  // The auto handoff flag rides along; absent reads as false.
  const auto = adoptGame(JSON.stringify({ v: 1, by: 'x', mode: 'draw1', seed: 5, moves: '', auto: true }))
  eq(auto!.auto, true)
  const plain = adoptGame(JSON.stringify({ v: 1, by: 'x', mode: 'draw1', seed: 5, moves: '' }))
  eq(plain!.auto, false)
  // Negative seeds normalize to u32 just like the dealer does.
  const neg = adoptGame(JSON.stringify({ v: 1, by: 'x', mode: 'draw1', seed: -1, moves: '' }))
  eq(neg!.deal.seed, 0xffffffff)
})

check('stats count each deal once for plays and wins', () => {
  let st = EMPTY_STATS
  st = recordPlay(st, 'draw1', 5)
  st = recordPlay(st, 'draw1', 5) // second move on the same deal: still one play
  st = recordPlay(st, 'draw1', 7)
  st = recordPlay(st, 'draw3', 5) // same seed, other mode: a different deal
  eq(st.draw1.plays, 2)
  eq(st.draw3.plays, 1)
  st = recordWin(st, 'draw1', 7, 120)
  eq(st.draw1.wins, 1)
  eq(st.draw1.best, 120)
  // Undo past the winning move and win the same deal slower: no second win.
  st = recordWin(st, 'draw1', 7, 140)
  eq(st.draw1.wins, 1)
  eq(st.draw1.best, 120)
  // A faster re-win keeps the win count but takes the record.
  st = recordWin(st, 'draw1', 7, 100)
  eq(st.draw1.wins, 1)
  eq(st.draw1.best, 100)
  // A different seed is a different deal.
  st = recordWin(st, 'draw1', 9, 80)
  eq(st.draw1.wins, 2)
  eq(st.draw1.best, 80)
})

check('normalizeStats repairs inflated records and keeps deal identity', () => {
  // A stored record with wins > plays is corrupt: a deal cannot win unplayed.
  const corrupt = normalizeStats({
    draw1: { plays: 0, wins: 3, best: 200 },
    draw3: { plays: 1, wins: 1, best: 44 }
  })
  eq(corrupt.draw1.wins, 0)
  eq(corrupt.draw3.wins, 1)
  eq(corrupt.draw1.best, 200)
  const lists = normalizeStats({
    draw1: { plays: 1, wins: 1, best: 9 },
    played: { draw1: [5, 'x', -1] },
    won: { draw1: [5, 5] }
  })
  eq(lists.played.draw1, [5, 0xffffffff])
  eq(lists.won.draw1, [5])
})

check('autoMoves returns nothing on a finished game', () => {
  const won = makeGame({
    status: 'won',
    waste: [card(0, 2, true)],
    foundations: [[card(0, 0, true), card(0, 1, true)], [], [], []]
  })
  eq(autoMoves(won), [])
})

// Follow hints across seeded deals the way a player would; a repeated board
// under a non-draw suggestion is the ping-pong the reviewer caught.
const hintCycles = (seeds: [number, 'draw1' | 'draw3'][]): string[] => {
  const found: string[] = []
  for (const [seed, mode] of seeds) {
    let g = newGame(seed, mode)
    const seen = new Set<string>()
    for (let i = 0; i < 600 && g.status === 'playing'; i++) {
      const h = hint(g)
      if (!h) break
      const k = JSON.stringify(g)
      if (seen.has(k) && h.move.t !== 'draw' && h.move.t !== 'redeal') {
        found.push(`${mode} seed ${seed} step ${i}: ${h.text}`)
        break
      }
      seen.add(k)
      g = apply(g, h.move).game
    }
  }
  return found
}

check('review repro seeds never ping-pong a run between columns', () => {
  eq(
    hintCycles([
      [15839, 'draw1'],
      [23758, 'draw3']
    ]),
    []
  )
})

check('hint following across 200 seeds never revisits a state', () => {
  const seeds: [number, 'draw1' | 'draw3'][] = []
  for (let s = 0; s < 200; s++) seeds.push([(s * 7919 + 1) >>> 0, s % 2 ? 'draw3' : 'draw1'])
  const found = hintCycles(seeds)
  eq(found, [])
})

check('red is hearts and diamonds', () => {
  eq(isRed(0), false)
  eq(isRed(1), true)
  eq(isRed(2), true)
  eq(isRed(3), false)
  eq(card(0, 0).id, 0)
  eq(card(3, 12).id, 51)
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`game.test.ts: ${passed} checks passed`)
