// Block Drop rules and wire format. The session value is the whole game, so
// both displays draw the same field; only the copy that wrote it ignores it on
// the way back in. Everything is plain data - the stores carry JSON, so the
// state itself stays serializable.

export const COLS = 10
export const ROWS = 20
export const NEXT_COUNT = 3

export type Kind = 1 | 2 | 3 | 4 | 5 | 6 | 7
export const KINDS: readonly Kind[] = [1, 2, 3, 4, 5, 6, 7]
// I, O, T, S, Z, J, L in order; names ride along for labels and aria text.
export const KIND_NAME: Record<Kind, string> = { 1: 'I', 2: 'O', 3: 'T', 4: 'S', 5: 'Z', 6: 'J', 7: 'L' }

export type Status = 'ready' | 'playing' | 'paused' | 'over'
export type Piece = { k: Kind; r: number; x: number; y: number; grace: number; slides: number }
export type Game = {
  /** Writer id: a copy ignores the session writes it made itself. */
  by: string
  /** Run id, so a rematch's cues never replay the last game's. */
  id: string
  board: number[]
  piece: Piece | null
  queue: Kind[]
  bag: Kind[]
  hold: Kind | null
  /** Hold is allowed once per falling piece; locks reopen it. */
  holdFree: boolean
  score: number
  lines: number
  level: number
  combo: number
  status: Status
  /** Rows the last lock cleared, still on the field for their flash. */
  cleared: number[]
  /** Points the last lock awarded (lines + combo), for the fly-up. */
  last: number
  /** PRNG state; the queue is deterministic for whichever copy next ticks. */
  rng: number
  /** Pieces spawned this run: the falling layer's key and the lock signal. */
  drops: number
  /** Monotonic write counter: animation keys and staleness checks. */
  tick: number
}
export type Save = { best: number; game: Game | null }
export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

// Cell maps per rotation state, in the piece's own box. I lives in a 4-wide
// box, O in a 2x2 shifted into the middle of a 4-wide spawn box, the rest in
// 3-wide boxes. Spawn x=3 lands the 3-wide boxes on columns 3-5 and I on 3-6.
const SHAPES: Record<Kind, readonly (readonly [number, number])[][]> = {
  1: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1]
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3]
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3]
    ]
  ],
  2: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ]
  ],
  3: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  4: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2]
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  5: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2]
    ]
  ],
  6: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2]
    ]
  ],
  7: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2]
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2]
    ]
  ]
}

// Kick order on a blocked rotation: in place, one step either way, a step up
// (floor kick), two steps either way. Enough for slides and floor saves without
// the full SRS tables.
const KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [-2, 0],
  [2, 0]
]

const SPAWN_X = 3
const SPAWN_Y = -1
// A grounded piece locks on the second blocked gravity tick, so slides and
// spins get one full interval of grace no matter the level.
const LOCK_GRACE = 1
const MAX_SLIDES = 15
const LINE_POINTS = [0, 40, 100, 300, 1200]

export const cellsOf = (piece: Piece): [number, number][] =>
  SHAPES[piece.k][piece.r & 3]!.map(([dx, dy]) => [piece.x + dx, piece.y + dy])

const blocked = (board: number[], cells: [number, number][]) =>
  cells.some(([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y * COLS + x] !== 0))

// mulberry32: the bag is fair and reproducible, and the state in the session
// key carries the draw position so a handoff mid-game keeps one future.
const roll = (rng: number): [number, number] => {
  const s = (rng + 0x6d2b79f5) >>> 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

function freshBag(rng: number): [Kind[], number] {
  const bag = [...KINDS]
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const [v, s] = roll(rng)
    rng = s
    const j = Math.floor(v * (i + 1))
    const t = bag[i]!
    bag[i] = bag[j]!
    bag[j] = t
  }
  return [bag, rng]
}

/** Pop the queue's head, topping it up from the bag; reshuffles as needed. */
function draw(g: Game): [Kind, Game] {
  const queue = [...g.queue]
  const bag = [...g.bag]
  let rng = g.rng
  while (queue.length <= NEXT_COUNT + 1) {
    if (!bag.length) {
      const [next, r] = freshBag(rng)
      rng = r
      bag.push(...next)
    }
    queue.push(bag.shift()!)
  }
  return [queue.shift()!, { ...g, queue, bag, rng }]
}

function spawn(g: Game): Game {
  const [k, next] = draw(g)
  const piece: Piece = { k, r: 0, x: SPAWN_X, y: SPAWN_Y, grace: 0, slides: 0 }
  // Lock out: the fresh piece already overlaps the stack.
  const status: Status = blocked(next.board, cellsOf(piece)) ? 'over' : next.status
  return { ...next, piece, status, drops: next.drops + 1 }
}

