// The two engines the whole app shares, both anchored on the session owner.
// mic.* mutating calls and file.put/del reject off-owner (the bridge's
// assertOwner), so every capture or write is an op: the owner view runs it
// locally, the parked view sends a 'memos.op' command the owner's own
// handler replays. Blobs never cross the bridge - a payload is the recipe
// (a memo id, trim marks) and the owner re-derives the audio from the stored
// file, which file.get reads on any view. Shared state - the take's phase,
// levels, transcript, playhead - sits in os.session cells, so the parked copy
// draws the same deck without a stream of its own. Playback is the owner's
// element too, so a fold mid-take or mid-song never strands the audio.

import { os } from '@doan-labs/duo-sdk'
import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'
import { decode, demoTake, ext, peaks, splice, wav } from './audio.ts'
import { type Memo, memoOps, memosCell } from './store.ts'

// The manifest's `microphone` and `files` permissions make the services exist;
// a denial lands as a runtime phase, not a missing capability.
export const hasMic = () => true
export const hasFiles = () => true
/** Read one stored blob; null when the file or the store is gone. */
export const readFile = (name: string): Promise<Blob | null> => os.files.get(name).catch(() => null)

// ---------- owner dispatch ----------

type Op =
  | { op: 'start'; replaceAtSec?: number }
  | { op: 'pause' }
  | { op: 'resume' }
  | { op: 'discard' }
  | { op: 'stop'; name?: string }
  | { op: 'stopReplace' }
  | { op: 'trim'; id: string; fromSec: number; toSec: number; asNew: boolean }
  | { op: 'applyReplace'; id: string; asNew: boolean }
  | { op: 'demo' }
  | { op: 'erase'; id: string }
  | { op: 'reconcile' }
  | { op: 'play'; id: string }
  | { op: 'pausePlay' }
  | { op: 'seek'; ms: number }
  | { op: 'scrub'; id: string; ms: number }
  | { op: 'rate'; rate: number }
  | { op: 'skip'; deltaMs: number }
  | { op: 'stopPlay'; id?: string }

const CMD = 'memos.op'

async function dispatch(op: Op) {
  try {
    switch (op.op) {
      case 'start':
        await doStartRec(op.replaceAtSec == null ? undefined : { replaceAtSec: op.replaceAtSec })
        break
      case 'pause':
        os.mic.pause()
        break
      case 'resume':
        os.mic.resume()
        break
      case 'discard':
        await doDiscardRec()
        break
      case 'stop':
        await doStopAndSave(op.name)
        break
      case 'stopReplace':
        await doStopReplace()
        break
      case 'trim':
        await doTrim(op.id, op.fromSec, op.toSec, op.asNew)
        break
      case 'applyReplace':
        await doApplyReplace(op.id, op.asNew)
        break
      case 'demo':
        await doAddDemo()
        break
      case 'erase':
        await doErase(op.id)
        break
      case 'reconcile':
        await doReconcile()
        break
      case 'play':
        await doPlay(op.id)
        break
      case 'pausePlay':
        doPausePlay()
        break
      case 'seek':
        doSeek(op.ms)
        break
      case 'scrub':
        doScrub(op.id, op.ms)
        break
      case 'rate':
        doRate(op.rate)
        break
      case 'skip':
        doSkip(op.deltaMs)
        break
      case 'stopPlay':
        doStopPlay(op.id)
        break
    }
  } catch (error) {
    // A failed op still acks: without the catch an unlucky one would be
    // redelivered on every owner change forever.
    console.debug('memos op failed', op.op, error)
  }
}
os.commands.onCommand((c) => (c.type === CMD ? dispatch(JSON.parse(c.payload) as Op) : undefined))

/** Owner runs the op; off-owner it crosses to the owner view as a command. */
const run = (op: Op): Promise<void> =>
  os.owner ? dispatch(op) : os.commands.send(CMD, JSON.stringify(op)).catch(() => {})

// ---------- recorder ----------

export type RecPhase = 'idle' | 'starting' | 'recording' | 'paused' | 'saving' | 'denied' | 'unavailable'
export type Rec = { phase: RecPhase; elapsed: number; level: number; detail?: string }
const IDLE: Rec = { phase: 'idle', elapsed: 0, level: 0 }

const recCell = cell<Rec>('session', 'memos.rec', IDLE)
const levelsCell = cell<number[]>('session', 'memos.levels', [])
const wordsCell = cell('session', 'memos.words', '')
/** 'off' before and during a take without SR, 'live' while it types, 'unavailable' when the platform cannot. */
const speechCell = cell<'off' | 'live' | 'unavailable'>('session', 'memos.speech', 'off')
/** The edit page's replace take: armed with a splice point, filled on stop. */
const replaceCell = cell<{ active: boolean; atSec: number | null }>('session', 'memos.replace', {
  active: false,
  atSec: null
})
/** The armed take's audio, on the owner only - a Blob cannot ride a cell. */
let replaceBlob: Blob | null = null
/** The UI-facing view of the replace take; `blob` reads only resolve on the owner. */
export const replaceState = {
  subscribe: replaceCell.subscribe,
  get: () => ({ ...replaceCell.get(), blob: replaceBlob })
}

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

