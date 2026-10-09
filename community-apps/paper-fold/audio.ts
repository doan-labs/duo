// Tiny synth cues. The AudioContext is created lazily inside a user gesture;
// every cue re-resumes in case the context was suspended. Failures are
// swallowed - audio is decorative.

let ctx: AudioContext | null = null
let enabled = true

export const setMuted = (muted: boolean) => {
  enabled = !muted
}

// Called from a gesture handler so autoplay policy sees a user action.
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
  } catch {
    ctx = null
  }
}

const noise = (dur: number, freq: number, gain = 0.05) => {
  if (!ctx) return
  const n = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 0.9
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  src.connect(bp).connect(g).connect(ctx.destination)
  src.start()
  src.stop(ctx.currentTime + dur)
}

const tone = (freq: number, at: number, dur: number, gain = 0.04, type: OscillatorType = 'sine') => {
  if (!ctx) return
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  const g = ctx.createGain()
  const t = ctx.currentTime + at
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(ctx.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export type Cue = 'fold' | 'back' | 'turn' | 'done' | 'select'

export function cue(kind: Cue) {
  if (!enabled) return
  try {
    unlockAudio()
    if (ctx?.state !== 'running') return
    switch (kind) {
      case 'fold':
        noise(0.14, 2400, 0.05) // paper swipe
        tone(660, 0.02, 0.09, 0.025, 'triangle')
        break
      case 'back':
        noise(0.1, 1600, 0.035)
        break
      case 'turn':
        noise(0.12, 1200, 0.04)
        tone(330, 0.03, 0.1, 0.02, 'triangle')
        break
      case 'select':
        tone(880, 0, 0.07, 0.025, 'triangle')
        break
      case 'done':
        tone(523, 0, 0.14, 0.045)
        tone(659, 0.08, 0.14, 0.045)
        tone(784, 0.16, 0.22, 0.05)
        noise(0.2, 3200, 0.02)
        break
    }
  } catch {
    /* audio is best-effort */
  }
}
