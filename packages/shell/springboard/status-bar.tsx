// The Duo's status read: the time and the radios, plus the punch-hole they sit
// beside. Its own file because it is a stack and not a bar — the camera is
// top-right, so everything here is a column pinned to that corner, with nothing
// in common with the rest of the shell.
//
// It is also the only place a Control Center switch is visible from outside the
// panel: airplane mode, the two radios, the focus moon and the rotation lock all
// come from `toggles.ts`, so flipping one on the cover shows on the inner display.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors, leading, radius, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { clock, useNow } from './clock.ts'
import { BATTERY, NETWORK, useToggles } from './toggles.ts'

// The battery ring is the Duo's status glyph: what sits inside it is the radios
// normally, and the charge itself while Control Center is open and asking.
const Ring = ({ inner, dots }: { inner: ReactNode; dots: boolean }) => (
  <svg viewBox="0 0 44 52" width={34} height={40} fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M9.8 39.6a17 17 0 1 1 24.4 0" strokeWidth={3} />
    {inner}
    {dots && (
      <g fill="currentColor" stroke="none">
        <circle cx="13.4" cy="46.6" r="2" />
        <circle cx="19.1" cy="48.4" r="2" />
        <circle cx="24.9" cy="48.4" r="2" />
        <circle cx="30.6" cy="46.6" r="2" />
      </g>
    )}
  </svg>
)

const WIFI = (
  <g>
    <path d="M13.4 21.8a13 13 0 0 1 17.2 0" strokeWidth={2.5} />
    <path d="M16.9 26.3a8 8 0 0 1 10.2 0" strokeWidth={2.5} />
    <path d="M20.4 30.8a3 3 0 0 1 3.2 0" strokeWidth={2.5} />
  </g>
)
const CHARGE = <rect x="12" y="18.5" width="20" height="9" rx="4.5" fill="currentColor" stroke="none" />

const Time = () => <span>{clock(useNow())}</span>

/**
 * `wide` is the unfolded inner display. `light` means an app with a light surface
 * sits under the stack and Control Center is closed, so the glyphs go black.
 * `covered` means an app occupies the top-right corner, so the hole and the
 * radios get out of its way. `cc` is Control Center open: iOS spells the status
 * out while it is, so the time gives way to the charge and the network.
 *
 * `open` is what the two shortcuts here call — the time opens the Clock and the
 * radio ring opens Settings at Wi-Fi, as iOS does. Left out while the screen is
 * locked, and then the stack takes no taps at all: the lock screen's swipes run
 * across this corner and must reach it.
 */
export const StatusBar = ({
  wide,
  light,
  covered,
  cc,
  open
}: {
  wide: boolean
  light: boolean
  covered: boolean
  cc: boolean
  open?: (name: string, arg?: string) => void
}) => {
  const t = useToggles()
  return (
    <div {...stylex.props(styles.status, !wide && styles.statusNarrow, light && styles.statusLight)}>
      {/* No punch-hole on the inner display: the Duo's inner camera is under-display. */}
      {!wide && <div {...stylex.props(styles.hole, covered && shared.hide)} />}
      {cc ? (
        <>
          <Ring inner={CHARGE} dots={false} />
          <span {...stylex.props(styles.read)}>{BATTERY}%</span>
          <Sym name="wifi" size={17} />
          <span {...stylex.props(styles.read)}>{t.wifi ? NETWORK : 'Off'}</span>
        </>
      ) : (
        <>
          <button
            type="button"
            {...stylex.props(styles.tap, open && styles.tapOn)}
            aria-label="Clock"
            onClick={() => open?.('Clock')}
          >
            <Time />
          </button>
          <div {...stylex.props(covered && shared.hide)}>
            <button
              type="button"
              {...stylex.props(styles.tap, open && styles.tapOn)}
              aria-label="Wi‑Fi settings"
              onClick={() => open?.('Settings', 'wifi')}
            >
              <Ring inner={t.wifi ? WIFI : null} dots={t.cell} />
            </button>
            {/* iOS keeps the plane where the bars were, and the rest of the row
                is what is switched on: lock, moon, mirror. */}
            <div {...stylex.props(styles.marks)}>
              {t.airplane && <Sym name="airplane" size={15} />}
              {t.rotate && <Sym name="lock" size={14} />}
              {t.focus && <Sym name="moon" size={14} />}
              {t.mirror && <Sym name="tabs" size={14} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles = stylex.create({
  // Status. A stack, not a bar: the Duo's camera is top-right, so iOS runs the
  // time and the radios down beside it. Apps only keep the time — the ring is
  // 90 px tall and would sit on top of every header.
  status: {
    position: 'absolute',
    top: 18,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    zIndex: 6,
    pointerEvents: 'none',
    color: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold
  },
  // The cover's camera sits 5.5 mm from the free edge: the ring's centre lands on 33 px.
  statusNarrow: { right: 16 },
  statusLight: { color: colors.black },
  hole: { width: 23, height: 23, borderRadius: radius.circle, backgroundColor: colors.black, marginBottom: 2 },
  read: { fontSize: typeScale.caption1, marginTop: -4 },
  // The shortcuts take a tap without changing the stack's shape: the stack is
  // dead to the pointer, and only these two opt back in.
  tap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transform: { default: 'scale(1)', ':active': 'scale(.9)' },
    transitionProperty: 'transform',
    transitionDuration: '.2s'
  },
  tapOn: { pointerEvents: 'auto' },
  marks: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, paddingTop: 3 }
})
