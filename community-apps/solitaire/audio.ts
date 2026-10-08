// Tiny synth cues, no assets. Card sounds are short filtered noise plus a soft
// body tone; melodic cues reuse the block-drop tone recipe. One AudioContext,
// resumed inside gestures - a cue scheduled while suspended lands on the next
// gesture, which reads as intentional, not broken.
let audio: AudioContext | undefined
let noiseBuffer: AudioBuffer | undefined

const ctx = () => (audio ??= new AudioContext())

function tone(type: OscillatorType, notes: [number, number][], level: number, sustain: number) {
  const ac = ctx()
  const t = ac.currentTime
  const gain = ac.createGain()
  gain.connect(ac.destination)
  const osc = ac.createOscillator()
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

// One paper snap: a burst of noise through a bandpass that opens then shuts,
// the texture of a card sliding off a stack.
function snap(at: number, level: number, duration = 0.07, frequency = 2600) {
  const ac = ctx()
  noiseBuffer ??= (() => {
    const buffer = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  })()
  const t = ac.currentTime + at
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(frequency, t)
  filter.frequency.exponentialRampToValueAtTime(frequency * 0.6, t + duration)
  filter.Q.value = 1.1
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(level, t + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
  src.stop(t + duration + 0.02)
}

function thud(at: number, level: number) {
  const ac = ctx()
  const t = ac.currentTime + at
  const gain = ac.createGain()
  gain.connect(ac.destination)
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.connect(gain)
  osc.frequency.setValueAtTime(170, t)
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.07)
  osc.start(t)
  osc.stop(t + 0.11)
  gain.gain.setValueAtTime(level, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
}

export type Cue = 'deal' | 'draw' | 'pickup' | 'place' | 'reveal' | 'redeal' | 'foundation' | 'undo' | 'reject' | 'win'

export function cue(kind: Cue) {
  try {
    void ctx().resume()
    if (kind === 'deal') {
      // A fresh shuffle: three riffles and a settle.
      snap(0, 0.1, 0.09, 2200)
      snap(0.07, 0.09, 0.08, 2800)
      snap(0.15, 0.11, 0.1, 2000)
      thud(0.22, 0.07)
    } else if (kind === 'draw') {
      snap(0, 0.09)
    } else if (kind === 'pickup') {
      snap(0, 0.05, 0.05, 3400)
      tone('sine', [[520, 0]], 0.03, 0.05)
    } else if (kind === 'place') {
      snap(0, 0.07, 0.06, 2400)
      thud(0.01, 0.09)
    } else if (kind === 'reveal') {
      snap(0, 0.08, 0.07, 3000)
      tone('triangle', [[660, 0.03]], 0.05, 0.12)
    } else if (kind === 'redeal') {
      snap(0, 0.09, 0.1, 1800)
      snap(0.09, 0.08, 0.09, 2400)
      thud(0.16, 0.06)
    } else if (kind === 'foundation') {
      // Settling home: a soft two-note ping under the snap.
      snap(0, 0.06, 0.05, 2800)
      tone('triangle', [[784, 0]], 0.07, 0.18)
      tone('sine', [[1175, 0.07]], 0.05, 0.2)
    } else if (kind === 'undo') {
      tone('triangle', [[392, 0]], 0.05, 0.07)
      snap(0.01, 0.05, 0.05, 3200)
    } else if (kind === 'reject') {
      // A forbidden move lands nowhere: low, dull, over fast.
      tone('sine', [[130, 0]], 0.09, 0.09)
    } else if (kind === 'win') {
      tone(
        'triangle',
        [
          [523, 0],
          [659, 0.08],
          [784, 0.16],
          [1047, 0.24],
          [1319, 0.32]
        ],
        0.14,
        0.42
      )
      tone(
        'sine',
        [
          [2093, 0.4],
          [2637, 0.46]
        ],
        0.06,
        0.5
      )
      snap(0.06, 0.04, 0.12, 5200)
    }
  } catch {
    // Audio is decorative: a blocked or missing AudioContext stays silent.
  }
}
