// The scenes on one display: which apps are open, which half each holds, and
// the zoom that grows one out of the icon it came from. iOS's word, and the
// right one here — a scene is an app instance on glass, taking all of the
// display or one half of it, never more than two at once (decisions.md 21).
//
// Its own file because the frame buttons, the other display and the home-bar
// drag all reach into this list, and none of them should have to reach through
// the shell to do it.

import type { CameraHooks, Os } from '@doan-labs/duo-sdk'
import type { App } from '@doan-labs/duo-uikit/app.ts'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { byName } from '../apps.ts'
import { device, type Stage } from '../device.ts'
import { store } from '../runtime/catalog.ts'
import { type Box, type Side, settle, spot, zone, zoom } from './gestures.ts'
import type { Open } from './tile.tsx'

/**
 * `side` unset is the whole display; `from` is the icon it grew out of and
 * shrinks back into. A `parked` scene is off the glass but still mounted, so the
 * app switcher can show it and put it back with its state intact; `used` orders
 * the switcher, most recent first.
 */
export type Scene = {
  id: number
  a: App
  ctx: Os
  leaving: boolean
  parked?: boolean
  used: number
  side?: Side
  from: Box
}

/** Apps kept mounted off the glass. Past this the oldest goes, so iframes do not pile up. */
const PARKED = 6

let seq = 0

type Opts = {
  /** Display size in CSS px, the fallback before the panel is in the document. */
  w: number
  hgt: number
  /** Photos taken in Camera on this display, newest first. */
  shots: string[]
  disp: React.RefObject<HTMLDivElement | null>
  /** The home screen's current page; `at()` has to subtract its offset. */
  pageRef: React.RefObject<number>
}

