// The ink canvas over Math Notes: pointer strokes draw ink; once the pen
// lifts and pauses the recognizer turns them into a line of math text. A wide
// flat stroke under stacked digits is vertical arithmetic (recognize.ts).
// `undo` drops the last stroke, the tick recognizes now, `x` abandons the pad.

import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { recognize, type Stroke } from './recognize.ts'
import { styles } from './styles.ts'
import { resolveColor } from './theme.ts'

const IDLE_MS = 750

export const Ink = ({ onText, onClose }: { onText: (t: string) => void; onClose: () => void }) => {
  const wrap = useRef<HTMLDivElement | null>(null)
  const cv = useRef<HTMLCanvasElement | null>(null)
  const strokes = useRef<Stroke[]>([])
  const live = useRef<Stroke | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const down = useRef(false)

  const redraw = () => {
    const c = cv.current
    const w = wrap.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || !w) return
    const dpr = window.devicePixelRatio || 1
    if (c.width !== w.clientWidth * dpr || c.height !== w.clientHeight * dpr) {
      c.width = w.clientWidth * dpr
      c.height = w.clientHeight * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w.clientWidth, w.clientHeight)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = resolveColor(w, colors.white) || 'white'
    for (const s of [...strokes.current, ...(live.current ? [live.current] : [])]) {
      if (s.length === 0) continue
      ctx.beginPath()
      ctx.moveTo(s[0]!.x, s[0]!.y)
      for (const p of s.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  }

  const finish = () => {
    const text = recognize(strokes.current)
    strokes.current = []
    redraw()
    if (text) onText(text)
  }
  const poke = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(finish, IDLE_MS)
  }
  const pos = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  return (
    <div ref={wrap} {...stylex.props(styles.inkWrap)}>
      <div {...stylex.props(styles.inkGhost)}>Write here</div>
      <canvas
        ref={cv}
        {...stylex.props(styles.inkCanvas)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          down.current = true
          live.current = [pos(e)]
          redraw()
        }}
        onPointerMove={(e) => {
          if (!down.current || !live.current) return
          live.current.push(pos(e))
          redraw()
        }}
        onPointerUp={() => {
          down.current = false
          if (live.current?.length) strokes.current = [...strokes.current, live.current]
          live.current = null
          redraw()
          if (strokes.current.length) poke()
        }}
        onPointerCancel={() => {
          down.current = false
          live.current = null
          redraw()
        }}
      />
      <div {...stylex.props(styles.inkBar)}>
        <button
          type="button"
          {...stylex.props(styles.tool)}
          aria-label="Undo stroke"
          onClick={() => {
            strokes.current = strokes.current.slice(0, -1)
            redraw()
          }}
        >
          <Sym name="undo" size={15} />
        </button>
        <button
          type="button"
          {...stylex.props(styles.tool)}
          aria-label="Recognize now"
          onClick={() => {
            if (timer.current) clearTimeout(timer.current)
            finish()
          }}
        >
          <Sym name="tick" size={15} />
        </button>
        <button type="button" {...stylex.props(styles.tool)} aria-label="Close ink" onClick={onClose}>
          <Sym name="xmark" size={15} />
        </button>
      </div>
    </div>
  )
}
