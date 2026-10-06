// Jigsaw domain: piece geometry, placement rules, wire formats. Pure and
// deterministic - the same seed rebuilds the same edge map, so saves only
// carry positions and never the paths themselves.

export const BOARD_W = 400
export const BOARD_H = 300
// Felt margin around the board where loose pieces park. In board units, so a
// parked spot reads at the same relative place on both displays.
export const FELT = 72
export const SNAP = 0.34

export const COUNTS = [12, 24, 48] as const
export type Count = (typeof COUNTS)[number]

export const GRIDS: Record<number, { cols: number; rows: number }> = {
  12: { cols: 4, rows: 3 },
  24: { cols: 6, rows: 4 },
  48: { cols: 8, rows: 6 }
}

/** Deterministic RNG so a seed reproduces one edge map and one tray shuffle. */
export function rng32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Edge = {
  /** +1 the first cell protrudes, -1 the second does, 0 border/flat. */
  s: 0 | 1 | -1
  /** Knob centre drift along the edge, a small signed offset. */
  k: number
  /** Knob depth multiplier so neighbours share one exact shape. */
  d: number
}

export type Grid = { cols: number; rows: number; v: Edge[]; h: Edge[] }

/**
 * The edge map. v[(r * (cols - 1)) + (c - 1)] is the seam between (r, c - 1)
 * and (r, c); h[((r - 1) * cols) + c] the seam between (r - 1, c) and (r, c).
 * One Edge serves both sides, so neighbours always fit by construction.
 */
export function makeGrid(cols: number, rows: number, seed: number): Grid {
  const rnd = rng32(seed)
  const edge = (): Edge => ({ s: rnd() < 0.5 ? 1 : -1, k: (rnd() - 0.5) * 0.07, d: 0.82 + rnd() * 0.3 })
  const v: Edge[] = []
  const h: Edge[] = []
  for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) v.push(edge())
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) h.push(edge())
  return { cols, rows, v, h }
}

const vEdge = (g: Grid, r: number, c: number): Edge => g.v[r * (g.cols - 1) + (c - 1)]!
const hEdge = (g: Grid, r: number, c: number): Edge => g.h[(r - 1) * g.cols + c]!

const FLAT: Edge = { s: 0, k: 0, d: 1 }
const flip = (e: Edge): Edge => ({ s: -e.s as 0 | 1 | -1, k: e.k, d: e.d })

/** The four edges of a piece; signs already resolve to this piece's frame. */
export function pieceEdges(g: Grid, r: number, c: number): { top: Edge; right: Edge; bottom: Edge; left: Edge } {
  return {
    top: r === 0 ? FLAT : flip(hEdge(g, r, c)),
    right: c === g.cols - 1 ? FLAT : vEdge(g, r, c + 1),
    bottom: r === g.rows - 1 ? FLAT : hEdge(g, r + 1, c),
    left: c === 0 ? FLAT : flip(vEdge(g, r, c))
  }
}

export type Kind = 'corner' | 'edge' | 'middle'
export function kindOf(g: Grid, r: number, c: number): Kind {
  const e = pieceEdges(g, r, c)
  const flats = [e.top, e.right, e.bottom, e.left].filter((x) => x.s === 0).length
  return flats >= 2 ? 'corner' : flats === 1 ? 'edge' : 'middle'
}

export const cellW = (g: Grid) => BOARD_W / g.cols
export const cellH = (g: Grid) => BOARD_H / g.rows

// Knob profile along a unit edge: pairs of (t along, w across). The bump
// reaches about 0.26 of the edge length, multiplied by the edge's depth.
const KNOB: readonly (readonly number[])[] = [
  [0.42, 0],
  [0.46, 0, 0.42, 0.055, 0.4, 0.1],
  [0.36, 0.17, 0.4, 0.26, 0.5, 0.26],
  [0.6, 0.26, 0.64, 0.17, 0.6, 0.1],
  [0.58, 0.055, 0.54, 0, 0.58, 0],
  [1, 0]
]

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Path commands for one edge from p0 to p1. d is the unit direction, n the
 * outward normal (rotate d by -90deg), L the edge length and e its shape.
 * s=+1 bulges outward along n; s=-1 caves into the piece.
 */
