// Tiny synth cues, no assets. One AudioContext, created inside a user gesture
// and resumed on each cue; a cue scheduled while the context is still suspended
// lands on the next gesture as a held chord, which reads as intentional.
// Errors are silent: a ding that never fires must never mask a UI result.
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

export type Cue = 'add' | 'use' | 'restock' | 'check' | 'uncheck' | 'trash' | 'save'

export function cue(kind: Cue) {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    if (kind === 'add') {
      // Stocked: a soft rising pair.
      tone(
        'sine',
        [
          [520, 0],
          [780, 0.07]
        ],
        0.1,
        0.18
      )
    } else if (kind === 'use') {
      // One unit gone: a low soft thock.
      tone(
        'sine',
        [
          [300, 0],
          [220, 0.05]
        ],
        0.09,
        0.1
      )
    } else if (kind === 'restock') {
      // Quantity up: a brighter two-note pop than 'add'.
      tone(
        'triangle',
        [
          [620, 0],
          [930, 0.05]
        ],
        0.08,
        0.14
      )
    } else if (kind === 'check') {
      // A shopping tick: one crisp high blip.
      tone('triangle', [[1180, 0]], 0.07, 0.08)
    } else if (kind === 'uncheck') {
      // Tick undone: the same blip a touch lower.
      tone('triangle', [[880, 0]], 0.05, 0.08)
    } else if (kind === 'trash') {
      // Delete: a short fall.
      tone(
        'sine',
        [
          [260, 0],
          [160, 0.08]
        ],
        0.1,
        0.16
      )
    } else {
      // Save: quiet settled fifth.
      tone(
        'sine',
        [
          [440, 0],
          [660, 0.06]
        ],
        0.07,
        0.14
      )
    }
  } catch {
    // No audio is fine. The shelf still works.
  }
}
