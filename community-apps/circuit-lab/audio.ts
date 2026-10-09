// Tiny synth cues, no assets. One AudioContext, created lazily inside a
// gesture; the caller gates on view.active and the persisted mute, so the
// hidden display copy never speaks.

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

export type Cue =
  | 'place' // a part lands on the canvas
  | 'arm' // an output pin is armed, waiting for its target
  | 'connect' // a wire snaps in
  | 'cut' // a wire or part is removed
  | 'flip' // a switch toggles
  | 'reject' // a cycle or an illegal pin
  | 'solve' // a challenge checks out
  | 'undo'

export function cue(kind: Cue) {
  try {
    audio ??= new AudioContext()
    // Outside a gesture the context stays suspended; the scheduled notes then
    // land on the next gesture, which reads as a held chord, not an error.
    void audio.resume()
    if (kind === 'solve') {
      // Rising major arpeggio: the solved chime.
      tone(
        'triangle',
        [
          [523, 0],
          [659, 0.09],
          [784, 0.18],
          [1047, 0.27]
        ],
        0.14,
        0.32
      )
      tone(
        'sine',
        [
          [1568, 0.32],
          [2093, 0.38]
        ],
        0.06,
        0.42
      )
    } else if (kind === 'connect') {
      // A two-tick snap up into place.
      tone(
        'triangle',
        [
          [340, 0],
          [560, 0.05]
        ],
        0.09,
        0.09
      )
    } else if (kind === 'cut' || kind === 'undo') {
      // A soft drop back down.
      tone(
        'sine',
        [
          [420, 0],
          [280, 0.06]
        ],
        0.07,
        0.1
      )
    } else if (kind === 'reject') {
      // Illegal move: a flat low buzz, kept quiet.
      tone(
        'sine',
        [
          [150, 0],
          [120, 0.08]
        ],
        0.08,
        0.1
      )
    } else if (kind === 'arm') {
      tone('sine', [[660, 0]], 0.05, 0.06)
    } else if (kind === 'flip') {
      // A dry mechanical click, pitched by nothing - the same flick both ways.
      tone(
        'square',
        [
          [900, 0],
          [620, 0.02]
        ],
        0.04,
        0.05
      )
      tone('sine', [[240, 0.01]], 0.06, 0.07)
    } else {
      // 'place': a light pop.
      tone(
        'triangle',
        [
          [280, 0],
          [420, 0.04]
        ],
        0.1,
        0.1
      )
    }
  } catch {
    // No audio is fine. The circuit still works.
  }
}
