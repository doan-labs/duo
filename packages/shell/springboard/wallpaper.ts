// The wallpaper, one for the whole device: both displays wear it and the bake
// in screen.ts paints it, so it lives here rather than in either SpringBoard,
// and in localStorage so the next visit finds it. Apple's dune is the default.
// The alternatives are gradients written as SVG data URLs: one string is a CSS
// background and decodes into the canvas bake alike, with no asset to ship.

import { WALLPAPER } from '@doan-labs/duo-uikit/icons/index.ts'
import { wallpaper as paint } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import { useSyncExternalStore } from 'react'

const KEY = 'os.wallpaper'

/**
 * A field of one colour with soft lights in it. Positions and radii are fractions
 * of a 16:10 sheet, the dune's proportions, so both displays crop it the same way.
 */
function paper(ground: string, ...lights: [x: number, y: number, r: number, colour: string][]) {
  const defs = lights
    .map(
      ([x, y, r, c], i) =>
        `<radialGradient id="l${i}" cx="${x}" cy="${y}" r="${r}"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
    )
    .join('')
  const fills = lights.map((_, i) => `<rect width="1600" height="1000" fill="url(#l${i})"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="${ground}"/>${defs}${fills}</svg>`
  // Parentheses and quotes survive encodeURIComponent and would end a CSS url() early.
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/[()']/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`
}

/** What the sheet offers: Apple's dune, then five of ours. */
export const WALLPAPERS = [
  WALLPAPER,
  paper(
    paint.duskGround,
    [0.5, 1.05, 0.62, paint.duskEmber],
    [0.25, 0.15, 0.5, paint.duskViolet],
    [0.9, 0.4, 0.42, paint.duskRose]
  ),
  paper(
    paint.tideGround,
    [0.3, -0.1, 0.72, paint.tideCrest],
    [0.92, 0.95, 0.5, paint.tideDeep],
    [0.62, 0.52, 0.28, paint.tideFoam]
  ),
  paper(
    paint.emberGround,
    [0.18, 0.95, 0.62, paint.emberCore],
    [0.82, 0.08, 0.5, paint.emberAmber],
    [0.55, 0.55, 0.3, paint.emberGlow]
  ),
  paper(
    paint.mossGround,
    [0.12, 0.12, 0.55, paint.mossLeaf],
    [0.9, 0.9, 0.6, paint.mossLime],
    [0.58, 0.32, 0.3, paint.mossDeep]
  ),
  paper(paint.slateGround, [0.35, 0.28, 0.6, paint.slateHaze], [0.92, 1.02, 0.5, paint.slateShade])
]

const stored = (() => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
})()
// A Camera shot is a blob: URL and does not outlive its page; back to the dune then.
let url = stored && !stored.startsWith('blob:') ? stored : WALLPAPER
const subs = new Set<() => void>()

/** The wallpaper's URL, for code with no render to hook: main.ts decodes it for the bake. */
export const wallpaper = () => url

/** Hangs a new one on both displays and remembers it. */
export function setWallpaper(next: string) {
  url = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Private mode or quota (a picture too big to keep): it still hangs until the page reloads.
  }
  for (const f of subs) f()
}

export const subscribeWallpaper = (f: () => void) => {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

/** Re-renders the caller when the wallpaper changes. */
export const useWallpaper = () => useSyncExternalStore(subscribeWallpaper, wallpaper)
