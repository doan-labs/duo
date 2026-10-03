// The engine only the session owner may run: one AudioContext, one lookahead
// scheduler, one pool of scheduled sources. The mirror copy never imports a
// running engine - it only reads the transport and draws the playhead.
import { gridOn, type Live, STEPS, stepAt, stepMs, TRACK_COUNT } from './sequencer.ts'

// Generous lookahead: scheduling is a poll, not the clock, so hidden or busy
// frames still land every step on time. Sources already past are left alone;
// anything due inside a small late window still plays rather than dropping.
const LOOKAHEAD_MS = 380
const TICK_MS = 90
const LATE_MS = 40

export type EngineStatus = { on: boolean; blocked: boolean }

// C major pentatonic over two octaves, up and back: the Keys row maps step to
// pitch, so a random scatter of lit pads still sketches a melody.
const SCALE = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.0, 392.0, 329.63,
  293.66
]

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let timer = 0
let nextStep = 0
let anchorMs = 0
let anchorStep = 0
let running = false
let blocked = false
let getLive: () => Live | null = () => null
let report: (status: EngineStatus) => void = () => {}
const pending = new Set<AudioScheduledSourceNode>()

function ensure() {
  if (ctx) return ctx
  const audio = new AudioContext()
  const out = audio.createGain()
  out.gain.value = 0.85
  out.connect(audio.destination)
  const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  ctx = audio
  master = out
  noiseBuf = buffer
  return audio
}

function hold(src: AudioScheduledSourceNode) {
  pending.add(src)
  src.onended = () => pending.delete(src)
}

function noiseHit(at: number, type: BiquadFilterType, frequency: number, level: number, duration: number) {
  const audio = ctx!
  const src = audio.createBufferSource()
  src.buffer = noiseBuf
  const filter = audio.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  const gain = audio.createGain()
  gain.gain.setValueAtTime(level, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(master!)
  src.start(at)
  src.stop(at + duration + 0.02)
  hold(src)
}

function pluck(at: number, frequency: number) {
  const audio = ctx!
  const gain = audio.createGain()
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2600
  gain.gain.setValueAtTime(0.34, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5)
  filter.connect(gain)
  gain.connect(master!)
  const body = audio.createOscillator()
  body.type = 'triangle'
  body.frequency.value = frequency
  const air = audio.createOscillator()
  air.type = 'sine'
  air.frequency.value = frequency * 2
  const airGain = audio.createGain()
  airGain.gain.value = 0.4
  body.connect(filter)
  air.connect(airGain)
  airGain.connect(filter)
  body.start(at)
  air.start(at)
  body.stop(at + 0.55)
  air.stop(at + 0.55)
  hold(body)
  hold(air)
}

function kick(at: number) {
  const audio = ctx!
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, at)
  osc.frequency.exponentialRampToValueAtTime(46, at + 0.12)
  gain.gain.setValueAtTime(0.95, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.3)
  osc.connect(gain)
  gain.connect(master!)
  osc.start(at)
  osc.stop(at + 0.32)
  hold(osc)
}

function snare(at: number) {
  noiseHit(at, 'bandpass', 1900, 0.5, 0.18)
  const audio = ctx!
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 190
  gain.gain.setValueAtTime(0.28, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.1)
  osc.connect(gain)
  gain.connect(master!)
  osc.start(at)
  osc.stop(at + 0.12)
  hold(osc)
}

function voice(track: number, step: number, at: number) {
  if (track === 3) kick(at)
  else if (track === 2) snare(at)
  else if (track === 1) noiseHit(at, 'highpass', 7200, 0.3, 0.05)
  else pluck(at, SCALE[step % STEPS]!)
}

function setBlocked(next: boolean) {
  if (blocked === next) return
  blocked = next
  report({ on: true, blocked })
}

function tick() {
  const audio = ctx
  if (!audio || !running) return
  if (audio.state === 'suspended') {
    // Autoplay refused the resume: stay armed, schedule nothing, and let the
    // owner view's next gesture unlock cleanly instead of bursting held notes.
    setBlocked(true)
    return
  }
  setBlocked(false)
  const live = getLive()
  if (!live?.transport.on) return
  const now = Date.now()
  const horizon = now + LOOKAHEAD_MS
  // Re-anchor whenever the shared transport moved (play, pause, tempo drag):
  // the step counter only makes sense relative to the anchors it started from.
  if (live.transport.atMs !== anchorMs || live.transport.atStep !== anchorStep) {
    anchorMs = live.transport.atMs
    anchorStep = live.transport.atStep
    nextStep = Math.ceil(stepAt(live.transport, live.tempo, now) - 1e-4)
  }
  for (;;) {
    const due = live.transport.atMs + (nextStep - live.transport.atStep) * stepMs(live.tempo)
    if (due > horizon) break
    if (due >= now - LATE_MS) {
      const step = ((nextStep % STEPS) + STEPS) % STEPS
      const at = audio.currentTime + Math.max(0, (due - now) / 1000)
      for (let track = 0; track < TRACK_COUNT; track++) {
        if (!live.mutes[track]! && gridOn(live.grid, track, step)) voice(track, step, at)
      }
    }
    nextStep += 1
  }
}

function silence() {
  for (const src of pending) {
    try {
      src.onended = null
      src.stop()
    } catch {
      // Already stopped or never started.
    }
  }
  pending.clear()
}

// Arm the scheduler on the owner. `get` reads the freshest shared Live state,
// so remote edits and tempo changes land on the next pass without reseeding.
export function engineStart(get: () => Live | null, onStatus: (status: EngineStatus) => void) {
  getLive = get
  report = onStatus
  try {
    ensure()
  } catch {
    report({ on: false, blocked: false })
    return
  }
  void ctx!.resume().then(
    () => setBlocked(ctx!.state === 'suspended'),
    () => {}
  )
  if (!running) {
    running = true
    nextStep = 0
    anchorMs = 0
    anchorStep = 0
    blocked = ctx!.state === 'suspended'
    timer = setInterval(tick, TICK_MS) as unknown as number
    tick()
  }
  report({ on: true, blocked })
}

export function engineStop(onStatus?: (status: EngineStatus) => void) {
  if (onStatus) report = onStatus
  if (!running) {
    if (onStatus) report({ on: false, blocked: false })
    return
  }
  running = false
  clearInterval(timer)
  timer = 0
  nextStep = 0
  anchorMs = 0
  anchorStep = 0
  blocked = false
  silence()
  report({ on: false, blocked: false })
}

// A gesture inside the owner view: the one legal way to take a suspended
// context running. Harmless when already running or never started.
export function engineUnlock() {
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
}

export function engineClose() {
  engineStop()
  silence()
  void ctx?.close().catch(() => {})
  ctx = null
  master = null
  noiseBuf = null
  getLive = () => null
  report = () => {}
}
