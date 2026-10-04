// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun sequencer.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import {
  clampTempo,
  defaultMutes,
  emptyGrid,
  freshLive,
  gridCount,
  gridOn,
  gridSet,
  gridToggle,
  MAX_TEMPO,
  MIN_TEMPO,
  nextLoopName,
  parseEngine,
  parseLive,
  parseLoops,
  parseSketch,
  pause,
  play,
  reanchor,
  starterGrid,
  stepAt,
  stepMs,
  TRACK_COUNT,
  writeLive,
  writeSketch
} from './sequencer.ts'

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

check('stepMs is a sixteenth note at tempo', () => {
  eq(stepMs(120), 125)
  eq(stepMs(60), 250)
})

check('stepAt holds a paused transport and advances a playing one linearly', () => {
  eq(stepAt({ on: false, step: 3 }, 120, 99999), 3)
  const t = { on: true, atMs: 1000, atStep: 2 } as const
  eq(stepAt(t, 120, 1000), 2)
  eq(stepAt(t, 120, 1125), 3) // one 125ms step later
  eq(stepAt(t, 120, 1000 + 16 * 125), 18) // past the bar, unwrapped
})

check('play and pause round-trip the audible position', () => {
  const on = play({ on: false, step: 1.5 }, 120, 500)
  eq(on, { on: true, atMs: 500, atStep: 1.5 })
  const off = pause(on, 120, 500 + 2 * 125) // two steps later
  eq(off, { on: false, step: 3.5 })
  // wraps within the bar
  const wrapped = pause({ on: true, atMs: 0, atStep: 15 }, 120, 2 * 125)
  eq(wrapped, { on: false, step: 1 })
})

check('reanchor keeps position across a tempo change', () => {
  const on = { on: true, atMs: 0, atStep: 0 } as const
  const moved = reanchor(on, 120, 250) // 2 steps at 120bpm
  eq(moved, { on: true, atMs: 250, atStep: 2 })
  // after reanchor the NEW tempo advances from the preserved position
  eq(stepAt(moved, 60, 250 + 250), 3) // one 250ms step at 60bpm
  const off = { on: false, step: 7 } as const
  eq(reanchor(off, 120, 999), off)
})

check('clampTempo bounds and rounds', () => {
  eq(clampTempo(10), MIN_TEMPO)
  eq(clampTempo(999), MAX_TEMPO)
  eq(clampTempo(112.6), 113)
})

check('grid edits only touch the addressed cell', () => {
  let grid = emptyGrid()
  eq(gridCount(grid), 0)
  grid = gridToggle(grid, 1, 3)
  ok(gridOn(grid, 1, 3), 'toggled on')
  eq(gridCount(grid), 1)
  grid = gridSet(grid, 1, 3, true)
  eq(gridCount(grid), 1) // idempotent set
  grid = gridSet(grid, 1, 3, false)
  ok(!gridOn(grid, 1, 3), 'set off')
  // other tracks untouched
  eq(grid[0], 0)
  eq(grid[2], 0)
})

check('starterGrid grooves out of the box', () => {
  const grid = starterGrid()
  eq(grid.length, TRACK_COUNT)
  eq(gridCount(grid), 15)
})

check('freshLive prefers a stored sketch and starts paused', () => {
  const live = freshLive('cover', { grid: emptyGrid(), mutes: [true, false, false, false], tempo: 96 })
  eq(live.tempo, 96)
  eq(live.transport, { on: false, step: 0 })
  eq(live.mutes[0], true)
  eq(freshLive('inner', null).tempo, 112)
})

check('live/sketch documents round-trip and reject malformed payloads', () => {
  const live = freshLive('cover')
  const back = parseLive(writeLive(live))
  eq(back, { ...live, loop: undefined })
  eq(parseLive('{"by":1}'), null)
  eq(parseLive('not json'), null)
  eq(parseLive(null), null)
  // mildly out-of-range tempo clamps on read; far out rejects
  const warm = parseLive(JSON.stringify({ ...live, tempo: 200 }))
  eq(warm?.tempo, MAX_TEMPO)
  eq(parseLive(JSON.stringify({ ...live, tempo: 999 })), null)
  const sketch = { grid: starterGrid(), mutes: defaultMutes(), tempo: 100 }
  eq(parseSketch(writeSketch(sketch)), sketch)
  eq(parseSketch(JSON.stringify({ grid: [1], tempo: 100 })), null)
})

check('parseLoops drops bad entries and nextLoopName fills gaps', () => {
  const raw = JSON.stringify([
    { id: 'a', name: 'Loop 1', tempo: 100, grid: starterGrid(), savedAt: 1 },
    { id: 5, name: 'bogus', tempo: 'x', grid: [] },
    { id: 'b', name: 'Loop 3', tempo: 90, grid: emptyGrid(), savedAt: 2 }
  ])
  const loops = parseLoops(raw)
  eq(loops.length, 2)
  eq(nextLoopName(loops), 'Loop 2') // gap before climbing
  eq(parseLoops('[]'), [])
  eq(parseLoops('junk'), [])
})

check('parseEngine tolerates missing fields and bad input', () => {
  eq(parseEngine('{"on":true}'), { on: true, blocked: false, at: undefined })
  eq(parseEngine('{"on":false,"blocked":true,"at":"cover"}'), { on: false, blocked: true, at: 'cover' })
  eq(parseEngine('{"on":"yes"}'), null)
  eq(parseEngine(null), null)
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`sequencer.test.ts: ${passed} checks passed`)
