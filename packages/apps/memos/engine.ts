// The two engines the whole app shares. Both live at module level, so the fold
// copy draws their state but never opens a second stream or a second element -
// one recorder, one player, one owner across both pieces of glass.
//
// The recorder is thin over `os.mic`: the shell owns getUserMedia, the
// MediaRecorder and track teardown; this file owns the deck's state machine,
// the live waveform history and the transcript tap. The player is a single
// HTMLAudioElement fed by `os.files`.

import type { FileHost, MicHost, Os } from '@doan-labs/duo-sdk'
import { useSyncExternalStore } from 'react'
import { decode, demoTake, ext, peaks } from './audio.ts'
import { type Memo, memoOps, memosCell } from './store.ts'

let mic: MicHost | undefined
let files: FileHost | undefined
/** The app's mounted copies each attach; the last detach stops capture. */
export function bindHost(os: Os) {
  if (os.mic && os.mic !== mic) mic = os.mic
  if (os.files && os.files !== files) files = os.files
}
export const hasMic = () => !!mic
export const hasFiles = () => !!files
/** Read one stored blob; null when the file or the store is gone. */
export const readFile = (name: string): Promise<Blob | null> =>
  files ? files.get(name).catch(() => null) : Promise.resolve(null)

// ---------- recorder ----------

export type RecPhase = 'idle' | 'starting' | 'recording' | 'paused' | 'saving' | 'denied' | 'unavailable'
export type Rec = { phase: RecPhase; elapsed: number; level: number; detail?: string }
const IDLE: Rec = { phase: 'idle', elapsed: 0, level: 0 }

function cell<T>(initial: T) {
  let value = initial
  const subs = new Set<() => void>()
  return {
    subscribe: (fn: () => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    get: () => value,
    set: (v: T) => {
      value = v
      for (const fn of subs) fn()
    }
  }
}

const recCell = cell<Rec>(IDLE)
const levelsCell = cell<number[]>([])
const wordsCell = cell('')
/** 'off' before and during a take without SR, 'live' while it types, 'unavailable' when the platform cannot. */
const speechCell = cell<'off' | 'live' | 'unavailable'>('off')
/** The edit page's replace take: armed with a splice point, filled on stop. */
export const replaceState = cell<{ active: boolean; atSec: number | null; blob: Blob | null }>({
  active: false,
  atSec: null,
  blob: null
})

export const useRec = () => useSyncExternalStore(recCell.subscribe, recCell.get)
export const useLevels = () => useSyncExternalStore(levelsCell.subscribe, levelsCell.get)
export const useWords = () => useSyncExternalStore(wordsCell.subscribe, wordsCell.get)
export const useSpeech = () => useSyncExternalStore(speechCell.subscribe, speechCell.get)

// The Web Speech API is prefixed on some engines and absent on others; it is
// the only browser transcript path, so a missing constructor means 'unavailable'.
type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
const SR =
  (
    window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
  ).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
export const speechSupported = !!SR

let unStatus: (() => void) | undefined
let stopping = false
let sr: SpeechRecognitionLike | undefined

function startSpeech() {
  if (!SR) return
  try {
    sr = new SR()
    sr.continuous = true
    sr.interimResults = true
    sr.lang = navigator.language || 'en-US'
    sr.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!
        if (r.isFinal) wordsCell.set(`${wordsCell.get()} ${r[0]!.transcript}`.trim())
      }
      speechCell.set('live')
    }
    sr.onerror = () => {
      // Recognizers fail for many reasons (no network, no speech service);
      // the recording itself is unaffected - only the transcript slot empties.
      speechCell.set('unavailable')
      try {
        sr?.abort()
      } catch {}
      sr = undefined
    }
    sr.onend = () => {
      sr = undefined
    }
    sr.start()
    speechCell.set('live')
  } catch {
    speechCell.set('unavailable')
    sr = undefined
  }
}
function stopSpeech() {
  try {
    sr?.stop()
  } catch {}
  sr = undefined
}

