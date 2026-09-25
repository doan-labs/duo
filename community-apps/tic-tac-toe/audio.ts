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
  osc.stop(t + notes.at(-1)![1] + sustain)
  const end = notes.at(-1)![1] + sustain
  gain.gain.setValueAtTime(level, t)
  gain.gain.setValueAtTime(level, Math.max(t, t + end - 0.12))
  gain.gain.exponentialRampToValueAtTime(0.001, t + end)
}

export function cue(kind: 'place' | 'win' | 'draw') {
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
    } else if (kind === 'draw') {
      // Two descending notes: nobody won, gently.
      tone(
        'triangle',
        [
          [392, 0],
          [311, 0.16]
        ],
        0.14,
        0.3
      )
    } else {
      // A soft woodblock tick under each placement.
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
