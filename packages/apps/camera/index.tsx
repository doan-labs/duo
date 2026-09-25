// Camera, rebuilt toward Apple's Camera: the six-mode dial, the zoom chips and
// their scrub, flash off/auto/on, an honest auto Night mode read off the feed's
// luminance, the self-timer's countdown, the filters tray, tap-to-focus with
// the sun slider, Portrait's f-stop bokeh, Pano's guided sweep, Live Photos,
// bursts, and QuickTake - holding the shutter in PHOTO or Volume Down on the
// frame records video while you hold it, Volume Up held bursts (the shell maps
// those in device-buttons.ts; this app publishes the hooks on `os.camera`).
//
// The front camera previews mirrored and fires the screen as retina flash; the
// rear one flashes the body's real LED through `os.led`, the same light the
// flashlight uses. Portrait bokeh, the look, the exposure bias and the night
// boost all bake into the still, not just the preview (capture.ts).
//
// Two layouts, picked from the app's own box and not the display: a landscape
// box gets the rail stood up along the right edge, a portrait box gets the
// iPhone stack under the feed.

import { beep } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { Placeholder, Screen } from '@doan-labs/duo-uikit'
import { ICONS, type SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { Num } from '@doan-labs/duo-uikit/num.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { type Aspect, bokeh, evCss, LOOKS, luminance, nightCss, pano, still } from './capture.ts'
import { FocusGlyph, TimerGlyph } from './glyphs.tsx'
import { styles, WHEEL_STEP } from './styles.ts'

type Facing = 'user' | 'environment'
type Flash = 'off' | 'auto' | 'on'

/** The feed on `video`, or a note saying why there isn't one. */
function useWebcam(facing: Facing = 'user') {
  const video = useRef<HTMLVideoElement>(null)
  const bokehVideo = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream>()
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    let s: MediaStream | undefined
    let gone = false
    const ask = (c: MediaStreamConstraints) =>
      navigator.mediaDevices ? navigator.mediaDevices.getUserMedia(c) : Promise.reject(new Error('no mediaDevices'))
    // A laptop has no rear camera; whatever it does have is still the feed.
    ask({ video: { facingMode: facing } })
      .catch(() => ask({ video: true }))
      .then((got) => {
        if (gone) return got.getTracks().forEach((t) => t.stop())
        s = got
        setStream(got)
      })
      .catch(() => setDenied(true))
    return () => {
      gone = true
      s?.getTracks().forEach((t) => t.stop())
      setStream(undefined)
    }
  }, [facing])
  // srcObject is assigned from state so Portrait's second copy picks the same
  // stream up whenever it mounts.
  useEffect(() => {
    if (video.current && video.current.srcObject !== stream) video.current.srcObject = stream ?? null
  })
  useEffect(() => {
    if (bokehVideo.current && bokehVideo.current.srcObject !== stream) bokehVideo.current.srcObject = stream ?? null
  })
  return { video, bokehVideo, denied }
}

const Unavailable = () => (
  <Placeholder xstyle={[styles.msg]}>
    <img src={ICONS.Camera} alt="" {...stylex.props(shared.phImg)} />
    Camera unavailable. Allow access and reopen.
  </Placeholder>
)

const two = (n: number) => String(Math.floor(n)).padStart(2, '0')

/** Apple's order, left to right when held upright. */
const MODES = ['TIME-LAPSE', 'SLO-MO', 'VIDEO', 'PHOTO', 'PORTRAIT', 'PANO'] as const
type Mode = (typeof MODES)[number]
/** Modes that shoot video instead of a still. */
const VIDEOISH: Mode[] = ['VIDEO', 'SLO-MO', 'TIME-LAPSE']

const ASPECTS: Aspect[] = ['4:3', '16:9', '1:1']
const TIMERS = [0, 3, 10]
const FLASHES: Flash[] = ['off', 'auto', 'on']
const ZOOMS = [0.5, 1, 2, 5]
const FSTOPS = [16, 11, 8, 5.6, 4, 2.8, 1.8, 1.4]
const NIGHTS = [0, 1, 2, 3]
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * The camera session, shared by both displays: the mirror copy renders this
 * same state, so folding keeps the mode, zoom, toggles and running record
 * clock you had - the way the real phone keeps its camera across a fold.
 * Per-copy things (the video node, timers, transient flashes) stay local.
 */