export function newGame(by: string, seed = (Math.random() * 4294967296) >>> 0): Game {
  const g: Game = {
    by,
    id: crypto.randomUUID(),
    board: new Array(COLS * ROWS).fill(0),
    piece: null,
    queue: [],
    bag: [],
    hold: null,
    holdFree: true,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    status: 'ready',
    cleared: [],
    last: 0,
    rng: seed,
    drops: 0,
    tick: 0
  }
  return spawn(g)
}

export const intervalFor = (level: number) => Math.max(70, Math.round(800 * 0.8 ** (level - 1)))

function lock(g: Game): Game {
  const piece = g.piece!
  const board = [...g.board]
  let above = true
  for (const [x, y] of cellsOf(piece)) {
    if (y >= 0) {
      board[y * COLS + x] = piece.k
      above = false
    }
  }
  const cleared: number[] = []
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board.slice(y * COLS, y * COLS + COLS).every((c) => c !== 0)) {
      board.splice(y * COLS, COLS)
      board.unshift(...new Array<number>(COLS).fill(0))
      // Post-collapse index: each earlier removal slid this row's band up one.
      cleared.push(y - cleared.length)
      y += 1
    }
  }
  const combo = cleared.length ? g.combo + 1 : 0
  const lines = g.lines + cleared.length
  const level = 1 + Math.floor(lines / 10)
  const gained = LINE_POINTS[cleared.length]! * g.level + (combo > 0 ? 50 * combo * g.level : 0)
  const score = g.score + gained
  const next: Game = {
    ...g,
    board,
    piece: null,
    holdFree: true,
    score,
    lines,
    level,
    combo,
    cleared,
    last: gained,
    // A piece buried wholly above the field is a block out; otherwise spawn
    // decides lock out on the next piece's overlap.
    status: above ? 'over' : g.status
  }
  return next.status === 'over' ? next : spawn(next)
}

/** One gravity step: the piece falls, or rests a tick, or locks. */
export function gravity(g: Game): Game {
  if (g.status !== 'playing') return g
  const piece = g.piece
  if (!piece) return spawn({ ...g, cleared: [] })
  const down: Piece = { ...piece, y: piece.y + 1, grace: 0 }
  if (!blocked(g.board, cellsOf(down))) return { ...g, piece: down }
  if (piece.grace >= LOCK_GRACE) return lock(g)
  return { ...g, piece: { ...piece, grace: piece.grace + 1 } }
}

const grounded = (g: Game) => {
  const piece = g.piece!
  return blocked(g.board, cellsOf({ ...piece, y: piece.y + 1 }))
}

/** Sideways shift. A grounded piece's move resets its lock timer, a bounded number of times. */
export function shift(g: Game, dx: number): Game {
  const piece = g.piece
  if (g.status !== 'playing' || !piece) return g
  const next: Piece = { ...piece, x: piece.x + dx }
  if (blocked(g.board, cellsOf(next))) return g
  if (grounded(g) && piece.slides < MAX_SLIDES) return { ...g, piece: { ...next, grace: 0, slides: piece.slides + 1 } }
  return { ...g, piece: next }
}

export function rotate(g: Game, dir: 1 | -1): Game {
  const piece = g.piece
  if (g.status !== 'playing' || !piece || piece.k === 2) return g
  const r = (piece.r + dir + 4) & 3
  for (const [kx, ky] of KICKS) {
    const next: Piece = { ...piece, r, x: piece.x + kx, y: piece.y + ky }
    if (blocked(g.board, cellsOf(next))) continue
    if (grounded(g) && piece.slides < MAX_SLIDES)
      return { ...g, piece: { ...next, grace: 0, slides: piece.slides + 1 } }
    return { ...g, piece: next }
  }
  return g
}

/** Soft drop: one row at a time, one point each, lock timer untouched. */
export function softDrop(g: Game): Game {
  const piece = g.piece
  if (g.status !== 'playing' || !piece) return g
  const down: Piece = { ...piece, y: piece.y + 1, grace: 0 }
  if (blocked(g.board, cellsOf(down))) return g
  return { ...g, piece: down, score: g.score + 1 }
}

/** Hard drop: to the floor, two points a row, locked on landing. */
export function hardDrop(g: Game): Game {
  const piece = g.piece
  if (g.status !== 'playing' || !piece) return g
  let y = piece.y
  while (!blocked(g.board, cellsOf({ ...piece, y: y + 1 }))) y += 1
  return lock({ ...g, piece: { ...piece, y }, score: g.score + (y - piece.y) * 2 })
}

/** Where the piece lands: the row a hard drop would take it to. */
export function ghostY(board: number[], piece: Piece): number {
  let y = piece.y
  while (!blocked(board, cellsOf({ ...piece, y: y + 1 }))) y += 1
  return y
}

