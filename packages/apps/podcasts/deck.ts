// The podcast deck: one <audio>, the Up Next queue it is working through, and
// the clock that keeps the mini player honest. Module state on purpose, like
// Music's (apps/music/deck.ts) - both copies of the app and the player sheet
// bind to the same deck, so a fold never interrupts an episode.
//
// The audio element is made lazily, on the first play: constructing Audio at
// module load would crash the store tests, which never touch a DOM.

import { useEffect, useState } from 'react'
import { EPS, type Ep } from './data.ts'

/** The slice of HTMLAudioElement the deck drives; tests inject a fake. */
export type Media = {
  src: string
  currentTime: number
  duration: number
  playbackRate: number
  preload: string
  play(): Promise<void>
  pause(): void
  addEventListener(type: 'ended', cb: () => void): void
  removeAttribute(name: string): void
}

export const RATES = [0.75, 1, 1.25, 1.5, 2] as const

export type DeckOpts = {
  /** Every time an episode actually starts; the app wires it to listening history. */
  onStart?: (ep: Ep) => void
}

export function deck(eps: Ep[], makeAudio: () => Media = () => new Audio(), opts: DeckOpts = {}) {
  let a: Media | null = null
  let queue: Ep[] = []
  let i = 0
  let t = 0
  let on = false
  let rate = 1
  let timer: ReturnType<typeof setInterval> | null = null
  const subs = new Set<() => void>()
  const emit = () => {
    for (const f of subs) f()
  }
  const el = () => {
    if (!a) {
      a = makeAudio()
      a.preload = 'none'
      a.addEventListener('ended', advance)
      a.playbackRate = rate
    }
    return a
  }
  const now = () => queue[i]
  const dur = () => (a?.src ? a.duration || now()!.secs : (now()?.secs ?? 0))
  const tickStart = () => {
    // <audio> is the clock while it streams; the quarter-second fallback covers
    // the file that never loads, scaled by the playback rate.
    if (timer) return
    timer = setInterval(() => {
      if (!on) return
      t = (a?.src && a.currentTime) || t + 0.25 * rate
      if (t >= dur()) advance()
      else emit()
    }, 250)
  }
  const load = (n: number) => {
    if (!queue.length) return
    i = ((n % queue.length) + queue.length) % queue.length
    t = 0
    el().src = now()!.src
    el().playbackRate = rate
    api.onStart?.(now()!)
    if (on)
      void el()
        .play()
        .catch(() => {})
    emit()
  }
  const advance = () => {
    if (i >= queue.length - 1) {
      // Off the end of Up Next: park on the last episode, stopped.
      on = false
      t = 0
      el().pause()
      emit()
      return
    }
    load(i + 1)
  }
  const api = {
    /** Every time an episode actually starts; the app wires it to listening history. */
    onStart: opts.onStart,
    get now() {
      return now()
    },
    get at() {
      return t
    },
    get dur() {
      return dur()
    },
    get playing() {
      return on
    },
    /** Whether anything was ever queued: the mini player stays hidden until then. */
    get started() {
      return queue.length > 0
    },
    get rate() {
      return rate
    },
    get pos() {
      return i
    },
    get queue() {
      return queue
    },
    /** The queue from here: the rows Up Next shows. */
    upcoming() {
      return queue.slice(i + 1).map((ep, k) => ({ ep, pos: i + 1 + k }))
    },
    /** Hands the deck a new queue: `list` the episodes, `idx` where it starts, and starts. */
    play(list: Ep[], idx: number) {
      queue = list.slice()
      i = idx
      t = 0
      on = true
      tickStart()
      load(i)
    },
    /** Convenience for one episode on its own. */
    playOne(ep: Ep) {
      api.play([ep], 0)
    },
    toggle() {
      if (!queue.length) api.play([eps[0]!], 0)
      else if (!a?.src) {
        // Queued without a play ('Add to Queue' on an empty deck): the head is
        // only ever loaded when something actually plays it, so Play works here.
        on = true
        tickStart()
        load(i)
      } else {
        on = !on
        if (on) {
          tickStart()
          void el()
            .play()
            .catch(() => {})
        } else el().pause()
        emit()
      }
    },
    /** Jumps to a fraction of the episode (0..1), as the seek bar passes it. */
    seek(frac: number) {
      t = Math.min(1, Math.max(0, frac)) * dur()
      if (a?.src) a.currentTime = t
      emit()
    },
    /** The ±15 s transport buttons. */
    skipSecs(d: number) {
      t = Math.min(dur(), Math.max(0, t + d))
      if (a?.src) a.currentTime = t
      emit()
    },
    /** Track back inside the first seconds means previous; after that it rewinds. */
    prev() {
      if (t > 3) {
        t = 0
        if (a?.src) a.currentTime = 0
        emit()
        return
      }
      load(i - 1)
    },
    next() {
      advance()
    },
    /** Jumps to a position in the queue; how an Up Next row plays early. */
    load,
    /** 'Play Next' inserts after the current episode; 'Add to Queue' appends. On an
     * empty deck the episode lands at the head and is loaded on the first play. */
    enqueue(ep: Ep, next = false) {
      const cut = queue.length ? i + 1 : 0
      queue.splice(next ? cut : queue.length, 0, ep)
      emit()
    },
    /** Removes a queued episode without disturbing what's playing. */
    dequeue(pos: number) {
      if (pos <= i || pos >= queue.length) return
      queue.splice(pos, 1)
      emit()
    },
    clearQueue() {
      const cur = now()
      queue = cur ? [cur] : []
      i = 0
      emit()
    },
    /** Cycles 0.75 -> 1 -> 1.25 -> 1.5 -> 2x. */
    cycleRate() {
      rate = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length]!
      if (a) a.playbackRate = rate
      emit()
    },
    watch(f: () => void) {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    }
  }
  return api
}

/** The shared deck the Podcasts app and its chrome both point at. */
export const podcastsDeck = deck(EPS)

export function usePodcastsDeck() {
  const [, nudge] = useState(0)
  useEffect(() => podcastsDeck.watch(() => nudge((n) => n + 1)), [])
  return podcastsDeck
}
