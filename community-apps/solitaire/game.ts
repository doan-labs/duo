// Pure Klondike model: no React, no SDK, no DOM. Every mutation returns a new
// Game and stays serializable, so both displays run this code and the whole
// match - deal plus the complete undo history - is one seed and one move log.

export type Suit = 0 | 1 | 2 | 3
export const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'] as const
export const SUIT_CHARS = ['S', 'H', 'D', 'C'] as const
export const isRed = (suit: Suit) => suit === 1 || suit === 2

// Rank 0 is the ace, 12 the king.
export const RANK_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const rankName = (rank: number) => RANK_NAMES[rank] ?? '?'

export type Card = { id: number; suit: Suit; rank: number; up: boolean }
export const card = (suit: Suit, rank: number, up = false): Card => ({ id: suit * 13 + rank, suit, rank, up })
export const cardName = (c: Card) => `${RANK_NAMES[c.rank]}${SUIT_CHARS[c.suit]}`

export type Mode = 'draw1' | 'draw3'
export const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'draw1', label: 'Draw 1' },
  { id: 'draw3', label: 'Draw 3' }
]
export const modeById = (id: string): Mode => (id === 'draw3' ? 'draw3' : 'draw1')
export const drawCount = (mode: Mode) => (mode === 'draw3' ? 3 : 1)

export type Status = 'playing' | 'won'

export type Game = {
  seed: number
  mode: Mode
  /** Pile tops are the LAST element of each array. Stock and face-down tableau cards carry up: false. */
  stock: Card[]
  waste: Card[]
  /** Four piles, not suit-bound until the first ace lands. */
  foundations: Card[][]
  /** Seven columns; index 0 is the leftmost. */
  tableau: Card[][]
  status: Status
}

// A move is all the log stores: replay from the seed rebuilds the full state,
// so undo is dropping the tail entry and no snapshot format can drift.
export type Move =
  | { t: 'draw' }
  | { t: 'redeal' }
  | { t: 'wf'; f: number }
  | { t: 'wt'; c: number }
  | { t: 'tf'; c: number; f: number }
  | { t: 'ft'; f: number; c: number }
  | { t: 'tt'; c: number; d: number; n: number }

/** Deterministic RNG for the deal; the seed in storage reproduces it exactly. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A fresh Klondike deal: seven columns of 1..7, each top card face up, the
 * remaining 24 face down on the stock. Dealt row by row like the real thing.
 */
export function newGame(seed: number, mode: Mode): Game {
  const deck: Card[] = []
  for (const s of [0, 1, 2, 3] as const) for (let r = 0; r < 13; r++) deck.push(card(s, r, false))
  const random = mulberry32(seed)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = deck[i]!
    deck[i] = deck[j]!
    deck[j] = swap
  }
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let at = 0
  for (let row = 0; row < 7; row++) {
    for (let col = row; col < 7; col++) {
      const c = { ...deck[at++]!, up: row === col }
      tableau[col]!.push(c)
    }
  }
  return {
    seed,
    mode,
    stock: deck.slice(at),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    status: 'playing'
  }
}

const cloneCards = (cards: Card[]) => cards.map((c) => ({ ...c }))
const cloneGame = (g: Game): Game => ({
  ...g,
  stock: cloneCards(g.stock),
  waste: cloneCards(g.waste),
  foundations: g.foundations.map(cloneCards),
  tableau: g.tableau.map(cloneCards)
})

const top = (pile: Card[]) => pile[pile.length - 1]

/** A face-up run is a valid descending, alternating stack - the only kind a legal game can hold. */
export function isRun(cards: Card[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]!
    if (!c.up) return false
    const below = cards[i + 1]
    if (below && (below.rank !== c.rank - 1 || isRed(below.suit) === isRed(c.suit))) return false
  }
  return true
}

/** `cardOn` may land on this foundation pile: ace to an empty one, else same suit one rank up. */
export function canFoundation(pile: Card[], on: Card): boolean {
  const head = top(pile)
  if (!head) return on.rank === 0
  return head.suit === on.suit && on.rank === head.rank + 1
}

/** The run headed by `on` may land on tableau column `col`: king to empty, else opposite colour one rank down. */
export function canTableau(col: Card[], on: Card): boolean {
  const head = top(col)
  if (!head) return on.rank === 12
  return head.up && isRed(head.suit) !== isRed(on.suit) && head.rank === on.rank + 1
}