export async function startRec(opts?: { replaceAtSec?: number }) {
  if (!mic || stopping || ['starting', 'recording', 'paused', 'saving'].includes(recCell.get().phase)) return
  wordsCell.set('')
  levelsCell.set([])
  // Honest before anything runs: no SR constructor means no transcript, ever.
  speechCell.set(SR && opts?.replaceAtSec == null ? 'off' : 'unavailable')
  replaceState.set(
    opts?.replaceAtSec == null
      ? { active: false, atSec: null, blob: null }
      : { active: true, atSec: opts.replaceAtSec, blob: null }
  )
  recCell.set({ ...IDLE, phase: 'starting' })
  try {
    await mic.start()
  } catch (error) {
    // E_DENIED vs everything else is how the deck picks its card; the status
    // event the shell emitted already carries the detail.
    const code = (error as { code?: string })?.code
    recCell.set({ ...IDLE, phase: code === 'E_DENIED' ? 'denied' : 'unavailable' })
    speechCell.set('off')
    replaceState.set({ active: false, atSec: null, blob: null })
    return
  }
  if (!replaceState.get().active) startSpeech()
  unStatus = mic.onStatus((s) => {
    if (s.state === 'recording' || s.state === 'paused') {
      const rec = recCell.get()
      if (rec.phase !== 'saving') {
        recCell.set({ phase: s.state, elapsed: s.elapsed, level: s.level })
        levelsCell.set([...levelsCell.get(), s.level])
      }
      return
    }
    if (s.state === 'ended') {
      // Track lost or capture stopped elsewhere: keep what was recorded rather
      // than pretending the take never happened.
      void stopAndSave()
      return
    }
    if (s.state === 'denied' || s.state === 'unavailable') recCell.set({ ...IDLE, phase: s.state, detail: s.detail })
  })
}

export function pauseRec() {
  mic?.pause()
}
export function resumeRec() {
  mic?.resume()
}

async function saveBlob(blob: Blob, mime: string, ms: number, name?: string) {
  const id = crypto.randomUUID()
  const file = `rec-${id}.${ext(mime)}`
  // Decode only to draw the waveform; the stored blob is the take untouched.
  const buf = await decode(blob).catch(() => null)
  const memo: Memo = {
    id,
    name: name?.trim() || memoOps.defaultName(),
    file,
    mime,
    ms: Math.round(ms),
    at: Date.now(),
    fav: false,
    transcript: wordsCell.get() || undefined,
    peaks: buf ? peaks(buf) : []
  }
  await files!.put(file, blob)
  memoOps.add(memo)
  return memo
}

/** Stop -> persist -> list. iOS saves on Done the same way, no confirm. */
export async function stopAndSave(name?: string) {
  if (!mic || stopping) return null
  // A take armed for Replace belongs to the editor; stopping it is splice data.
  if (replaceState.get().active) {
    await stopReplace()
    return null
  }
  stopping = true
  const rec = recCell.get()
  if (rec.phase === 'recording' || rec.phase === 'paused') recCell.set({ ...rec, phase: 'saving' })
  let memo: Memo | null = null
  try {
    const take = await mic.stop()
    unStatus?.()
    unStatus = undefined
    stopSpeech()
    if (take && files) memo = await saveBlob(take.blob, take.mime, take.durationMs, name)
  } finally {
    stopping = false
    recCell.set(IDLE)
    levelsCell.set([])
    wordsCell.set('')
    speechCell.set('off')
  }
  return memo
}

/**
 * Stop a replace take: the audio lands in `replaceState` for the edit page to
 * splice, not in the library - nothing gets saved as a memo here.
 */
export async function stopReplace() {
  if (!mic || stopping) return
  stopping = true
  try {
    const take = await mic.stop()
    replaceState.set({ ...replaceState.get(), blob: take?.blob ?? null })
    unStatus?.()
    unStatus = undefined
    stopSpeech()
  } finally {
    stopping = false
    recCell.set(IDLE)
    levelsCell.set([])
  }
}

/** A 'Save as New' copy of `base` holding `blob`; the original is untouched. */
export async function saveCopy(base: Memo, blob: Blob) {
  if (!files) return
  const id = crypto.randomUUID()
  const file = `rec-${id}.wav`
  await files.put(file, blob)
  const buf = await decode(blob).catch(() => null)
  memoOps.add({
    id,
    name: `${base.name} copy`,
    file,
    mime: 'audio/wav',
    ms: Math.round((buf?.duration ?? base.ms / 1000) * 1000),
    at: Date.now(),
    fav: false,
    transcript: base.transcript,
    peaks: buf ? peaks(buf) : []
  })
}

/** Cancel a take in progress: nothing is written, no memo appears. */
export async function discardRec() {
  if (!mic) return
  stopping = true
  try {
    await mic.stop()
    unStatus?.()
    unStatus = undefined
    stopSpeech()
  } finally {
    stopping = false
    recCell.set(IDLE)
    levelsCell.set([])
    wordsCell.set('')
    speechCell.set('off')
  }
}

// ---------- player ----------

export type Play = { id: string; posMs: number; playing: boolean; rate: number }
const playCell = cell<Play | null>(null)
export const usePlay = () => useSyncExternalStore(playCell.subscribe, playCell.get)

