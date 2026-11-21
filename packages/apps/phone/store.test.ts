// Store-level coverage of the call engine's guards: two calls placed inside
// the dial window must not both connect, and a second hang-up inside the
// 'call ended' beat must not log twice. `bun test` has no DOM - the cells fall
// back to in-memory, and the window/audio shims below stand in for timers and
// the beeper.

import assert from 'node:assert/strict'
import { test } from 'node:test'

// The store borrows window's timers; queue them so the test fires them by hand.
const timers = new Map<number, () => void>()
let seq = 0
;(globalThis as Record<string, unknown>).window = {
  setTimeout: (f: () => void) => {
    timers.set(++seq, f)
    return seq
  },
  clearTimeout: (id: number) => timers.delete(id),
  setInterval: () => 0,
  clearInterval: () => {}
}
;(globalThis as Record<string, unknown>).AudioContext = class {
  currentTime = 0
  destination = null
  resume() {
    return Promise.resolve()
  }
  createGain() {
    return { gain: { value: 0, setTargetAtTime: () => {} }, connect: () => {} }
  }
  createOscillator() {
    return { frequency: { value: 0 }, connect: () => {}, start: () => {}, stop: () => {} }
  }
}

const { callsCell, end, place, recentsCell } = await import('./store.ts')

const flush = () => {
  for (let guard = 0; guard < 20 && timers.size; guard++) {
    const [id, f] = timers.entries().next().value as [number, () => void]
    timers.delete(id)
    f()
  }
}

test('a second call placed mid-dial holds the first; only one connects', () => {
  const a = place({ number: '+1 (800) 555-0001' })
  const b = place({ number: '+1 (800) 555-0002' })
  flush()
  const calls = callsCell.get()
  assert.equal(calls.find((c) => c.id === a)!.phase, 'held')
  assert.equal(calls.find((c) => c.id === b)!.phase, 'active')
  for (const c of calls) end(c.id)
  flush()
  assert.equal(callsCell.get().length, 0)
})

test('a second hang-up inside the 700 ms beat does not log the call twice', () => {
  const id = place({ number: '+1 (800) 555-0003' })
  flush()
  const logged = recentsCell.get().length
  end(id)
  end(id)
  assert.equal(recentsCell.get().length, logged + 1)
  flush()
  assert.equal(callsCell.get().length, 0)
})