/** True exactly when `m` is a legal move in `g`. */
export function canApply(g: Game, m: Move): boolean {
  if (g.status !== 'playing') return false
  switch (m.t) {
    case 'draw':
      return g.stock.length > 0
    case 'redeal':
      return g.stock.length === 0 && g.waste.length > 0
    case 'wf': {
      const c = top(g.waste)
      return !!c && m.f >= 0 && m.f < 4 && canFoundation(g.foundations[m.f]!, c)
    }
    case 'wt': {
      const c = top(g.waste)
      return !!c && m.c >= 0 && m.c < 7 && canTableau(g.tableau[m.c]!, c)
    }
    case 'tf': {
      const col = g.tableau[m.c]
      const c = col && top(col)
      return !!c && c.up && m.f >= 0 && m.f < 4 && canFoundation(g.foundations[m.f]!, c)
    }
    case 'ft': {
      const pile = g.foundations[m.f]
      const c = pile && top(pile)
      return !!c && m.c >= 0 && m.c < 7 && canTableau(g.tableau[m.c]!, c)
    }
    case 'tt': {
      const col = g.tableau[m.c]
      if (!col || m.d < 0 || m.d > 6 || m.d === m.c || m.n < 1 || m.n > col.length) return false
      const run = col.slice(col.length - m.n)
      return run.length === m.n && isRun(run) && canTableau(g.tableau[m.d]!, run[0]!)
    }
  }
}

export type Applied = {
  game: Game
  /** A tableau card this move turned face up, for the flip cue. */
  revealed: Card | null
  /** Where the moved cards landed - 'stock' covers redeal, 'waste' covers draw. */
  to: 'waste' | 'stock' | 'foundation' | 'tableau'
}

/**
 * Applies a checked move. Illegal input returns the same object, so a corrupt
 * stored entry can never complete a forbidden move.
 */
export function apply(g: Game, m: Move): Applied {
  if (!canApply(g, m)) return { game: g, revealed: null, to: 'tableau' }
  const next = cloneGame(g)
  let revealed: Card | null = null
  let to: Applied['to'] = 'tableau'
  switch (m.t) {
    case 'draw': {
      const n = Math.min(drawCount(g.mode), next.stock.length)
      for (let i = 0; i < n; i++) next.waste.push({ ...next.stock.pop()!, up: true })
      to = 'waste'
      break
    }
    case 'redeal': {
      // The waste lifts as one stack and turns over: its top ends the stock's bottom.
      next.stock = next.waste.reverse().map((c) => ({ ...c, up: false }))
      next.waste = []
      to = 'stock'
      break
    }
    case 'wf': {
      next.foundations[m.f]!.push(next.waste.pop()!)
      to = 'foundation'
      break
    }
    case 'wt': {
      next.tableau[m.c]!.push(next.waste.pop()!)
      break
    }
    case 'tf': {
      next.foundations[m.f]!.push(next.tableau[m.c]!.pop()!)
      to = 'foundation'
      break
    }
    case 'ft': {
      next.tableau[m.c]!.push(next.foundations[m.f]!.pop()!)
      break
    }
    case 'tt': {
      const run = next.tableau[m.c]!.splice(next.tableau[m.c]!.length - m.n, m.n)
      next.tableau[m.d]!.push(...run)
      break
    }
  }
  if (m.t === 'tt' || m.t === 'tf') {
    const head = top(next.tableau[m.c]!)
    if (head && !head.up) {
      head.up = true
      revealed = head
    }
  }
  if (next.foundations.every((p) => p.length === 13)) next.status = 'won'
  return { game: next, revealed, to }
}

