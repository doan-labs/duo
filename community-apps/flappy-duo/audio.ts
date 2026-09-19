// ---- audio: tiny synth cues, no assets ----
let audio: AudioContext | undefined
export function cue(kind: 'flap' | 'score' | 'crash' | 'pay') {
  try {
    audio ??= new AudioContext()
    const t = audio.currentTime
    const gain = audio.createGain()
    gain.connect(audio.destination)
    if (kind === 'crash') {
      const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.35), audio.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
      const src = audio.createBufferSource()
      src.buffer = buffer
      const filter = audio.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 900
      src.connect(filter).connect(gain)
      gain.gain.setValueAtTime(0.5, t)
      src.start(t)
      return
    }
    const osc = audio.createOscillator()
    osc.type = kind === 'flap' ? 'triangle' : 'sine'
    osc.connect(gain)
    if (kind === 'flap') {
      osc.frequency.setValueAtTime(520, t)
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.08)
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
      osc.start(t)
      osc.stop(t + 0.1)
    } else if (kind === 'pay') {
      // the two-note "paid" chime
      osc.frequency.setValueAtTime(740, t)
      osc.frequency.setValueAtTime(988, t + 0.12)
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.setValueAtTime(0.2, t + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.start(t)
      osc.stop(t + 0.5)
    } else {
      osc.frequency.setValueAtTime(880, t)
      osc.frequency.setValueAtTime(1320, t + 0.07)
      gain.gain.setValueAtTime(0.16, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  } catch {
    // No audio is fine. The roasts still work.
  }
}
