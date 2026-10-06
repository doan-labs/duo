/**
 * Synthesized cues through one lazily opened AudioContext. The context is
 * resumed on every cue so the first user gesture unlocks sound; cues requested
 * while the context is still suspended are dropped rather than queued, so a
 * bot move that lands before the first tap does not pile up as a held chord.
 */
export type Cue = 'place' | 'flip' | 'pass' | 'reject' | 'undo' | 'new' | 'win' | 'lose' | 'draw'

let ctx: AudioContext | null = null
let muted = false

export function setMuted(value: boolean): void {
  muted = value
}

/** Call from a real user gesture so suspended audio wakes up. */
export function unlockAudio(): void {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state !== 'running') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(type: OscillatorType, notes: { f: number; t: number; d: number }[], level: number, sustain = 4): void {
  if (!ctx) return
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  for (const note of notes) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = note.f
    osc.connect(gain)
    osc.start(now + note.t)
    osc.stop(now + note.t + note.d)
  }
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(level, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(...notes.map((n) => n.t + n.d)) * sustain)
}

/** A short, dry percussive tick - the disc landing and each quiet cue. */
function tick(freq: number, when: number, level: number, duration = 0.08): void {
  tone('triangle', [{ f: freq, t: when, d: duration }], level, 1)
}

export function cue(kind: Cue): void {
  if (muted) return
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') {
      void ctx.resume()
      return
    }
    switch (kind) {
      case 'place':
        tick(340, 0, 0.5)
        break
      case 'flip':
        tick(340, 0, 0.45)
        tick(520, 0.07, 0.3)
        break
      case 'pass':
        tick(220, 0, 0.4)
        tick(180, 0.11, 0.3)
        break
      case 'reject':
        tone('sine', [{ f: 160, t: 0, d: 0.12 }], 0.25, 1)
        break
      case 'undo':
        tick(460, 0, 0.35)
        tick(320, 0.08, 0.3)
        break
      case 'new':
        tick(300, 0, 0.3)
        tick(420, 0.09, 0.35)
        break
      case 'win':
        tone(
          'sine',
          [
            { f: 392, t: 0, d: 0.16 },
            { f: 523, t: 0.12, d: 0.16 },
            { f: 659, t: 0.24, d: 0.3 }
          ],
          0.35,
          2
        )
        break
      case 'lose':
        tone(
          'sine',
          [
            { f: 330, t: 0, d: 0.18 },
            { f: 262, t: 0.14, d: 0.34 }
          ],
          0.3,
          2
        )
        break
      case 'draw':
        tone(
          'sine',
          [
            { f: 392, t: 0, d: 0.2 },
            { f: 392, t: 0.18, d: 0.3 }
          ],
          0.3,
          2
        )
        break
    }
  } catch {
    ctx = null
  }
}
