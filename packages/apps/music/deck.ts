// The device's music deck: one <audio>, the queue it is working through, and
// the clock that keeps its displays honest. Module state on purpose — both
// copies of the app, the mini player and Control Center bind to the same deck,
// so a fold or the app's own lifetime never interrupts a song.
//
// The queue is a list plus `order`, a permutation of indices into it. `i` is a
// position in `order`, so shuffle is a reshuffled `order`, repeat-all is a
// wrap, and repeat-one is staying put. Anything that replaces the list —
// an album's Play, a row tap, a station — goes through `play`, and the Up
// Next shelf reads `upcoming` back out.

import { TRACKS, type Track } from '@doan-labs/duo-fixtures/tracks.ts'
import { useEffect, useState } from 'react'

export type Repeat = 'off' | 'all' | 'one'

/** A deck for a list of Playables: one <audio>, play/pause, skip, scrub, fades. */
export function deck(list: Track[]) {
  const a = new Audio()
  a.preload = 'none'
  let queue = list
  // Names the shelf the queue came from, for the "Playing From" line; unset
  // while the default catalog queue is up.
  let context: string | undefined
  let order = list.map((_, n) => n)
  let i = 0
  let t = 0
  let on = false
  let shuffle = false
  let repeat: Repeat = 'off'
  // Tracks that actually started, most recent first: Home's Recently Played
  // reads this instead of inventing a shelf.
  let history: Track[] = []
  const subs = new Set<() => void>()
  const emit = () => {
    for (const f of subs) f()
  }
  const now = () => queue[order[i]!]!
  const len = () => now().secs
  const start = () => {
    a.muted = false
    void a.play().catch(() => {
      // Autoplay rules reject the unmuted play; retry muted so a cue's
      // fadeOut -> fadeIn still works, the file just comes back silent.
      a.muted = true
      void a.play().catch(() => {})
    })
  }
  const record = () => {
    const t = now()
    history = [t, ...history.filter((h) => h !== t)].slice(0, 24)
  }
  const load = (n: number) => {
    i = ((n % order.length) + order.length) % order.length
    t = 0
    a.src = now().src
    if (on) start()
    record()
    emit()
  }
  const skip = (d: number) => {
    // Back inside the first seconds means previous; after that it rewinds.
    if (d < 0 && t > 3) {
      t = 0
      a.currentTime = 0
      emit()
      return
    }
    load(i + d)
  }
  const advance = () => {
    if (repeat === 'one') {
      t = 0
      a.currentTime = 0
      if (on) void a.play().catch(() => {})
      emit()
      return
    }
    if (i >= order.length - 1 && repeat === 'off') {
      // Off the end with no repeat: park on the last track, stopped.
      on = false
      t = 0
      emit()
      return
    }
    skip(1)
  }
  a.addEventListener('ended', advance)
  // <audio> is the clock while it is streaming; a quarter-second tick covers
  // the corner where the file never loaded and only `secs` knows the length.
  setInterval(() => {
    if (!on) return
    t = a.currentTime || t + 0.25
    if (t >= (a.duration || len())) advance()
    else emit()
  }, 250)
  return {
    get now() {
      return now()
    },
    get at() {
      return t
    },
    get dur() {
      return a.duration || len()
    },
    get playing() {
      return on
    },
    /** Whether a track is loaded: lets callers show 'not playing' before anything has ever started. */
    get started() {
      return !!a.src
    },
    /** What the queue came from ('Layers', 'Duo Radio'), or undefined for the catalog. */
    get context() {
      return context
    },
    get queue() {
      return queue
    },
    get shuffle() {
      return shuffle
    },
    get repeat() {
      return repeat
    },
    get history() {
      return history
    },
    /** The queue from here: the rows Up Next shows, wrapping only under repeat-all. */
    upcoming(n = 20) {
      const out: { track: Track; pos: number }[] = []
      for (let k = 1; k <= n; k++) {
        const pos = i + k
        if (pos >= order.length) {
          if (repeat !== 'all') break
          const p = pos % order.length
          out.push({ track: queue[order[p]!]!, pos: p })
        } else out.push({ track: queue[order[pos]!]!, pos })
      }
      return out
    },
    /** Jump to a position in the current order; how an Up Next row plays early. */
    load,
    /**
     * Hand the deck a new queue: `l` the list, `idx` where it starts, `name`
     * the "Playing From" line, `shuffled` to deal the rest of it at random.
     */
    play(l: Track[], idx: number, opts?: { name?: string; shuffled?: boolean }) {
      queue = l
      context = opts?.name
      order = l.map((_, n) => n)
      shuffle = !!opts?.shuffled
      if (shuffle) {
        order.splice(idx, 1)
        for (let n = order.length - 1; n > 0; n--) {
          const k = Math.floor(Math.random() * (n + 1))
          ;[order[n], order[k]] = [order[k]!, order[n]!]
        }
        order.unshift(idx)
        i = 0
      } else {
        i = idx
      }
      t = 0
      a.src = now().src
      on = true
      start()
      record()
      emit()
    },
    skip,
    toggle,
    /** Jumps to a fraction of the track (0..1), as the scrubbers everywhere pass it. */
    seek(frac: number) {
      t = frac * (a.duration || len())
      a.currentTime = t
      emit()
    },
    /** Deal the rest of the queue at random, or restore it in order. */
    setShuffle(v: boolean) {
      if (v === shuffle) return
      const cur = order[i]!
      if (v) {
        const rest = order.filter((n) => n !== cur)
        for (let n = rest.length - 1; n > 0; n--) {
          const k = Math.floor(Math.random() * (n + 1))
          ;[rest[n], rest[k]] = [rest[k]!, rest[n]!]
        }
        order = [cur, ...rest]
        i = 0
      } else {
        order = queue.map((_, n) => n)
        i = cur
      }
      shuffle = v
      emit()
    },
    /** off -> all -> one, matching the repeat glyph's three states. */
    cycleRepeat() {
      repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'
      emit()
    },
    get volume() {
      return a.volume
    },
    setVolume(v: number) {
      a.volume = Math.min(1, Math.max(0, v))
      emit()
    },
    /** Ramp to silence over `ms`, then pause where it stood, back at full volume. */
    fadeOut(ms: number) {
      if (!on) return
      fade(ms, 0, () => {
        a.pause()
        on = false
        a.volume = 1
        emit()
      })
    },
    /** Starts, if stopped, rising from silence over `ms`. */
    fadeIn(ms: number) {
      if (!on) {
        a.volume = 0
        // toggle loads the queue's head when nothing has ever been played.
        toggle()
      }
      fade(ms, 1)
    },
    watch(f: () => void) {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    }
  }
  function toggle() {
    if (!a.src) load(i)
    on = !on
    if (on) start()
    else a.pause()
    emit()
  }
  function fade(ms: number, to: number, done?: () => void) {
    const from = a.volume
    const t0 = performance.now()
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms)
      a.volume = from + (to - from) * k
      if (k < 1) requestAnimationFrame(tick)
      else done?.()
    }
    tick()
  }
}

/** The shared deck the Music app and Control Center both point at. */
export const nowPlaying = deck(TRACKS)

export function useNowPlaying() {
  const [, nudge] = useState(0)
  useEffect(() => nowPlaying.watch(() => nudge((n) => n + 1)), [])
  return nowPlaying
}
