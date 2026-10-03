// The wire value: placed hulls plus the shot list are the truth; every board,
// peg and log line on a display is derived by replaying them, so the two
// copies can never disagree about the match. `by` is the writer's id - a copy
// ignores its own writes.
export type Side = 'you' | 'bot'
export type Orientation = 'h' | 'v'
export type Shot = { by: Side; at: number }
export type Fleet = (number[] | null)[]
export type SavedGame = {
  by: string
  id: string
  fleet: Fleet
  enemy: number[][]
  shots: Shot[]
}
export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

export const SIZE = 10
export const CELL_COUNT = SIZE * SIZE

// Hull order is placement order: the biggest ship goes down first.
export const SHIPS = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 }
] as const

export const cellName = (i: number) => `${'ABCDEFGHIJ'[i % SIZE]}${Math.floor(i / SIZE) + 1}`

/** Cells a hull of `size` occupies anchored at `at`, or null off the grid. */
export function shipCells(at: number, size: number, dir: Orientation): number[] | null {
  const row = Math.floor(at / SIZE)
  const col = at % SIZE
  const cells: number[] = []
  for (let k = 0; k < size; k++) {
    const r = dir === 'v' ? row + k : row
    const c = dir === 'h' ? col + k : col
    if (r >= SIZE || c >= SIZE) return null
    cells.push(r * SIZE + c)
  }
  return cells
}

export function canPlace(fleet: Fleet, cells: number[]): boolean {
  return cells.every((c) => fleet.every((ship) => !ship?.includes(c)))
}

// A random legal fleet: rejection-sample each hull until it sits on open water.
export function randomFleet(): number[][] {
  const fleet: number[][] = []
  for (const ship of SHIPS) {
    for (;;) {
      const dir: Orientation = Math.random() < 0.5 ? 'h' : 'v'
      const cells = shipCells(Math.floor(Math.random() * CELL_COUNT), ship.size, dir)
      if (cells && canPlace(fleet, cells)) {
        fleet.push(cells)
        break
      }
    }
  }
  return fleet
}

export function newGame(by: string): SavedGame {
  return { by, id: crypto.randomUUID(), fleet: SHIPS.map(() => null), enemy: randomFleet(), shots: [] }
}

const isCell = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < CELL_COUNT

// A stored hull is only believable as a straight run of the ship's length.
function validHull(cells: number[], size: number): boolean {
  if (cells.length !== size || !cells.every(isCell)) return false
  const sorted = [...cells].sort((a, b) => a - b)
  const step = sorted.length > 1 ? sorted[1]! - sorted[0]! : 1
  if (step !== 1 && step !== SIZE) return false
  if (sorted.some((c, i) => i > 0 && c - sorted[i - 1]! !== step)) return false
  return step !== 1 || sorted.every((c) => Math.floor(c / SIZE) === Math.floor(sorted[0]! / SIZE))
}

// Partial fleets are legitimate (mid-placement); a bad slot degrades to
// unplaced, so a corrupted value costs one hull, not the match.
function sanitizeFleet(value: unknown, partial: boolean): Fleet | null {
  if (!Array.isArray(value)) return null
  const fleet: Fleet = SHIPS.map(() => null)
  const used = new Set<number>()
  for (let i = 0; i < SHIPS.length; i++) {
    const raw: unknown = value[i]
    if (raw === null || raw === undefined) {
      if (!partial) return null
      continue
    }
    const cells = Array.isArray(raw) ? raw.filter(isCell) : []
    if (!validHull(cells, SHIPS[i]!.size) || cells.some((c) => used.has(c))) {
      if (!partial) return null
      continue
    }
    for (const c of cells) used.add(c)
    fleet[i] = cells
  }
  return fleet
}

/** The wire value is untrusted: malformed games degrade to the longest legal
 * prefix rather than crashing the fold. Stored values arrive as JSON text, so
 * a string is parsed first; anything else is used as-is. */
export function adoptGame(saved: unknown, by: string): SavedGame {
  const fallback = newGame(by)
  if (typeof saved === 'string') {
    try {
      saved = JSON.parse(saved)
    } catch {
      return fallback
    }
  }
  if (!saved || typeof saved !== 'object') return fallback
  const g = saved as Partial<SavedGame>
  const fleet = sanitizeFleet(g.fleet, true) ?? SHIPS.map(() => null)
  const enemy = (sanitizeFleet(g.enemy, false) as number[][] | null) ?? randomFleet()
  // Alternation and a per-side no-repeat rule are part of the schema: a shot
  // list that breaks either is cut at the anomaly, like the chess prefix rule.
  const shots: Shot[] = []
  const seen = { you: new Set<number>(), bot: new Set<number>() }
  if (Array.isArray(g.shots)) {
    for (const raw of g.shots) {
      if (!raw || typeof raw !== 'object') break
      const s = raw as Partial<Shot>
      if ((s.by !== 'you' && s.by !== 'bot') || !isCell(s.at)) break
      if (s.by !== (shots.length % 2 === 0 ? 'you' : 'bot')) break
      if (seen[s.by].has(s.at)) break
      seen[s.by].add(s.at)
      shots.push({ by: s.by, at: s.at })
    }
  }
  return {
    by: typeof g.by === 'string' ? g.by : '',
    id: typeof g.id === 'string' ? g.id : fallback.id,
    fleet,
    enemy,
    shots
  }
}

