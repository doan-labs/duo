// Admission-gate tests, runnable via `bun live.test.ts` or `bun test`.
// Pure like engine.test.ts: no SDK import - the gate takes a ViewLike so the
// four visibility/activity combinations and same-turn flips run deterministically.
// Community app tests must not import bun:test or node: modules.

import { admit, live, stepTarget, stillBound, type ViewLike } from './live'

const failures: string[] = []

const check = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (e) {
    failures.push(name)
    console.log(`FAIL - ${name}: ${(e as Error).message}`)
  }
}

const eq = <T>(a: T, b: T, msg = '') => {
  if (!Object.is(a, b)) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)} ${msg}`)
}

// A fake copy wired like the real handlers: every user intent mutates a sink
// that stands in for refs + UI + ui/prefs/progress KV + the audio queue.
const sink = () => ({ uiWrites: 0, kvWrites: 0, sessionWrites: 0, progress: 0, audio: 0, ui: 0 })

const hiddenIntent = (s: ReturnType<typeof sink>) => () => {
  s.uiWrites++
  s.kvWrites++
  s.sessionWrites++
  s.progress++
  s.audio++
  s.ui++
}

check('live admits only a copy that is both visible and active', () => {
  eq(live({ visible: false, active: false }), false)
  eq(live({ visible: false, active: true }), false)
  eq(live({ visible: true, active: false }), false)
  eq(live({ visible: true, active: true }), true)
})

check('hidden copy (false+false): new intent writes nothing anywhere', () => {
  const s = sink()
  const ok = admit({ visible: false, active: false }, hiddenIntent(s))
  eq(ok, false)
  eq(s.uiWrites, 0)
  eq(s.kvWrites, 0)
  eq(s.sessionWrites, 0)
  eq(s.progress, 0)
  eq(s.audio, 0)
  eq(s.ui, 0)
})

check('sleep/clipped copy (false visible, true active) rejects new input', () => {
  const s = sink()
  eq(admit({ visible: false, active: true }, hiddenIntent(s)), false)
  eq(s.kvWrites + s.sessionWrites + s.uiWrites, 0)
  eq(s.progress, 0)
  eq(s.audio, 0)
})

check('inactive copy (true visible, false active) rejects new input', () => {
  const s = sink()
  eq(admit({ visible: true, active: false }, hiddenIntent(s)), false)
  eq(s.kvWrites + s.sessionWrites + s.uiWrites, 0)
  eq(s.progress, 0)
  eq(s.audio, 0)
})

check('admission is read at event time: same-turn snapshot flip wins', () => {
  // The view flips to hidden between two dispatches; a render-lagged copy would
  // still look live but the second intent must be rejected.
  const v: ViewLike = { visible: true, active: true }
  const s = sink()
  eq(admit(v, hiddenIntent(s)), true)
  v.visible = false
  eq(admit(v, hiddenIntent(s)), false)
  eq(s.uiWrites, 1)
  eq(s.kvWrites, 1)
  eq(s.audio, 1)
})

check('an intent admitted before the hide completes exactly once', () => {
  const s = sink()
  eq(admit({ visible: true, active: true }, hiddenIntent(s)), true)
  eq(s.uiWrites, 1)
  eq(s.kvWrites, 1)
  eq(s.sessionWrites, 1)
  eq(s.progress, 1)
  eq(s.audio, 1)
})

check('stepTarget binds relative transport to the best-known model + step', () => {
  // Two rapid admitted +1s advance two steps even though the render would
  // still show the first input's source.
  const best = { model: 'dart', step: 0 }
  const first = stepTarget(best, 'dart', 1, 6)
  eq(first, 1)
  best.step = first!
  eq(stepTarget(best, 'dart', 1, 6), 2)
  // Back below zero clamps, never wraps.
  eq(stepTarget(best, 'dart', -9, 6), 0)
  // Past the last step lands on the result slot (index == steps).
  eq(stepTarget({ model: 'dart', step: 5 }, 'dart', 1, 6), 6)
})

check('stepTarget drops intents a peer switched away from', () => {
  // A peer opened 'boat' on the shared session; a stale +1 bound to 'dart'
  // must not replay onto 'boat' or double-count progress.
  eq(stepTarget({ model: 'boat', step: 0 }, 'dart', 1, 6), null)
  eq(stepTarget({ model: null, step: 0 }, 'dart', 1, 6), null)
  // The same intent on the live model still lands.
  eq(stepTarget({ model: 'boat', step: 0 }, 'boat', 1, 8), 1)
})

check('stillBound keeps deferred work only on a live copy of the bound model', () => {
  const best = { model: 'dart' }
  eq(stillBound({ visible: true, active: true }, best, 'dart'), true)
  eq(stillBound({ visible: false, active: true }, best, 'dart'), false)
  eq(stillBound({ visible: true, active: false }, best, 'dart'), false)
  eq(stillBound({ visible: true, active: true }, best, 'boat'), false)
  eq(stillBound({ visible: true, active: true }, { model: null }, 'dart'), false)
})

// --- Callback adapter tests -------------------------------------------------
// These evaluate the ACTUAL callbacks committed in main.tsx with controlled
// refs/snapshots and a virtual RAF, so a regression in the real handler (not a
// copy of it) fails here. Extraction mirrors the reviewer's probe.

const source = await Bun.file(new URL('./main.tsx', import.meta.url).pathname).text()
const transpiler = new Bun.Transpiler({ loader: 'tsx' })

const railBody = source.match(/const onKey = \(e: React\.KeyboardEvent\) => \{([\s\S]*?)\n {2}\}/)
if (!railBody) throw new Error('StepRail onKey callback not found in main.tsx')
const railJs = transpiler.transformSync(`const onKey = (e: React.KeyboardEvent) => {${railBody[1]}\n};`)

const railHarness = (view: ViewLike, bestModel: string | null) => {
  const os = { view }
  const best = { current: { model: bestModel } }
  const frames: (() => void)[] = []
  let writes = 0
  let focusCalls = 0
  let prevented = 0
  const liveNow = () => live(os.view)
  const onKey = new Function(
    'liveNow',
    'stillBound',
    'os',
    'best',
    'model',
    'total',
    'current',
    'onStep',
    'requestAnimationFrame',
    'railRef',
    `${railJs}\nreturn onKey;`
  )(
    liveNow,
    stillBound,
    os,
    best,
    { id: 'dart' },
    6,
    0,
    () => {
      writes += 1
    },
    (f: () => void) => frames.push(f),
    { current: { querySelector: () => ({ focus: () => focusCalls++ }) } }
  )
  const fire = () => onKey({ key: 'ArrowDown', preventDefault: () => prevented++ })
  return { os, best, frames, fire, counts: () => ({ writes, focusCalls, prevented }) }
}

check('rail onKey: hidden copy (false+false) schedules nothing at all', () => {
  const h = railHarness({ visible: false, active: false }, 'dart')
  h.fire()
  eq(h.counts().writes, 0)
  eq(h.counts().prevented, 0)
  eq(h.frames.length, 0)
  eq(h.counts().focusCalls, 0)
})

check('rail onKey: sleep/clipped copy (false+true) schedules nothing', () => {
  const h = railHarness({ visible: false, active: true }, 'dart')
  h.fire()
  eq(h.counts().writes, 0)
  eq(h.frames.length, 0)
  eq(h.counts().focusCalls, 0)
})

check('rail onKey: inactive copy (true+false) schedules nothing', () => {
  const h = railHarness({ visible: true, active: false }, 'dart')
  h.fire()
  eq(h.counts().writes, 0)
  eq(h.frames.length, 0)
  eq(h.counts().focusCalls, 0)
})

check('rail onKey: admitted input, hide before RAF drops the deferred focus', () => {
  const h = railHarness({ visible: true, active: true }, 'dart')
  h.fire()
  eq(h.counts().writes, 1)
  eq(h.frames.length, 1)
  h.os.view = { visible: false, active: true } // slept/clipped before the frame
  for (const f of h.frames) f()
  eq(h.counts().focusCalls, 0)
})

check('rail onKey: admitted input, peer model switch before RAF drops focus', () => {
  const h = railHarness({ visible: true, active: true }, 'dart')
  h.fire()
  eq(h.frames.length, 1)
  h.best.current.model = 'boat' // peer switched the shared session
  for (const f of h.frames) f()
  eq(h.counts().focusCalls, 0)
})

check('rail onKey: admitted input on a still-live copy focuses the marker', () => {
  const h = railHarness({ visible: true, active: true }, 'dart')
  h.fire()
  eq(h.counts().writes, 1)
  eq(h.frames.length, 1)
  for (const f of h.frames) f()
  eq(h.counts().focusCalls, 1)
})

// The root focus effect must read the synchronous SDK snapshot at execution,
// not only the React-render view captured in the effect deps.
const rootLine = source.match(
  /useEffect\(\(\) => \{[\s\S]*?(if \(view\.visible && view\.active && liveNow\(\)\) rootRef[^\n]+)/
)
if (!rootLine) throw new Error('root focus effect line not found in main.tsx')

check('root focus uses current os.view, not a stale React snapshot', () => {
  const os = { view: { visible: false, active: true } }
  // A React-render view still says live; the effect must consult os.view.
  const staleRenderView = { visible: true, active: true }
  let focusCalls = 0
  const run = new Function('view', 'liveNow', 'rootRef', 'os', rootLine[1])
  const rootRef = { current: { focus: () => focusCalls++ } }
  // Stale render says live, synchronous SDK says occluded: no focus work.
  run(staleRenderView, () => live(os.view), rootRef, os)
  eq(focusCalls, 0)
  // Render says hidden while SDK is already live: still no focus work here
  // (the next effect run on the fresh render takes it).
  os.view = { visible: true, active: true }
  run({ visible: false, active: false }, () => live(os.view), rootRef, os)
  eq(focusCalls, 0)
  // Both live: the admitted focus lands.
  run(staleRenderView, () => live(os.view), rootRef, os)
  eq(focusCalls, 1)
})

if (failures.length) throw new Error(`${failures.length} failing: ${failures.join(', ')}`)
console.log('live.test.ts: all checks passed')