export function startRec(opts?: { replaceAtSec?: number }) {
  return run({ op: 'start', replaceAtSec: opts?.replaceAtSec })
}
async function doStartRec(opts?: { replaceAtSec?: number }) {
  if (stopping || ['starting', 'recording', 'paused', 'saving'].includes(recCell.get().phase)) return
  wordsCell.set('')
  levelsCell.set([])
  // Honest before anything runs: no SR constructor means no transcript, ever.
  speechCell.set(SR && opts?.replaceAtSec == null ? 'off' : 'unavailable')
  replaceBlob = null
  replaceCell.set(
    opts?.replaceAtSec == null ? { active: false, atSec: null } : { active: true, atSec: opts.replaceAtSec }
  )
  recCell.set({ ...IDLE, phase: 'starting' })
  try {
    await os.mic.start()
  } catch (error) {
    // E_DENIED vs everything else is how the deck picks its card; the status
    // event the shell emitted already carries the detail.
    const code = (error as { code?: string })?.code
    recCell.set({ ...IDLE, phase: code === 'E_DENIED' ? 'denied' : 'unavailable' })
    speechCell.set('off')
    replaceCell.set({ active: false, atSec: null })
    return
  }
  if (!replaceCell.get().active) startSpeech()
  unStatus = os.mic.onStatus((s) => {
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
      void doStopAndSave()
      return
    }
    if (s.state === 'denied' || s.state === 'unavailable') recCell.set({ ...IDLE, phase: s.state, detail: s.detail })
  })
}

export function pauseRec() {
  return run({ op: 'pause' })
}
export function resumeRec() {
  return run({ op: 'resume' })
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
  await os.files.put(file, blob)
  memoOps.add(memo)
  return memo
}

