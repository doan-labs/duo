// Synthesized UI cues: one shared AudioContext, created lazily inside the
// first user gesture so autoplay policy is satisfied. Each cue is a short,
// quiet two-note blip; every call is wrapped so a blocked or missing
// AudioContext never surfaces an error to the user.

export type Cue = 'check' | 'uncheck' | 'save' | 'delete' | 'undo' | 'move' | 'error'

let audio: AudioContext | undefined
let muted = false

/** Called with the persisted preference on boot and whenever it changes. */
export const setMuted = (value: boolean) => {
  muted = value
}

function ensure(): AudioContext | undefined {
  if (audio) return audio
  const Ctor =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return undefined
  audio = new Ctor()
  return audio
}

type Note = [freq: number, at: number, sustain: number]

function tone(notes: Note[], level: number, wave: OscillatorType) {
  const ctx = ensure()
  if (!ctx) return
  void ctx.resume().catch(() => {})
  const t0 = ctx.currentTime + 0.01
  for (const [freq, at, sustain] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    const start = t0 + at
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(level, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + sustain)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + sustain + 0.02)
  }
}

const CUES: Record<Cue, () => void> = {
  // Packing tick: short bright blip; uncheck sits a third lower.
  check: () =>
    tone(
      [
        [740, 0, 0.07],
        [988, 0.05, 0.09]
      ],
      0.045,
      'sine'
    ),
  uncheck: () =>
    tone(
      [
        [560, 0, 0.07],
        [440, 0.05, 0.08]
      ],
      0.04,
      'sine'
    ),
  // Sheet save: a small two-note confirm.
  save: () =>
    tone(
      [
        [523, 0, 0.08],
        [784, 0.07, 0.12]
      ],
      0.05,
      'triangle'
    ),
  // Destructive confirm: a low, heavier thud.
  delete: () =>
    tone(
      [
        [220, 0, 0.1],
        [147, 0.06, 0.14]
      ],
      0.055,
      'sine'
    ),
  undo: () =>
    tone(
      [
        [392, 0, 0.08],
        [587, 0.06, 0.1]
      ],
      0.045,
      'triangle'
    ),
  // Reorder tick: very quiet, it fires per move.
  move: () => tone([[660, 0, 0.05]], 0.03, 'sine'),
  // Failed validation: low pair, clearly not an error buzzer.
  error: () =>
    tone(
      [
        [311, 0, 0.09],
        [262, 0.08, 0.12]
      ],
      0.05,
      'triangle'
    )
}

export function cue(kind: Cue) {
  if (muted) return
  try {
    CUES[kind]()
  } catch {
    // Audio hardware unavailable or still blocked: cues are decoration.
  }
}
