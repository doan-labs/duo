// The audiobook preview: the browser's speech engine reads the opening
// paragraphs aloud. One utterance at a time, chained through the chapter, in a
// module so both displays show the same now-playing state and so the playing
// book survives pane switches.

import { useSyncExternalStore } from 'react'
import { byId } from './data.ts'

type Voice = {
  id?: string
  speaking: boolean
  /** 0..1 through the preview text. */
  frac: number
  rate: number
}

let v: Voice = { speaking: false, frac: 0, rate: 1 }
const subs = new Set<() => void>()
let paras: string[] = []
let at = 0

const set = (p: Partial<Voice>) => {
  v = { ...v, ...p }
  for (const f of subs) f()
}

const ok = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const say = () => {
  if (!ok() || at >= paras.length) {
    set({ speaking: false, frac: 1 })
    return
  }
  const u = new SpeechSynthesisUtterance(paras[at]!)
  u.rate = v.rate
  u.onend = () => {
    at += 1
    set({ frac: at / paras.length })
    say()
  }
  u.onerror = () => set({ speaking: false })
  speechSynthesis.speak(u)
}

export const useVoice = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => v
  )

/** Start the preview for a book, or pause/resume the one already loaded. */
export const toggleVoice = (id?: string) => {
  if (!ok()) return
  if (id && id !== v.id) {
    speechSynthesis.cancel()
    paras = byId(id).chapters[0]!.paras.slice(0, 6)
    at = 0
    set({ id, speaking: true, frac: 0 })
    say()
    return
  }
  if (!v.id) return
  if (v.speaking) {
    speechSynthesis.pause()
    set({ speaking: false })
  } else {
    if (v.frac >= 1) {
      at = 0
      set({ frac: 0 })
      say()
      set({ speaking: true })
    } else {
      speechSynthesis.resume()
      set({ speaking: true })
    }
  }
}

export const stopVoice = () => {
  if (!ok()) return
  speechSynthesis.cancel()
  paras = []
  at = 0
  set({ id: undefined, speaking: false, frac: 0 })
}

const RATES = [1, 1.25, 1.5, 2, 0.75]
export const cycleRate = () => {
  const rate = RATES[(RATES.indexOf(v.rate) + 1) % RATES.length]!
  set({ rate })
  if (v.speaking && ok()) {
    speechSynthesis.cancel()
    say()
  }
}