/** Every currently legal move, used by hints, blocked detection and tests. */
export function legalMoves(g: Game): Move[] {
  if (g.status !== 'playing') return []
  const out: Move[] = []
  if (g.stock.length > 0) out.push({ t: 'draw' })
  else if (g.waste.length > 0) out.push({ t: 'redeal' })
  const w = top(g.waste)
  if (w) {
    for (let f = 0; f < 4; f++) if (canFoundation(g.foundations[f]!, w)) out.push({ t: 'wf', f })
    for (let c = 0; c < 7; c++) if (canTableau(g.tableau[c]!, w)) out.push({ t: 'wt', c })
  }
  for (let c = 0; c < 7; c++) {
    const col = g.tableau[c]!
    const head = top(col)
    if (head?.up) for (let f = 0; f < 4; f++) if (canFoundation(g.foundations[f]!, head)) out.push({ t: 'tf', c, f })
    // Every face-up card heads a movable run, longest first.
    for (let i = 0; i < col.length; i++) {
      if (!col[i]!.up) continue
      const run = col.slice(i)
      for (let d = 0; d < 7; d++) {
        if (d === c) continue
        if (canTableau(g.tableau[d]!, run[0]!)) out.push({ t: 'tt', c, d, n: run.length })
      }
    }
  }
  for (let f = 0; f < 4; f++) {
    const head = top(g.foundations[f]!)
    if (!head) continue
    for (let c = 0; c < 7; c++) if (canTableau(g.tableau[c]!, head)) out.push({ t: 'ft', f, c })
  }
  return out
}

/** True when nothing legal remains - the tests' blocked case and the hint line's honest answer. */
export const isBlocked = (g: Game) => legalMoves(g).length === 0

export type Hint = { move: Move; text: string }

const atName = (m: Move): { from: string; to: string } => {
  switch (m.t) {
    case 'draw':
      return { from: 'the stock', to: 'the waste' }
    case 'redeal':
      return { from: 'the waste', to: 'the stock' }
    case 'wf':
      return { from: 'the waste', to: 'a foundation' }
    case 'wt':
      return { from: 'the waste', to: `column ${m.c + 1}` }
    case 'tf':
      return { from: `column ${m.c + 1}`, to: 'a foundation' }
    case 'ft':
      return { from: 'a foundation', to: `column ${m.c + 1}` }
    case 'tt':
      return { from: `column ${m.c + 1}`, to: `column ${m.d + 1}` }
  }
}

/** Moves that advance the match: up to a foundation, waste to the table, or off a covered card. */
const productive = (g: Game): Set<string> => {
  const out = new Set<string>()
  for (const m of legalMoves(g)) {
    if (m.t === 'wf' || m.t === 'tf' || m.t === 'wt') {
      out.add(encodeMove(m))
    } else if (m.t === 'tt') {
      const col = g.tableau[m.c]!
      const under = col[col.length - 1 - m.n]
      if (under && !under.up) out.add(encodeMove(m))
    }
  }
  return out
}

/**
 * The move worth suggesting: reveals first, then foundations, then waste plays,
 * then a draw. A tableau move that uncovers nothing is a pure sideways shuffle;
 * it is only suggested when it unlocks a productive move next ply, and it never
 * outranks a draw. That keeps hints honest - the old flat relocation bonus let
 * the same two legal jumps ping-pong a run between equivalent homes forever.
 * Returns null when blocked, or when only pointless sideways moves remain.
 */
export function hint(g: Game): Hint | null {
  const moves = legalMoves(g)
  if (!moves.length) return null
  const before = productive(g)
  const score = (m: Move): number => {
    if (m.t === 'draw') return 4
    if (m.t === 'redeal') return 2
    // Pulling a card back off a foundation undoes progress: suggesting it
    // invites the same states to repeat, so a hint never offers it.
    if (m.t === 'ft') return 0
    let s = 0
    if (m.t === 'tf' || m.t === 'tt') {
      const col = g.tableau[m.c]!
      const under = col[col.length - 1 - (m.t === 'tt' ? m.n : 1)]
      if (under && !under.up) s += 100 // moving off a covered card reveals it
    }
    if (m.t === 'wf' || m.t === 'tf') s += 40
    if (m.t === 'wt') s += 30
    if (m.t === 'tt' && s === 0) {
      const col = g.tableau[m.c]!
      if (g.tableau[m.d]!.length === 0 && m.n === col.length) return 0
      // A bare relocation earns a suggestion only by unlocking a productive
      // move that was not already on the table; otherwise it is sideways.
      for (const k of productive(apply(g, m).game)) {
        if (!before.has(k)) return 15
      }
      return 0
    }
    return s
  }
  const best = moves.reduce((a, b) => (score(b) > score(a) ? b : a))
  if (score(best) === 0) return null // only pointless sideways moves left
  const names = atName(best)
  const text =
    best.t === 'draw'
      ? 'Draw from the stock'
      : best.t === 'redeal'
        ? 'Turn the waste back into the stock'
        : `Move ${moveCardsText(g, best)} from ${names.from} to ${names.to}`
  return { move: best, text }
}

