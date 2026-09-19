// Going down and coming back up: the slide-to-power-off sheet and the boot logo.
// Its own file because neither belongs to anything on screen — they are the
// device itself taking the whole display, and the shell only decides when.

import {
  chrome,
  colors,
  easing,
  glass,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type RefObject, useRef, useState } from 'react'

// SF Symbols power.
const Power = () => (
  <svg
    viewBox="0 0 24 24"
    width={26}
    height={26}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
  >
    <path d="M12 3.5v8.5" />
    <path d="M7.3 6.6a7 7 0 1 0 9.4 0" />
  </svg>
)
// The boot logo as a path, not the  glyph: that codepoint is empty off macOS.
const Apple = () => (
  <svg viewBox="0 0 24 24" width={64} height={64} fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
)

/**
 * The logo on black the display wears while the device boots. The caller owns
 * when. The bar is indeterminate — nothing here knows how far along a boot is,
 * so it eases out and crawls rather than claiming progress it can't see.
 */
/**
 * How long the logo stays up at minimum. Only on localhost, where demos are
 * recorded: a visitor's boot takes exactly as long as the load.
 */
export const BOOT_MS = typeof location !== 'undefined' && location.hostname === 'localhost' ? 3000 : 0
/** The logo's fade into the booted screen; the caller keeps it mounted this long with `leaving`. */
export const BOOT_FADE_MS = 700

export const BootScreen = ({ error, leaving }: { error?: string; leaving?: boolean }) => (
  <div data-boot {...stylex.props(styles.boot, leaving && styles.bootOut)}>
    <Apple />
    {error ? (
      <p {...stylex.props(styles.bootError)}>{error}</p>
    ) : (
      <div {...stylex.props(styles.track)}>
        <div {...stylex.props(styles.fill)} />
      </div>
    )}
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
const fadeOut = stylex.keyframes({ to: { opacity: 0 } })
// Fast at first, then a crawl: the bar is always moving and never quite lands,
// so a slow boot reads as working rather than stuck.
const fill = stylex.keyframes({ from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(0.96)' } })

const styles = stylex.create({
  boot: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: colors.black,
    color: colors.white,
    fontSize: typeScale.displayXl,
    lineHeight: 1,
    animationName: fade,
    animationDuration: '1s',
    animationFillMode: 'both'
  },
  bootOut: {
    animationName: fadeOut,
    animationDuration: `${BOOT_FADE_MS}ms`,
    animationTimingFunction: easing.inOut,
    animationFillMode: 'forwards',
    pointerEvents: 'none'
  },
  track: {
    width: 160,
    height: 4,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: chrome.fill
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.white,
    transformOrigin: 'left center',
    animationName: fill,
    animationDuration: '14s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  bootError: {
    margin: 0,
    maxWidth: 320,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    textAlign: 'center',
    color: chrome.label
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
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    animationName: fade,
    animationDuration: '.3s',
    animationFillMode: 'both'
  },
  slide: {
    position: 'relative',
    width: 260,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: chrome.fill,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    fontWeight: weight.medium,
    color: colors.white,
    overflow: 'hidden',
    touchAction: 'none'
  },
  knob: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 56,
    height: 56,
    borderRadius: radius.circle,
    backgroundColor: colors.red,
    display: 'grid',
    placeItems: 'center',
    cursor: 'grab',
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.pop,
    boxShadow: shadow.card
  },
  knobDrag: { transitionProperty: 'none' },
  shiftX: (x: number) => ({ transform: `translateX(${x}px)` }),
  cancel: {
    width: 56,
    height: 56,
    borderRadius: radius.circle,
    backgroundColor: chrome.fill,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    color: colors.white
  }
})