function edgeD(x0: number, y0: number, dx: number, dy: number, nx: number, ny: number, L: number, e: Edge): string {
  if (e.s === 0) return `L${round(x0 + dx * L)} ${round(y0 + dy * L)}`
  const at = (t: number, w: number) =>
    `${round(x0 + dx * t * L + nx * w * e.d * e.s * L)} ${round(y0 + dy * t * L + ny * w * e.d * e.s * L)}`
  const parts: string[] = []
  for (const seg of KNOB) {
    const t = (v: number) => (v === 1 ? 1 : v + e.k)
    if (seg.length === 2) parts.push(`L${at(t(seg[0]!), seg[1]!)}`)
    else parts.push(`C${at(t(seg[0]!), seg[1]!)} ${at(t(seg[2]!), seg[3]!)} ${at(t(seg[4]!), seg[5]!)}`)
  }
  return parts.join('')
}

/** Full outline path of piece (r, c) in local coordinates - origin at its own
 * cell's top-left, tabs may reach beyond the cell rect. */
export function piecePath(g: Grid, r: number, c: number): string {
  const w = cellW(g)
  const h = cellH(g)
  const e = pieceEdges(g, r, c)
  return (
    `M0 0` +
    edgeD(0, 0, 1, 0, 0, -1, w, e.top) +
    edgeD(w, 0, 0, 1, 1, 0, h, e.right) +
    edgeD(w, h, -1, 0, 0, 1, w, e.bottom) +
    edgeD(0, h, 0, -1, -1, 0, h, e.left) +
    'Z'
  )
}

/** How far a tab can reach outside the cell rect: bounds thumbnails and the
 * felt clamp. */
export const tabReach = (g: Grid) => Math.min(cellW(g), cellH(g)) * 0.32

export type Zone = 0 | 1 | 2
export const TRAY: Zone = 0
export const BOARD: Zone = 1
export const LOCKED: Zone = 2

export type Piece = {
  /** Stable id: its index in the grid, row-major. */
  i: number
  r: number
  c: number
  z: Zone
  /** Board-unit position of the piece's cell origin while z is BOARD. */
  x: number
  y: number
}

export type Game = {
  v: 1
  art: string
  count: number
  cols: number
  rows: number
  seed: number
  pieces: Piece[]
  /** Piece ids in tray order; z stays TRAY while listed. */
  tray: number[]
  moves: number
  startedAt: number | null
  finishedAt: number | null
}

export type Live = { v: 1; by: string; held: number | null; game: Game }

export const slotX = (g: Game, p: Piece) => p.c * (BOARD_W / g.cols)
export const slotY = (g: Game, p: Piece) => p.r * (BOARD_H / g.rows)
const cellMin = (g: Game) => Math.min(BOARD_W / g.cols, BOARD_H / g.rows)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** A fresh puzzle: every piece in the tray, shuffled by the seed. */
export function newGame(art: string, count: Count, seed: number): Game {
  const spec = GRIDS[count]!
  const rnd = rng32(seed ^ 0x9e3779b9)
  const pieces: Piece[] = []
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) pieces.push({ i: r * spec.cols + c, r, c, z: TRAY, x: 0, y: 0 })
  }
  const tray = pieces.map((p) => p.i)
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[tray[i], tray[j]] = [tray[j]!, tray[i]!]
  }
  return {
    v: 1,
    art,
    count,
    cols: spec.cols,
    rows: spec.rows,
    seed,
    pieces,
    tray,
    moves: 0,
    startedAt: null,
    finishedAt: null
  }
}

export const gridOf = (g: Game): Grid => makeGrid(g.cols, g.rows, g.seed)