function moveCardsText(g: Game, m: Move): string {
  const first =
    m.t === 'wf' || m.t === 'wt'
      ? top(g.waste)
      : m.t === 'tf'
        ? top(g.tableau[m.c]!)
        : m.t === 'ft'
          ? top(g.foundations[m.f]!)
          : m.t === 'tt'
            ? g.tableau[m.c]![g.tableau[m.c]!.length - m.n]
            : undefined
  if (!first) return 'cards'
  if (m.t === 'tt' && m.n > 1) return `${cardName(first)} and the ${m.n - 1} on it`
  return `the ${cardName(first)}`
}

/**
 * The foundation moves an Auto press sweeps, one entry per card so each lands
 * as its own animated hop. Only clearly upward moves are offered.
 */
export function autoMoves(g: Game): Move[] {
  if (g.status !== 'playing') return []
  const out: Move[] = []
  let cur = g
  for (;;) {
    const w = top(cur.waste)
    if (w) {
      const f = cur.foundations.findIndex((p) => canFoundation(p, w))
      if (f >= 0) {
        out.push({ t: 'wf', f })
        cur = apply(cur, { t: 'wf', f }).game
        continue
      }
    }
    let stepped = false
    for (let c = 0; c < 7; c++) {
      const head = top(cur.tableau[c]!)
      if (!head?.up) continue
      const f = cur.foundations.findIndex((p) => canFoundation(p, head))
      if (f >= 0) {
        out.push({ t: 'tf', c, f })
        cur = apply(cur, { t: 'tf', c, f }).game
        stepped = true
        break
      }
    }
    if (!stepped) break
  }
  return out
}

// --- Persistence -----------------------------------------------------------

// The wire record is the deal plus the move log: complete undo state by
// construction, a few hundred bytes for a long game.
export type SavedGame = { v: 1; by: string; mode: Mode; seed: number; moves: string; auto?: true; n?: number }

export function serializeGame(by: string, deal: Deal, auto = false, n = 0): SavedGame {
  const out: SavedGame = { v: 1, by, mode: deal.mode, seed: deal.seed, moves: encodeLog(deal.log) }
  if (auto) out.auto = true
  // `n` is this writer's write ordinal: two writes of the same deal state
  // (an Undo returning to an earlier log) still differ, while a stale mirror
  // echo carries the identical pair - which is what makes the echo tellable
  // from a new record without trusting content equality.
  if (n > 0) out.n = n
  return out
}

export type Deal = { mode: Mode; seed: number; log: Move[] }

export function encodeMove(m: Move): string {
  switch (m.t) {
    case 'draw':
      return 'd'
    case 'redeal':
      return 'r'
    case 'wf':
      return `wf${m.f}`
    case 'wt':
      return `wt${m.c}`
    case 'tf':
      return `tf${m.c}.${m.f}`
    case 'ft':
      return `ft${m.f}.${m.c}`
    case 'tt':
      return `tt${m.c}.${m.d}.${m.n}`
  }
}

export function decodeMove(s: string): Move | null {
  const num = (v: string) => (/^\d+$/.test(v) ? Number.parseInt(v, 10) : -1)
  if (s === 'd') return { t: 'draw' }
  if (s === 'r') return { t: 'redeal' }
  if (s.startsWith('wf')) {
    const f = num(s.slice(2))
    return f >= 0 && f < 4 ? { t: 'wf', f } : null
  }
  if (s.startsWith('wt')) {
    const c = num(s.slice(2))
    return c >= 0 && c < 7 ? { t: 'wt', c } : null
  }
  if (s.startsWith('tf')) {
    const [c, f] = s.slice(2).split('.').map(num)
    return c !== undefined && f !== undefined && c >= 0 && c < 7 && f >= 0 && f < 4 ? { t: 'tf', c, f } : null
  }
  if (s.startsWith('ft')) {
    const [f, c] = s.slice(2).split('.').map(num)
    return f !== undefined && c !== undefined && f >= 0 && f < 4 && c >= 0 && c < 7 ? { t: 'ft', f, c } : null
  }
  if (s.startsWith('tt')) {
    const [c, d, n] = s.slice(2).split('.').map(num)
    return c !== undefined && d !== undefined && n !== undefined && c >= 0 && c < 7 && d >= 0 && d < 7 && n >= 1
      ? { t: 'tt', c, d, n }
      : null
  }
  return null
}

export const encodeLog = (log: Move[]) => log.map(encodeMove).join(',')

