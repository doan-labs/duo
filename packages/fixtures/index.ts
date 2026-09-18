// Invented data and feedback for the baked apps: generated artwork, deterministic
// charts, clock formatting and a WebAudio beep. None of it renders anything, which
// is why it is not in the UI kit.

/** Deterministic hue from a string, so generated artwork is stable per title. */
export const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
export const art = (s: string, l = 54) =>
  `linear-gradient(150deg,hsl(${hue(s)} 64% ${l}%),hsl(${(hue(s) + 52) % 360} 58% ${Math.max(18, l - 26)}%))`

/** Deterministic random walk, so a chart is the same on every visit. */
export function walk(seed: string, n: number) {
  let s = hue(seed) * 7919 + 13
  // biome-ignore lint/suspicious/noAssignInExpressions: an LCG advances its seed as it reads it
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const out = [50]
  for (let i = 1; i < n; i++) out.push(Math.max(5, Math.min(95, out[i - 1]! + (rnd() - 0.47) * 11)))
  return out
}
/** SVG path through `pts` (0..100) across a w×ht box. */
export const poly = (pts: number[], w: number, ht: number) =>
  pts
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * w).toFixed(1)} ${((1 - v / 100) * ht).toFixed(1)}`)
    .join('')

export const mmss = (s: number) => `${(s / 60) | 0}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** A WebAudio beep. Lazy context: constructing one before a gesture gets it suspended. */
let ac: AudioContext | undefined
export function beep(freqs: number[], dur = 0.14, vol = 0.11) {
  ac ??= new AudioContext()
  void ac.resume()
  const g = ac.createGain()
  g.gain.value = 0.0001
  g.connect(ac.destination)
  g.gain.setTargetAtTime(vol, ac.currentTime, 0.004)
  g.gain.setTargetAtTime(0.0001, ac.currentTime + dur, 0.03)
  for (const f of freqs) {
    const o = ac.createOscillator()
    o.frequency.value = f
    o.connect(g)
    o.start()
    o.stop(ac.currentTime + dur + 0.2)
  }
}