const withStarted = (g: Game, now: number): Game => (g.startedAt === null ? { ...g, startedAt: now } : g)

/**
 * Drops a piece at a board-unit origin. Within SNAP of the slot it locks;
 * otherwise it rests on the felt, clamped inside the margin. Returns the
 * next game plus whether it snapped.
 */
export function placeAt(g: Game, id: number, x: number, y: number, now: number): { game: Game; snapped: boolean } {
  const p = g.pieces[id]
  if (!p || p.z === LOCKED || g.finishedAt !== null) return { game: g, snapped: false }
  const w = BOARD_W / g.cols
  const h = BOARD_H / g.rows
  const reach = Math.min(w, h) * 0.32
  const snapped = Math.hypot(x - p.c * w, y - p.r * h) <= cellMin(g) * SNAP
  const pieces = g.pieces.slice()
  if (snapped) pieces[id] = { ...p, z: LOCKED, x: p.c * w, y: p.r * h }
  else
    pieces[id] = {
      ...p,
      z: BOARD,
      x: clamp(x, -FELT + reach, BOARD_W + FELT - reach - w),
      y: clamp(y, -FELT + reach, BOARD_H + FELT - reach - h)
    }
  const done = snapped && pieces.every((q) => q.z === LOCKED)
  const game: Game = {
    ...withStarted(g, now),
    pieces,
    tray: g.tray.filter((i) => i !== id),
    moves: g.moves + 1,
    finishedAt: done ? now : g.finishedAt
  }
  return { game, snapped }
}

/** Sends a loose board piece back to the tray, appended at the end. */
export function sendToTray(g: Game, id: number): Game {
  const p = g.pieces[id]
  if (!p || p.z !== BOARD || g.finishedAt !== null) return g
  const pieces = g.pieces.slice()
  pieces[id] = { ...p, z: TRAY, x: 0, y: 0 }
  return { ...g, pieces, tray: [...g.tray, id], moves: g.moves + 1 }
}

/** Collects every felt piece back into the tray, order preserved. */
export function collectBoard(g: Game): Game {
  if (g.finishedAt !== null) return g
  const pieces = g.pieces.slice()
  const tray = g.tray.slice()
  for (const p of g.pieces) {
    if (p.z !== BOARD) continue
    pieces[p.i] = { ...p, z: TRAY, x: 0, y: 0 }
    tray.push(p.i)
  }
  return { ...g, pieces, tray }
}

/** A finished or fresh game re-scatters into the tray with the same edges. */
export function resetGame(g: Game, seed: number): Game {
  const fresh = newGame(g.art, g.count as Count, g.seed)
  const rnd = rng32(seed)
  const tray = fresh.tray.slice()
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[tray[i], tray[j]] = [tray[j]!, tray[i]!]
  }
  return { ...fresh, tray }
}

export const isComplete = (g: Game) => g.finishedAt !== null
export const placedCount = (g: Game) => g.pieces.reduce((n, p) => n + (p.z === LOCKED ? 1 : 0), 0)
export const looseCount = (g: Game) => g.pieces.reduce((n, p) => n + (p.z === BOARD ? 1 : 0), 0)

