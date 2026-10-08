// Quiet synth cues for picks, saves and deletes - no audio assets. The one
// AudioContext is created inside a user gesture and resumed per cue; a cue
// fired while the context is suspended resolves on resume, which reads as a
// held note rather than a dropped one. Any failure is silent.
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

export type Cue = 'pick' | 'apply' | 'save' | 'remove' | 'copy' | 'error'

export function cue(kind: Cue) {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    if (kind === 'save') {
      // A two-note lift: the palette landed in the library.
      tone(
        'triangle',
        [
          [523, 0],
          [784, 0.08]
        ],
        0.11,
        0.3
      )
    } else if (kind === 'remove') {
      tone(
        'triangle',
        [
          [392, 0],
          [262, 0.1]
        ],
        0.1,
        0.28
      )
    } else if (kind === 'copy') {
      // A single bright chirp: the code is on the clipboard.
      tone(
        'sine',
        [
          [880, 0],
          [1175, 0.06]
        ],
        0.08,
        0.16
      )
    } else if (kind === 'error') {
      // A soft low buzz, deliberately shorter and duller than a real alarm.
      tone('sine', [[196, 0]], 0.08, 0.14)
    } else if (kind === 'apply') {
      // The field committed a colour: a touch more present than a swatch pick.
      tone(
        'sine',
        [
          [660, 0],
          [880, 0.05]
        ],
        0.07,
        0.14
      )
    } else {
      // Pick: the quietest tick a selection can make.
      tone('sine', [[740, 0]], 0.05, 0.08)
    }
  } catch {
    // No audio device or a blocked context: the app still works.
  }
}
