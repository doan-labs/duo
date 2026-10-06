// Throw-based test runner, runnable via `bun engine.test.ts` or `bun test`.
// Community app tests must not import bun:test or node: modules.

import {
  clampStep,
  isResult,
  modelDone,
  nextStep,
  parsePrefs,
  parseProgress,
  parseUi,
  prevStep,
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
  const ui = parseUi('{"v":1,"model":"boat","step":3}')
  eq(ui.model, 'boat')
  eq(ui.step, 3)
  eq(parseUi('{"model":5,"step":-2}').model, null)
  eq(parseUi('{"model":5,"step":-2}').step, 0)
})

if (failures.length) throw new Error(`${failures.length} failing: ${failures.join(', ')}`)
console.log('engine.test.ts: all checks passed')
