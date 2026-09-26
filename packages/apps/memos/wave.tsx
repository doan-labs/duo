// The waveform, one canvas for three jobs: live bars while recording, a static
// scrubber on the detail page, and a trim surface on the edit page. Canvas
// needs resolved colours - tokens are var(--…) strings a 2d context cannot
// read - so they are resolved once per element off getComputedStyle.

import { app, appAppearance, colors, radius } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'

const resolved = new Map<string, string>()
function ink(el: Element, token: string): string {
  let out = resolved.get(token)
  if (!out) {
    const name = /^var\((--[\w-]+)\)$/.exec(token)?.[1]
    out = (name && getComputedStyle(el).getPropertyValue(name).trim()) || token
    resolved.set(token, out)
  }
  return out
}

const BARS = 96

export type WaveProps = {
  /** Stored peaks, or live levels while recording. */
  peaks: readonly number[]
  /** Live recording bars paint red and scroll; static bars paint the theme. */
  live?: boolean
  /** Playhead fraction for the scrubber, 0..1. */
  pos?: number
  /** Trim range [from, to] as fractions; outside dims, edges drag. */
  trim?: readonly [number, number]
  onTrim?: (edge: 0 | 1, value: number) => void
  /** Scrubbing callback for the detail page. */
  onScrub?: (pos: number) => void
  height?: number
}

export function Wave({ peaks, live, pos, trim, onTrim, onScrub, height = 96 }: WaveProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const drag = useRef<null | 0 | 1 | 'scrub'>(null)

  // Draws on every render - levels and pos change faster than effects batch.
  useEffect(() => {
    const c = cv.current
    const box = wrap.current
    if (!c || !box) return
    const g = c.getContext('2d')
    if (!g) return
    const draw = () => {
      const w = box.clientWidth
      const h = box.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr
        c.height = h * dpr
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const base = ink(c, live ? colors.redDark : app.label2)
      const played = ink(c, app.fg)
      const dim = ink(c, appAppearance.memosFill)
      const count = live ? Math.floor(w / 3) : BARS
      const data = live ? peaks.slice(-count) : peaks
      for (let i = 0; i < count; i++) {
        const v = data[i] ?? 0.04
        const bh = Math.max(2, v * h * 0.9)
        const x = live ? i * 3 : (i / count) * w
        const bw = live ? 2 : Math.max(1, w / count - 1.5)
        const mid = (i + 0.5) / count
        let fill = base
        if (!live) {
          if (trim && (mid < trim[0] || mid > trim[1])) fill = dim
          else if (pos != null && mid <= pos) fill = played
        }
        g.fillStyle = fill
        g.fillRect(x, (h - bh) / 2, bw, bh)
      }
      if (pos != null && !live) {
        g.fillStyle = played
        g.fillRect(pos * w - 1, 0, 2, h)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(box)
    return () => ro.disconnect()
  })

  const frac = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
  }

  return (
    <div
      ref={wrap}
      {...stylex.props(styles.wrap, styles.h(height))}
      onPointerDown={(e) => {
        if (onTrim && trim) {
          const f = frac(e)
          const edge = Math.abs(f - trim[0]) < Math.abs(f - trim[1]) ? 0 : 1
          drag.current = edge
          onTrim(edge, f)
        } else if (onScrub) {
          drag.current = 'scrub'
          onScrub(frac(e))
        } else return
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (d === null) return
        if (d === 'scrub') onScrub?.(frac(e))
        else onTrim?.(d, frac(e))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
    >
      <canvas ref={cv} {...stylex.props(styles.canvas)} />
      {trim?.map((at, edge) => (
        <div
          key={edge === 0 ? 'start' : 'end'}
          {...stylex.props(styles.handle, styles.handleAt(at))}
          onPointerDown={(e) => {
            e.stopPropagation()
            drag.current = edge as 0 | 1
            wrap.current!.setPointerCapture(e.pointerId)
          }}
        >
          <div {...stylex.props(styles.grip)} />
        </div>
      ))}
    </div>
  )
}

const styles = stylex.create({
  wrap: { position: 'relative', width: '100%', touchAction: 'none', cursor: 'pointer' },
  h: (height: number) => ({ height }),
  canvas: { width: '100%', height: '100%', display: 'block' },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    marginLeft: -9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'ew-resize',
    touchAction: 'none'
  },
  handleAt: (at: number) => ({ left: `${at * 100}%` }),
  grip: { width: 4, height: '42%', borderRadius: radius.xs, backgroundColor: colors.yellow }
})