/** Stop -> persist -> list. iOS saves on Done the same way, no confirm. */
export function stopAndSave(name?: string) {
  return run({ op: 'stop', name })
}
async function doStopAndSave(name?: string) {
  if (stopping) return null
  // A take armed for Replace belongs to the editor; stopping it is splice data.
  if (replaceCell.get().active) {
    await doStopReplace()
    return null
  }
  stopping = true
  const rec = recCell.get()
  if (rec.phase === 'recording' || rec.phase === 'paused') recCell.set({ ...rec, phase: 'saving' })
  let memo: Memo | null = null
  try {
    const take = await os.mic.stop()
    unStatus?.()
    unStatus = undefined
    stopSpeech()
    if (take) memo = await saveBlob(take.blob, take.mime, take.durationMs, name)
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
 * Stop a replace take: the audio lands on the owner for the apply op to
 * splice, not in the library - nothing gets saved as a memo here.
 */
export function stopReplace() {
  return run({ op: 'stopReplace' })
}
async function doStopReplace() {
  if (stopping) return
  stopping = true
  try {
    const take = await os.mic.stop()
    replaceBlob = take?.blob ?? null
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
async function saveCopy(base: Memo, blob: Blob) {
  const id = crypto.randomUUID()
  const file = `rec-${id}.wav`
  await os.files.put(file, blob)
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
export function discardRec() {
  return run({ op: 'discard' })
}
async function doDiscardRec() {
  stopping = true
  try {
    await os.mic.stop()
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

// ---------- player (owner's element, shared state) ----------

export type Play = { id: string; posMs: number; playing: boolean; rate: number }
const playCell = cell<Play | null>('session', 'memos.play', null)
export const usePlay = () => useSyncExternalStore(playCell.subscribe, playCell.get)

let el: HTMLAudioElement | undefined

/** A data: URL is the only media src the sandbox's document policy allows. */
const dataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const f = new FileReader()
    f.onload = () => res(f.result as string)
    f.onerror = () => rej(f.error)
    f.readAsDataURL(blob)
  })

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

export function playMemo(memo: Memo) {
  return run({ op: 'play', id: memo.id })
}
async function doPlay(id: string) {
  const memo = memosCell.get().find((m) => m.id === id)
  if (!memo) return
  const audio = element()
  const p = playCell.get()
  if (p?.id === memo.id) {
    if (audio.paused) await audio.play().catch(() => {})
    playCell.set({ ...p, playing: true })
    return
  }
  const blob = await os.files.get(memo.file)
  if (!blob) return
  audio.src = await dataUrl(blob)
  audio.playbackRate = p?.rate ?? 1
  // A scrubbed-but-unplayed memo resumes from the mark, not from zero.
  if (p?.id === memo.id && p.posMs > 0 && !p.playing) audio.currentTime = p.posMs / 1000
  await audio.play().catch(() => {})
  playCell.set({ id: memo.id, posMs: 0, playing: !audio.paused, rate: audio.playbackRate })
}

export function pausePlay() {
  return run({ op: 'pausePlay' })
}
function doPausePlay() {
  const p = playCell.get()
  if (!p) return
  el?.pause()
  playCell.set({ ...p, playing: false })
}

export function seekPlay(ms: number) {
  return run({ op: 'seek', ms })
}
function doSeek(ms: number) {
  const p = playCell.get()
  if (!p) return
  const memo = memosCell.get().find((m) => m.id === p.id)
  const clamped = Math.max(0, Math.min(memo?.ms ?? ms, ms))
  if (el && !el.paused) el.currentTime = clamped / 1000
  playCell.set({ ...p, posMs: clamped })
}

/** Dragging the waveform before any playback sets the mark without playing. */
export function scrubMemo(memo: Memo, ms: number) {
  return run({ op: 'scrub', id: memo.id, ms })
}
function doScrub(id: string, ms: number) {
  const p = playCell.get()
  if (p?.id === id) return doSeek(ms)
  const memo = memosCell.get().find((m) => m.id === id)
  if (memo) playCell.set({ id, posMs: Math.max(0, Math.min(memo.ms, ms)), playing: false, rate: p?.rate ?? 1 })
}

export function ratePlay(rate: number) {
  return run({ op: 'rate', rate })
}
function doRate(rate: number) {
  const p = playCell.get()
  if (el) el.playbackRate = rate
  if (p) playCell.set({ ...p, rate })
}

export function skipPlay(deltaMs: number) {
  return run({ op: 'skip', deltaMs })
}
function doSkip(deltaMs: number) {
  const p = playCell.get()
  if (p) doSeek(p.posMs + deltaMs)
}

/** Deleting or overwriting a file out from under the player stops it first. */
export function stopPlay(id?: string) {
  return run({ op: 'stopPlay', id })
}
function doStopPlay(id?: string) {
  const p = playCell.get()
  if (!p || (id && p.id !== id)) return
  el?.pause()
  playCell.set(null)
}

// ---------- files ----------

/** Re-encode after an edit: a new file lands and the old one goes, atomically enough. */
async function writeTake(memo: Memo, blob: Blob, mime: string) {
  doStopPlay(memo.id)
  const buf = await decode(blob).catch(() => null)
  const file = `rec-${memo.id}.${ext(mime)}`
  await os.files.put(file, blob)
  if (file !== memo.file) await os.files.del(memo.file).catch(() => {})
  memoOps.patch(memo.id, {
    file,
    mime,
    ms: Math.round((buf?.duration ?? memo.ms / 1000) * 1000),
    peaks: buf ? peaks(buf) : memo.peaks
  })
}

/** The trim marks are the whole recipe; the owner re-derives the audio. */
export function trimTake(memo: Memo, fromSec: number, toSec: number, asNew: boolean) {
  void stopPlay(memo.id)
  return run({ op: 'trim', id: memo.id, fromSec, toSec, asNew })
}
async function doTrim(id: string, fromSec: number, toSec: number, asNew: boolean) {
  const memo = memosCell.get().find((m) => m.id === id)
  if (!memo) return
  const stored = await os.files.get(memo.file)
  if (!stored) return
  const blob = wav(await decode(stored), fromSec, toSec)
  if (asNew) await saveCopy(memo, blob)
  else await writeTake(memo, blob, 'audio/wav')
}

/** The armed replace take is already on the owner; the memo id names the base. */
export function applyReplace(memo: Memo, asNew: boolean) {
  void stopPlay(memo.id)
  return run({ op: 'applyReplace', id: memo.id, asNew })
}
async function doApplyReplace(id: string, asNew: boolean) {
  const memo = memosCell.get().find((m) => m.id === id)
  const take = replaceBlob
  const atSec = replaceCell.get().atSec
  if (!memo || !take || atSec == null) return
  const stored = await os.files.get(memo.file)
  if (!stored) return
  const blob = splice(await decode(stored), atSec, await decode(take))
  if (asNew) await saveCopy(memo, blob)
  else await writeTake(memo, blob, 'audio/wav')
}

/** The demo shelf: synthesized takes, labeled, never shown as mic recordings. */
export function addDemo() {
  return run({ op: 'demo' })
}
async function doAddDemo() {
  const count = memosCell.get().filter((m) => m.demo).length
  const take = demoTake(count % 3)
  const names = ['Demo - Melody', 'Demo - Tone Sweep', 'Demo - Chord Pad']
  const id = crypto.randomUUID()
  const file = `rec-${id}.wav`
  await os.files.put(file, take.blob)
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
export function eraseMemo(memo: Memo) {
  void stopPlay(memo.id)
  return run({ op: 'erase', id: memo.id })
}
async function doErase(id: string) {
  const memo = memosCell.get().find((m) => m.id === id)
  if (!memo) return
  doStopPlay(id)
  await os.files.del(memo.file).catch(() => {})
  memoOps.drop([id])
}

/** Purge expired trash and drop rows whose files are already gone. Owner-side, once. */
export function reconcileFiles() {
  return run({ op: 'reconcile' })
}
async function doReconcile() {
  const expired = memoOps.expired()
  for (const m of expired) await doErase(m.id)
  // A failed list must never read as "everything is gone".
  const list = await os.files.list().catch(() => null)
  if (!list) return
  const stored = new Set(list.map((f) => f.name))
  for (const m of memosCell.get()) if (!stored.has(m.file)) memoOps.drop([m.id])
}
