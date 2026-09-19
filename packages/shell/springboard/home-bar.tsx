// The home indicator, and the drag that starts on it. Its own file because two
// unrelated things draw the identical pill — the lock screen, centred, and every
// open app, positioned per half and tinted per app — and because the drag is the
// only gesture `swipe()` cannot model: it needs a hold timer, a card that follows
// the hand and a drop (decisions.md 21).
//
// One bar per app, under it. Drag it up and the app shrinks toward its icon
// under your finger, the home screen surfacing behind; let go early and it
// springs back; pause and it becomes a card: let go and the app switcher opens
// around it, drag it sideways and the halves are offered to drop it on (grab()).

import * as stylex from '@stylexjs/stylex'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { flushSync } from 'react-dom'
import { type Box, type Side, zoom } from './gestures.ts'
import type { Scene, Scenes } from './scenes.ts'

export function HomeBar({
  side,
  split = 0.5,
  light,
  off,
  onPointerDown
}: {
  side?: Side
  /** Where the divider sits, so a half's bar stays centred on its half. */
  split?: number
  light?: boolean
  off?: boolean
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      data-homebar=""
      {...stylex.props(
        styles.homebar,
        side && styles.homebarAt(side === 'left' ? split * 50 : 50 + split * 50),
        light && styles.homebarLight,
        off && styles.homebarOff
      )}
      onPointerDown={onPointerDown}
    />
  )
}

/** The app on a finger, and the half under it (`null` over the hinge). */
export type Drop = { id: number; side: Side | null } | null

type Props = {
  ctl: Scenes
  /** Only the inner display is wide enough to split; the cover keeps swipe-to-close. */
  wide: boolean
  /**
   * Read at the moment the hold timer fires, 220 ms after the press, not at the
   * render that made the handler — so a lock landing mid-drag still cancels it.
   */
  lockedRef: RefObject<boolean>
  /** The home screen scaling in from behind whatever is leaving. */
  reveal: () => Animation
  /** Control Center is up: nothing to go home to. */
  off: boolean
  drop: Drop
  onDrop: (d: Drop) => void
  /** The finger let the card go without choosing a half: the switcher takes over from where it is. */
  onSwitch: () => void
}