export function parseLog(moves: string): Move[] | null {
  if (moves === '') return []
  const out: Move[] = []
  for (const token of moves.split(',')) {
    const m = decodeMove(token)
    if (!m) return null
    out.push(m)
  }
  return out
}

/** Rebuilds the game from a deal: every logged move must still be legal, else the record is corrupt. */
export function buildGame(mode: Mode, seed: number, log: Move[]): Game | null {
  let g = newGame(seed, mode)
  for (const m of log) {
    if (!canApply(g, m)) return null
    g = apply(g, m).game
  }
  return g
}

/** Rebuilds from the stored string form. Null means malformed or corrupt. */
export function adoptGame(raw: string): { by: string; deal: Deal; game: Game; auto: boolean; n: number } | null {
  let saved: SavedGame
  try {
    saved = JSON.parse(raw) as SavedGame
  } catch {
    return null
  }
  // JSON.parse hands back any type: 'null', 'true', '42', '"x"' all parse fine.
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null
  if (saved.v !== 1 || typeof saved.by !== 'string' || typeof saved.seed !== 'number') return null
  if (saved.mode !== 'draw1' && saved.mode !== 'draw3') return null
  if (typeof saved.moves !== 'string') return null
  const log = parseLog(saved.moves)
  if (!log) return null
  // Seeds live and die as u32: the dealer truncates anyway, so adopt the same value.
  const seed = saved.seed >>> 0
  const game = buildGame(saved.mode, seed, log)
  if (!game) return null
  // Records written before `n` existed, or by a peer that never stamps it,
  // read as 0 - identity dedup falls back to content for those. An unsafe,
  // fractional or nonpositive ordinal is no ordinal either: adopting it would
  // pin writeSeq at the safe-integer ceiling where `+1` can never advance and
  // every later write would collide on one record id.
  const n = validWriteN(saved.n) ? saved.n : 0
  return { by: saved.by, deal: { mode: saved.mode, seed, log }, game, auto: saved.auto === true, n }
}

/**
 * The dedup identity of a raw record: `by:n` when the writer stamped an
 * ordinal, the raw bytes otherwise. A stale mirror echo re-serves the same
 * pair verbatim while a genuinely new write never repeats one, so this - not
 * record content - is what tells an old echo apart from an acknowledged
 * return to an earlier deal state.
 */
export function recordId(raw: string): string {
  try {
    const p = JSON.parse(raw) as { by?: unknown; n?: unknown }
    if (p && typeof p === 'object' && !Array.isArray(p) && typeof p.by === 'string' && validWriteN(p.n)) {
      return `${p.by}:${p.n}`
    }
  } catch {
    // Unparseable raws dedupe by content below.
  }
  return `raw:${raw}`
}

/** A write ordinal is only an ordinal while `+1` can still advance past it. */
export const validWriteN = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 1

/**
 * This copy's write identity: the id stamped on new records, every id it has
 * ever used (a previous epoch's records are still own writes for echo and
 * own-versus-foreign purposes), and its ordinal.
 */
export type Writer = { me: string; ids: Set<string>; seq: number }
export const newWriter = (me: string): Writer => ({ me, ids: new Set([me]), seq: 0 })

/**
 * The next (by, n) for a new write. Ordinals run 1..MAX_SAFE_INTEGER; at the
 * ceiling `+1` cannot produce a new number, so the writer rotates to a fresh
 * id and restarts - an epoch. `by:n` then stays unique for every new write,
 * including a byte-identical Undo, and n always remains a valid ordinal:
 * generated records never fall back to content identity.
 */
export const nextWriteN = (w: Writer, freshId: () => string): { by: string; n: number } => {
  if (w.seq >= 0 && w.seq < Number.MAX_SAFE_INTEGER) {
    w.seq += 1
  } else {
    w.me = freshId()
    w.ids.add(w.me)
    w.seq = 1
  }
  return { by: w.me, n: w.seq }
}

// --- Match statistics -------------------------------------------------------

export type ModeStats = { plays: number; wins: number; best: number | null }
// Seeds of deals already counted, per mode: a play is counted on its first move,
// a win on its first win - replaying either is idempotent.
export type Stats = Record<Mode, ModeStats> & { played: Record<Mode, number[]>; won: Record<Mode, number[]> }

