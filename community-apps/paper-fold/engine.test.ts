// Throw-based test runner, runnable via `bun engine.test.ts` or `bun test`.
// Community app tests must not import bun:test or node: modules.

import {
  clampStep,
  isResult,
  mergeProgress,
  modelDone,
  newerSeq,
  nextStep,
  parsePrefs,
  parseProgress,
  parseUi,
  prevStep,
  progressSubset,
  recordProgress,
  resumeStep
} from './engine'

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

check('clampStep bounds to 0..steps', () => {
  eq(clampStep(5, -3), 0)
  eq(clampStep(5, 0), 0)
  eq(clampStep(5, 5), 5)
  eq(clampStep(5, 99), 5)
  eq(clampStep(5, Number.NaN), 0)
  eq(clampStep(5, 2.7), 2)
})

check('nextStep stops at result, prevStep stops at 0', () => {
  eq(nextStep(4, 3), 4)
  eq(nextStep(4, 4), 4)
  eq(nextStep(4, 9), 4)
  eq(prevStep(0), 0)
  eq(prevStep(2), 1)
})

check('isResult marks the virtual result index', () => {
  eq(isResult(6, 5), false)
  eq(isResult(6, 6), true)
  eq(isResult(6, 7), true)
})

check('recordProgress is monotonic and latches done', () => {
  let p = recordProgress({}, 'dart', 2, 6, 100)
  eq(p.dart?.hi, 2)
  eq(p.dart?.done, false)
  p = recordProgress(p, 'dart', 1, 6, 200) // revisit earlier step never shrinks
  eq(p.dart?.hi, 2)
  p = recordProgress(p, 'dart', 6, 6, 300)
  eq(p.dart?.hi, 6)
  eq(p.dart?.done, true)
  p = recordProgress(p, 'dart', 0, 6, 400) // replay keeps done
  eq(p.dart?.hi, 6)
  eq(p.dart?.done, true)
})

check('progress is per-model', () => {
  let p = recordProgress({}, 'dart', 3, 6, 1)
  p = recordProgress(p, 'boat', 1, 8, 2)
  eq(p.dart?.hi, 3)
  eq(p.boat?.hi, 1)
  eq(p.dart?.done, false)
})

check('resumeStep resumes at progress, clamps bad values', () => {
  eq(resumeStep(6, undefined), 0)
  eq(resumeStep(6, { hi: 3, done: false, at: 0 }), 3)
  eq(resumeStep(6, { hi: 6, done: true, at: 0 }), 6)
  eq(resumeStep(6, { hi: 99, done: true, at: 0 }), 6)
  eq(modelDone(undefined), false)
  eq(modelDone({ hi: 6, done: true, at: 0 }), true)
})

check('parseProgress tolerates garbage and validates entries', () => {
  eq(Object.keys(parseProgress(null)).length, 0)
  eq(Object.keys(parseProgress('not json')).length, 0)
  eq(Object.keys(parseProgress('[]')).length, 0)
  eq(Object.keys(parseProgress('"x"')).length, 0)
  const p = parseProgress('{"dart":{"hi":2.9,"done":true,"at":7},"bad":{"hi":"x"},"nope":5}')
  eq(p.dart?.hi, 2)
  eq(p.dart?.done, true)
  eq(p.bad?.hi, 0)
  eq(p.bad?.done, false)
  eq(p.nope, undefined)
})

check('parsePrefs defaults and survives garbage', () => {
  eq(parsePrefs(null).muted, false)
  eq(parsePrefs('junk').muted, false)
  eq(parsePrefs('{"muted":true}').muted, true)
  eq(parsePrefs('{"motion":false}').motion, false)
  eq(parsePrefs('{"motion":0}').motion, true) // only strict false disables
})

check('parseUi round-trips and sanitizes', () => {
  eq(parseUi(null).model, null)
  eq(parseUi('junk').step, 0)
  const ui = parseUi('{"v":1,"model":"boat","step":3,"seq":7,"by":"x1"}')
  eq(ui.model, 'boat')
  eq(ui.step, 3)
  eq(ui.seq, 7)
  eq(ui.by, 'x1')
  eq(parseUi('{"model":5,"step":-2}').model, null)
  eq(parseUi('{"model":5,"step":-2}').step, 0)
  eq(parseUi('{"model":"a"}').seq, 0) // missing envelope defaults
})

check('newerSeq orders by seq then writer id', () => {
  const a = { seq: 3, by: 'cover' }
  const b = { seq: 5, by: 'inner' }
  eq(newerSeq(b, a), true)
  eq(newerSeq(a, b), false)
  eq(newerSeq(a, a), false) // equal docs are never newer
  eq(newerSeq({ seq: 4, by: 'z' }, { seq: 4, by: 'a' }), true) // deterministic tie-break
  eq(newerSeq({ seq: 4, by: 'a' }, { seq: 4, by: 'z' }), false)
})

check('mergeProgress is commutative and keeps the max of every entry', () => {
  const cover = recordProgress(recordProgress({}, 'dart', 6, 6, 1), 'cup', 2, 5, 2)
  const inner = recordProgress(recordProgress({}, 'boat', 8, 8, 3), 'dart', 3, 6, 4)
  const ab = mergeProgress(cover, inner)
  const ba = mergeProgress(inner, cover)
  eq(ab.dart?.hi, 6) // cover's finished dart beats inner's stale 3
  eq(ab.dart?.done, true)
  eq(ab.boat?.done, true)
  eq(ab.cup?.hi, 2)
  eq(ba.dart?.hi, 6) // order-independent content
  eq(ba.cup?.hi, 2)
  eq(JSON.stringify(mergeProgress(ab, ba).dart), JSON.stringify(ab.dart)) // idempotent
})

check('progressSubset detects a store doc missing merged entries', () => {
  const store = recordProgress({}, 'dart', 6, 6, 1)
  const merged = mergeProgress(store, recordProgress({}, 'cup', 4, 5, 2))
  eq(progressSubset(merged, store), false) // merged overflows store - must re-emit
  eq(progressSubset(store, merged), true) // store itself is covered, nothing lost
  eq(progressSubset(merged, merged), true)
  eq(progressSubset({}, merged), true)
})

if (failures.length) throw new Error(`${failures.length} failing: ${failures.join(', ')}`)
console.log('engine.test.ts: all checks passed')
