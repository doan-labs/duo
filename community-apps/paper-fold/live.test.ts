// Admission-gate tests, runnable via `bun live.test.ts` or `bun test`.
// Pure like engine.test.ts: no SDK import - the gate takes a ViewLike so the
// four visibility/activity combinations and same-turn flips run deterministically.
// Community app tests must not import bun:test or node: modules.

import { admit, live, stepTarget, type ViewLike } from './live'

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

if (failures.length) throw new Error(`${failures.length} failing: ${failures.join(', ')}`)
console.log('live.test.ts: all checks passed')
