// ---- audio: tiny synth cues, no assets ----
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

export type Cue = 'place' | 'rotate' | 'reject' | 'fire' | 'miss' | 'hit' | 'sunk' | 'win' | 'lose'

export function cue(kind: Cue) {
  try {
    audio ??= new AudioContext()
    // Outside a gesture the context stays suspended; the scheduled notes then
    // land on the next gesture, which reads as a held chord, not an error.
    void audio.resume()
    if (kind === 'win') {
      // Rising major arpeggio with a shimmer on top: the payoff jingle.
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
      // Your hulls going down: a three-note descent into the deep.
      tone(
        'triangle',
        [
          [330, 0],
          [262, 0.16],
          [196, 0.34]
        ],
        0.15,
        0.5
      )
    } else if (kind === 'sunk') {
      // A klaxon pair sagging to a low groan for a ship lost.
      tone(
        'square',
        [
          [466, 0],
          [466, 0.14]
        ],
        0.05,
        0.1
      )
      tone(
        'triangle',
        [
          [311, 0.24],
          [233, 0.38]
        ],
        0.14,
        0.36
      )
    } else if (kind === 'hit') {
      // Impact: a low thud with a knock of metal under it.
      tone('triangle', [[96, 0]], 0.2, 0.22)
      tone('sine', [[62, 0.02]], 0.16, 0.3)
    } else if (kind === 'miss') {
      // Splash: a quick slide down the scale reads as falling water.
      tone(
        'sine',
        [
          [520, 0],
          [340, 0.08],
          [210, 0.16]
        ],
        0.08,
        0.2
      )
    } else if (kind === 'fire') {
      // The shot leaving the rail: a short rising blip.
      tone(
        'triangle',
        [
          [300, 0],
          [520, 0.05],
          [740, 0.1]
        ],
        0.07,
        0.1
      )
    } else if (kind === 'reject') {
      // Illegal berth: a flat low buzz, kept quiet.
      tone(
        'sine',
        [
          [140, 0],
          [110, 0.08]
        ],
        0.09,
        0.1
      )
    } else if (kind === 'rotate') {
      // Bearing change: one dry click.
      tone('sine', [[620, 0]], 0.06, 0.05)
    } else {
      // A hull settling into the water: soft low thunk.
      tone(
        'sine',
        [
          [170, 0],
          [120, 0.05]
        ],
        0.12,
        0.12
      )
    }
  } catch {
    // No audio is fine. The boards still work.
  }
}
