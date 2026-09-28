// Tiny synth cues, no assets. One AudioContext, resumed inside gestures; a cue
// scheduled while suspended lands on the next gesture as a held chord, which
// reads as intentional, not broken.
let audio: AudioContext | undefined
function tone(type: OscillatorType, notes: [number, number][], level: number, sustain: number) {
  const ctx = audio!
  const t = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  const osc = ctx.createOscillator()
  osc.type = type
  osc.connect(gain)
  for (const [freq, at] of notes) osc.frequency.setValueAtTime(freq, t + at)
  osc.start(t)
  const end = notes.at(-1)![1] + sustain
  osc.stop(t + end)
  gain.gain.setValueAtTime(level, t)
  gain.gain.setValueAtTime(level, Math.max(t, t + end - 0.12))
  gain.gain.exponentialRampToValueAtTime(0.001, t + end)
}

export type Cue = 'move' | 'capture' | 'check' | 'win' | 'lose' | 'draw'

export function cue(kind: Cue) {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    if (kind === 'win') {
      // Rising major arpeggio with a shimmer on top.
      tone(
        'triangle',
        [
          [523, 0],
          [659, 0.09],
          [784, 0.18],
          [1047, 0.27]
        ],
        0.16,
        0.34
      )
      tone(
        'sine',
        [
          [1568, 0.32],
          [2093, 0.38]
        ],
        0.08,
        0.5
      )
    } else if (kind === 'lose') {
      // Falling minor third: the bot took the point.
      tone(
        'triangle',
        [
          [392, 0],
          [311, 0.18],
          [233, 0.36]
        ],
        0.14,
        0.42
      )
    } else if (kind === 'draw') {
      tone(
        'triangle',
        [
          [392, 0],
          [311, 0.16]
        ],
        0.14,
        0.3
      )
    } else if (kind === 'check') {
      // Two quick alerts, a half-step apart.
      tone(
        'square',
        [
          [880, 0],
          [932, 0.09]
        ],
        0.05,
        0.12
      )
    } else if (kind === 'capture') {
      // A knock under the tick: wood on wood.
      tone(
        'sine',
        [
          [300, 0],
          [180, 0.05]
        ],
        0.1,
        0.1
      )
      tone(
        'sine',
        [
          [760, 0],
          [540, 0.04]
        ],
        0.05,
        0.08
      )
    } else {
      // The soft woodblock tick under every quiet move.
      tone(
        'sine',
        [
          [760, 0],
          [540, 0.04]
        ],
        0.07,
        0.08
      )
    }
  } catch {
    // No audio is fine. The board still works.
  }
}
