// Tiny synth cues, no assets. One AudioContext, created and resumed inside
// gestures; a cue that lands while suspended is skipped rather than queued,
// because a snap sound arriving late reads as a bug, not a held chord.
let audio: AudioContext | undefined
let muted = false

export function setMuted(value: boolean) {
  muted = value
}

export function audioReady(): boolean {
  return !!audio && audio.state === 'running'
}

/** Called from inside a user gesture so the context is allowed to run. */
export function unlock() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    // No audio device or policy - the game stays silent and playable.
  }
}

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

export type Cue = 'lift' | 'drop' | 'snap' | 'done'

export function cue(kind: Cue) {
  if (muted) return
  try {
    if (audio?.state !== 'running') return
    if (kind === 'lift') {
      // A soft tick as the piece leaves the tray.
      tone(
        'sine',
        [
          [620, 0],
          [740, 0.04]
        ],
        0.05,
        0.07
      )
    } else if (kind === 'drop') {
      // The piece lands on the felt without locking: a muted tap.
      tone(
        'sine',
        [
          [240, 0],
          [170, 0.05]
        ],
        0.09,
        0.1
      )
    } else if (kind === 'snap') {
      // The satisfying click of a piece seating into its slot.
      tone('sine', [[300, 0]], 0.14, 0.08)
      tone(
        'triangle',
        [
          [880, 0.015],
          [1180, 0.05]
        ],
        0.07,
        0.1
      )
    } else {
      // Completion: a short rising chime with a shimmer on top.
      tone(
        'triangle',
        [
          [523, 0],
          [659, 0.09],
          [784, 0.18],
          [1047, 0.27],
          [1319, 0.36]
        ],
        0.14,
        0.5
      )
      tone(
        'sine',
        [
          [2093, 0.42],
          [2637, 0.5]
        ],
        0.05,
        0.5
      )
    }
  } catch {
    // Audio is optional; never let it break a move.
  }
}
