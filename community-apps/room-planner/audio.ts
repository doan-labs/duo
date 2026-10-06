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
  gain.gain.setValueAtTime(level, Math.max(t, t + end - 0.1))
  gain.gain.exponentialRampToValueAtTime(0.001, t + end)
}

export type Cue = 'place' | 'settle' | 'rotate' | 'select' | 'delete' | 'save' | 'undo' | 'error' | 'open'

export function cue(kind: Cue) {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    if (kind === 'place') {
      // A piece landing on the plan: soft low knock.
      tone(
        'sine',
        [
          [280, 0],
          [190, 0.05]
        ],
        0.14,
        0.12
      )
    } else if (kind === 'settle') {
      // Drag release settling onto the grid.
      tone(
        'sine',
        [
          [340, 0],
          [240, 0.04]
        ],
        0.08,
        0.09
      )
    } else if (kind === 'rotate') {
      // Quarter-turn tick.
      tone(
        'sine',
        [
          [620, 0],
          [500, 0.03]
        ],
        0.05,
        0.06
      )
    } else if (kind === 'select') {
      tone('sine', [[760, 0]], 0.04, 0.05)
    } else if (kind === 'delete') {
      // A short falling sweep.
      tone(
        'triangle',
        [
          [420, 0],
          [240, 0.08]
        ],
        0.09,
        0.14
      )
    } else if (kind === 'save') {
      // Layout stored: a small two-note confirm.
      tone(
        'triangle',
        [
          [520, 0],
          [660, 0.07]
        ],
        0.09,
        0.16
      )
    } else if (kind === 'undo') {
      tone(
        'sine',
        [
          [520, 0],
          [640, 0.06]
        ],
        0.07,
        0.11
      )
    } else if (kind === 'open') {
      tone(
        'sine',
        [
          [460, 0],
          [580, 0.06]
        ],
        0.06,
        0.12
      )
    } else {
      // error: a muted double thud, still quiet.
      tone('square', [[180, 0]], 0.05, 0.07)
      tone('square', [[150, 0.08]], 0.05, 0.09)
    }
  } catch {
    // No audio is fine. The plan still works.
  }
}
