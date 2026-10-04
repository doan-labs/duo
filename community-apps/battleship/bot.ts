// The opponent: a hunt/target shot picker. Once a hull is bleeding it is
// chased along its own axis; until then the bot sweeps the checkerboard parity
// every ship of size two or more must cross. `fired` is the bot's whole shot
// history, and every return path picks outside it - the bot cannot fire twice.
import { CELL_COUNT, type Fleet, SIZE } from './game.ts'

const rowOf = (c: number) => Math.floor(c / SIZE)
const colOf = (c: number) => c % SIZE

function neighbors(c: number): number[] {
  const out: number[] = []
  if (rowOf(c) > 0) out.push(c - SIZE)
  if (rowOf(c) < SIZE - 1) out.push(c + SIZE)
  if (colOf(c) > 0) out.push(c - 1)
  if (colOf(c) < SIZE - 1) out.push(c + 1)
  return out
}

/**
 * Pick the bot's next shot. Returns null only when no unfired cell remains,
 * which the caller treats as the end of a corrupted or finished game.
 */
export function chooseShot(fired: Set<number>, fleet: Fleet, sunk: Set<number>): number | null {
  const targets = new Set<number>()
  fleet.forEach((cells, i) => {
    if (!cells || sunk.has(i)) return
    const hits = cells.filter((c) => fired.has(c))
    if (hits.length === 0) return
    if (hits.length === 1) {
      for (const n of neighbors(hits[0]!)) if (!fired.has(n)) targets.add(n)
      return
    }
    // Two hits give away the line: extend past both ends of the run.
    const lo = Math.min(...hits)
    const hi = Math.max(...hits)
    const step = cells[1]! - cells[0]!
    for (const end of [lo - step, hi + step]) {
      if (end < 0 || end >= CELL_COUNT || fired.has(end)) continue
      if (step === 1 && rowOf(end) !== rowOf(lo)) continue
      if (step === SIZE && colOf(end) !== colOf(lo)) continue
      targets.add(end)
    }
  })
  const open: number[] = []
  for (let c = 0; c < CELL_COUNT; c++) if (!fired.has(c)) open.push(c)
  // Hunt on parity: every hull left is at least two cells long, so each one
  // covers an even cell. The open fallback covers a fully swept board.
  const parity = open.filter((c) => (rowOf(c) + colOf(c)) % 2 === 0)
  const pool = targets.size ? [...targets] : parity.length ? parity : open
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]!
}