export const EMPTY_STATS: Stats = {
  draw1: { plays: 0, wins: 0, best: null },
  draw3: { plays: 0, wins: 0, best: null },
  played: { draw1: [], draw3: [] },
  won: { draw1: [], draw3: [] }
}

// How many distinct deals a stat keeps identity for. Far past a lifetime of play.
const KNOWN_DEALS = 256

const seedList = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) return []
  const seen = new Set<number>()
  const out: number[] = []
  for (const v of raw) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    const s = v >>> 0
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out.slice(-KNOWN_DEALS)
}

export function normalizeStats(raw: unknown): Stats {
  const out: Stats = {
    draw1: { ...EMPTY_STATS.draw1 },
    draw3: { ...EMPTY_STATS.draw3 },
    played: { draw1: [], draw3: [] },
    won: { draw1: [], draw3: [] }
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>
    for (const mode of ['draw1', 'draw3'] as const) {
      const row = (rec as Record<string, Partial<ModeStats> | undefined>)[mode]
      if (!row) continue
      out[mode] = {
        plays: typeof row.plays === 'number' && row.plays >= 0 ? Math.floor(row.plays) : 0,
        wins: typeof row.wins === 'number' && row.wins >= 0 ? Math.floor(row.wins) : 0,
        best: typeof row.best === 'number' && row.best >= 1 ? Math.floor(row.best) : null
      }
      const lists = rec.played as Record<string, unknown> | undefined
      const wons = rec.won as Record<string, unknown> | undefined
      out.played[mode] = seedList(lists?.[mode])
      out.won[mode] = seedList(wons?.[mode])
      // A deal cannot be won without being played once; repair inflated records.
      if (out[mode].wins > out[mode].plays) out[mode].wins = out[mode].plays
    }
  }
  return out
}

/**
 * A deal counts as played once its first move lands - and never again, so undo
 * back to the deal, a re-dealt replacement or a fresh copy adopting it can
 * never count the same seed twice.
 */
export function recordPlay(stats: Stats, mode: Mode, seed: number): Stats {
  const s = seed >>> 0
  if (stats.played[mode].includes(s)) return stats
  return {
    ...stats,
    [mode]: { ...stats[mode], plays: stats[mode].plays + 1 },
    played: { ...stats.played, [mode]: [...stats.played[mode], s].slice(-KNOWN_DEALS) }
  }
}

/**
 * A win counts once per deal - undoing back past the winning move and winning
 * the same seed again cannot inflate the tally, but a lower move count on a
 * re-win still earns the best. Robust to undo, fold, relaunch and Auto.
 */
export function recordWin(stats: Stats, mode: Mode, seed: number, moves: number): Stats {
  const s = seed >>> 0
  const row = stats[mode]
  const best = row.best === null ? moves : Math.min(row.best, moves)
  if (stats.won[mode].includes(s)) return { ...stats, [mode]: { ...row, best } }
  return {
    ...stats,
    [mode]: { ...row, wins: row.wins + 1, best },
    won: { ...stats.won, [mode]: [...stats.won[mode], s].slice(-KNOWN_DEALS) }
  }
}

/**
 * Set-merge two stat records from different displays. Each copy writes the
 * same key, so a plain last-writer-wins save would drop whichever increments
 * the other screen just made; unioning the deal sets and keeping the larger
 * counters / smaller best makes every commit converge instead of clobber.
 */
export function mergeStats(a: Stats, b: Stats): Stats {
  const out: Stats = {
    draw1: { plays: 0, wins: 0, best: null },
    draw3: { plays: 0, wins: 0, best: null },
    played: { draw1: [], draw3: [] },
    won: { draw1: [], draw3: [] }
  }
  for (const mode of ['draw1', 'draw3'] as const) {
    out.played[mode] = [...new Set([...a.played[mode], ...b.played[mode]])].slice(-KNOWN_DEALS)
    out.won[mode] = [...new Set([...a.won[mode], ...b.won[mode]])].slice(-KNOWN_DEALS)
    const best =
      a[mode].best === null ? b[mode].best : b[mode].best === null ? a[mode].best : Math.min(a[mode].best, b[mode].best)
    // Counters can outlive the capped deal lists, so keep the larger of each.
    const plays = Math.max(out.played[mode].length, a[mode].plays, b[mode].plays)
    const wins = Math.min(Math.max(out.won[mode].length, a[mode].wins, b[mode].wins), plays)
    out[mode] = { plays, wins, best }
  }
  return out
}
