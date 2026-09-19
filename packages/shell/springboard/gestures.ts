// The one animation scrubber every gesture in the shell shares — unlock, close,
// the app switcher — plus the geometry the icon-to-app zoom needs: where a tile
// sits inside the display, and which rectangle an app fills. Scrubbing paused
// Web Animations is decisions.md 8, which is also why both commit paths cancel
// what they played rather than leave it filling on the shell.
// Its own module because it is pure logic: no React, no StyleX, no styles.

import { flushSync } from 'react-dom'

export type Swipe = {
  /** The drag runs down the display instead of up. */
  down?: boolean
  /** Runs once a let-go swipe has run back, before the animations are cancelled. */
  back?: () => void
}

/**
 * Scrubs paused animations with a drag that started at `down`, upward unless
 * `opts.down`. Past a third of the way, or on a quick flick, `go` commits and
 * plays them through; otherwise they run back and `opts.back` runs.
 */
export function swipe(down: PointerEvent, anims: Animation[], go: (anims: Animation[]) => void, opts: Swipe = {}) {
  const dir = opts.down ? -1 : 1
  const y0 = down.clientY
  let y = y0
  let t = down.timeStamp
  let v = 0
  let p = 0
  for (const a of anims) a.pause()
  const move = (e: PointerEvent) => {
    v = (dir * (y - e.clientY)) / Math.max(1, e.timeStamp - t)
    y = e.clientY
    t = e.timeStamp
    p = Math.min(1, Math.max(0, (dir * (y0 - y)) / 140))
    for (const a of anims) a.currentTime = p * Number(a.effect!.getComputedTiming().duration)
  }
  const up = () => {
    removeEventListener('pointermove', move)
    removeEventListener('pointerup', up)
    removeEventListener('pointercancel', up)
    if (p > 0.35 || v > 0.6) return go(anims)
    for (const a of anims) a.reverse()
    // Same order as settle(): unmount first, then cancel, so nothing snaps back.
    Promise.all(anims.map((a) => a.finished)).then(
      () => {
        if (opts.back) flushSync(opts.back)
        for (const a of anims) a.cancel()
      },
      () => {}
    )
  }
  addEventListener('pointermove', move)
  addEventListener('pointerup', up)
  addEventListener('pointercancel', up)
}

/**
 * Plays `list` through, then removes what it animated before cancelling: React
 * unmounts asynchronously, and a cancel that lands first snaps the element back
 * for a frame. Cancelling at all is so none stay on the shell (decisions.md 8).
 */
export function settle(list: Animation[], remove: () => void) {
  for (const a of list) a.play()
  Promise.all(list.map((a) => a.finished)).then(() => {
    flushSync(remove)
    for (const a of list) a.cancel()
  }, remove)
}

export type Box = { x: number; y: number; w: number; h: number }
export type Side = 'left' | 'right'

/**
 * The part of the display an app fills: one side of the divider, or all of it
 * when `side` is unset. `split` is where the divider sits, as a fraction of the width.
 */
export const zone = (side: Side | undefined, W: number, H: number, split = 0.5): Box =>
  side
    ? { x: side === 'right' ? W * split : 0, y: 0, w: W * (side === 'right' ? 1 - split : split), h: H }
    : { x: 0, y: 0, w: W, h: H }

/**
 * Where a tile sits inside the display, in layout px. getBoundingClientRect is in
 * screen space and this panel is rotated in 3D by CSS3DRenderer, so the offset
 * chain is the only usable source — plus the one place the layout moves a box
 * with a transform, which offsetLeft does not see.
 */
export function spot(el: HTMLElement, disp: HTMLElement, page: number): Box {
  let x = el.offsetLeft
  let y = el.offsetTop
  for (let n = el.offsetParent as HTMLElement | null; n && n !== disp; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft
    y += n.offsetTop
  }
  // A page is as wide as the strip holding it: the whole display, or the half the home is squeezed into.
  const strip = el.closest('[data-pages]')?.parentElement
  if (strip) x -= page * strip.clientWidth
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

/**
 * The iOS open: the app is the icon, scaled up into the full panel. Anchoring
 * it to the icon is the whole effect — a panel that slides up from the bottom
 * reads as a sheet, not as the thing you just pressed. `z` is where the app sits
 * on the display; `start` replaces the full-size end when the app is already
 * mid-gesture, so a card on a finger shrinks from where it is.
 */
export function zoom(el: HTMLElement, from: Box, out: boolean, z: Box, start?: Keyframe) {
  const sc = Math.max(from.w / z.w, from.h / z.h)
  // Corner radius is pre-scale, so divide it back out or the icon's 14 px
  // rounds off at 60 px and the app looks like it grew out of a circle.
  const small = {
    transform: `translate(${from.x + from.w / 2 - (z.x + z.w / 2)}px,${from.y + from.h / 2 - (z.y + z.h / 2)}px) scale(${sc})`,
    borderRadius: `${14 / sc}px`
  }
  const big = start ?? { transform: 'none', borderRadius: '0px' }
  const frames: Keyframe[] = out
    ? [
        { ...big, opacity: 1 },
        { opacity: 1, offset: 0.65 },
        { ...small, opacity: 0 }
      ]
    : [
        { ...small, opacity: 0 },
        { opacity: 1, offset: 0.22 },
        { ...big, opacity: 1 }
      ]
  return el.animate(frames, {
    duration: out ? 320 : 440,
    easing: out ? 'cubic-bezier(.5,0,.75,.4)' : 'cubic-bezier(.22,.9,.26,1)',
    fill: 'both'
  })
}

/**
 * Picks a tile up under the finger that pressed it at `down` and carries it
 * until release, reporting what is under the pointer as that changes; the tile
 * itself is deaf to hit-testing while carried, so what it covers is what is
 * found. `drop` gets the last thing under the finger and says whether it took
 * the tile. If not, the tile springs back to its cell.
 */
export function lift(
  down: PointerEvent,
  el: HTMLElement,
  over: (under: Element | null) => void,
  drop: (under: Element | null) => boolean
) {
  // Pointer deltas are screen px; the panel is scaled in 3D. The display root gives the ratio.
  const box = el.closest<HTMLElement>('[data-os]') ?? el
  const s = box.clientWidth / box.getBoundingClientRect().width
  let under: Element | null = null
  let at = 'scale(1.12)'
  el.style.zIndex = '5'
  el.style.pointerEvents = 'none'
  // A short ease, so the tile trails the hand rather than snapping to each pointer event.
  el.style.transition = 'transform .15s ease-out'
  el.style.transform = at
  const move = (m: PointerEvent) => {
    at = `translate(${(m.clientX - down.clientX) * s}px,${(m.clientY - down.clientY) * s}px) scale(1.12)`
    el.style.transform = at
    const now = document.elementFromPoint(m.clientX, m.clientY)
    if (now === under) return
    under = now
    over(now)
  }
  const up = () => {
    removeEventListener('pointermove', move)
    removeEventListener('pointerup', up)
    removeEventListener('pointercancel', up)
    el.style.zIndex = ''
    el.style.pointerEvents = ''
    el.style.transition = ''
    el.style.transform = ''
    if (drop(under)) return
    const back = el.animate([{ transform: at }, { transform: 'none' }], {
      duration: 260,
      easing: 'cubic-bezier(.2,.9,.3,1)'
    })
    back.finished.then(
      () => back.cancel(),
      () => {}
    )
  }
  addEventListener('pointermove', move)
  addEventListener('pointerup', up)
  addEventListener('pointercancel', up)
}
