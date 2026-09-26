// Audio plumbing the UI never sees: decode/encode for the editor, peaks for
// the waveform, and the synthesized demo takes. Everything here is honest -
// demos are PCM syntheses labeled demo, and a trimmed memo is re-encoded as a
// real WAV file with a real extension.

/** Lazy, like `beep`'s: constructing one before a gesture gets it suspended. */
let ac: AudioContext | undefined
const ctx = () =>
  (ac ??= new (
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )())

/** Honest extension for a container the browser actually produced. */
export function ext(mime: string): string {
  const base = mime.split(';')[0]!.toLowerCase()
  if (base === 'audio/wav' || base === 'audio/x-wav' || base === 'audio/wave') return 'wav'
  if (base === 'audio/webm' || base === 'video/webm') return 'webm'
  if (base === 'audio/mp4' || base === 'audio/x-m4a' || base === 'audio/aac') return 'm4a'
  if (base === 'audio/ogg' || base === 'application/ogg') return 'ogg'
  if (base === 'audio/mpeg') return 'mp3'
  return 'audio'
}

export async function decode(blob: Blob): Promise<AudioBuffer> {
  return ctx().decodeAudioData(await blob.arrayBuffer())
}

/** `n` bars of RMS per bucket, mono-mixed, normalized so the loudest is 1. */
export function peaks(buf: AudioBuffer, n = 96): number[] {
  const out = new Array<number>(n).fill(0)
  const channels = buf.numberOfChannels
  const len = buf.length
  const mono = new Float32Array(len)
  for (let c = 0; c < channels; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < len; i++) mono[i]! += data[i]! / channels
  }
  const per = len / n
  let max = 0
  for (let b = 0; b < n; b++) {
    let sum = 0
    const from = Math.floor(b * per)
    const to = Math.min(len, Math.floor((b + 1) * per))
    for (let i = from; i < to; i++) sum += mono[i]! * mono[i]!
    out[b] = Math.sqrt(sum / Math.max(1, to - from))
    if (out[b]! > max) max = out[b]!
  }
  // Quiet rooms should still draw something; floor the bars at a sliver.
  return out.map((v) => Math.max(0.04, max ? v / max : 0))
}

/** PCM16 WAV: the one container every browser both writes and reads. */
export function wav(buf: AudioBuffer, fromSec = 0, toSec = buf.duration): Blob {
  const rate = buf.sampleRate
  const from = Math.max(0, Math.floor(fromSec * rate))
  const to = Math.min(buf.length, Math.ceil(toSec * rate))
  const frames = Math.max(0, to - from)
  const channels = Math.min(2, buf.numberOfChannels)
  const bytes = 44 + frames * channels * 2
  const view = new DataView(new ArrayBuffer(bytes))
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, bytes - 8, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, frames * channels * 2, true)
  let at = 44
  for (let i = from; i < to; i++)
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]!))
      view.setInt16(at, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      at += 2
    }
  return new Blob([view.buffer], { type: 'audio/wav' })
}

/** `insert` spliced over `base` at `atSec`: the iOS Replace edit. */
export function splice(base: AudioBuffer, atSec: number, insert: AudioBuffer): Blob {
  const rate = base.sampleRate
  const at = Math.max(0, Math.min(base.length, Math.floor(atSec * rate)))
  const channels = Math.min(2, base.numberOfChannels)
  const tail = Math.min(insert.length, base.length - at)
  const frames = at + tail + (base.length - at - tail)
  const out = ctx().createBuffer(channels, frames, rate)
  for (let c = 0; c < channels; c++) {
    const dst = out.getChannelData(c)
    const src = base.getChannelData(c)
    const add = insert.getChannelData(Math.min(c, insert.numberOfChannels - 1))
    dst.set(src.subarray(0, at))
    dst.set(add.subarray(0, tail), at)
    dst.set(src.subarray(at + tail), at + tail)
  }
  return wav(out)
}

/** A few seconds of synthesized audio for the demo shelf - clearly labeled. */
export function demoTake(kind: number): { blob: Blob; ms: number; peaks: number[] } {
  const rate = 22050
  const seconds = 5 + kind * 1.5
  const frames = Math.floor(seconds * rate)
  const data = new Float32Array(frames)
  // Three demo shapes so each generated take sounds different: an arpeggio, a
  // slow sweep and a pad. All sine sums with an envelope, nothing sampled.
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]
  for (let i = 0; i < frames; i++) {
    const t = i / rate
    let v = 0
    if (kind === 0) {
      const step = Math.floor(t * 4) % notes.length
      const f = notes[step]!
      const env = Math.exp(-3 * (t * 4 - Math.floor(t * 4)))
      v = Math.sin(2 * Math.PI * f * t) * env * 0.4 + Math.sin(2 * Math.PI * f * 2 * t) * env * 0.12
    } else if (kind === 1) {
      const f = 180 + (t / seconds) * 800
      v = Math.sin(2 * Math.PI * f * t) * 0.3 * Math.min(1, t * 4) * Math.min(1, (seconds - t) * 2)
    } else {
      for (const f of [notes[0]!, notes[2]!, notes[4]!])
        v += (Math.sin(2 * Math.PI * f * t) / 3) * (0.25 + 0.1 * Math.sin(2 * Math.PI * 0.6 * t))
      v *= Math.min(1, t * 3) * Math.min(1, (seconds - t) * 2)
    }
    data[i] = v
  }
  const buf = ctx().createBuffer(1, frames, rate)
  buf.copyToChannel(data, 0)
  return { blob: wav(buf), ms: Math.round(seconds * 1000), peaks: peaks(buf) }
}

/** Tap-to-download: the only honest export a web page has. */
export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