type Session = {
  facing: Facing
  mode: Mode
  z: number
  flash: Flash
  live: boolean
  grid: boolean
  aspect: Aspect
  timerSecs: number
  look: number
  ev: number
  fstIdx: number
  night: number
  /** The last luminance verdict, shared so Night's badge survives the fold. */
  dark: boolean
  torch: boolean
  recing: boolean
  clock: string
}
const cam = {
  s: {
    facing: 'user',
    mode: 'PHOTO',
    z: 1,
    flash: 'off',
    live: true,
    grid: false,
    aspect: '4:3',
    timerSecs: 0,
    look: 0,
    ev: 0,
    fstIdx: 3,
    night: 0,
    dark: false,
    torch: false,
    recing: false,
    clock: '00:00'
  } as Session,
  /** Where the record clock keeps its epoch; a fold doesn't restart it. */
  recT0: 0,
  /** The mode a QuickTake suspends and restores. */
  quickMode: null as Mode | null,
  subs: new Set<() => void>(),
  set(p: Partial<Session>) {
    cam.s = { ...cam.s, ...p }
    for (const f of cam.subs) f()
  },
  get: () => cam.s,
  sub(f: () => void) {
    cam.subs.add(f)
    return () => {
      cam.subs.delete(f)
    }
  }
}
const useSession = () => useSyncExternalStore(cam.sub, cam.get)

/** A value that slides in on change - the soft swap, not a hard cut. */
const Roll = ({ k, children }: { k: string | number; children: ReactNode }) => (
  <span key={k} {...stylex.props(styles.roll)}>
    {children}
  </span>
)

