// What an embedding page can make the phone do, beyond posing it: the real
// split-screen drag played by synthetic pointer events through the home bar's
// own handler, a screenshot, a song. Reached from the bridge in main.ts only,
// so the page never touches the shell's DOM itself.
import { nowPlaying } from '@doan-labs/duo-app-music/index.tsx'
import { device } from './device.ts'

export type Cue = {
  /** Drag the open app onto the left half and open this one beside it. */
  split?: string
  /**
   * How far along that drag to be, 0..1, for a page that ties it to its scroll.
   * Later messages for the same `split` move the finger instead of starting
   * over; without it the drag plays out on its own clock.
   */
  at?: number
  screenshot?: boolean
  /** Start the deck, muted: a page scroll is not a gesture the visitor meant as "play out loud". */
  play?: boolean
}

let run = 0
let release: (() => void) | null = null
/** The scrubbed drag in flight: which app it ends on, and where the page says the finger is. */
let scrub: { name: string; at: number } | null = null
/** Stops the cue in flight; a drag mid-air lets go where it is. */
export function cancel() {
  run++
  scrub = null
  release?.()
}
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function cue(c: Cue) {
  if (c.split && typeof c.at === 'number' && scrub?.name === c.split) {
    scrub.at = c.at
    return
  }
  cancel()
  const my = run
  if (c.play) {
    nowPlaying.mute()
    if (!nowPlaying.playing) nowPlaying.toggle()
  }
  // After the app that came with the message has landed on the glass.
  if (c.screenshot) void wait(600).then(() => my === run && device.screenshot())
  if (c.split) {
    if (typeof c.at === 'number') scrub = { name: c.split, at: c.at }
    void split(c.split, my)
  }
}

/** Up from the home bar, a pause until it becomes a card, over to the left half, drop, then `name` on the right. */
async function split(name: string, my: number) {
  const ok = () => my === run
  // The app has to have landed, and the inner panel has to be on screen: main.ts
  // hides it while the hinge is still easing open, and a hidden panel has no size.
  let os: HTMLElement | null = null
  let bar: HTMLElement | undefined
  for (let i = 0; i < 40 && ok(); i++) {
    await wait(100)
    os = document.querySelector<HTMLElement>('[data-os="wide"]')
    bar = [...(os?.querySelectorAll<HTMLElement>('[data-homebar]') ?? [])].find((b) => !b.closest('[data-lock]'))
    if (i >= 6 && os?.clientWidth && bar) break
  }
  if (!ok() || !os?.clientWidth || !bar) return
  // Screen px per display px: the panel is scaled in 3D, and grab() divides by the same ratio.
  const s = os.getBoundingClientRect().width / os.clientWidth
  const r = bar.getBoundingClientRect()
  let x = r.left + r.width / 2
  let y = r.top + r.height / 2
  const ev = (type: string, target: EventTarget = window) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'touch'
      })
    )
  ev('pointerdown', bar)
  release = () => {
    release = null
    ev('pointerup')
  }
  // One move a frame: grab() times its hold from the last move, so the card appears once the finger rests.
  const glide = async (dx: number, dy: number, ms: number) => {
    const [x0, y0, t0] = [x, y, performance.now()]
    for (let p = 0; p < 1 && ok(); ) {
      await new Promise(requestAnimationFrame)
      if (!ok()) return
      p = Math.min(1, (performance.now() - t0) / ms)
      const e = 1 - (1 - p) ** 3
      x = x0 + dx * e
      y = y0 + dy * e
      ev('pointermove')
    }
  }
  // Scrubbed: the finger sits where the page's `at` puts it along [from, to] of
  // the drag, and the phase ends once `at` has passed `to`. Moves only go out
  // when the finger actually moved, so a still scroll is a still finger and the
  // hold timer can fire.
  const track = async (dx: number, dy: number, from: number, to: number) => {
    const [x0, y0] = [x, y]
    while (ok() && scrub) {
      const p = Math.min(1, Math.max(0, (scrub.at - from) / (to - from)))
      const [nx, ny] = [x0 + dx * p, y0 + dy * p]
      if (nx !== x || ny !== y) {
        x = nx
        y = ny
        ev('pointermove')
      }
      if (p >= 1) return
      await new Promise(requestAnimationFrame)
    }
  }
  if (scrub) {
    await track(0, -130 * s, 0, 0.35)
    // grab() needs 220 ms of rest before the app becomes a card; a fast scroll waits here and catches up after.
    await wait(300)
    await track(-os.clientWidth * 0.3 * s, 0, 0.45, 0.8)
    await wait(250)
  } else {
    await glide(0, -130 * s, 450)
    await wait(600)
    await glide(-os.clientWidth * 0.3 * s, 0, 450)
    await wait(350)
  }
  if (!ok()) return
  release?.()
  await wait(500)
  if (ok()) device.open(name)
}