export function useScenes({ w, hgt, shots, disp, pageRef }: Opts) {
  const els = useRef(new Map<number, HTMLDivElement>())
  const zoomed = useRef(new Set<number>())

  // The frame buttons and the other display call in between renders, so what
  // they read lives in refs; state only mirrors it for React.
  const [scenes, setScenes] = useState<Scene[]>([])
  const live = useRef(scenes)
  const setList = (next: Scene[]) => {
    live.current = next
    setScenes(next)
  }
  const onStage = () => live.current.filter((e) => !e.leaving && !e.parked)
  /** Everything mounted, on the glass or parked, most recently used first: the switcher's cards. */
  const recent = () => live.current.filter((e) => !e.leaving).sort((a, b) => b.used - a.used)
  // Where the divider between two halves sits, as a fraction of the width. A ref
  // for the gestures, which read it between renders; state for the layout.
  const [split, setSplit] = useState(0.5)
  const splitRef = useRef(0.5)
  const setRatio = (v: number) => {
    splitRef.current = v
    setSplit(v)
  }
  /** Nothing of the home screen shows: one app over all of it, or one on each half. */
  const covered = () => {
    const on = onStage()
    return on.length === 2 || on.some((e) => !e.side)
  }

  // `?app=` opens before the panel is in the document, where clientWidth is 0
  // and the scale factor comes out infinite. Fall back to the known size.
  const panel = () => [disp.current?.clientWidth || w - 22, disp.current?.clientHeight || hgt - 22] as const
  const box = (side: Side | undefined) => zone(side, ...panel(), splitRef.current)
  const at = (el: HTMLElement) => spot(el, disp.current!, pageRef.current)

  /**
   * Opens `a` over the whole display, or on the free half while another app
   * holds the other one; `side` pins it (an app replacing itself in place).
   * `quiet` skips the zoom: the app is simply there, as a mirror's is.
   */
  function open(a: App, from?: Box, arg?: string, side?: Side, quiet = false) {
    const on = onStage()
    if (on.some((e) => !e.side)) return
    if (!side && on[0]) side = on[0].side === 'left' ? 'right' : 'left'
    if (on.some((e) => e.side === side)) return
    // Already parked: the app comes back as it was, not as a second copy.
    const kept = live.current.find((e) => e.parked && !e.leaving && same(e, a))
    if (kept) return unpark(kept.id, side)
    const z = box(side)
    from ??= { x: z.x + z.w / 2 - 30, y: z.y + z.h / 2 - 30, w: 60, h: 60 }
    const id = ++seq
    if (quiet) zoomed.current.add(id)
    const ctx: Os = {
      store,
      shots,
      open: (name, g) => swap(id, name, g),
      home: () => park(id),
      arg,
      display: w > 600 ? 'inner' : 'cover',
      mirror: quiet || undefined,
      camera: { current: null }
    }
    setList([...live.current, { id, a, ctx, leaving: false, used: Date.now(), side, from }])
  }
  const same = (e: Scene, a: App) => (a.id ? e.a.id === a.id : e.a.name === a.name)
  /**
   * Off the glass, still running: the Home gesture. Plays `anims` (the zoom back
   * into its icon by default) and then hides it. The camera is the exception
   * and closes, so a parked Camera cannot keep the webcam on.
   */
  function park(id: number, anims?: Animation[]) {
    const e = live.current.find((x) => x.id === id && !x.leaving && !x.parked)
    if (!e) return
    if (e.ctx.camera.current) return close(id, anims)
    setList(live.current.map((x) => (x === e ? { ...x, leaving: true } : x)))
    const el = els.current.get(e.id)
    settle(anims ?? (el ? [zoom(el, e.from, true, box(e.side))] : []), () => {
      setList(live.current.map((x) => (x.id === e.id ? { ...x, leaving: false, parked: true } : x)))
      const parked = live.current.filter((x) => x.parked).sort((a, b) => a.used - b.used)
      for (const old of parked.slice(0, Math.max(0, parked.length - PARKED))) close(old.id, [])
    })
  }
  /**
   * Back on the glass, over the whole display unless `side` says otherwise. Plays
   * `anims` if given (the switcher's card growing into place), else the icon zoom.
   */
  function unpark(id: number, side?: Side, anims?: Animation[] | ((el: HTMLElement) => Animation[])) {
    const e = live.current.find((x) => x.id === id && x.parked && !x.leaving)
    if (!e) return
    flushSync(() => setList(live.current.map((x) => (x === e ? { ...x, parked: false, side, used: Date.now() } : x))))
    const el = els.current.get(e.id)
    if (!el) return
    const list = typeof anims === 'function' ? anims(el) : (anims ?? [zoom(el, e.from, false, box(side))])
    Promise.all(list.map((a) => a.finished)).then(
      () => {
        for (const a of list) a.cancel()
      },
      () => {}
    )
  }
  function close(id: number, anims?: Animation[]) {
    const e = live.current.find((x) => x.id === id && !x.leaving)
    if (!e) return
    setList(live.current.map((x) => (x === e ? { ...x, leaving: true } : x)))
    const el = els.current.get(e.id)
    settle(anims ?? (el ? [zoom(el, e.from, true, box(e.side))] : []), () => {
      zoomed.current.delete(e.id)
      setList(live.current.filter((x) => x.id !== e.id))
    })
  }
  /** Home: everything on the glass is parked. */
  const parkAll = () => {
    for (const e of onStage()) park(e.id)
  }
  /** One app opening another in its place (Siri, Contacts, Shortcuts, News → Safari). */
  function swap(id: number, name: string, arg?: string) {
    const a = byName(name)
    const e = live.current.find((x) => x.id === id)
    if (!a || !e) return
    close(id)
    setTimeout(() => open(a, e.from, arg, e.side), 190)
  }
  const openFrom: Open = (a, el) => open(a, at(el))

  /**
   * What the frame's Siri, Wallet and Camera buttons do, and what `?app=` does.
   * `arg` is the deep link: the status stack opens Settings straight at Wi-Fi.
   */
  const launch = (name: string, arg?: string) => {
    if (device.asleep) device.wake()
    const a = byName(name)
    const on = onStage()
    if (!a || on.some((e) => same(e, a))) return
    // Into the free half if there is one; otherwise in place of the app under
    // the status stack, the one iOS would call frontmost.
    const victim = on.find((e) => !e.side) ?? (on.length === 2 ? on.find((e) => e.side === 'right') : undefined)
    if (victim) swap(victim.id, name, arg)
    else open(a, undefined, arg)
  }
  const stage = (): Stage => onStage().map((e) => ({ name: e.a.id ?? e.a.name, side: e.side }))
  /**
   * This display as the other one's mirror (device.ts `follow`): made to match
   * `want` with no zoom in or out, since nothing is being launched or closed
   * here — the fold is showing the same session on another piece of glass.
   */
  const mirror = (want: Stage) => {
    const on = onStage()
    if (
      on.length === want.length &&
      on.every((e, i) => (e.a.id ?? e.a.name) === want[i]?.name && e.side === want[i]?.side)
    )
      return
    for (const e of on) close(e.id, [])
    for (const s of want) {
      const a = byName(s.name)
      if (a) open(a, undefined, undefined, s.side, true)
    }
  }
  /** The Camera app's hooks, when it is open here. */
  const cam = (): CameraHooks | null => onStage().find((e) => e.ctx.camera.current)?.ctx.camera.current ?? null

  // The app is in the DOM only after the commit, so the zoom that grows it out
  // of its icon starts here rather than in open().
  useLayoutEffect(() => {
    for (const e of scenes) {
      if (e.leaving || zoomed.current.has(e.id)) continue
      zoomed.current.add(e.id)
      const el = els.current.get(e.id)
      if (!el) continue
      // Its last frame is the resting style, so it can go once it has played:
      // left in place, a `fill: both` animation would beat the transform grab() writes.
      const a = zoom(el, e.from, false, box(e.side))
      a.finished.then(
        () => a.cancel(),
        () => {}
      )
    }
  })

  // `live` and `setList` are handed out raw for the home-bar drag, which reads
  // the list mid-gesture and rewrites two entries' sides in one flushSync.
  return {
    scenes,
    live,
    setList,
    els,
    disp,
    onStage,
    recent,
    covered,
    panel,
    box,
    split,
    splitRef,
    setRatio,
    at,
    open,
    close,
    park,
    unpark,
    parkAll,
    swap,
    openFrom,
    launch,
    stage,
    mirror,
    cam
  }
}

export type Scenes = ReturnType<typeof useScenes>
