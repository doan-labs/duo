// The OS notification layer on one display: the banner that drops in over
// whatever is on screen, and the Notification Center the lock screen shows
// under the clock. Both read runtime/notifications.ts, which bridge.ts fills
// when an app calls os.notify. A tap opens the app with the notice's arg, the
// same deep link os.open carries, so the two views of the same list behave the
// same way.

import { ICONS } from '@doan-labs/duo-uikit/icons/index.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import {
  chrome,
  colors,
  easing,
  layout,
  leading,
  motion,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { byName } from '../apps.ts'
import {
  clearAllNotices,
  listNotices,
  noticesRevision,
  type Posted,
  subscribeNotices
} from '../runtime/notifications.ts'
import { useNow } from './clock.ts'

/** What a tap on a card does: the shell unlocks, then launches the app with the arg. */
export type Open = (notice: Posted) => void

const useNotices = () => {
  useSyncExternalStore(subscribeNotices, noticesRevision)
  return listNotices()
}

/** The app's current icon, or the baked art for a stock app that posted. */
const icon = (n: Posted) => byName(n.app)?.icon ?? ICONS[n.name]

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** One glass card: app, title, body - the unit a banner and the list share. */
export function NoticeCard({ notice: n, onOpen, now }: { notice: Posted; onOpen: Open; now: number }) {
  const src = icon(n)
  return (
    <div data-notice={n.id} {...stylex.props(shared.glass, styles.card)} onClick={() => onOpen(n)}>
      <div {...stylex.props(styles.head)}>
        {src ? (
          <img src={src} alt="" {...stylex.props(styles.icon)} />
        ) : (
          <span {...stylex.props(styles.iconFallback)} aria-hidden="true">
            {n.name[0]}
          </span>
        )}
        <span {...stylex.props(styles.name)}>{n.name}</span>
        <span {...stylex.props(styles.time)}>{ago(n.at, now)}</span>
      </div>
      <strong {...stylex.props(styles.title)}>{n.title}</strong>
      {n.body && <span {...stylex.props(styles.body)}>{n.body}</span>}
    </div>
  )
}

// How long a banner stays before lifting out; about iOS's four seconds.
const SHOW = 4400
const FLY = 300

/**
 * The drop-in over whatever is showing, apps, home or lock included. The newest
 * post bumps the one on screen; a cleared one ends early; a stale post (the
 * store already lived longer than a banner does) never flashes in.
 */
export function NoticeBanner({ onOpen }: { onOpen: Open }) {
  const list = useNotices()
  const latest = list[0]
  const [live, setLive] = useState<Posted | null>(null)
  const [leaving, setLeaving] = useState(false)
  // A notice banners once: clearing the newest must not re-drop the one under it.
  const shown = useRef(new Set<string>())
  useEffect(() => {
    if (!latest || shown.current.has(latest.id) || Date.now() - latest.at > SHOW) return
    shown.current.add(latest.id)
    setLive(latest)
    setLeaving(false)
    const away = setTimeout(() => setLeaving(true), SHOW)
    const gone = setTimeout(() => setLive(null), SHOW + FLY)
    return () => {
      clearTimeout(away)
      clearTimeout(gone)
    }
  }, [latest])
  if (!live || !list.some((n) => n.id === live.id)) return null
  return (
    <div data-banner {...stylex.props(styles.bannerWrap)}>
      <div {...stylex.props(styles.banner, leaving && styles.bannerOut)}>
        <NoticeCard notice={live} onOpen={onOpen} now={Date.now()} />
      </div>
    </div>
  )
}

/**
 * Notification Center, the lock screen's list. Its pointer events are its own:
 * a pointerdown anywhere else on the lock screen is the unlock swipe.
 */
export function NoticeList({ wide, onOpen }: { wide: boolean; onOpen: Open }) {
  const list = useNotices()
  const now = useNow().getTime()
  if (!list.length) return null
  return (
    <div
      data-notices
      {...stylex.props(styles.list, wide ? styles.listWide : styles.listNarrow)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div {...stylex.props(styles.listHead)}>
        <span {...stylex.props(styles.listTitle)}>Notification Center</span>
        <button
          type="button"
          aria-label="Clear all"
          {...stylex.props(shared.glass, styles.clear)}
          onClick={() => clearAllNotices()}
        >
          <Sym name="xmark" size={10} />
        </button>
      </div>
      {list.map((n) => (
        <NoticeCard key={n.id} notice={n} onOpen={onOpen} now={now} />
      ))}
    </div>
  )
}

// The banner arrives off-screen and settles; the leave is a transition back out.
const dropIn = stylex.keyframes({
  from: { transform: 'translateY(-120%)', opacity: 0.4 },
  to: { transform: 'none', opacity: 1 }
})

const styles = stylex.create({
  card: {
    borderRadius: radius.xxl,
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg,
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: shadow.float,
    transitionDuration: motion.pressDuration,
    transitionProperty: 'transform',
    transform: { default: null, ':active': motion.press }
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: layout.iconRadius
  },
  // A dev icon missing its art: the app's initial on a plain fill.
  iconFallback: {
    width: 20,
    height: 20,
    borderRadius: layout.iconRadius,
    backgroundColor: chrome.fill2,
    color: colors.white,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    display: 'grid',
    placeItems: 'center'
  },
  name: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    color: chrome.label,
    textTransform: 'uppercase',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  time: {
    marginLeft: 'auto',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: chrome.label,
    flexShrink: 0
  },
  title: {
    display: 'block',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    color: colors.white
  },
  body: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: colors.white
  },
  // Deaf to the pointer until the card: what is around it stays clickable.
  bannerWrap: {
    position: 'absolute',
    top: space.md,
    left: space.sm,
    right: space.sm,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 8,
    pointerEvents: 'none'
  },
  banner: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    maxWidth: 384,
    pointerEvents: 'auto',
    animationName: dropIn,
    animationDuration: '.55s',
    animationTimingFunction: easing.spring,
    transitionProperty: 'transform, opacity',
    transitionDuration: `${FLY}ms`,
    transitionTimingFunction: easing.inOut
  },
  bannerOut: { transform: 'translateY(-120%)', opacity: 0 },
  // Under the clock, over the lock buttons: the dates above come to ~150 px on
  // both displays; the button row tops out at ~128 px on wide, ~90 on narrow.
  list: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    overflowY: 'auto',
    touchAction: 'pan-y',
    // Hide the bar but keep the scroll.
    scrollbarWidth: 'none'
  },
  listWide: { top: 176, bottom: 134 },
  listNarrow: { top: 178, bottom: 100 },
  listHead: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.xs,
    paddingRight: space.xxs
  },
  listTitle: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: chrome.label,
    textTransform: 'uppercase'
  },
  clear: {
    marginLeft: 'auto',
    width: 22,
    height: 22,
    borderRadius: radius.circle,
    borderWidth: 0,
    padding: 0,
    display: 'grid',
    placeItems: 'center',
    color: chrome.label,
    backgroundColor: chrome.fill3,
    cursor: 'pointer',
    transitionDuration: motion.pressDuration,
    transitionProperty: 'transform',
    transform: { default: null, ':active': motion.press }
  }
})