export function elapsedMs(g: Game, now: number): number {
  if (g.startedAt === null) return 0
  return Math.max(0, (g.finishedAt ?? now) - g.startedAt)
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Tray ids matching a filter, order preserved. */
export function filterTray(g: Game, kind: 'all' | 'corner' | 'edge'): number[] {
  if (kind === 'all') return g.tray
  const grid = gridOf(g)
  return g.tray.filter((id) => {
    const p = g.pieces[id]!
    const k = kindOf(grid, p.r, p.c)
    return kind === 'corner' ? k === 'corner' : k === 'edge' || k === 'corner'
  })
}

// ---------- wire formats ----------

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Validates a stored or mirrored game. Returns null when the shape or the
 * piece conservation invariant cannot be repaired. */
export function cleanGame(v: unknown): Game | null {
  if (!record(v)) return null
  const spec = typeof v.count === 'number' ? GRIDS[v.count] : undefined
  if (!spec || spec.cols !== v.cols || spec.rows !== v.rows) return null
  if (typeof v.art !== 'string' || !v.art) return null
  const seed = num(v.seed)
  if (seed === null) return null
  const rawPieces = Array.isArray(v.pieces) ? v.pieces : []
  const total = spec.cols * spec.rows
  const seen = new Set<number>()
  const pieces: Piece[] = []
  for (const raw of rawPieces) {
    if (!record(raw)) return null
    const i = num(raw.i)
    const z: Zone | null = raw.z === TRAY || raw.z === BOARD || raw.z === LOCKED ? (raw.z as Zone) : null
    const x = num(raw.x)
    const y = num(raw.y)
    if (i === null || i < 0 || i >= total || i !== Math.floor(i) || z === null || x === null || y === null) return null
    if (seen.has(i)) return null
    seen.add(i)
    const r = Math.floor(i / spec.cols)
    const c = i % spec.cols
    pieces.push({ i, r, c, z, x: clamp(x, -FELT, BOARD_W + FELT), y: clamp(y, -FELT, BOARD_H + FELT) })
  }
  if (pieces.length !== total) return null
  const tray: number[] = []
  const rawTray = Array.isArray(v.tray) ? v.tray : []
  for (const id of rawTray)
    if (typeof id === 'number' && seen.has(id) && pieces[id]!.z === TRAY && !tray.includes(id)) tray.push(id)
  // Conservation repair: every tray-zoned piece must appear in the order list;
  // anything missing appends, anything listed but not tray-zoned is dropped.
  for (const p of pieces) if (p.z === TRAY && !tray.includes(p.i)) tray.push(p.i)
  const startedAt = num(v.startedAt)
  const finishedAt = num(v.finishedAt)
  const moves = num(v.moves) ?? 0
  return {
    v: 1,
    art: v.art,
    count: v.count as Count,
    cols: spec.cols,
    rows: spec.rows,
    seed,
    pieces,
    tray,
    moves,
    startedAt,
    finishedAt: finishedAt !== null && pieces.every((p) => p.z === LOCKED) ? finishedAt : null
  }
}

export function serializeGame(g: Game): string {
  return JSON.stringify(g)
}

export function parseGame(raw: string | null): Game | null {
  if (!raw) return null
  try {
    return cleanGame(JSON.parse(raw))
  } catch {
    return null
  }
}

/** The session mirror: who wrote it, the game and which piece is held. */
export function liveOf(by: string, game: Game, held: number | null): string {
  return JSON.stringify({ v: 1, by, held, game } satisfies Live)
}

export function parseLive(raw: string | null): Live | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!record(v) || typeof v.by !== 'string') return null
    const game = cleanGame(v.game)
    if (!game) return null
    const held = num(v.held)
    return {
      v: 1,
      by: v.by,
      held: held !== null && game.pieces[held] && game.pieces[held]!.z !== LOCKED ? held : null,
      game
    }
  } catch {
    return null
  }
}

/** Durable save: one game per art:count config plus the last-open pointer. */
export type Saves = { current: string | null; games: Record<string, Game> }
export const configKey = (art: string, count: number) => `${art}:${count}`

export function parseSaves(raw: string | null): Saves {
  if (!raw) return { current: null, games: {} }
  try {
    const v: unknown = JSON.parse(raw)
    if (!record(v) || !record(v.games)) return { current: null, games: {} }
    const games: Record<string, Game> = {}
    for (const [key, value] of Object.entries(v.games)) {
      const g = cleanGame(value)
      if (g && key === configKey(g.art, g.count)) games[key] = g
    }
    const current = typeof v.current === 'string' && games[v.current] ? v.current : null
    return { current, games }
  } catch {
    return { current: null, games: {} }
  }
}

export function serializeSaves(s: Saves): string {
  return JSON.stringify(s)
}
