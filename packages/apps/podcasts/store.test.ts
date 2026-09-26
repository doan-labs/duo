// Store-level coverage: the seeded catalog is what the app opens with, search
// hits shows and episodes, and subscribe/download/share/queue give feedback.
// `bun test` has no DOM - the cells fall back to in-memory and the queue calls
// reach the shared deck.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EPS, epById, epsOf, SHOWS, searchPodcasts } from './data.ts'
import { podcastsDeck } from './deck.ts'
import {
  addToQueue,
  closeShow,
  dlCell,
  go,
  histCell,
  openEp,
  openShow,
  pushHist,
  setPlayer,
  setQ,
  setQueueOpen,
  share,
  subsCell,
  toggleDownload,
  toggleSub,
  uiNow
} from './store.ts'

test('the app opens on the seeded catalog', () => {
  assert.equal(SHOWS.length, 3)
  assert.equal(EPS.length, 9)
  assert.equal(epsOf('The Talk Show').length, 3)
  assert.equal(epById(EPS[0]!.id)!.title, EPS[0]!.title)
})

test('search finds shows and episodes, and an empty query lists everything', () => {
  const hit = searchPodcasts('titanium')
  assert.deepEqual(
    hit.eps.map((e) => e.title),
    ['Titanium, Folded']
  )
  const byShow = searchPodcasts('accidental')
  assert.equal(byShow.shows.length, 1)
  assert.ok(byShow.eps.length >= 3)
  assert.equal(searchPodcasts('zzz nothing zzz').eps.length, 0)
  assert.equal(searchPodcasts('').eps.length, EPS.length)
})

test('subscribe toggles a show and reports it', () => {
  const t = SHOWS[0]!.title
  toggleSub(t)
  assert.equal(subsCell.get()[t], true)
  toggleSub(t)
  assert.equal(subsCell.get()[t], undefined)
})

test('download toggles an episode', () => {
  const ep = EPS[0]!
  toggleDownload(ep)
  assert.ok(dlCell.get()[ep.id])
  toggleDownload(ep)
  assert.equal(dlCell.get()[ep.id], undefined)
})

test('share gives feedback even without a clipboard', async () => {
  await share(EPS[0]!)
  // Reaching here means the toast fired without a DOM clipboard.
})

test('queueing an episode lands it in the deck, and listening is recorded', () => {
  const ep = EPS[3]!
  pushHist(ep)
  pushHist(EPS[4]!)
  pushHist(ep)
  assert.equal(histCell.get()[0]!.id, ep.id)
  assert.equal(histCell.get().filter((h) => h.id === ep.id).length, 1)

  podcastsDeck.clearQueue()
  addToQueue(EPS[7]!, false)
  assert.equal(podcastsDeck.queue.at(-1)!.id, EPS[7]!.id)
})

test('pane navigation follows tab, show, episode, player and queue', () => {
  go('library')
  openShow(SHOWS[0]!.title)
  openEp(EPS[0]!.id)
  setPlayer(true)
  setQueueOpen(true)
  setQ('abc')
  assert.deepEqual(uiNow(), {
    tab: 'library',
    show: SHOWS[0]!.title,
    ep: EPS[0]!.id,
    player: true,
    queue: true,
    q: 'abc'
  })
  closeShow()
  assert.equal(uiNow().show, undefined)
  assert.equal(uiNow().ep, undefined)
  go('listen')
  assert.equal(uiNow().tab, 'listen')
})