/** Swap the falling piece for the held one - once per drop, opened by a lock. */
export function hold(g: Game): Game {
  const piece = g.piece
  if ((g.status !== 'playing' && g.status !== 'ready') || !piece || !g.holdFree) return g
  if (g.hold === null) {
    const swapped = spawn({ ...g, hold: piece.k, holdFree: false })
    return swapped
  }
  const next: Piece = { k: g.hold, r: 0, x: SPAWN_X, y: SPAWN_Y, grace: 0, slides: 0 }
  const status: Status = blocked(g.board, cellsOf(next)) ? 'over' : g.status
  return { ...g, piece: next, hold: piece.k, holdFree: false, cleared: [], status }
}

const isKind = (v: unknown): v is Kind => typeof v === 'number' && KINDS.includes(v as Kind)
const clampInt = (v: unknown, lo: number, hi: number, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : fallback

// The session value is untrusted input: anything odd degrades to a fresh game
// or the nearest legal field rather than crashing the fold handoff.
export function adoptGame(saved: unknown, by: string): Game {
  const fallback = newGame(by)
  if (!saved || typeof saved !== 'object') return fallback
  const g = saved as Partial<Game>
  const board = Array.isArray(g.board)
    ? Array.from({ length: COLS * ROWS }, (_, i) => clampInt(g.board![i], 0, 7, 0))
    : fallback.board
  const piece: Piece | null =
    g.piece && typeof g.piece === 'object' && isKind((g.piece as Piece).k)
      ? {
          k: (g.piece as Piece).k,
          r: clampInt((g.piece as Piece).r, 0, 3, 0),
          x: clampInt((g.piece as Piece).x, -4, COLS + 4, SPAWN_X),
          y: clampInt((g.piece as Piece).y, -4, ROWS, SPAWN_Y),
          grace: 0,
          slides: 0
        }
      : null
  return {
    by: typeof g.by === 'string' ? g.by : '',
    id: typeof g.id === 'string' ? g.id : fallback.id,
    board,
    piece,
    queue: Array.isArray(g.queue) ? g.queue.filter(isKind).slice(0, 8) : fallback.queue,
    bag: Array.isArray(g.bag) ? g.bag.filter(isKind) : [],
    hold: isKind(g.hold) ? g.hold : null,
    holdFree: g.holdFree !== false,
    score: clampInt(g.score, 0, 999999999, 0),
    lines: clampInt(g.lines, 0, 99999, 0),
    level: clampInt(g.level, 1, 30, 1),
    combo: clampInt(g.combo, 0, 99, 0),
    status:
      g.status === 'playing' || g.status === 'paused' || g.status === 'over' || g.status === 'ready'
        ? g.status
        : 'ready',
    cleared: Array.isArray(g.cleared) ? g.cleared.filter((y): y is number => typeof y === 'number') : [],
    last: clampInt(g.last, 0, 9999999, 0),
    rng: clampInt(g.rng, 0, 4294967295, fallback.rng),
    drops: clampInt(g.drops, 0, 4294967295, 0),
    tick: clampInt(g.tick, 0, 4294967295, 0)
  }
}

export function parseSave(value: string | null): Save {
  const empty: Save = { best: 0, game: null }
  if (!value) return empty
  try {
    const p = JSON.parse(value) as Partial<Save>
    const game = p.game && typeof p.game === 'object' ? adoptGame(p.game, '') : null
    return { best: clampInt(p.best, 0, 999999999, 0), game }
  } catch {
    return empty
  }
}

// Wide boxes put the rail beside the field and spend width; narrow boxes - the
// cover or a split half - run a slim rail next to the field and controls below.
// All sizes are measured here so the layout never guesses.
export function fitLayout(view: ViewDimensions, wide: boolean) {
  const width = view.width || 740
  const height = view.height || 480
  const cover = view.display === 'cover'
  const padX = wide ? 24 : 12
  const chrome = wide ? 100 : 158 // header, status line, controls on the narrow layout
  const railW = wide ? 236 : 94
  const gap = wide ? 24 : 10
  const availW = width - padX * 2 - railW - gap
  const availH = height - chrome - (cover ? 26 : 30)
  const cell = Math.max(8, Math.floor(Math.min(availH / ROWS, availW / COLS)))
  // A mini frame is 4x2 cells: hold and next draw pieces at reduced size.
  const mini = wide ? 11 : 7
  // Touch controls: five buttons share the row on the cover, cap at 56.
  const ctrl = wide ? 44 : Math.min(56, Math.floor((width - padX * 2 - 32) / 5))
  const pad = Math.max(4, Math.round(cell * 0.28))
  return { cell, board: cell * COLS, boardH: cell * ROWS, pad, rail: railW, mini, ctrl, narrow: !wide }
}
