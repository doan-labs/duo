// The app switcher: every mounted app as a card in a row over the wallpaper,
// most recent in front. Opened by letting go of a card the home-bar hold made
// (home-bar.tsx). Drag sideways to scroll the row, tap a card to bring it back,
// flick one up to quit it, tap the wallpaper to go home. Its own file because
// it is the one layer that lays the scenes out itself: the cards are the app
// elements, transformed, so what you see in a card is the app, live.

import { ICONS } from '@doan-labs/duo-uikit/icons/index.ts'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react'
import type { Scene, Scenes } from './scenes.ts'

/** Cards are this much of the display. */
const SC = 0.56
const GAP = 22

export function Switcher({ ctl, onClose }: { ctl: Scenes; onClose: () => void }) {
  const cards = ctl.recent()
  const [W, H] = ctl.panel()
  const labels = useRef(new Map<number, HTMLDivElement>())
  // Scroll offset and the card being lifted, imperative: a pointer move a frame is no place for a render.
  const state = useRef({ off: 0, lift: 0, lifting: -1 })
  // Closing: the parking and unparking below re-render this layer before it unmounts, and a repaint then would undo `clear()`.
  const done = useRef(false)

  /** Where card `i`'s centre sits at offset 0: the front card in the middle, the rest off to the left. */
  const centres = () => {
    const xs: number[] = []
    let x = W / 2
    cards.forEach((e, i) => {
      const w = ctl.box(e.side).w * SC
      if (i > 0) x -= (ctl.box(cards[i - 1]!.side).w * SC + w) / 2 + GAP
      xs.push(x)
    })
    return xs
  }
  const maxOff = () => {
    const xs = centres()
    return xs.length ? W / 2 - xs[xs.length - 1]! : 0
  }
  /** The card's transform at its slot. Every zone is the display's full height, so the card stays centred vertically. */
  const pose = (e: Scene, cx: number) => {
    const z = ctl.box(e.side)
    return `translate(${cx - (z.x + z.w / 2)}px,0) scale(${SC})`
  }
  const paint = () => {
    if (done.current) return
    const { off, lift, lifting } = state.current
    centres().forEach((cx, i) => {
      const e = cards[i]!
      const el = ctl.els.current.get(e.id)
      const up = i === lifting ? lift : 0
      if (el) {
        el.style.transform = `translateY(${up}px) ${pose(e, cx + off)}`
        el.style.borderRadius = `${24 / SC}px`
        el.style.opacity = i === lifting ? String(Math.max(0, 1 + lift / (H * 0.6))) : ''
      }
      const l = labels.current.get(e.id)
      if (l)
        l.style.transform = `translate(${cx + off - ctl.box(e.side).w * SC * 0.5}px,${(H * (1 - SC)) / 2 - 34 + up}px)`
    })
  }
  // A passive effect, not a layout one: the shell re-creates the scenes' ref
  // callbacks every render, so React empties `els` in the mutation phase and
  // refills it in the layout phase, after this component's own layout effect.
  // biome-ignore lint/correctness/useExhaustiveDependencies: lays out on every render; the list of cards is what changes
  useEffect(paint)

  /** Which card is under a point of the display, if any. */
  const hit = (x: number, y: number) => {
    const { off } = state.current
    const i = centres().findIndex((cx, i) => {
      const z = ctl.box(cards[i]!.side)
      return Math.abs(x - cx - off) < (z.w * SC) / 2 && Math.abs(y - H / 2) < (z.h * SC) / 2
    })
    return i
  }
  /** Leaves the elements as the shell lays them out, ready for the animations below. */
  const clear = () => {
    for (const e of cards) {
      const el = ctl.els.current.get(e.id)
      if (!el) continue
      el.style.transform = ''
      el.style.borderRadius = ''
      el.style.opacity = ''
    }
  }
  const grow = (el: HTMLElement, from: string) =>
    el.animate(
      [
        { transform: from, borderRadius: `${24 / SC}px` },
        { transform: 'none', borderRadius: '0px' }
      ],
      {
        duration: 380,
        easing: 'cubic-bezier(.22,.9,.26,1)',
        fill: 'both'
      }
    )
  /** The card tapped comes to the glass; whatever else was on it is parked, with no zoom of its own. */
  const pick = (i: number) => {
    const e = cards[i]!
    const cx = centres()[i]! + state.current.off
    const from = pose(e, cx)
    done.current = true
    clear()
    if (e.parked) {
      for (const x of ctl.onStage()) ctl.park(x.id, [])
      ctl.unpark(e.id, undefined, (el) => [grow(el, from)])
    } else {
      // Already on the glass, maybe with a partner in the other half: both grow back.
      for (const x of ctl.onStage()) {
        const el = ctl.els.current.get(x.id)
        if (!el) continue
        const a = grow(el, pose(x, centres()[cards.indexOf(x)]! + state.current.off))
        a.finished.then(
          () => a.cancel(),
          () => {}
        )
      }
    }
    onClose()
  }
  /** The wallpaper tapped: home, everything parked from where its card is. */
  const home = () => {
    const xs = centres()
    const on = ctl.onStage()
    done.current = true
    clear()
    for (const x of on) {
      const el = ctl.els.current.get(x.id)
      const from = pose(x, xs[cards.indexOf(x)]! + state.current.off)
      ctl.park(
        x.id,
        el
          ? [
              el.animate(
                [
                  { transform: from, opacity: 1 },
                  { transform: `${from} scale(.6)`, opacity: 0 }
                ],
                {
                  duration: 260,
                  easing: 'ease-in',
                  fill: 'both'
                }
              )
            ]
          : []
      )
    }
    onClose()
  }
  /** Flicked up: gone for good. */
  const quit = (i: number) => {
    const e = cards[i]!
    const el = ctl.els.current.get(e.id)
    const from = el?.style.transform || 'none'
    state.current.lifting = -1
    state.current.lift = 0
    ctl.close(
      e.id,
      el
        ? [
            el.animate(
              [
                { transform: from, opacity: el.style.opacity || 1 },
                { transform: `translateY(${-H}px) ${from}`, opacity: 0 }
              ],
              {
                duration: 220,
                easing: 'ease-in',
                fill: 'both'
              }
            )
          ]
        : []
    )
    if (cards.length === 1) {
      done.current = true
      onClose()
    }
  }

  const down = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const d = ctl.disp.current
    if (!d) return
    // Pointer deltas are screen px; the panel is scaled in 3D.
    const s = d.clientWidth / d.getBoundingClientRect().width
    const x0 = ev.nativeEvent.offsetX
    const y0 = ev.nativeEvent.offsetY
    const i = hit(x0, y0)
    const off0 = state.current.off
    let axis: 'x' | 'y' | null = null
    let dy = 0
    let v = 0
    let t = ev.timeStamp
    const move = (m: PointerEvent) => {
      const dx = (m.clientX - ev.clientX) * s
      const ny = (m.clientY - ev.clientY) * s
      v = (dy - ny) / Math.max(1, m.timeStamp - t)
      t = m.timeStamp
      dy = ny
      if (!axis && Math.hypot(dx, dy) > 6) axis = Math.abs(dx) > Math.abs(dy) || i < 0 ? 'x' : 'y'
      if (axis === 'x') state.current.off = Math.min(maxOff(), Math.max(0, off0 + dx))
      else if (axis === 'y') {
        state.current.lifting = i
        state.current.lift = Math.min(0, dy)
      }
      paint()
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      if (!axis) return i >= 0 ? pick(i) : home()
      if (axis === 'y') {
        if (-dy > 90 || v > 0.6) return quit(i)
        state.current.lifting = -1
        state.current.lift = 0
        paint()
      }
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }
  const wheel = (ev: React.WheelEvent) => {
    state.current.off = Math.min(maxOff(), Math.max(0, state.current.off + ev.deltaX + ev.deltaY))
    paint()
  }

  return (
    <div data-switcher {...stylex.props(styles.layer)} onPointerDown={down} onWheel={wheel}>
      {cards.map((e) => (
        <div
          key={e.id}
          ref={(el) => {
            if (el) labels.current.set(e.id, el)
            else labels.current.delete(e.id)
          }}
          {...stylex.props(styles.label)}
        >
          <img src={e.a.icon ?? ICONS[e.a.name] ?? ''} alt="" {...stylex.props(styles.icon)} />
          {e.a.name}
        </div>
      ))}
    </div>
  )
}

const fade = stylex.keyframes({ from: { opacity: 0 } })

const styles = stylex.create({
  // Over the cards (zIndex 4 in springboard.tsx), under the system HUDs.
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
    touchAction: 'none',
    cursor: 'grab',
    animationName: fade,
    animationDuration: '.25s',
    animationFillMode: 'both'
  },
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: 'white',
    textShadow: '0 1px 3px rgba(0,0,0,.5)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    transitionProperty: 'transform',
    transitionDuration: '.16s',
    transitionTimingFunction: 'ease-out'
  },
  icon: { width: 22, height: 22, borderRadius: 6 }
})
