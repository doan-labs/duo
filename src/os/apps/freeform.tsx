import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { colors } from '../uikit/tokens.stylex.ts'
import { beep } from './shared.ts'

export const INKS = ['#1c1c1e', '#ff3b30', '#ff9f0a', '#34c759', '#0a7cff', '#af52de']

const ctx = (c: HTMLCanvasElement) => c.getContext('2d')!

export const Freeform = (_: { os: Os }) => {
  const cv = useRef<HTMLCanvasElement>(null)
  const [ink, setInk] = useState(INKS[4]!)
  const wide = useRef(4)
  const down = useRef(false)
  const last = useRef<[number, number] | null>(null)
  const strokes = useRef<ImageData[]>([])

  useEffect(() => {
    const c = cv.current!
    const size = () => {
      const { clientWidth: w, clientHeight: ht } = c
      if (!w || !ht) return
      const g = ctx(c)
      const keep = c.width ? g.getImageData(0, 0, c.width, c.height) : null
      c.width = w * devicePixelRatio
      c.height = ht * devicePixelRatio
      g.scale(devicePixelRatio, devicePixelRatio)
      g.lineCap = g.lineJoin = 'round'
      if (keep) g.putImageData(keep, 0, 0)
    }
    const ro = new ResizeObserver(size)
    const raf = requestAnimationFrame(() => ro.observe(c))
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const pos = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const b = e.currentTarget.getBoundingClientRect()
    // offsetX/offsetY are in the element's own box, which is what we want: they
    // survive the CSS3D transform that getBoundingClientRect does not.
    return [e.nativeEvent.offsetX || e.clientX - b.left, e.nativeEvent.offsetY || e.clientY - b.top]
  }
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget
    down.current = true
    c.setPointerCapture(e.pointerId)
    if (c.width) strokes.current.push(ctx(c).getImageData(0, 0, c.width, c.height))
    if (strokes.current.length > 12) strokes.current.shift()
    last.current = pos(e)
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const l = last.current
    if (!down.current || !l) return
    const p = pos(e)
    const g = ctx(e.currentTarget)
    g.strokeStyle = ink
    g.lineWidth = wide.current
    g.beginPath()
    g.moveTo(l[0], l[1])
    // Quadratic through the midpoint, so a fast drag is a curve and not a chain
    // of visible straight segments.
    g.quadraticCurveTo(l[0], l[1], (l[0] + p[0]) / 2, (l[1] + p[1]) / 2)
    g.stroke()
    last.current = p
  }
  const onUp = () => {
    down.current = false
    last.current = null
  }

  return (
    <div {...stylex.props(shared.body, styles.flush)}>
      <canvas
        ref={cv}
        {...stylex.props(styles.pad)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      />
      <div {...stylex.props(styles.tools)}>
        {INKS.map((c) => (
          <button
            type="button"
            key={c}
            {...stylex.props(styles.tool, styles.tint(c), c === ink && styles.on)}
            onClick={() => setInk(c)}
          />
        ))}
        <button
          type="button"
          {...stylex.props(styles.tool, styles.glyph, styles.width)}
          onClick={() => {
            wide.current = wide.current === 4 ? 12 : 4
            beep([900], 0.04, 0.04)
          }}
        >
          ⌀
        </button>
        <button
          type="button"
          {...stylex.props(styles.tool, styles.glyph, styles.undo)}
          onClick={() => {
            const s = strokes.current.pop()
            if (s) ctx(cv.current!).putImageData(s, 0, 0)
          }}
        >
          ↶
        </button>
        <button
          type="button"
          {...stylex.props(styles.tool, styles.glyph, styles.clear)}
          onClick={() => {
            const c = cv.current!
            ctx(c).clearRect(0, 0, c.width, c.height)
            strokes.current.length = 0
          }}
        >
          <Sym name="close" size={12} />
        </button>
      </div>
    </div>
  )
}

const styles = stylex.create({
  flush: { paddingBottom: 0 },
  // width/height are not optional: a canvas is a replaced element, and inset:0
  // leaves a replaced box at its intrinsic 300x150 instead of stretching.
  pad: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    backgroundColor: colors.white,
    touchAction: 'none',
    cursor: 'crosshair'
  },
  tools: {
    position: 'absolute',
    left: '50%',
    bottom: 18,
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 9,
    paddingBlock: 9,
    paddingInline: 13,
    borderRadius: 24,
    backgroundColor: 'rgba(250,250,252,.9)',
    boxShadow: '0 8px 22px rgba(0,0,0,.2)',
    zIndex: 3,
    backdropFilter: 'blur(14px)'
  },
  tool: {
    width: 26,
    height: 26,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: '50%',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: '0 1px 4px rgba(0,0,0,.3)',
    transitionProperty: 'transform',
    transitionDuration: '.18s'
  },
  tint: (c: string) => ({ backgroundColor: c }),
  on: { transform: 'scale(1.24)' },
  glyph: { display: 'grid', placeItems: 'center', color: colors.black },
  width: { backgroundColor: colors.white, fontSize: 13, fontWeight: 700 },
  undo: { backgroundColor: colors.trackLight, fontSize: 14 },
  clear: { backgroundColor: colors.red, color: colors.white }
})