let el: HTMLAudioElement | undefined
let objUrl: string | undefined

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
    el.ontimeupdate = () => {
      const p = playCell.get()
      if (p && el) playCell.set({ ...p, posMs: el.currentTime * 1000 })
    }
    el.onended = () => {
      const p = playCell.get()
      if (p) playCell.set({ ...p, playing: false, posMs: 0 })
      if (el) el.currentTime = 0
    }
    el.onerror = () => {
      const p = playCell.get()
      if (p) playCell.set({ ...p, playing: false })
    }
  }
  return el
}

export async function playMemo(memo: Memo) {
  if (!files) return
  const audio = element()
  const p = playCell.get()
  if (p?.id === memo.id) {
    if (audio.paused) await audio.play().catch(() => {})
    playCell.set({ ...p, playing: true })
    return
  }
  const blob = await files.get(memo.file)
  if (!blob) return
  if (objUrl) URL.revokeObjectURL(objUrl)
  objUrl = URL.createObjectURL(blob)
  audio.src = objUrl
  audio.playbackRate = p?.rate ?? 1
  // A scrubbed-but-unplayed memo resumes from the mark, not from zero.
  if (p?.id === memo.id && p.posMs > 0 && !p.playing) audio.currentTime = p.posMs / 1000
  await audio.play().catch(() => {})
  playCell.set({ id: memo.id, posMs: 0, playing: !audio.paused, rate: audio.playbackRate })
}

export function pausePlay() {
  const p = playCell.get()
  if (!p) return
  el?.pause()
  playCell.set({ ...p, playing: false })
}

export function seekPlay(ms: number) {
  const p = playCell.get()
  if (!p) return
  const memo = memosCell.get().find((m) => m.id === p.id)
  const clamped = Math.max(0, Math.min(memo?.ms ?? ms, ms))
  if (el && !el.paused) el.currentTime = clamped / 1000
  playCell.set({ ...p, posMs: clamped })
}

/** Dragging the waveform before any playback sets the mark without playing. */
export function scrubMemo(memo: Memo, ms: number) {
  const p = playCell.get()
  if (p?.id === memo.id) seekPlay(ms)
  else playCell.set({ id: memo.id, posMs: Math.max(0, Math.min(memo.ms, ms)), playing: false, rate: p?.rate ?? 1 })
}

export function ratePlay(rate: number) {
  const p = playCell.get()
  if (el) el.playbackRate = rate
  if (p) playCell.set({ ...p, rate })
}

export function skipPlay(deltaMs: number) {
  const p = playCell.get()
  if (p) seekPlay(p.posMs + deltaMs)
}

/** Deleting or overwriting a file out from under the player stops it first. */
export function stopPlay(id?: string) {
  const p = playCell.get()
  if (!p || (id && p.id !== id)) return
  el?.pause()
  playCell.set(null)
}

// ---------- files ----------

/** Re-encode after an edit: a new file lands and the old one goes, atomically enough. */
export async function writeTake(memo: Memo, blob: Blob, mime: string) {
  if (!files) return
  stopPlay(memo.id)
  const buf = await decode(blob).catch(() => null)
  const file = `rec-${memo.id}.${ext(mime)}`
  await files.put(file, blob)
  if (file !== memo.file) await files.del(memo.file).catch(() => {})
  memoOps.patch(memo.id, {
    file,
    mime,
    ms: Math.round((buf?.duration ?? memo.ms / 1000) * 1000),
    peaks: buf ? peaks(buf) : memo.peaks
  })
}

/** The demo shelf: synthesized takes, labeled, never shown as mic recordings. */
export async function addDemo() {
  if (!files) return
  const count = memosCell.get().filter((m) => m.demo).length
  const take = demoTake(count % 3)
  const names = ['Demo - Melody', 'Demo - Tone Sweep', 'Demo - Chord Pad']
  const id = crypto.randomUUID()
  const file = `rec-${id}.wav`
  await files.put(file, take.blob)
  memoOps.add({
    id,
    name: `${names[count % 3]!} ${Math.floor(count / 3) + 1}`,
    file,
    mime: 'audio/wav',
    ms: take.ms,
    at: Date.now(),
    fav: false,
    peaks: take.peaks,
    demo: true
  })
}

/** Removing a memo erases its file; trashing keeps both for the grace window. */
export async function eraseMemo(memo: Memo) {
  stopPlay(memo.id)
  if (files) await files.del(memo.file).catch(() => {})
  memoOps.drop([memo.id])
}

/** Purge expired trash and drop rows whose files are already gone. */
export async function reconcileFiles() {
  if (!files) return
  const expired = memoOps.expired()
  for (const m of expired) await eraseMemo(m)
  // A failed list must never read as "everything is gone".
  const list = await files.list().catch(() => null)
  if (!list) return
  const stored = new Set(list.map((f) => f.name))
  for (const m of memosCell.get()) if (!stored.has(m.file)) memoOps.drop([m.id])
}
