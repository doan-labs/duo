// The audiobook preview: the browser's speech engine reads the opening
// paragraphs aloud. The engine lives in the owner view (a non-owner copy's
// taps reach it through os.commands), and the now-playing state lives in
// os.session, so both displays show the same row and the playing book
// survives pane switches.

import { os } from '@doan-labs/duo-sdk'
import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'
import { byId } from './data.ts'

type Voice = {
  id?: string
  speaking: boolean
  /** 0..1 through the preview text. */
  frac: number
  rate: number
}

type VoiceOp = { op: 'toggle'; id?: string } | { op: 'stop' } | { op: 'rate' }

const voiceCell = cell<Voice>('session', 'books.voice', { speaking: false, frac: 0, rate: 1 })
let paras: string[] = []
let at = 0

const set = (p: Partial<Voice>) => voiceCell.set({ ...voiceCell.get(), ...p })

const ok = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const say = () => {
  const v = voiceCell.get()
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

const RATES = [1, 1.25, 1.5, 2, 0.75]

const run = (op: VoiceOp) => {
  const v = voiceCell.get()
  switch (op.op) {
    case 'toggle': {
      if (!ok()) return
      if (op.id && op.id !== v.id) {
        speechSynthesis.cancel()
        paras = byId(op.id).chapters[0]!.paras.slice(0, 6)
        at = 0
        set({ id: op.id, speaking: true, frac: 0 })
        say()
        return
      }
      if (!v.id) return
      if (v.speaking) {
        speechSynthesis.pause()
        set({ speaking: false })
      } else if (v.frac >= 1) {
        at = 0
        set({ frac: 0 })
        say()
        set({ speaking: true })
      } else {
        speechSynthesis.resume()
        set({ speaking: true })
      }
      return
    }
    case 'stop': {
      if (!ok()) return
      speechSynthesis.cancel()
      paras = []
      at = 0
      set({ id: undefined, speaking: false, frac: 0 })
      return
    }
    case 'rate': {
      const rate = RATES[(RATES.indexOf(v.rate) + 1) % RATES.length]!
      set({ rate })
      if (v.speaking && ok()) {
        speechSynthesis.cancel()
        say()
      }
      return
    }
  }
}

// The bridge only delivers commands to the session's owner, so this handler
// fires on the copy that holds the engine and nowhere else.
os.commands.onCommand((c) => {
  if (c.type !== 'books.voice') return
  try {
    run(JSON.parse(c.payload) as VoiceOp)
  } catch {}
})

const send = (op: VoiceOp) => {
  if (os.owner) run(op)
  else void os.commands.send('books.voice', JSON.stringify(op)).catch(() => {})
}

export const useVoice = () => useSyncExternalStore(voiceCell.subscribe, voiceCell.get)

/** Start the preview for a book, or pause/resume the one already loaded. */
export const toggleVoice = (id?: string) => send({ op: 'toggle', id })

export const stopVoice = () => send({ op: 'stop' })

export const cycleRate = () => send({ op: 'rate' })
