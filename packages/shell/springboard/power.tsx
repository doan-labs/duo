// Going down and coming back up: the slide-to-power-off sheet and the boot logo.
// Its own file because neither belongs to anything on screen — they are the
// device itself taking the whole display, and the shell only decides when.

import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type RefObject, useRef, useState } from 'react'

// SF Symbols power.
const Power = () => (
  <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
    <path d="M12 3.5v8.5" />
    <path d="M7.3 6.6a7 7 0 1 0 9.4 0" />
  </svg>
)
// The boot logo as a path, not the  glyph: that codepoint is empty off macOS.
const Apple = () => (
  <svg viewBox="0 0 24 24" width={64} height={64} fill="#fff">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
)

/** The logo on black the display wears while the device boots. The caller owns when. */
export const BootScreen = () => (
  <div data-boot {...stylex.props(styles.boot)}>
    <Apple />
  </div>
)

/** Slide to power off. */
export function PowerSheet({
  disp,
  onCancel,
  onCommit
}: {
  disp: RefObject<HTMLDivElement | null>
  onCancel: () => void
  onCommit: () => void
}) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x0: number; s: number; max: number; x: number } | null>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  return (
    <div data-hud="poff" {...stylex.props(styles.poff)}>
      <div ref={track} {...stylex.props(styles.slide)}>
        slide to power off
        <div
          {...stylex.props(styles.knob, dragging && styles.knobDrag, styles.shiftX(x))}
          onPointerDown={(e) => {
            // Pointer deltas are screen px; the panel is scaled in 3D.
            const d = disp.current!
            const s = d.clientWidth / d.getBoundingClientRect().width
            drag.current = { x0: e.clientX, s, max: track.current!.clientWidth - 64, x: 0 }
            e.currentTarget.setPointerCapture(e.pointerId)
            setDragging(true)
          }}
          onPointerMove={(m) => {
            const g = drag.current
            if (!g) return
            g.x = Math.min(g.max, Math.max(0, (m.clientX - g.x0) * g.s))
            setX(g.x)
          }}
          onPointerUp={() => {
            const g = drag.current
            if (!g) return
            drag.current = null
            setDragging(false)
            if (g.x < g.max * 0.8) return setX(0)
            onCommit()
          }}
        >
          <Power />
        </div>
      </div>
      <div {...stylex.props(styles.cancel)} onClick={onCancel}>
        ✕
      </div>
    </div>
  )
}

// Same frame as styles.ts's fade: StyleX only resolves keyframes defined in the
// file that uses them or in a .stylex file, and identical frames share a name.
const fade = stylex.keyframes({ from: { opacity: 0 } })

const styles = stylex.create({
  boot: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 'inherit',
    color: colors.white,
    fontSize: 76,
    lineHeight: 1,
    animationName: fade,
    animationDuration: '1s',
    animationFillMode: 'both'
  },

  poff: {
    position: 'absolute',
    inset: 0,
    zIndex: 9,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 34,
    backgroundColor: 'rgba(30,30,34,.55)',
    backdropFilter: 'blur(30px) saturate(140%)',
    WebkitBackdropFilter: 'blur(30px) saturate(140%)',
    animationName: fade,
    animationDuration: '.3s',
    animationFillMode: 'both'
  },
  slide: {
    position: 'relative',
    width: 260,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,.22)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 16,
    fontWeight: 500,
    color: 'rgba(255,255,255,.85)',
    overflow: 'hidden',
    touchAction: 'none'
  },
  knob: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: colors.red,
    display: 'grid',
    placeItems: 'center',
    cursor: 'grab',
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: 'cubic-bezier(.2,.9,.3,1)',
    boxShadow: '0 2px 8px rgba(0,0,0,.3)'
  },
  knobDrag: { transitionProperty: 'none' },
  shiftX: (x: number) => ({ transform: `translateX(${x}px)` }),
  cancel: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,.22)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    fontSize: 26,
    color: colors.white
  }
})
