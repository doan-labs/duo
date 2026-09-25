// What the device shows before it is unlocked: the glass clock, the padlock
// lifts, and the torch and camera buttons. Its own file because it is a whole screen
// of its own — it sits over the home screen and shares nothing with it; only the
// pointer maths that dismisses it stays in the shell.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import {
  chrome,
  colors,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent as ReactPointerEvent, type Ref, useRef } from 'react'
import { clock, dateOf, useNow } from './clock.ts'
import { HomeBar } from './home-bar.tsx'
import { NoticeList, type Open } from './notifications.tsx'
import { flip, useToggles } from './toggles.ts'

// SF Symbols' flashlight.off.fill and camera.fill, as strokes.
const Torch = () => (
  <svg
    viewBox="0 0 24 24"
    width={22}
    height={22}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinejoin="round"
    strokeLinecap="round"
  >
    <path d="M8 2.5h8v3.2L13.8 9.4V21a1.8 1.8 0 0 1-3.6 0V9.4L8 5.7z" />
    <path d="M8 5.7h8" />
    <circle cx="12" cy="12.6" r=".9" fill="currentColor" />
  </svg>
)
const Camera = () => (
  <svg
    viewBox="0 0 24 24"
    width={22}
    height={22}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.6l1.5-2.2h5.8L16.4 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
    <circle cx="12" cy="12.8" r="3.4" />
  </svg>
)

// SF Symbols lock.fill.
const Padlock = () => (
  <svg viewBox="0 0 14 17" width={14} height={17} fill="currentColor">
    <path d="M3.2 7V5.2a3.8 3.8 0 0 1 7.6 0V7H9.3V5.2a2.3 2.3 0 0 0-4.6 0V7z" />
    <rect y="6.6" width="14" height="10.4" rx="2.6" />
  </svg>
)

/**
 * Lock screen. Swipe up anywhere to unlock; the pointer maths is in Shell. The
 * time is iOS 26's glass numerals: white that thins toward the baseline, with
 * a dark bloom behind so it still reads over the bright sky.
 */
export function LockScreen({
  wide,
  hidden,
  onSwipe,
  onCamera,
  onOpenNotice,
  ref
}: {
  wide: boolean
  hidden: boolean
  onSwipe: (e: ReactPointerEvent<HTMLDivElement>) => void
  onCamera: (from: HTMLElement) => void
  onOpenNotice: Open
  ref: Ref<HTMLDivElement>
}) {
  // Device-wide: the same torch Control Center flips and the LED on the back shows.
  const { torch } = useToggles()
  const cam = useRef<HTMLDivElement>(null)
  const now = useNow()
  return (
    <div
      ref={ref}
      data-lock
      data-hidden={hidden || undefined}
      {...stylex.props(styles.lock, hidden && shared.hide)}
      onPointerDown={onSwipe}
    >
      {/* The padlock above the date. */}
      <div {...stylex.props(styles.lpad, wide ? styles.lpadWide : styles.lpadNarrow)}>
        <Padlock />
      </div>
      <div>
        <div {...stylex.props(styles.ldate, wide ? styles.ldateWide : styles.ldateNarrow)}>{dateOf(now)}</div>
        <div {...stylex.props(styles.ltime, wide ? styles.ltimeWide : styles.ltimeNarrow)}>{clock(now)}</div>
      </div>
      {/* Notification Center: what arrived while the device was locked. */}
      <NoticeList wide={wide} onOpen={onOpenNotice} />
      <div {...stylex.props(styles.lbtns, !wide && styles.lbtnsNarrow)}>
        <div
          data-torch
          {...stylex.props(shared.glass, styles.lbtn, torch && styles.lbtnOn)}
          onClick={() => flip('torch')}
        >
          <Torch />
        </div>
        {/* Camera from the lock screen does not unlock: open() hides the lock behind it. */}
        <div ref={cam} {...stylex.props(shared.glass, styles.lbtn)} onClick={() => onCamera(cam.current!)}>
          <Camera />
        </div>
      </div>
      <HomeBar />
    </div>
  )
}

const styles = stylex.create({
  // Lock screen.
  lock: { position: 'absolute', inset: 0, zIndex: 5, textAlign: 'center', touchAction: 'none' },
  ldate: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    textShadow: shadow.text
  },
  ldateWide: { paddingTop: 34 },
  ldateNarrow: { paddingTop: 64 },
  ltime: {
    fontWeight: weight.bold,
    lineHeight: 1,
    color: 'transparent',
    backgroundImage: chrome.clockInk,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    filter: chrome.clockBloom
  },
  // The two biggest display steps; letter-spacing is -3% of the size.
  ltimeWide: { fontSize: typeScale.displayXxl, letterSpacing: -2.88 },
  ltimeNarrow: { fontSize: typeScale.displayXl, letterSpacing: -2.16 },
  lbtns: { position: 'absolute', right: 20, bottom: 22, display: 'flex', flexDirection: 'column', gap: 14 },
  lbtnsNarrow: {
    left: 0,
    right: 0,
    bottom: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 42,
    paddingRight: 42
  },
  lbtn: {
    width: 46,
    height: 46,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    backgroundColor: chrome.well,
    transitionProperty: 'transform, background-color, color',
    transitionDuration: `${motion.pressDuration}, .25s, .25s`,
    transform: { default: null, ':active': motion.press }
  },
  lbtnOn: { backgroundColor: colors.white, color: colors.black },
  lpad: {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    filter: `drop-shadow(${shadow.text})`
  },
  // 21 px above the date's top padding.
  lpadWide: { top: 13 },
  lpadNarrow: { top: 43 }
})
