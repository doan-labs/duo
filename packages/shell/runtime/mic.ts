// The microphone is a shell device, not an app device: frames keep
// `allow="microphone 'none'"` (decisions.md 42) and this module is the host
// half of the capture contract. One take at a time, owned by the channel that
// started it - a Session over the bridge, or a baked app's `os.mic` handle;
// other channels keep their own idle status and get E_DENIED on mutating calls.
//
// The rules the contract makes binding: getUserMedia runs only inside `start`
// (the user's Record press, never at mount); every track stops when the take
// ends, fails or its owner goes away; a track ending on its own tears the take
// down but keeps the captured audio claimable by one `stop`.

import { PlatformError } from '../../sdk/guards.ts'
import type { MicHost } from '../../sdk/legacy.ts'
import { LIMITS, type MicResult, type MicStatus } from '../../sdk/protocol.ts'
import type { Session } from './sessions.ts'

const idle = (): MicStatus => ({ state: 'idle', elapsed: 0, level: 0 })
/** A fold's mirror copy mounts within this window; a real close outlives it. */
const GRACE_MS = 600
const METER_MS = 66

type Holder = {
  status: MicStatus
  subs: Set<(s: MicStatus) => void>
  /** Mounted app copies holding this channel; sessions never attach. */
  refs: number
  grace?: ReturnType<typeof setTimeout>
  /** A take that ended on its own (track lost, size cap); claimable once via `stop`. */
  result?: MicResult | null
}

type Take = {
  token: unknown
  stream: MediaStream
  recorder: MediaRecorder
  ctx: AudioContext
  analyser: AnalyserNode
  chunks: Blob[]
  bytes: number
  mime: string
  /** performance.now() when the current segment began; `carriedMs` holds what paused segments banked. */
  beganAt: number
  carriedMs: number
  paused: boolean
  meter: ReturnType<typeof setInterval>
  finishing?: Promise<MicResult | null>
}

const holders = new Map<unknown, Holder>()
let take: Take | undefined

function holderFor(token: unknown): Holder {
  let h = holders.get(token)
  if (!h) {
    h = { status: idle(), subs: new Set(), refs: 0 }
    holders.set(token, h)
  }
  return h
}

function emit(token: unknown, status: MicStatus) {
  const h = holders.get(token)
  if (!h) return
  h.status = status
  for (const cb of h.subs) cb(status)
}

function refuse(holder: Holder, state: 'denied' | 'unavailable', detail: string): never {
  const status: MicStatus = { state, elapsed: 0, level: 0, detail }
  holder.status = status
  for (const cb of holder.subs) cb(status)
  throw new PlatformError(state === 'denied' ? 'E_DENIED' : 'E_UNSUPPORTED', detail)
}

const elapsed = (t: Take) => t.carriedMs + (t.paused ? 0 : performance.now() - t.beganAt)

function meter(t: Take) {
  const buf = new Uint8Array(t.analyser.fftSize)
  t.analyser.getByteTimeDomainData(buf)
  let peak = 0
  for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128)
  emit(t.token, { state: 'recording', elapsed: elapsed(t), level: peak })
}

function finish(t: Take, keep: boolean, detail?: string): Promise<MicResult | null> {
  t.finishing ??= (async () => {
    if (take === t) take = undefined
    clearInterval(t.meter)
    // onstop is the flush: chunks after it are the whole take.
    const blob = await new Promise<Blob>((resolve) => {
      const packed = () => resolve(new Blob(t.chunks, { type: t.mime || t.recorder.mimeType }))
      if (t.recorder.state === 'inactive') return packed()
      t.recorder.onstop = packed
      try {
        t.recorder.stop()
      } catch {
        packed()
      }
    })
    for (const track of t.stream.getTracks()) track.stop()
    void t.ctx.close().catch(() => {})
    const result = keep && blob.size ? { blob, mime: t.mime || blob.type, durationMs: Math.round(elapsed(t)) } : null
    // The result lands before 'ended' fires: an owner reacting to that event
    // can claim the take with `stop` in the same turn.
    const holder = holders.get(t.token)
    if (holder) holder.result = result
    emit(t.token, { state: 'ended', elapsed: result?.durationMs ?? Math.round(elapsed(t)), level: 0, detail })
    return result
  })()
  return t.finishing
}

