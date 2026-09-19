// Spotlight: the search sheet that drops over the home screen, and the magnifier
// glyph that opens it. Its own file because it is a whole screen with its own
// state, and because the glyph belongs to the thing it opens — the home screen's
// search button imports it from here rather than keeping a second copy.

import type { App } from '@doan-labs/duo-uikit/app.ts'
import { delay } from '@doan-labs/duo-uikit/styles.ts'
import {
  chrome,
  colors,
  easing,
  glass,
  leading,
  radius,
  tracking,
  typeScale
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { APPS } from '../apps.ts'
import { Icon } from './tile.tsx'

export const Magnifier = () => (
  <svg
    viewBox="0 0 24 24"
    width={19}
    height={19}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.1}
    strokeLinecap="round"
  >
    <circle cx="10.5" cy="10.5" r="6.6" />
    <path d="M15.4 15.4 20.5 20.5" />
  </svg>
)

export function Spotlight({ onPick, onClose }: { onPick: (a: App) => void; onClose: () => void }) {
  const [on, setOn] = useState(false)
  const [q, setQ] = useState('')
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setOn(true)
      field.current?.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [])
  const shut = () => {
    setOn(false)
    setTimeout(onClose, 280)
  }
  const s = q.trim().toLowerCase()
  // Apps only: a folder is a place on the grid, not something to open from here.
  const apps = APPS.filter((a) => !a.folder)
  const list = (s ? apps.filter((a) => a.name.toLowerCase().includes(s)) : apps).slice(0, 12)
  return (
    <div {...stylex.props(styles.spot, on && styles.spotOn)} onClick={(e) => e.target === e.currentTarget && shut()}>
      <div {...stylex.props(styles.fld, on && styles.fldOn)}>
        <Magnifier />
        <input
          ref={field}
          {...stylex.props(styles.field)}
          placeholder="Search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div {...stylex.props(styles.hits)}>
        {/* Keyed by the query too, so the list lands afresh on every keystroke. */}
        {list.map((a, i) => (
          <div
            key={`${s}/${a.name}`}
            {...stylex.props(styles.hit, delay.ms(i * 22))}
            onClick={() => {
              shut()
              onPick(a)
            }}
          >
            <Icon a={a} size={styles.hitIcon} />
            {a.name}
          </div>
        ))}
      </div>
    </div>
  )
}

// Same frame as styles.ts's rise: StyleX only resolves keyframes defined in the
// file that uses them or in a .stylex file, and identical frames share a name.
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

const styles = stylex.create({
  // Spotlight
  spot: {
    position: 'absolute',
    inset: 0,
    zIndex: 7,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 52,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: chrome.scrimDeep,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.26s',
    color: colors.white
  },
  spotOn: { opacity: 1 },
  fld: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    flexShrink: 0,
    backgroundColor: chrome.fill,
    borderRadius: radius.lg,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 12,
    transform: 'translateY(-16px)',
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.pop
  },
  fldOn: { transform: 'none' },
  field: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    outlineStyle: 'none',
    color: colors.white,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout
  },
  hits: { flexGrow: 1, flexBasis: 0, minHeight: 0, overflow: 'auto', marginTop: 12, paddingBottom: 16 },
  hit: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: radius.lg,
    cursor: 'pointer',
    backgroundColor: { default: null, ':active': chrome.fill },
    animationName: rise,
    animationDuration: '.3s',
    animationFillMode: 'backwards'
  },
  hitIcon: { width: 36, height: 36 }
})
