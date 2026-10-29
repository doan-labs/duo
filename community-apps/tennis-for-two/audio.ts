// Tiny synth blips, no assets. Only the active copy of the app ever calls this.
import type { Cue } from './game.ts'

let audio: AudioContext | undefined
const TONE: Record<Cue, [number, number, number]> = {
  hit: [660, 0.06, 0.16],
  bounce: [330, 0.05, 0.1],
  net: [140, 0.18, 0.18],
  point: [880, 0.16, 0.14],
  over: [523, 0.5, 0.16]
}

export function blip(cue: Cue) {
  try {
    audio ??= new AudioContext()
    const [freq, length, level] = TONE[cue]
    const t = audio.currentTime
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = cue === 'net' ? 'sawtooth' : 'square'
    osc.frequency.setValueAtTime(freq, t)
    if (cue === 'over') osc.frequency.setValueAtTime(freq * 1.5, t + 0.18)
    gain.gain.setValueAtTime(level * 0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + length)
    osc.connect(gain).connect(audio.destination)
    osc.start(t)
    osc.stop(t + length + 0.02)
  } catch {
    // Silence is a fine fallback.
  }
}