async function start(token: unknown): Promise<void> {
  const holder = holderFor(token)
  if (take) {
    if (take.token === token) return
    return refuse(holder, 'denied', 'The microphone is recording in another app.')
  }
  holder.result = undefined
  if (
    !window.isSecureContext ||
    typeof navigator.mediaDevices?.getUserMedia !== 'function' ||
    typeof MediaRecorder === 'undefined'
  )
    return refuse(holder, 'unavailable', 'Microphone capture is not supported here.')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    return refuse(
      holder,
      name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDismissedError'
        ? 'denied'
        : 'unavailable',
      error instanceof Error ? error.message : String(error)
    )
  }
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) throw new PlatformError('E_UNSUPPORTED', 'No AudioContext')
    const ctx = new Ctor()
    void ctx.resume().catch(() => {})
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const mime =
      ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) =>
        MediaRecorder.isTypeSupported(m)
      ) ?? ''
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const t: Take = {
      token,
      stream,
      recorder,
      ctx,
      analyser,
      chunks: [],
      bytes: 0,
      mime,
      beganAt: performance.now(),
      carriedMs: 0,
      paused: false,
      meter: 0 as never
    }
    recorder.ondataavailable = (e) => {
      if (!e.data.size) return
      t.chunks.push(e.data)
      t.bytes += e.data.size
      // A take bigger than the file store could never be saved; end it whole.
      if (t.bytes > LIMITS.file) void finish(t, true, 'Reached the recording size limit.')
    }
    recorder.onerror = () => {
      if (take === t) void finish(t, true, 'The recorder failed.')
    }
    // A pulled device or a revoked permission ends the track: capture stops at
    // once and the partial take stays claimable, like a stopped one.
    for (const track of stream.getTracks())
      track.addEventListener('ended', () => {
        if (take === t) void finish(t, true, 'The microphone disconnected.')
      })
    t.meter = setInterval(() => {
      if (take === t && !t.paused) meter(t)
    }, METER_MS)
    take = t
    recorder.start(250)
    emit(token, { state: 'recording', elapsed: 0, level: 0 })
  } catch (error) {
    for (const track of stream.getTracks()) track.stop()
    return refuse(holder, 'unavailable', error instanceof Error ? error.message : String(error))
  }
}

/** Mutating calls from a channel that does not own the take are denied, not ignored. */
const owns = (token: unknown) => {
  if (take && take.token !== token) throw new PlatformError('E_DENIED', 'The microphone is recording in another app.')
}

function pause(token: unknown) {
  owns(token)
  if (!take || take.paused) return
  take.carriedMs += performance.now() - take.beganAt
  take.paused = true
  try {
    take.recorder.pause()
  } catch {
    /* A recorder already stopping has nothing to pause. */
  }
  emit(token, { state: 'paused', elapsed: take.carriedMs, level: 0 })
}

function resume(token: unknown) {
  owns(token)
  if (!take?.paused) return
  take.paused = false
  take.beganAt = performance.now()
  try {
    take.recorder.resume()
  } catch {
    /* Mirrored by pause. */
  }
  emit(token, { state: 'recording', elapsed: take.carriedMs, level: 0 })
}

async function stop(token: unknown): Promise<MicResult | null> {
  owns(token)
  const holder = holderFor(token)
  const current = take
  if (current && current.token === token) {
    const result = await finish(current, true)
    holder.result = undefined
    return result
  }
  const claimed = holder.result
  holder.result = undefined
  return claimed ?? null
}

/**
 * One channel per owner token. `attach`/`detach` count the owner's mounted
 * views: the last detach starts a grace window, so the fold's mirror copy
 * re-attaches before the take is dropped; a real close stops every track.
 */
export function micChannel(token: unknown): MicHost {
  const holder = holderFor(token)
  return {
    attach() {
      clearTimeout(holder.grace)
      holder.refs++
      let released = false
      return () => {
        if (released) return
        released = true
        if (--holder.refs > 0) return
        holder.grace = setTimeout(() => {
          if (holder.refs > 0) return
          holders.delete(token)
          const current = take
          if (current && current.token === token) void finish(current, false)
        }, GRACE_MS)
      }
    },
    status: () => holder.status,
    onStatus(cb) {
      holder.subs.add(cb)
      cb(holder.status)
      return () => {
        holder.subs.delete(cb)
      }
    },
    start: () => start(token),
    pause: () => pause(token),
    resume: () => resume(token),
    stop: () => stop(token)
  }
}

/** A baked app's `os.mic`: the same engine, keyed by app name. */
export const micHost = (name: string): MicHost => micChannel(`baked:${name}`)

const channels = new WeakMap<Session, MicHost>()
function channelFor(session: Session): MicHost {
  let channel = channels.get(session)
  if (!channel) {
    channel = micChannel(session)
    holderFor(session).subs.add((status) => {
      for (const view of session.views.values()) view.send({ ev: 'mic', p: status })
    })
    channels.set(session, channel)
  }
  return channel
}

/** The bridge's half of `os.mic`; `dispatch` reaches it after the permission check. */
export async function micService(session: Session, method: string): Promise<unknown> {
  const channel = channelFor(session)
  switch (method) {
    case 'mic.status':
      return channel.status()
    case 'mic.start':
      return channel.start()
    case 'mic.pause':
      return channel.pause()
    case 'mic.resume':
      return channel.resume()
    case 'mic.stop':
      return channel.stop()
  }
  throw new PlatformError('E_ARGS')
}

/** Session end stops capture outright - no grace, nothing left running. */
export function micRelease(token: unknown) {
  const holder = holders.get(token)
  clearTimeout(holder?.grace)
  holders.delete(token)
  const current = take
  if (current && current.token === token) void finish(current, false)
}