export type ShotResult = 'miss' | 'hit' | 'sunk'
export type LogEntry = { n: number; by: Side; at: number; result: ShotResult; ship: string | null }
export type Phase = 'placing' | 'battle' | 'won' | 'lost'
export type Derived = {
  phase: Phase
  turn: Side | null
  winner: Side | null
  yourShots: Set<number>
  botShots: Set<number>
  yourHits: Set<number>
  botHits: Set<number>
  sunkYou: Set<number>
  sunkEnemy: Set<number>
  log: LogEntry[]
}

/** Replay the shot list into both boards, the sunk sets and the shot log. */
export function derive(game: SavedGame): Derived {
  const locate = (fleet: Fleet) => {
    const map = new Map<number, number>()
    fleet.forEach((cells, i) => cells?.forEach((c) => map.set(c, i)))
    return map
  }
  const yourMap = locate(game.fleet)
  const enemyMap = locate(game.enemy)
  const yourShots = new Set<number>()
  const botShots = new Set<number>()
  const yourHits = new Set<number>()
  const botHits = new Set<number>()
  const sunkYou = new Set<number>()
  const sunkEnemy = new Set<number>()
  // Hits already taken per hull index; a ship sinks when the count reaches size.
  const youTaken = new Array<number>(SHIPS.length).fill(0)
  const enemyTaken = new Array<number>(SHIPS.length).fill(0)
  const log: LogEntry[] = []
  game.shots.forEach((shot, i) => {
    const map = shot.by === 'you' ? enemyMap : yourMap
    const taken = shot.by === 'you' ? enemyTaken : youTaken
    const hits = shot.by === 'you' ? yourHits : botHits
    const sunk = shot.by === 'you' ? sunkEnemy : sunkYou
    ;(shot.by === 'you' ? yourShots : botShots).add(shot.at)
    const idx = map.get(shot.at)
    let result: ShotResult = 'miss'
    let ship: string | null = null
    if (idx !== undefined) {
      hits.add(shot.at)
      taken[idx] = (taken[idx] ?? 0) + 1
      result = 'hit'
      if (taken[idx] === SHIPS[idx]!.size) {
        result = 'sunk'
        ship = SHIPS[idx]!.name
        sunk.add(idx)
      }
    }
    log.push({ n: i + 1, by: shot.by, at: shot.at, result, ship })
  })
  const enemyCells = game.enemy.flat()
  const yourCells = game.fleet.flatMap((c) => c ?? [])
  const winner: Side | null =
    enemyCells.length > 0 && enemyCells.every((c) => yourShots.has(c))
      ? 'you'
      : yourCells.length > 0 && yourCells.every((c) => botShots.has(c))
        ? 'bot'
        : null
  // A fleet still missing hulls keeps the match in placing whatever the shots say.
  const placing = game.fleet.some((s) => s === null)
  const phase: Phase = placing ? 'placing' : winner === 'you' ? 'won' : winner === 'bot' ? 'lost' : 'battle'
  const turn: Side | null = phase === 'battle' ? (game.shots.length % 2 === 0 ? 'you' : 'bot') : null
  return { phase, turn, winner, yourShots, botShots, yourHits, botHits, sunkYou, sunkEnemy, log }
}

export type RecentMatch = { result: 'won' | 'lost'; shots: number }
export type Tally = { you: number; bot: number; lastGame: string | null; recent: RecentMatch[] }

const isRecent = (v: unknown): v is RecentMatch => {
  if (!v || typeof v !== 'object') return false
  const r = v as Partial<RecentMatch>
  return (r.result === 'won' || r.result === 'lost') && typeof r.shots === 'number'
}

export function parseRecord(value: string | null): Tally {
  if (!value) return { you: 0, bot: 0, lastGame: null, recent: [] }
  try {
    const p = JSON.parse(value) as Partial<Tally>
    return {
      you: Number(p.you) || 0,
      bot: Number(p.bot) || 0,
      lastGame: typeof p.lastGame === 'string' ? p.lastGame : null,
      recent: Array.isArray(p.recent) ? p.recent.filter(isRecent).slice(0, 6) : []
    }
  } catch {
    return { you: 0, bot: 0, lastGame: null, recent: [] }
  }
}

// Wide boxes put the rail beside two boards, so it costs width not height; the
// cover stacks one board with a toggle, controls and the log under it. Bottom
// padding clears the home bar.
export function fitLayout(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 20 : 14
  const top = wide ? 18 : 12
  const bottom = wide ? 34 : 26
  const header = wide ? 56 : 46
  const status = 20
  const labels = wide ? 22 : 0
  const rail = wide ? 252 : 0
  const stageGap = wide ? 52 : 0
  const under = wide ? 0 : 148
  const gaps = wide ? 40 : 26
  const width = view.width || 740
  const height = view.height || 480
  const freeH = height - top - header - status - bottom - gaps
  const across = wide ? (width - padX * 2 - rail - stageGap) / 2 : width - padX * 2
  const board = wide ? Math.min(freeH - labels, across) : Math.min(freeH - under, across)
  return { board: Math.max(120, Math.floor(board)) }
}
