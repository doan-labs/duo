// Camera. Also driven by Camera Control and the volume buttons through the
// hooks it publishes on `os.camera` while open (see os/buttons.ts).
//
// Two layouts, picked from the app's own box and not the display: a landscape
// box (the open inner display) gets Apple's rail — the shutter and the mode dial
// stood up along the right edge, toggles in the corners; a portrait box (the
// cover, or one half of a split) gets the iPhone layout, everything stacked
// under the feed. Most toggles only light up: the UI is the point, not the
// image pipeline.
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ICONS, type SYM } from '../../../icons/index.ts'
import type { Os } from '../../uikit/app.ts'
import { Num } from '../../uikit/num.tsx'
import { shared } from '../../uikit/styles.ts'
import { Sym } from '../../uikit/sym.tsx'
import { beep } from '../shared.ts'
import { styles } from './styles.ts'

type Facing = 'user' | 'environment'

/**
 * Webcam feed on `video`, or a note saying why there isn't one. FaceTime keeps
 * its own copy so the two apps do not share a module for eleven lines.
 */
function useWebcam(facing: Facing = 'user') {
  const video = useRef<HTMLVideoElement>(null)
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    let stream: MediaStream | undefined
    let gone = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing } })
      .then((s) => {
        // The app closed before the permission prompt was answered.
        if (gone) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
      })
      .catch(() => setDenied(true))
    return () => {
      gone = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])
  return { video, denied }
}

const Unavailable = () => (
  <div {...stylex.props(shared.ph, styles.msg)}>
    <img src={ICONS.Camera} alt="" {...stylex.props(shared.phImg)} />
    Camera unavailable. Allow access and reopen.
  </div>
)

const two = (n: number) => String(Math.floor(n)).padStart(2, '0')

const MODES = ['VIDEO', 'PHOTO', 'PORTRAIT'] as const
type Mode = (typeof MODES)[number]

