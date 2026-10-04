// The shared state of one sketch: which pads are lit, the tempo, mutes and the
// transport. Every field serializes compactly because the whole document rides
// on one session key both displays write last-writer-wins.

export const STEPS = 16
export const TRACK_COUNT = 4
export const MIN_TEMPO = 60
export const MAX_TEMPO = 184

export const TRACKS = [
  { id: 'keys', name: 'Keys' },
  { id: 'hat', name: 'Hat' },
  { id: 'snare', name: 'Snare' },
  { id: 'kick', name: 'Kick' }
] as const

// One transport anchors a wall-clock line through step space: the position is
// a linear function of Date.now(), so the hidden copy computes the same
// playhead the owner's scheduler hears, with no tick counting anywhere.
export type Transport = { on: true; atMs: number; atStep: number } | { on: false; step: number }

export type Live = {
  by: string
  /** One 16-bit row per track; bit s is step s lit. */
  grid: number[]
  mutes: boolean[]
  tempo: number
  transport: Transport
  /** The saved loop this sketch was loaded from, so both displays name it. */
  loop?: string
}

export type Sketch = { grid: number[]; mutes: boolean[]; tempo: number }
export type Loop = { id: string; name: string; tempo: number; grid: number[]; savedAt: number }

// Milliseconds per step: sixteenth notes at the current tempo.
export const stepMs = (tempo: number) => 15000 / tempo

export function stepAt(transport: Transport, tempo: number, now: number) {
  return transport.on ? transport.atStep + (now - transport.atMs) / stepMs(tempo) : transport.step
}

export function play(transport: Transport, tempo: number, now: number): Transport {
  return { on: true, atMs: now, atStep: stepAt(transport, tempo, now) % STEPS }
}

export function pause(transport: Transport, tempo: number, now: number): Transport {
  return { on: false, step: stepAt(transport, tempo, now) % STEPS }
}

// Tempo changes keep the audible position: re-anchor the transport at the
// position the OLD tempo already reached, then apply the new rate to what is
// still ahead. Callers write `tempo` in the same edit.
export function reanchor(transport: Transport, oldTempo: number, now: number): Transport {
  return transport.on ? { on: true, atMs: now, atStep: stepAt(transport, oldTempo, now) } : transport
}

export const clampTempo = (tempo: number) => Math.round(Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, tempo)))

export const gridOn = (grid: number[], track: number, step: number) => ((grid[track] ?? 0) & (1 << step)) !== 0

export function gridToggle(grid: number[], track: number, step: number) {
  return grid.map((row, i) => (i === track ? row ^ (1 << step) : row))
}

export function gridSet(grid: number[], track: number, step: number, on: boolean) {
  const bit = 1 << step
  return grid.map((row, i) => (i === track ? (on ? row | bit : row & ~bit) : row))
}

export function gridCount(grid: number[]) {
  let count = 0
  for (const row of grid) {
    let r = row
    while (r) {
      count += r & 1
      r >>= 1
    }
  }
  return count
}

const row = (steps: number[]) => steps.reduce((bits, s) => bits | (1 << s), 0)

// A first sketch that already grooves, so the very first Play answers with a
// real loop instead of silence.
export function starterGrid(): number[] {
  return [
    row([0, 3, 6, 10, 14]), // Keys
    row([2, 6, 10, 14]), // Hat
    row([4, 12]), // Snare
    row([0, 4, 8, 12]) // Kick
  ]
}

export const emptyGrid = () => Array.from({ length: TRACK_COUNT }, () => 0)
export const defaultMutes = () => Array.from({ length: TRACK_COUNT }, () => false)

export function freshLive(by: string, sketch?: Sketch | null): Live {
  return {
    by,
    grid: sketch?.grid ?? starterGrid(),
    mutes: sketch?.mutes ?? defaultMutes(),
    tempo: sketch?.tempo ?? 112,
    transport: { on: false, step: 0 }
  }
}

const isGrid = (grid: unknown): grid is number[] =>
  Array.isArray(grid) &&
  grid.length === TRACK_COUNT &&
  grid.every((r) => Number.isSafeInteger(r) && r >= 0 && r < 2 ** STEPS)

const isMutes = (mutes: unknown): mutes is boolean[] =>
  Array.isArray(mutes) && mutes.length === TRACK_COUNT && mutes.every((m) => typeof m === 'boolean')

const isTempo = (tempo: unknown): tempo is number =>
  typeof tempo === 'number' && tempo >= MIN_TEMPO - 24 && tempo <= MAX_TEMPO + 24

const isTransport = (transport: unknown): transport is Transport =>
  typeof transport === 'object' &&
  transport !== null &&
  (((transport as Transport).on === false && typeof (transport as { step?: unknown }).step === 'number') ||
    ((transport as Transport).on === true &&
      typeof (transport as { atMs?: unknown }).atMs === 'number' &&
      typeof (transport as { atStep?: unknown }).atStep === 'number'))

export function writeLive(live: Live) {
  return JSON.stringify(live)
}

export function parseLive(raw: string | null): Live | null {
  if (!raw) return null
  try {
    const live = JSON.parse(raw) as Live
    if (typeof live?.by !== 'string' || !isGrid(live.grid) || !isTempo(live.tempo) || !isTransport(live.transport)) {
      return null
    }
    return {
      by: live.by,
      grid: live.grid,
      mutes: isMutes(live.mutes) ? live.mutes : defaultMutes(),
      tempo: clampTempo(live.tempo),
      transport: live.transport,
      loop: typeof live.loop === 'string' ? live.loop : undefined
    }
  } catch {
    return null
  }
}

export function writeSketch(sketch: Sketch) {
  return JSON.stringify(sketch)
}

export function parseSketch(raw: string | null): Sketch | null {
  if (!raw) return null
  try {
    const sketch = JSON.parse(raw) as Sketch
    if (!isGrid(sketch?.grid) || !isTempo(sketch?.tempo)) return null
    return {
      grid: sketch.grid,
      mutes: isMutes(sketch.mutes) ? sketch.mutes : defaultMutes(),
      tempo: clampTempo(sketch.tempo)
    }
  } catch {
    return null
  }
}

export function parseLoops(raw: string | null): Loop[] {
  if (!raw) return []
  try {
    const loops = JSON.parse(raw) as Loop[]
    if (!Array.isArray(loops)) return []
    return loops.filter(
      (loop) =>
        loop && typeof loop.id === 'string' && typeof loop.name === 'string' && isGrid(loop.grid) && isTempo(loop.tempo)
    )
  } catch {
    return []
  }
}

// Names free the author: Loop 1, Loop 2, ... first gap wins so a deleted slot
// is reused instead of climbing forever.
export function nextLoopName(loops: Loop[]) {
  const names = new Set(loops.map((loop) => loop.name))
  for (let i = 1; ; i++) {
    const name = `Loop ${i}`
    if (!names.has(name)) return name
  }
}

export type EngineInfo = { on: boolean; blocked: boolean; at?: string }

export function parseEngine(raw: string | null): EngineInfo | null {
  if (!raw) return null
  try {
    const info = JSON.parse(raw) as EngineInfo
    if (typeof info?.on !== 'boolean') return null
    return { on: info.on, blocked: info.blocked === true, at: typeof info.at === 'string' ? info.at : undefined }
  } catch {
    return null
  }
}
