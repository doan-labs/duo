// What the shutter keeps. The preview wears the look, the exposure and the
// bokeh as CSS; a still repaints the video through the same stack on a canvas,
// so the file Photos shows is the image you framed. Everything runs on plain
// 2D canvas filters, so a look that shows shows up in the shot too.

export type Aspect = '4:3' | '16:9' | '1:1'

const RATIO: Record<Aspect, number> = { '4:3': 4 / 3, '16:9': 16 / 9, '1:1': 1 }

/**
 * The centre crop a still takes: zoom first, then the aspect inside it.
 * `upright` flips the ratio for the cover's portrait framing. A sub-1 zoom
 * plays the ultrawide fake and keeps the whole frame - a sensor cannot crop
 * wider than itself, which is what the preview shows at 0.5x too.
 */
export function crop(
  w: number,
  h: number,
  aspect: Aspect,
  z: number,
  upright = false
): [number, number, number, number] {
  const cz = Math.max(z, 1)
  let sw = w / cz
  let sh = h / cz
  const r = upright ? 1 / RATIO[aspect] : RATIO[aspect]
  if (sw / sh > r) sw = sh * r
  else sh = sw / r
  return [(w - sw) / 2, (h - sh) / 2, sw, sh]
}

/**
 * Apple's filter set, mapped to canvas filters: Vivid through Silvertone are
 * the nine iOS ships; Original is the no-op tile the tray still shows first.
 */
export const LOOKS: { name: string; css: string }[] = [
  { name: 'Original', css: '' },
  { name: 'Vivid', css: 'saturate(1.5) contrast(1.06)' },
  { name: 'Vivid Warm', css: 'saturate(1.45) sepia(.28) contrast(1.04)' },
  { name: 'Vivid Cool', css: 'saturate(1.4) hue-rotate(-10deg) contrast(1.06)' },
  { name: 'Dramatic', css: 'contrast(1.28) saturate(1.15) brightness(.94)' },
  { name: 'Dramatic Warm', css: 'contrast(1.26) sepia(.32) saturate(1.1) brightness(.95)' },
  { name: 'Dramatic Cool', css: 'contrast(1.28) hue-rotate(14deg) saturate(.92) brightness(.95)' },
  { name: 'Mono', css: 'grayscale(1)' },
  { name: 'Silvertone', css: 'grayscale(1) contrast(1.22) brightness(1.1)' }
]

/** Exposure bias in stops, as a brightness() term for preview and capture alike. */
export const evCss = (ev: number) => (ev ? `brightness(${(2 ** (ev * 0.6)).toFixed(3)})` : '')

/** The extra light a Night exposure pretends to gather, per second held. */
export const nightCss = (secs: number) => (secs ? `brightness(${1 + secs * 0.55}) saturate(1.05)` : '')

/** The portrait kit for an f-stop: how soft the field goes and how much stays sharp. */
export const bokeh = (f: number) => {
  // f1.4..f16 on a log scale: f1.4 blurs hard inside a tight subject ellipse,
  // f16 leaves a gentle blur behind most of the frame.
  const t = Math.log(f) / Math.log(16)
  return { blur: 13.5 - 12.5 * t, rx: 30 + 20 * t, ry: 32 + 22 * t }
}

export type StillOpts = {
  aspect: Aspect
  zoom: number
  /** The LOOKS filter string, already resolved. */
  look: string
  /** Exposure bias in stops. */
  ev: number
  /** Night seconds the shot pretends to expose for. */
  night: number
  /** Portrait f-stop, or 0 for a plain still. */
  fstop: number
  /** Held upright on the cover: the crop goes portrait like the frame does. */
  upright?: boolean
}

/** One frame of the feed as a JPEG data URL, with the whole effect stack baked in. */
export function still(video: HTMLVideoElement, o: StillOpts): string | undefined {
  if (!video.videoWidth) return
  const [sx, sy, sw, sh] = crop(video.videoWidth, video.videoHeight, o.aspect, o.zoom, o.upright)
  const c = document.createElement('canvas')
  c.width = Math.round(sw)
  c.height = Math.round(sh)
  const ctx = c.getContext('2d')!
  const css = [o.look, evCss(o.ev), nightCss(o.night)].filter(Boolean).join(' ') || 'none'
  if (o.fstop) {
    const { blur, rx, ry } = bokeh(o.fstop)
    ctx.filter = `blur(${blur.toFixed(1)}px) ${css}`
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.save()
    ctx.filter = css
    ctx.beginPath()
    ctx.ellipse(sw / 2, sh * 0.44, (sw * rx) / 100, (sh * ry) / 100, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.restore()
  } else {
    ctx.filter = css
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
  }
  return c.toDataURL('image/jpeg', 0.85)
}

/** Mean luminance of the current frame, 0..1: how Night mode knows it is dark. */
export function luminance(video: HTMLVideoElement): number {
  if (!video.videoWidth) return 1
  const c = document.createElement('canvas')
  c.width = c.height = 8
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(video, 0, 0, 8, 8)
  const d = ctx.getImageData(0, 0, 8, 8).data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) sum += d[i]! * 0.3 + d[i + 1]! * 0.6 + d[i + 2]! * 0.1
  return sum / (d.length / 4) / 255
}

export type Pano = {
  /** Appends the feed's centre slice; false once the strip is full. */
  step: () => boolean
  progress: () => number
  /** The stitched strip as a JPEG data URL, valid once stepping is done. */
  finish: () => string
}

/**
 * A real panorama: every step copies a thin slice from the middle of the live
 * frame onto the strip, so panning the camera sweeps a wider image the way iOS
 * pans one. Holding still repeats the same column, like a real pano held still.
 */
export function pano(video: HTMLVideoElement, zoom: number): Pano {
  const [, sy, , sh0] = crop(video.videoWidth, video.videoHeight, '4:3', zoom)
  const scale = Math.min(1, 1080 / sh0)
  const h = Math.max(1, Math.round(sh0 * scale))
  const slice = Math.max(4, Math.round(video.videoWidth / 160))
  const w = slice * 320
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  let x = 0
  return {
    step() {
      if (x >= w || !video.videoWidth) return false
      const s = Math.min(slice, w - x)
      ctx.drawImage(video, video.videoWidth / 2 - slice / 2, sy, slice, sh0, x, 0, s * scale, h)
      // The painted column is s*scale wide; advancing by s alone left blank
      // stripes whenever the feed was taller than the strip's cap.
      x += s * scale
      return x < w
    },
    progress: () => x / w,
    finish: () => c.toDataURL('image/jpeg', 0.85)
  }
}