/** A round glyph button; `on` tints it yellow like a lit toggle. */
const Tog = ({
  sym,
  glyph,
  label,
  on,
  onClick
}: {
  sym?: keyof typeof SYM
  glyph?: ReactNode
  label: string
  on?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={on}
    {...stylex.props(styles.tog, on && styles.on)}
    onClick={onClick}
  >
    {glyph ?? <Sym name={sym!} size={18} />}
  </button>
)

/** A labelled pill, for the toggles Apple draws as text: aspect and the f-stop. */
const Pill = ({ label, on, onClick }: { label: ReactNode; on?: boolean; onClick: () => void }) => (
  <button type="button" aria-pressed={on} {...stylex.props(styles.nightChip, on && styles.on)} onClick={onClick}>
    {label}
  </button>
)

export const Camera = ({ os }: { os: Os }) => {
  const root = useRef<HTMLDivElement>(null)
  const [land, setLand] = useState(true)
  const { facing, mode, z, flash, live, grid, aspect, timerSecs, look, ev, fstIdx, night, dark, torch, recing, clock } =
    useSession()
  const { video, bokehVideo, denied } = useWebcam(facing)
  const [tray, setTray] = useState(false)
  const [strip, setStrip] = useState(false)
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null)
  const [count, setCount] = useState(0)
  const [bursts, setBursts] = useState(0)
  const [panoOn, setPanoOn] = useState(false)
  const [panoP, setPanoP] = useState(0)
  const [flashOn, setFlashOn] = useState(false)
  const [liveTag, setLiveTag] = useState(false)

  const countTimer = useRef(0)
  const burstTimer = useRef(0)
  const flashTimer = useRef(0)
  const focusTimer = useRef(0)
  const tagTimer = useRef(0)
  const panoRef = useRef<ReturnType<typeof pano> | null>(null)
  const panoFrame = useRef(0)
  const thumbRow = useRef<HTMLDivElement>(null)
  // The torch state the unmount cleanup reads; the effect's closure is stale.
  const torchRef = useRef(false)
  torchRef.current = torch
  // The mirror copy draws everything and starts nothing: it samples no
  // luminance, repaints no filter thumbs and never drives the LED.
  const quiet = !!os.mirror

  const mirror = facing === 'user'
  const videoish = VIDEOISH.includes(mode)
  const portrait = mode === 'PORTRAIT'
  const panoMode = mode === 'PANO'
  const fstop = FSTOPS[fstIdx]!
  const { blur, rx, ry } = bokeh(fstop)
  // The letterboxed feed box for the aspect and orientation in hand.
  const frameBox = {
    '4:3': land ? styles.frame43L : styles.frame43P,
    '16:9': land ? styles.frame169L : styles.frame169P,
    '1:1': land ? styles.frameSqL : styles.frameSqP
  }[aspect]
  const nightSecs = () => (dark ? night || 1 : 0)
  // Preview and still share the night term, so the shot is the frame you saw.
  const previewCss = [LOOKS[look]!.css, evCss(ev), nightCss(nightSecs())].filter(Boolean).join(' ')

  // The box decides the layout: a split half on the wide display is portrait too.
  useEffect(() => {
    const el = root.current!
    const ro = new ResizeObserver(([e]) => setLand(e!.contentRect.width > e!.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The scene's luminance, sampled slow and small: Night's badge appears when
  // the room really is dark, the way Apple's auto mode does.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the interval polls the video ref, whose object is stable
  useEffect(() => {
    if (quiet) return
    const id = setInterval(() => {
      const v = video.current
      if (v) cam.set({ dark: luminance(v) < 0.22 })
    }, 900)
    return () => clearInterval(id)
  }, [quiet])

  // The tray's thumbnails are the live feed under each look, repainted lazily.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the interval polls the video and row refs, whose objects are stable
  useEffect(() => {
    if (!tray || quiet) return
    const tick = () => {
      const v = video.current
      const row = thumbRow.current
      if (!v?.videoWidth || !row) return
      const cells = row.querySelectorAll('canvas')
      cells.forEach((c, i) => {
        const ctx = c.getContext('2d')!
        ctx.filter = LOOKS[i]!.css || 'none'
        const side = Math.min(v.videoWidth, v.videoHeight)
        ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, c.width, c.height)
      })
    }
    tick()
    const id = setInterval(tick, 700)
    return () => clearInterval(id)
  }, [tray, quiet])

  // The LED belongs to Control Center too: the video torch writes the same
  // switch, and a rear flash pulses it. Only the leading copy drives it.
  useEffect(() => {
    if (!quiet) os.led?.(torch)
  }, [torch, quiet, os])

  // The torch only exists while the config that offers it does: leaving the
  // rear camera or a video mode turns it off, like iOS does.
  useEffect(() => {
    if (torch && !(videoish && facing === 'environment')) cam.set({ torch: false })
  }, [torch, videoish, facing])

  const flashPulse = (warm: boolean) => {
    setFlashOn(true)
    clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashOn(false), warm ? 180 : 90)
  }
  const fireFlash = () => {
    const wants = flash === 'on' || (flash === 'auto' && dark)
    if (!wants) return
    if (facing === 'environment') {
      os.led?.(true)
      setTimeout(() => os.led?.(torch), 140)
      flashPulse(false)
    } else {
      flashPulse(true)
    }
  }

  const takeShot = (inBurst = false) => {
    const v = video.current
    if (!v) return
    const url = still(v, {
      aspect,
      zoom: cam.s.z,
      look: LOOKS[look]!.css,
      ev,
      night: nightSecs(),
      fstop: portrait ? fstop : 0,
      upright: !land
    })
    if (!url) return
    os.shots.unshift(url)
    if (inBurst) {
      setBursts((n) => n + 1)
      setFlashOn(true)
      clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashOn(false), 40)
      return
    }
    if (!quiet) beep([1400, 2100], 0.03, 0.06)
    fireFlash()
    if (live) {
      setLiveTag(true)
      clearTimeout(tagTimer.current)
      tagTimer.current = window.setTimeout(() => setLiveTag(false), 900)
    }
  }

  const finishCount = useRef(0)
  const countdown = (secs: number) => {
    setCount(secs)
    finishCount.current = secs
    clearInterval(countTimer.current)
    countTimer.current = window.setInterval(() => {
      finishCount.current -= 1
      setCount(finishCount.current)
      if (finishCount.current <= 0) {
        clearInterval(countTimer.current)
        countTimer.current = 0
        setCount(0)
        if (!quiet) beep([1000, 1500], 0.05, 0.09)
        takeShot()
      } else if (!quiet) {
        beep([1600], 0.03, 0.05)
      }
    }, 1000)
  }
  const cancelCount = () => {
    clearInterval(countTimer.current)
    countTimer.current = 0
    setCount(0)
  }

  // Recording is the indicator and the clock; nothing is kept - Photos shows
  // stills only. Started mid-PHOTO it is QuickTake: the mode restores on stop.
  // recing and the clock live on the session: the display you fold to keeps it.
  const record = (on: boolean) => {
    if (on === cam.s.recing) return
    if (!on) {
      cam.set({ recing: false })
      if (cam.quickMode) {
        cam.set({ mode: cam.quickMode })
        cam.quickMode = null
      }
      return
    }
    if (!videoish) {
      cam.quickMode = mode
      cam.set({ mode: 'VIDEO' })
    }
    cam.recT0 = Date.now()
    cam.set({ recing: true, clock: '00:00' })
  }

  // The leading copy ticks the record clock; the epoch on the session means a
  // fold hands the count to the other display without a hiccup.
  useEffect(() => {
    if (quiet || !recing) return
    const id = setInterval(() => {
      const s = (Date.now() - cam.recT0) / 1000
      cam.set({ clock: `${two(s / 60)}:${two(s % 60)}` })
    }, 250)
    return () => clearInterval(id)
  }, [quiet, recing])

  const burst = (on: boolean) => {
    if (on === !!burstTimer.current) return
    if (on) {
      setBursts(0)
      burstTimer.current = window.setInterval(() => takeShot(true), 140)
      return
    }
    clearInterval(burstTimer.current)
    burstTimer.current = 0
    setTimeout(() => setBursts(0), 1400)
  }

  const startPano = () => {
    const v = video.current
    if (!v?.videoWidth) return
    panoRef.current = pano(v, cam.s.z)
    setPanoOn(true)
    setPanoP(0)
    cancelAnimationFrame(panoFrame.current)
    const step = () => {
      if (!panoRef.current) return
      if (!panoRef.current.step()) return finishPano()
      setPanoP(panoRef.current.progress())
      panoFrame.current = requestAnimationFrame(step)
    }
    panoFrame.current = requestAnimationFrame(step)
    if (!quiet) beep([1400], 0.04, 0.05)
  }
  const finishPano = () => {
    const p = panoRef.current
    if (!p) return
    cancelAnimationFrame(panoFrame.current)
    panoFrame.current = 0
    panoRef.current = null
    setPanoOn(false)
    setPanoP(0)
    os.shots.unshift(p.finish())
    fireFlash()
    if (!quiet) beep([1400, 2100], 0.03, 0.06)
  }

  /** The shutter's tap: still, pano step, countdown cancel or record toggle.
   *  While recording it is the stop square - the stills dot beside it is what
   *  grabs a frame. */
  const shoot = () => {
    if (recing) return record(false)
    if (panoOn) return finishPano()
    if (countTimer.current) return cancelCount()
    if (videoish) return record(true)
    if (panoMode) return startPano()
    if (timerSecs) return countdown(timerSecs)
    if (nightSecs()) return countdown(nightSecs())
    takeShot()
  }

  // The session holds the factor so both displays read it synchronously.
  const zoom = (v?: number) => {
    if (v !== undefined) cam.set({ z: clamp(v, 0.5, 5) })
    return cam.s.z
  }

  // Every render publishes fresh closures, so the frame buttons always act on
  // current state. The mirror copy publishes into its own ctx; the shell only
  // ever reads the leading display's.
  useEffect(() => {
    os.camera.current = { shoot, record, zoom, burst }
  })
  // biome-ignore lint/correctness/useExhaustiveDependencies: unmount-only cleanup; depending on the render-bound helpers would clear the timers every render
  useEffect(
    () => () => {
      os.camera.current = null
      cancelCount()
      clearInterval(burstTimer.current)
      burstTimer.current = 0
      cancelAnimationFrame(panoFrame.current)
      panoRef.current = null
      clearTimeout(flashTimer.current)
      clearTimeout(focusTimer.current)
      clearTimeout(tagTimer.current)
      // A torch the camera lit goes off with it; a Control Center flashlight
      // shares the LED but was never this copy's to write.
      if (!quiet && torchRef.current) os.led?.(false)
    },
    [os]
  )

  // The shutter's hold: drag left is a burst, a held press is QuickTake - the
  // same rules as iOS on the big button. Those gestures only mean something on
  // still modes; everywhere else a press is just the tap.
  const press = useRef<{ t: number; x: number; held: boolean; burst: boolean; gestures: boolean } | null>(null)
  const shutterDown = (e: React.PointerEvent) => {
    const gestures = !videoish && !panoMode && !recing
    press.current = { t: 0, x: e.clientX, held: false, burst: false, gestures }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    if (!gestures) return
    press.current.t = window.setTimeout(() => {
      if (press.current && !press.current.burst) {
        press.current.held = true
        record(true)
      }
    }, 350)
  }
  const shutterMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p?.gestures || p.burst) return
    if (p.x - e.clientX > 26) {
      p.burst = true
      p.held = false
      clearTimeout(p.t)
      burst(true)
    }
  }
  const shutterUp = () => {
    const p = press.current
    if (!p) return
    press.current = null
    clearTimeout(p.t)
    if (p.burst) return burst(false)
    if (p.held) return record(false)
    shoot()
  }
  const shutterCancel = () => {
    const p = press.current
    press.current = null
    if (!p) return
    clearTimeout(p.t)
    if (p.burst) burst(false)
    else if (p.held) record(false)
  }

  /** A tap on the feed sets the focus point and opens the sun slider beside it. */
  const tapFrame = (e: React.PointerEvent<HTMLDivElement>) => {
    if (countTimer.current || panoOn) return
    const r = e.currentTarget.getBoundingClientRect()
    setFocus({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
    clearTimeout(focusTimer.current)
    focusTimer.current = window.setTimeout(() => setFocus(null), 3200)
  }
  const dragEv = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const grab = (y: number) =>
      cam.set({ ev: Math.round(clamp((r.top + r.height / 2 - y) / (r.height / 2), -1, 1) * 20) / 10 })
    grab(e.clientY)
    el.setPointerCapture(e.pointerId)
    const move = (ev2: PointerEvent) => grab(ev2.clientY)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true })
  }

  // The zoom chips: tap picks a preset, a drag across the row scrubs
  // continuously like sliding along Camera Control.
  const zoomDrag = useRef<{ pos: number; z: number; moved: boolean } | null>(null)
  const [scrub, setScrub] = useState(false)
  const zoomDown = (e: React.PointerEvent<HTMLDivElement>) => {
    zoomDrag.current = { pos: land ? e.clientY : e.clientX, z: cam.s.z, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrub(true)
  }
  const zoomMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = zoomDrag.current
    if (!g) return
    // A scrub reads along the strip's axis: right on the row, up on the column.
    const d = land ? g.pos - e.clientY : e.clientX - g.pos
    if (Math.abs(d) < 6) return
    g.moved = true
    zoom(clamp(g.z * 2 ** (d / 110), 0.5, 5))
  }
  const zoomUp = () => {
    setScrub(false)
    // A scrubbed drag ends at the chip it released on without its tap firing:
    // the ref outlives the click the release still dispatches.
    setTimeout(() => {
      zoomDrag.current = null
    })
  }

  // The mode dial drags too. Held wide it is a wheel: the strip rides a drum
  // and a swipe turns it under your finger, settling on the nearest mode.
  // Upright it stays Apple's stepping strip.
  const dialDrag = useRef<{ at: number; from: number; moved: boolean } | null>(null)
  const [dPos, setDPos] = useState<number | null>(null)
  const wheelPos = dPos ?? MODES.indexOf(mode)
  const dialDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dialDrag.current = { at: land ? e.clientY : e.clientX, from: wheelPos, moved: false }
    // Synthetic or assistive pointers can't be captured; the tap still works.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }
  const dialMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = dialDrag.current
    if (!g) return
    const pos = land ? e.clientY : e.clientX
    const d = pos - g.at
    if (land) {
      if (Math.abs(d) < 4) return
      g.moved = true
      setDPos(clamp(g.from + d / WHEEL_STEP, 0, MODES.length - 1))
      return
    }
    if (Math.abs(d) < 34) return
    g.at = pos
    g.moved = true
    // Both axes run the same way: dragging against the order lands the next mode.
    pickMode(MODES[clamp(MODES.indexOf(mode) - Math.sign(d), 0, MODES.length - 1)]!)
  }
  const dialUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = dialDrag.current
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    if (g?.moved && land) pickMode(MODES[clamp(Math.round(wheelPos), 0, MODES.length - 1)]!)
    setDPos(null)
    // A release click still follows; the ref outlives it so a real drag's
    // landing doesn't fire the item under the finger.
    setTimeout(() => {
      dialDrag.current = null
    })
  }

  const pickMode = (m: Mode) => {
    if (m === mode) return
    record(false)
    burst(false)
    if (m !== 'PANO') finishPanoReset()
    cancelCount()
    cam.set({ mode: m })
    setFocus(null)
  }
  const finishPanoReset = () => {
    cancelAnimationFrame(panoFrame.current)
    panoFrame.current = 0
    panoRef.current = null
    setPanoOn(false)
    setPanoP(0)
  }

  // ---- shared bits of chrome ----

  // Off strikes the bolt through; auto keeps it and adds the little 'A' iOS uses.
  const flashBtn = (
    <Tog
      glyph={
        flash === 'auto' ? (
          <>
            <Sym name="bolt" size={15} />
            <span {...stylex.props(styles.flashA)}>A</span>
          </>
        ) : undefined
      }
      sym={flash === 'off' ? 'boltOff' : 'bolt'}
      label={`Flash ${flash}`}
      on={flash !== 'off'}
      onClick={() => cam.set({ flash: FLASHES[(FLASHES.indexOf(flash) + 1) % FLASHES.length]! })}
    />
  )
  const nightChip = dark && (
    <Pill
      label={
        <>
          <Sym name="moonStars" size={14} /> <Roll k={night}>{night ? `${night}s` : 'Auto'}</Roll>
        </>
      }
      on
      onClick={() => cam.set({ night: NIGHTS[(NIGHTS.indexOf(night) + 1) % NIGHTS.length]! })}
    />
  )
  const liveBtn = <Tog sym="live" label="Live Photo" on={live} onClick={() => cam.set({ live: !live })} />
  const filtersBtn = <Tog sym="filters" label="Filters" on={tray} onClick={() => setTray(!tray)} />
  const gridBtn = <Tog sym="grid" label="Grid" on={grid} onClick={() => cam.set({ grid: !grid })} />
  const chevronBtn = (
    <Tog
      glyph={
        <span {...stylex.props(styles.chevron, strip && styles.chevronOpen)}>
          <Sym name="up" size={18} />
        </span>
      }
      label="More controls"
      on={strip}
      onClick={() => setStrip(!strip)}
    />
  )
  const timerBtn = (
    <Pill
      label={
        <>
          <TimerGlyph size={15} />
          {timerSecs ? <Roll k={timerSecs}>{`${timerSecs}s`}</Roll> : ''}
        </>
      }
      on={!!timerSecs}
      onClick={() => cam.set({ timerSecs: TIMERS[(TIMERS.indexOf(timerSecs) + 1) % TIMERS.length]! })}
    />
  )
  const aspectBtn = (
    <Pill
      label={<Roll k={aspect}>{aspect}</Roll>}
      on={aspect !== '4:3'}
      onClick={() => cam.set({ aspect: ASPECTS[(ASPECTS.indexOf(aspect) + 1) % ASPECTS.length]! })}
    />
  )
  const torchBtn = videoish && facing === 'environment' && (
    <Tog sym={torch ? 'torchOn' : 'torchOff'} label="Torch" on={torch} onClick={() => cam.set({ torch: !torch })} />
  )
  const fstopBtn = portrait && (
    <Pill
      label={<Roll k={fstop}>{`\u0192${fstop}`}</Roll>}
      onClick={() => cam.set({ fstIdx: (fstIdx + 1) % FSTOPS.length })}
    />
  )
  const exposureBtn = (
    <Tog
      sym="exposure"
      label="Exposure"
      on={!!focus || ev !== 0}
      onClick={() => {
        setFocus({ x: 50, y: 44 })
        clearTimeout(focusTimer.current)
        focusTimer.current = window.setTimeout(() => setFocus(null), 3200)
      }}
    />
  )
  const flipBtn = (
    <Tog sym="flip" label="Switch camera" onClick={() => cam.set({ facing: mirror ? 'environment' : 'user' })} />
  )
  const thumb: ReactNode = (
    <div {...stylex.props(styles.thumbWrap)}>
      <button
        type="button"
        aria-label="Last photo"
        {...stylex.props(styles.thumb)}
        onClick={() => os.shots.length && os.open('Photos')}
      >
        {os.shots[0] && <img src={os.shots[0]} alt="" {...stylex.props(styles.thumbImg)} />}
      </button>
      {bursts > 0 && (
        <div {...stylex.props(styles.burstBadge)}>
          <Roll k={bursts}>
            <Num value={bursts} />
          </Roll>
        </div>
      )}
    </div>
  )

  const zoomRow = (
    <div
      data-zoom
      {...stylex.props(styles.zoomRow, land && styles.zoomRowLand)}
      onPointerDown={zoomDown}
      onPointerMove={zoomMove}
      onPointerUp={zoomUp}
      onPointerCancel={zoomUp}
    >
      {ZOOMS.map((p) => (
        <button
          type="button"
          key={p}
          {...stylex.props(styles.zl, z === p && styles.zlOn)}
          onClick={() => {
            if (!zoomDrag.current?.moved) zoom(p)
          }}
        >
          <Num value={p} format={{ maximumFractionDigits: 1 }} suffix="×" />
        </button>
      ))}
    </div>
  )
  const zoomPill = (scrub || !ZOOMS.includes(z)) && (
    <div {...stylex.props(styles.zPill, land ? styles.zPillLand : styles.zPillPort)}>
      <Roll k={z.toFixed(1)}>
        <Num value={z} format={{ maximumFractionDigits: 1 }} suffix="×" />
      </Roll>
    </div>
  )

  const dial = land ? (
    // The wheel: modes ride a drum, the pick sits at its centre and the turn
    // eases to a stop rather than jumping.
    <div
      role="tablist"
      {...stylex.props(styles.wheel)}
      onPointerDown={dialDown}
      onPointerMove={dialMove}
      onPointerUp={dialUp}
      onPointerCancel={dialUp}
    >
      {MODES.map((m, i) => (
        <button
          type="button"
          role="tab"
          key={m}
          aria-selected={m === mode}
          {...stylex.props(
            styles.wheelBtn,
            styles.wheelAt(i - wheelPos),
            dPos === null && styles.wheelEase,
            m === mode && styles.modeOn
          )}
          onClick={() => {
            if (!dialDrag.current?.moved) pickMode(m)
          }}
        >
          <span {...stylex.props(styles.wheelText)}>{m}</span>
        </button>
      ))}
    </div>
  ) : (
    <div
      role="tablist"
      {...stylex.props(styles.dial)}
      onPointerDown={dialDown}
      onPointerMove={dialMove}
      onPointerUp={dialUp}
      onPointerCancel={dialUp}
    >
      {MODES.map((m) => (
        <button
          type="button"
          role="tab"
          key={m}
          aria-selected={m === mode}
          {...stylex.props(styles.modeBtn, m === mode && styles.modeOn)}
          onClick={() => pickMode(m)}
        >
          {m}
        </button>
      ))}
    </div>
  )
  const shutterBtn = (
    <button
      type="button"
      data-shutter
      aria-label={recing ? 'Stop recording' : videoish ? 'Record' : 'Take photo'}
      {...stylex.props(
        styles.shutter,
        videoish && styles.shutterVideo,
        mode === 'TIME-LAPSE' && styles.shutterLapse,
        recing && styles.shutterRec
      )}
      onPointerDown={shutterDown}
      onPointerMove={shutterMove}
      onPointerUp={shutterUp}
      onPointerCancel={shutterCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') shoot()
      }}
    />
  )
  // The stills dot iOS shows beside the stop button while recording.
  const stillBtn = recing && (
    <button
      type="button"
      aria-label="Take photo while recording"
      {...stylex.props(styles.stillDot)}
      onClick={() => takeShot()}
    />
  )

  // The strip the chevron opens: Apple's second row of controls.
  const stripRow = strip && !land && (
    <div {...stylex.props(styles.strip)}>
      {aspectBtn}
      {exposureBtn}
      {timerBtn}
      {gridBtn}
      {torchBtn}
      {fstopBtn}
    </div>
  )

  const filterTray = tray && (
    <div {...stylex.props(styles.tray)}>
      <div ref={thumbRow} {...stylex.props(styles.trayRow)}>
        {LOOKS.map((l, i) => (
          <button
            type="button"
            key={l.name}
            {...stylex.props(styles.thumbBtn)}
            onClick={() => cam.set({ look: i })}
            aria-pressed={i === look}
          >
            <canvas width={72} height={72} {...stylex.props(styles.thumbCanvas, i === look && styles.thumbOn)} />
            <span {...stylex.props(styles.thumbName, i === look && styles.thumbNameOn)}>{l.name}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const reticle = focus && (
    <div {...stylex.props(styles.focusMark, styles.focusAt(focus.x, focus.y))}>
      <FocusGlyph />
      <div
        role="slider"
        aria-label="Exposure"
        aria-valuemin={-2}
        aria-valuemax={2}
        aria-valuenow={ev}
        aria-orientation="vertical"
        tabIndex={-1}
        {...stylex.props(styles.evTrackV)}
        onPointerDown={dragEv}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') cam.set({ ev: clamp(ev + 0.1, -2, 2) })
          if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') cam.set({ ev: clamp(ev - 0.1, -2, 2) })
        }}
      >
        <div {...stylex.props(styles.evZero)} />
        <div {...stylex.props(styles.evSun, styles.evSunAt(ev))}>
          <Sym name="sun" size={15} />
        </div>
      </div>
      {ev !== 0 && (
        <div {...stylex.props(styles.evReadout)}>
          <Roll k={ev.toFixed(1)}>
            <Num value={ev} format={{ maximumFractionDigits: 1, signDisplay: 'always' }} />
          </Roll>
        </div>
      )}
    </div>
  )

  const overlays = (
    <>
      {grid && <div {...stylex.props(styles.grid)} />}
      {reticle}
      {liveTag && <div {...stylex.props(styles.liveTag)}>LIVE</div>}
    </>
  )

  const feed = (
    <div {...stylex.props(styles.frame, frameBox)} onPointerUp={tapFrame}>
      {portrait && (
        <video
          ref={bokehVideo}
          autoPlay
          playsInline
          muted
          {...stylex.props(styles.video, styles.zoom(z, mirror), styles.fx(`blur(${blur.toFixed(1)}px) ${previewCss}`))}
        />
      )}
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        {...stylex.props(
          styles.video,
          styles.zoom(z, mirror),
          styles.fx(previewCss),
          portrait && styles.bokehMask(rx, ry)
        )}
      />
      {overlays}
      {denied && <Unavailable />}
    </div>
  )

  const recPill = recing && (
    <div {...stylex.props(styles.rectime)}>
      <span {...stylex.props(styles.recdot)} />
      {clock}
    </div>
  )
  const countOverlay = count > 0 && (
    <div {...stylex.props(styles.countWrap)}>
      <div {...stylex.props(styles.countNum)}>{count}</div>
      {nightSecs() > 0 && !timerSecs && <div {...stylex.props(styles.countHint)}>Hold still</div>}
    </div>
  )
  const panoOverlay = panoMode && (
    <div {...stylex.props(styles.panoWrap)}>
      <div {...stylex.props(styles.panoLine)} />
      <div {...stylex.props(styles.panoFill)}>
        <div {...stylex.props(styles.panoFillAt(panoOn ? panoP : 0))} />
      </div>
      <div {...stylex.props(styles.panoBox, styles.panoBoxAt(panoOn ? panoP : 0))}>
        <Sym name="forward" size={26} />
      </div>
      <div {...stylex.props(styles.panoHint)}>
        {panoOn ? 'Keep moving' : 'Move slowly in the direction of the arrow'}
      </div>
    </div>
  )

  return (
    <Screen ref={root} data-recording={recing || undefined} xstyle={[styles.root]}>
      {feed}
      <div {...stylex.props(styles.flash, flashOn && styles.flashOn, mirror && styles.flashWarm)} />
      {recPill}
      {countOverlay}
      {panoOverlay}
      {zoomPill}
      {filterTray}

      {land ? (
        <>
          <div {...stylex.props(styles.corner, styles.tl)}>
            {flashBtn}
            {nightChip}
          </div>
          <div {...stylex.props(styles.corner, styles.tr)}>
            {gridBtn}
            {timerBtn}
            {liveBtn}
            {flipBtn}
          </div>
          <div {...stylex.props(styles.corner, styles.ml)}>
            {filtersBtn}
            {torchBtn}
            {fstopBtn}
          </div>
          <div {...stylex.props(styles.corner, styles.bl)}>{thumb}</div>
          <div {...stylex.props(styles.rail)}>
            {exposureBtn}
            <div {...stylex.props(styles.railMid)}>
              {zoomRow}
              {dial}
              {shutterBtn}
            </div>
            {aspectBtn}
          </div>
          {recing && <div {...stylex.props(styles.stillLand)}>{stillBtn}</div>}
        </>
      ) : (
        <>
          <div {...stylex.props(styles.topBar)}>
            <div {...stylex.props(styles.topGroup)}>
              {flashBtn}
              {nightChip}
            </div>
            {chevronBtn}
            <div {...stylex.props(styles.topGroup)}>
              {liveBtn}
              {filtersBtn}
            </div>
          </div>
          <div {...stylex.props(styles.bottom)}>
            {stripRow}
            {zoomRow}
            {dial}
            <div {...stylex.props(styles.bottomRow)}>
              {thumb}
              {shutterBtn}
              {flipBtn}
            </div>
          </div>
          {recing && <div {...stylex.props(styles.stillPort)}>{stillBtn}</div>}
        </>
      )}
    </Screen>
  )
}
