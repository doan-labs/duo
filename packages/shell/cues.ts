// What an embedding page can make the phone do, beyond posing it: the real
// split-screen drag played by synthetic pointer events through the home bar's
// own handler, the switcher behind the same hold, a folder made on the home
// screen, the wallpaper sheet, a screenshot, a song. Reached from the bridge in
// main.ts only, so the page never touches the shell's DOM itself.
import { nowPlaying } from '@doan-labs/duo-app-music/index.tsx'
import { device } from './device.ts'
import { reset } from './springboard/grid.ts'

export type Cue = {
  /** Drag the open app onto the left half and open this one beside it. */
  split?: string
  /**
   * How far along that drag to be, 0..1, for a page that ties it to its scroll.
   * Later messages for the same `split` move the finger instead of starting
   * over; without it the drag plays out on its own clock.
   */
  at?: number
  /** Up from the home bar, a pause, let go: the running apps as cards. */
  switcher?: boolean
  /** On the home screen: hold Find My, carry it onto Stocks, let go. The grid is factory first, so a return visit makes the same folder. */
  folder?: boolean
  /** Hold the paper, pick the next swatch along, put the sheet away. */
  wallpaper?: boolean
  screenshot?: boolean
  /** Fade the deck in from the middle of the song, muted only where the browser refuses sound without a gesture; a later cue without it fades the song out. */
  play?: boolean
}

let run = 0
/** A cue started the song; the next cue without `play` stops it. */
let sung = false
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
  // Mid-song, so the caption "close it mid-song" is what happens; the song a cue
  // started ends with the next cue that does not ask for it, so a visitor who
  // scrolls on past is not left with a band playing under the rest of the page.
  if (c.play) {
    if (!nowPlaying.playing) {
      nowPlaying.fadeIn(1500)
      nowPlaying.seek(0.5)
    }
    sung = true
  } else if (sung) {
    sung = false
    nowPlaying.fadeOut(900)
  }
  // After the app that came with the message has landed on the glass.
  if (c.screenshot) void wait(600).then(() => my === run && device.screenshot())
  if (c.split) {
    if (typeof c.at === 'number') scrub = { name: c.split, at: c.at }
    void split(c.split, my)
  }
  if (c.switcher) void switcher(my)
  if (c.folder) void folder(my)
  if (c.wallpaper) void wallpaper(my)
}

const ok = (my: number) => my === run

/**
 * The inner panel once it is on screen and whatever has landed on it has
 * settled: main.ts hides it while the hinge is still easing open, and a hidden
 * panel has no size. `s` is screen px per display px: the panel is scaled in 3D.
 */
async function panel(my: number) {
  for (let i = 0; i < 40 && ok(my); i++) {
    await wait(100)
    const os = document.querySelector<HTMLElement>('[data-os="wide"]')
    if (i >= 6 && os?.clientWidth) return { os, s: os.getBoundingClientRect().width / os.clientWidth }
  }
  return null
}

/** One synthetic touch: where it is, and the events it sends from there. */
function finger(el: Element) {
  const r = el.getBoundingClientRect()
  const f = {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    ev(type: string, target: EventTarget = window) {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: f.x,
          clientY: f.y,
          pointerId: 1,
          isPrimary: true,
          pointerType: 'touch'
        })
      )
    },
    /** Presses `el`; cancel() lets go wherever the finger is. */
    down() {
      f.ev('pointerdown', el)
      release = () => {
        release = null
        f.ev('pointerup')
      }
    },
    /** One move a frame: grab() and the tiles time their holds from the last move, so the hold fires once the finger rests. */
    async glide(dx: number, dy: number, ms: number, my: number) {
      const [x0, y0, t0] = [f.x, f.y, performance.now()]
      for (let p = 0; p < 1 && ok(my); ) {
        await new Promise(requestAnimationFrame)
        if (!ok(my)) return
        p = Math.min(1, (performance.now() - t0) / ms)
        const e = 1 - (1 - p) ** 3
        f.x = x0 + dx * e
        f.y = y0 + dy * e
        f.ev('pointermove')
      }
    }
  }
  return f
}

/** The home bar of an app on `os`: the lock screen draws the same pill and is not it. */
const homeBar = (os: HTMLElement) =>
  [...os.querySelectorAll<HTMLElement>('[data-homebar]')].find((b) => !b.closest('[data-lock]'))

const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

/** Up from the home bar, a pause until it becomes a card, over to the left half, drop, then `name` on the right. */
async function split(name: string, my: number) {
  const p = await panel(my)
  const bar = p && homeBar(p.os)
  if (!p || !bar) return
  const { os, s } = p
  const f = finger(bar)
  f.down()
  // Scrubbed: the finger sits where the page's `at` puts it along [from, to] of
  // the drag, and the phase ends once `at` has passed `to`. Moves only go out
  // when the finger actually moved, so a still scroll is a still finger and the
  // hold timer can fire.
  const track = async (dx: number, dy: number, from: number, to: number) => {
    const [x0, y0] = [f.x, f.y]
    while (ok(my) && scrub) {
      const q = Math.min(1, Math.max(0, (scrub.at - from) / (to - from)))
      const [nx, ny] = [x0 + dx * q, y0 + dy * q]
      if (nx !== f.x || ny !== f.y) {
        f.x = nx
        f.y = ny
        f.ev('pointermove')
      }
      if (q >= 1) return
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
    await f.glide(0, -130 * s, 450, my)
    await wait(600)
    await f.glide(-os.clientWidth * 0.3 * s, 0, 450, my)
    await wait(350)
  }
  if (!ok(my)) return
  release?.()
  await wait(500)
  if (ok(my)) device.open(name)
}

/** Up from the home bar, a pause, let go where it is: the switcher. Already up (a split let go mid-hold opens it too): nothing to do. */
async function switcher(my: number) {
  const p = await panel(my)
  if (!p || p.os.querySelector('[data-switcher]')) return
  const bar = homeBar(p.os)
  if (!bar) return
  const f = finger(bar)
  f.down()
  await f.glide(0, -130 * p.s, 450, my)
  await wait(600)
  if (ok(my)) release?.()
}

/** A tile by the name under it. */
const tile = (os: HTMLElement, name: string) =>
  [...os.querySelectorAll<HTMLElement>('[data-cell]')].find((t) => t.textContent === name)

/** Hold Find My until it lifts, carry it onto Stocks, let go: the two become a folder. */
async function folder(my: number) {
  const p = await panel(my)
  if (!p) return
  reset()
  await wait(400)
  const from = tile(p.os, 'Find My')
  const to = tile(p.os, 'Stocks')
  if (!ok(my) || !from || !to) return
  const f = finger(from)
  const t = finger(to)
  f.down()
  // The tile's own hold, 500 ms still, then a moment lifted before it moves.
  await wait(700)
  await f.glide(t.x - f.x, t.y - f.y, 500, my)
  // Over the other icon long enough for its well to show.
  await wait(500)
  if (ok(my)) release?.()
}

/** Hold the paper until the sheet comes up, tap the swatch after the one on, then put the sheet away. */
async function wallpaper(my: number) {
  const p = await panel(my)
  const paper = p?.os.querySelector<HTMLElement>('[data-pages]')
  if (!p || !paper) return
  const f = finger(paper)
  f.down()
  await wait(700)
  if (ok(my)) release?.()
  await wait(700)
  const sheet = p.os.querySelector<HTMLElement>('[data-wallpapers]')
  const swatch = sheet?.querySelector('[data-paper]:not([data-on])')
  if (!ok(my) || !sheet || !swatch) return
  click(swatch)
  await wait(1600)
  if (ok(my)) click(sheet)
}