export function HomeBars({ ctl, wide, lockedRef, reveal, off, drop, onDrop, onSwitch }: Props) {
  const { els, live, setList, panel, covered, park, box } = ctl

  /**
   * The home bar under an app. Swipe up and let go: the app shrinks back into
   * its icon. Pause mid-swipe instead and it becomes a card on your finger.
   * Let go there and the app switcher opens with it. Drag it sideways and the
   * two halves of the display are offered underneath: drop it on one to split
   * the screen, on the half another app holds and the two trade places, over
   * the hinge and it goes back where it was. Only the inner display is wide
   * enough to split; the cover's card only leads to the switcher.
   */
  function grab(down: PointerEvent, e: Scene) {
    const el = els.current.get(e.id)
    const d = ctl.disp.current
    if (!el || !d) return
    // A landing still in flight would beat the transform written below.
    for (const a of el.getAnimations()) a.cancel()
    // Pointer deltas are screen px; the panel is scaled in 3D.
    const s = d.clientWidth / d.getBoundingClientRect().width
    const [W, H] = panel()
    const z = box(e.side)
    const home = covered() ? reveal() : null
    home?.pause()
    let dx = 0
    let dy = 0
    let sc = 1
    let v = 0
    let t = down.timeStamp
    let held = false
    /** The card has moved sideways since the hold: the halves are on offer, not the switcher. */
    let zoned = false
    /** Where the hand was when the hold fired; a swipe up is rarely dead straight, so drift before it does not count. */
    let hx = 0
    let over: Side | null = null
    let timer = 0
    // How far up the card sits: with the hand, but never off the top of the glass.
    const lift = () => Math.min(dy, (z.h * (1 - sc)) / 2 - 12)
    const paint = () => {
      el.style.transform = `translate(${dx}px,${-lift()}px) scale(${sc})`
      el.style.borderRadius = `${24 / sc}px`
    }
    // Which half the card's centre is over; the middle sixth is the hinge.
    const pick = (): Side | null => {
      const cx = z.x + z.w / 2 + dx
      return cx < W * 0.42 ? 'left' : cx > W * 0.58 ? 'right' : null
    }
    const hold = () => {
      held = true
      hx = dx
      sc = 0.4
      paint()
      // The wallpaper is the backdrop for the halves and the switcher, so the home screen goes.
      home?.reverse()
      onDrop({ id: e.id, side: null })
    }
    const move = (m: PointerEvent) => {
      const ny = (down.clientY - m.clientY) * s
      v = (ny - dy) / Math.max(1, m.timeStamp - t)
      t = m.timeStamp
      dx = (m.clientX - down.clientX) * s
      dy = ny
      if (held) {
        if (wide && Math.abs(dx - hx) > 60) zoned = true
        const now = zoned ? pick() : null
        if (now !== over) {
          over = now
          onDrop({ id: e.id, side: over })
        }
      } else {
        sc = Math.max(0.4, 1 - Math.max(0, dy) / (H * 0.5))
        if (home) home.currentTime = Math.min(1, Math.max(0, dy / 140)) * 420
        clearTimeout(timer)
        if (!lockedRef.current && dy > 60) timer = setTimeout(hold, 220)
      }
      paint()
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      clearTimeout(timer)
      // Let go as a card in hand: the switcher lays it out from where it is, so the transform stays.
      if (held && !zoned) {
        home?.cancel()
        onDrop(null)
        return onSwitch()
      }
      const start: Keyframe = { transform: el.style.transform || 'none', borderRadius: el.style.borderRadius || '0px' }
      el.style.transform = ''
      el.style.borderRadius = ''
      if (held) {
        onDrop(null)
        return place(
          e,
          over ?? e.side,
          { x: z.x + z.w / 2 + dx, y: z.y + z.h / 2 - lift(), w: sc * z.w, h: sc * z.h },
          home
        )
      }
      // swipe()'s commit rule, a third of the way or a flick, plus a press that never moved: the Home tap.
      if (dy > 49 || v > 0.6 || Math.abs(dy) < 4 * s) {
        return park(e.id, [zoom(el, e.from, true, z, start), ...(home ? [home] : [])])
      }
      const back = [
        el.animate([start, { transform: 'none', borderRadius: '0px' }], {
          duration: 300,
          easing: 'ease-out',
          fill: 'both'
        })
      ]
      if (home) {
        home.reverse()
        back.push(home)
      }
      Promise.all(back.map((a) => a.finished)).then(
        () => {
          for (const a of back) a.cancel()
        },
        () => {}
      )
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  /**
   * Lands a picked-up app on `side` (or back over everything), trading places
   * with whatever holds that half. `card` is where the finger left it, in
   * display px; `home` is the home screen's reveal, scrubbed by the swipe.
   */
  function place(e: Scene, side: Side | undefined, card: Box, home: Animation | null) {
    const z = box(e.side)
    const z2 = box(side)
    const other = live.current.find((x) => !x.leaving && x !== e && x.side === side)
    // Synchronous, so the element is in its new half before the frames below
    // pretend it is still the card.
    flushSync(() =>
      setList(live.current.map((x) => (x.id === e.id ? { ...x, side } : x === other ? { ...x, side: e.side } : x)))
    )
    const sc = card.w / z2.w
    const opts = { duration: 380, easing: 'cubic-bezier(.22,.9,.26,1)', fill: 'both' as const }
    const anims: Animation[] = []
    const el = els.current.get(e.id)
    if (el)
      anims.push(
        el.animate(
          [
            {
              transform: `translate(${card.x - (z2.x + z2.w / 2)}px,${card.y - (z2.y + z2.h / 2)}px) scale(${sc})`,
              borderRadius: `${24 / sc}px`
            },
            { transform: 'none', borderRadius: '0px' }
          ],
          opts
        )
      )
    const oEl = other && els.current.get(other.id)
    if (oEl) anims.push(oEl.animate([{ transform: `translateX(${z2.x - z.x}px)` }, { transform: 'none' }], opts))
    if (home) {
      // play() on a reversed animation sitting at 0 would seek to the end first.
      const at = Number(home.currentTime ?? 0)
      if (covered() ? at <= 0 : at >= 420) home.cancel()
      else {
        home.playbackRate = covered() ? -1 : 1
        home.play()
        anims.push(home)
      }
    }
    Promise.all(anims.map((a) => a.finished)).then(
      () => {
        for (const a of anims) a.cancel()
      },
      () => {}
    )
  }

  return (
    <>
      {ctl.scenes
        .filter((e) => !e.leaving && !e.parked)
        .map((e) => (
          <HomeBar
            key={e.id}
            side={e.side}
            split={ctl.split}
            light={e.a.light}
            off={off || !!drop}
            onPointerDown={(ev) => grab(ev.nativeEvent, e)}
          />
        ))}
      {/* The two halves offered to an app on a finger; the one under it lights up. */}
      {drop && (
        <div data-drop={drop.side ?? 'none'} {...stylex.props(styles.zones)}>
          <div {...stylex.props(styles.zone, drop.side === 'left' && styles.zoneOn)} />
          <div {...stylex.props(styles.zone, drop.side === 'right' && styles.zoneOn)} />
        </div>
      )}
    </>
  )
}

// Same frame as styles.ts's fade: StyleX only resolves keyframes defined in the
// file that uses them or in a .stylex file, and identical frames share a name.
const fade = stylex.keyframes({ from: { opacity: 0 } })

const styles = stylex.create({
  // The pill is 5 px; the strip you can grab to swipe it up is 22.
  homebar: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    width: 180,
    height: 22,
    marginLeft: -90,
    zIndex: 8,
    cursor: 'pointer',
    touchAction: 'none',
    transitionProperty: 'opacity',
    transitionDuration: '.2s',
    '::after': {
      content: '""',
      position: 'absolute',
      left: 30,
      right: 30,
      bottom: 7,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,.75)',
      transitionProperty: 'opacity',
      transitionDuration: '.2s',
      opacity: { default: null, ':active': 0.45 }
    }
  },
  homebarAt: (pct: number) => ({ left: `${pct}%` }),
  homebarLight: { '::after': { backgroundColor: 'rgba(0,0,0,.6)' } },
  // Nothing to go home to while the home screen is what you are looking at.
  homebarOff: { opacity: 0, pointerEvents: 'none' },
  zones: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
    display: 'flex',
    gap: 28,
    padding: 16,
    pointerEvents: 'none',
    animationName: fade,
    animationDuration: '.25s',
    animationFillMode: 'both'
  },
  zone: {
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,.16)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    transitionProperty: 'background-color',
    transitionDuration: '.18s'
  },
  zoneOn: { backgroundColor: 'rgba(255,255,255,.38)' }
})
