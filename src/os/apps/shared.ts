// Helpers more than one app reaches for: generated artwork, deterministic
// charts, a WebAudio beep, and the weather feed the home widget also shows.

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

// ---------- Weather (shared with the home-screen widget) ----------

export const forecast = (async () => {
  const r = await fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5'
  )
  const j = await r.json()
  return {
    t: Math.round(j.current.temperature_2m),
    code: j.current.weather_code as number,
    days: (j.daily.time as string[]).map((d, i) => ({
      d,
      hi: Math.round(j.daily.temperature_2m_max[i]),
      lo: Math.round(j.daily.temperature_2m_min[i]),
      code: j.daily.weather_code[i] as number
    }))
  }
})().catch(() => ({
  t: 12,
  code: 2,
  days: [0, 1, 2, 3, 4].map((i) => ({
    d: new Date(Date.now() + i * 864e5).toISOString(),
    hi: 18 + i,
    lo: 11,
    code: [0, 2, 3, 61, 0][i]!
  }))
}))

export const wx = (c: number) =>
  c === 0
    ? ['☀️', 'Clear']
    : c < 4
      ? ['⛅️', 'Partly Cloudy']
      : c < 50
        ? ['🌫️', 'Fog']
        : c < 70
          ? ['🌧️', 'Rain']
          : c < 80
            ? ['❄️', 'Snow']
            : c < 95
              ? ['🌦️', 'Showers']
              : ['⛈️', 'Thunderstorms']
export const day = (iso: string) => new Date(iso).toLocaleDateString('en', { weekday: 'short' })
