// Deck-level coverage: play, pause, the clock, seeking, the ±15 s skips, the
// speed cycle and the Up Next queue. `bun test` has no DOM, so the deck takes
// a fake <audio> - nothing here needs a speaker.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EPS } from './data.ts'
import { deck, type Media } from './deck.ts'

const fakeAudio = () => {
  const calls = { play: 0, pause: 0 }
  let ended: (() => void) | undefined
  const a: Media = {
    src: '',
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    preload: '',
    play: async () => {
      calls.play++
    },
    pause: () => {
      calls.pause++
    },
    addEventListener: (_t, cb) => {
      ended = cb
    },
    removeAttribute: () => {}
  }
  return { a, calls, fireEnded: () => ended?.() }
}

test('play starts an episode, toggle pauses and resumes it', async () => {
  const { a, calls } = fakeAudio()
  const d = deck(EPS, () => a)
  d.play(EPS, 0)
  assert.equal(d.now!.id, EPS[0]!.id)
  assert.equal(d.playing, true)
  assert.equal(d.started, true)
  assert.equal(a.src, EPS[0]!.src)

  d.toggle()
  assert.equal(d.playing, false)
  assert.equal(calls.pause, 1)

  d.toggle()
  assert.equal(d.playing, true)
  assert.equal(calls.play, 2)
})

test('seek lands inside the episode and skip clamps at both ends', () => {
  const { a } = fakeAudio()
  const d = deck(EPS, () => a)
  d.play(EPS, 0)
  const dur = d.dur

  d.seek(0.5)
  assert.equal(d.at, dur * 0.5)
  assert.equal(a.currentTime, dur * 0.5)

  d.skipSecs(-15)
  assert.equal(d.at, dur * 0.5 - 15)
  d.skipSecs(-9999)
  assert.equal(d.at, 0)
  d.skipSecs(99999)
  assert.equal(d.at, dur)
})

test('the queue orders Up Next, honours Play Next and survives dequeue', () => {
  const { a, fireEnded } = fakeAudio()
  const d = deck(EPS, () => a)
  d.play(EPS.slice(0, 2), 0)
  d.enqueue(EPS[5]!)
  d.enqueue(EPS[6]!, true)
  assert.deepEqual(
    d.upcoming().map((u) => u.ep.id),
    [EPS[6]!.id, EPS[1]!.id, EPS[5]!.id]
  )

  d.dequeue(3)
  assert.deepEqual(
    d.upcoming().map((u) => u.ep.id),
    [EPS[6]!.id, EPS[1]!.id]
  )

  fireEnded()
  assert.equal(d.now!.id, EPS[6]!.id)

  d.clearQueue()
  assert.equal(d.upcoming().length, 0)
  assert.equal(d.now!.id, EPS[6]!.id)
})

test('the speed button cycles the deck and the element together', () => {
  const { a } = fakeAudio()
  const d = deck(EPS, () => a)
  d.play(EPS, 0)
  d.cycleRate()
  assert.equal(d.rate, 1.25)
  assert.equal(a.playbackRate, 1.25)
  d.cycleRate()
  assert.equal(d.rate, 1.5)
})

test('running off the end of Up Next stops instead of wrapping', () => {
  const { a, fireEnded } = fakeAudio()
  const d = deck(EPS.slice(0, 1), () => a)
  d.play(EPS.slice(0, 1), 0)
  fireEnded()
  assert.equal(d.playing, false)
  assert.equal(d.at, 0)
})

test('every episode that starts is reported once', () => {
  const { a } = fakeAudio()
  const started: string[] = []
  const d = deck(EPS, () => a, { onStart: (ep) => started.push(ep.id) })
  d.play(EPS, 0)
  d.load(1)
  assert.deepEqual(started, [EPS[0]!.id, EPS[1]!.id])
})