/** A round glyph button; `on` tints it yellow like a lit toggle. */
const Tog = ({
  sym,
  label,
  on,
  onClick
}: {
  sym: keyof typeof SYM
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
    <Sym name={sym} size={18} />
  </button>
)

export const Camera = ({ os }: { os: Os }) => {
  const root = useRef<HTMLDivElement>(null)
  const [land, setLand] = useState(true)
  const [facing, setFacing] = useState<Facing>('user')
  const { video, denied } = useWebcam(facing)
  const [mode, setMode] = useState<Mode>('PHOTO')
  const [flash, setFlash] = useState(false)
  const [recing, setRecing] = useState(false)
  const [clock, setClock] = useState('00:00')
  const [z, setZ] = useState(1)
  const [tog, setTog] = useState({
    bolt: false,
    live: false,
    grid: false,
    four: false,
    filters: false,
    exposure: false
  })
  const timer = useRef(0)
  const flashTimer = useRef(0)
  const zRef = useRef(1)
  const flip = (k: keyof typeof tog) => setTog((t) => ({ ...t, [k]: !t[k] }))

  // The box decides the layout: a split half on the wide display is portrait too.
  useEffect(() => {
    const el = root.current!
    const ro = new ResizeObserver(([e]) => setLand(e!.contentRect.width > e!.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const shoot = () => {
    const v = video.current
    if (!v?.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    os.shots.unshift(c.toDataURL('image/jpeg', 0.85))
    beep([1400, 2100], 0.03, 0.06)
    setFlash(true)
    clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 60)
  }
  // Recording is the indicator and the clock; nothing is kept, Photos shows stills only.
  const record = (on: boolean) => {
    if (on === !!timer.current) return
    setRecing(on)
    clearInterval(timer.current)
    timer.current = 0
    if (!on) return
    setMode('VIDEO')
    const t0 = Date.now()
    setClock('00:00')
    timer.current = window.setInterval(() => {
      const s = (Date.now() - t0) / 1000
      setClock(`${two(s / 60)}:${two(s % 60)}`)
    }, 250)
  }
  // A ref beside the state so the shell gets the current factor back synchronously.
  const zoom = (v?: number) => {
    if (v !== undefined) {
      zRef.current = v
      setZ(v)
    }
    return zRef.current
  }
  const shutter = () => (timer.current ? record(false) : mode === 'VIDEO' ? record(true) : shoot())

  // biome-ignore lint/correctness/useExhaustiveDependencies: publish once; the hooks only touch refs, setters and `os`, which live as long as the app
  useEffect(() => {
    os.camera.current = { shoot, record, zoom }
    return () => {
      os.camera.current = null
      record(false)
      clearTimeout(flashTimer.current)
    }
  }, [])

  const dial = (
    <div role="tablist" {...stylex.props(styles.dial, land && styles.dialLand)}>
      {MODES.map((m) => (
        <button
          type="button"
          role="tab"
          key={m}
          aria-selected={m === mode}
          {...stylex.props(styles.modeBtn, land && styles.modeBtnLand, m === mode && styles.modeOn)}
          onClick={() => {
            if (m !== 'VIDEO') record(false)
            setMode(m)
          }}
        >
          {m}
        </button>
      ))}
    </div>
  )
  const shutterBtn = (
    <button
      type="button"
      aria-label={recing ? 'Stop recording' : mode === 'VIDEO' ? 'Record' : 'Take photo'}
      {...stylex.props(styles.shutter, mode === 'VIDEO' && styles.shutterVideo, recing && styles.shutterRec)}
      onClick={shutter}
    />
  )
  const thumb: ReactNode = (
    <button
      type="button"
      aria-label="Last photo"
      {...stylex.props(styles.thumb)}
      onClick={() => os.shots.length && os.open('Photos')}
    >
      {os.shots[0] && <img src={os.shots[0]} alt="" {...stylex.props(styles.thumbImg)} />}
    </button>
  )
  const flipBtn = (
    <Tog sym="flip" label="Switch camera" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')} />
  )
  const boltBtn = <Tog sym={tog.bolt ? 'bolt' : 'boltOff'} label="Flash" on={tog.bolt} onClick={() => flip('bolt')} />
  const liveBtn = <Tog sym="live" label="Live Photo" on={tog.live} onClick={() => flip('live')} />
  const zoomChip = (
    <button type="button" data-zoom {...stylex.props(styles.zl)} onClick={() => zoom(z >= 2 ? 1 : z * 2)}>
      <Num value={z} format={{ maximumFractionDigits: 1 }} suffix="×" />
    </button>
  )

  return (
    <div ref={root} data-recording={recing || undefined} {...stylex.props(shared.body, styles.root)}>
      <div
        {...stylex.props(
          styles.frame,
          tog.four && (land ? styles.frameFourLand : styles.frameFourPort),
          !land && !tog.four && styles.framePort
        )}
      >
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          {...stylex.props(styles.video, styles.zoom(z, facing === 'user'), tog.filters && styles.filtered)}
        />
        {tog.grid && <div {...stylex.props(styles.grid)} />}
        {denied && <Unavailable />}
      </div>
      <div {...stylex.props(styles.flash, flash && styles.flashOn)} />
      {recing && <div {...stylex.props(styles.rectime)}>{clock}</div>}

      {land ? (
        <>
          <div {...stylex.props(styles.corner, styles.tl)}>
            <Tog sym="aspect" label="Aspect ratio" on={tog.four} onClick={() => flip('four')} />
          </div>
          <div {...stylex.props(styles.corner, styles.tr)}>
            <Tog sym="grid" label="Grid" on={tog.grid} onClick={() => flip('grid')} />
            {flipBtn}
          </div>
          <div {...stylex.props(styles.corner, styles.ml)}>
            <Tog sym="filters" label="Filters" on={tog.filters} onClick={() => flip('filters')} />
            {liveBtn}
          </div>
          <div {...stylex.props(styles.corner, styles.bl)}>{thumb}</div>
          <div {...stylex.props(styles.rail)}>
            <Tog sym="exposure" label="Exposure" on={tog.exposure} onClick={() => flip('exposure')} />
            <div {...stylex.props(styles.railMid)}>
              {zoomChip}
              {shutterBtn}
              {dial}
            </div>
            {boltBtn}
          </div>
        </>
      ) : (
        <>
          <div {...stylex.props(styles.topBar)}>
            {boltBtn}
            <Tog sym="up" label="More controls" onClick={() => flip('exposure')} />
            {liveBtn}
          </div>
          <div {...stylex.props(styles.bottom)}>
            {zoomChip}
            {dial}
            <div {...stylex.props(styles.bottomRow)}>
              {thumb}
              {shutterBtn}
              {flipBtn}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
