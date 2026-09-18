// The transient overlays the shell throws over whatever is on screen: the
// volume readout, the screenshot flash with its shrinking thumbnail, the
// flashlight card and the brightness veil. None of them belongs to an app or to the home screen, which is
// why they collect here instead. Every `data-hud` attribute below is a debug probe
// documented in docs/debug.md, and screenshot() strips elements by that same
// attribute, so nothing here can be renamed on its own.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type RefObject, useEffect, useId, useRef, useState } from 'react'
import { device } from '../device.ts'
import { useToggles } from './toggles.ts'

// SF Symbols speaker.wave.2.fill.
const Speaker = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="#fff" stroke="#fff" strokeWidth={2} strokeLinecap="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.3 6.4a8 8 0 0 1 0 11.2" fill="none" />
  </svg>
)

// Volume HUD, hung under the buttons on the frame. iOS puts it beside them:
// an unlabelled bar anywhere else reads as brightness.
export const VolumeHud = ({ wide, on, level }: { wide: boolean; on: boolean; level: number }) => (
  <div
    data-hud="vol"
    data-on={on || undefined}
    {...stylex.props(shared.glass, styles.vol, wide ? styles.volWide : styles.volNarrow, on && styles.volOn)}
  >
    <Speaker />
    <div {...stylex.props(styles.trk)}>
      <i {...stylex.props(styles.fill, styles.fillW((level / 16) * 100))} />
    </div>
  </div>
)

/** `show` is what the frame's volume buttons reach; `setLevel` is Control Center's slider. */
export function useVolumeHud() {
  const [vol, setVol] = useState({ on: false, level: device.level })
  const volTimer = useRef(0)

  const show = () => {
    setVol({ on: true, level: device.level })
    clearTimeout(volTimer.current)
    volTimer.current = setTimeout(() => setVol((v) => ({ ...v, on: false })), 1400)
  }

  const setLevel = (n: number) => {
    device.level = n
    setVol((v) => ({ ...v, level: n }))
  }

  return { vol, show, setLevel }
}

export type Thumb = { id: number; copy: HTMLElement; w: number; h: number; out: boolean }
let seq = 0

export function useScreenshot(disp: RefObject<HTMLDivElement | null>) {
  const [flash, setFlash] = useState(false)
  const [thumbs, setThumbs] = useState<Thumb[]>([])

  /** A flash, then a copy of the page shrinks into the corner. The copy is DOM, not pixels: nothing here can read pixels back. */
  const screenshot = () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 40)
    const d = disp.current!
    const W = d.clientWidth
    const H = d.clientHeight
    const copy = d.cloneNode(true) as HTMLElement
    // data-hud marks what a screenshot must not contain; debug.md probes by the same attributes.
    for (const e of copy.querySelectorAll('[data-hud]')) e.remove()
    copy.style.cssText += `;position:relative;inset:auto;width:${W}px;height:${H}px;transform:scale(.2);transform-origin:0 0;pointer-events:none`
    const id = ++seq
    setThumbs((t) => [...t, { id, copy, w: W * 0.2 + 4, h: H * 0.2 + 4, out: false }])
    setTimeout(() => setThumbs((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x))), 2600)
    setTimeout(() => setThumbs((t) => t.filter((x) => x.id !== id)), 3100)
  }

  return { flash, thumbs, screenshot }
}

export const Flash = ({ on }: { on: boolean }) => (
  <div data-hud="flash" {...stylex.props(styles.flash, on && styles.flashHit)} />
)

export const Thumbs = ({ thumbs }: { thumbs: Thumb[] }) => (
  <>
    {thumbs.map((t) => (
      <div
        key={t.id}
        data-hud="thumb"
        ref={(el) => el?.replaceChildren(t.copy)}
        {...stylex.props(styles.thumb, t.out && styles.thumbOut, styles.size(t.w, t.h))}
      />
    ))}
  </>
)

/**
 * The flashlight card: iOS 18's Dynamic Island expansion, a black card that
 * drops from the top edge with the brightness arc, the beam and the torch, and
 * goes back up after a moment. The Duo has no island, so the card comes out of
 * the top edge on its own. It watches the device-wide switch and not the tile
 * that flipped it, so the lock screen button and the cover's tile show it too.
 */
export function TorchHud() {
  const { torch } = useToggles()
  const [show, setShow] = useState(false)
  const was = useRef(torch)
  useEffect(() => {
    // Mounting is not a flip: the card should not drop on every display at boot.
    if (was.current === torch) return
    was.current = torch
    setShow(true)
    const id = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(id)
  }, [torch])
  // Gradient and filter ids are per document; both displays draw this card.
  const id = useId()
  return (
    <div data-hud="torch" data-on={torch || undefined} {...stylex.props(styles.torch, show && styles.torchIn)}>
      <svg viewBox="0 0 230 300" width={230} height={300} fill="none" stroke="#fff" strokeLinecap="round">
        <defs>
          <linearGradient id={`${id}b`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".35" stopColor="#dde6ff" stopOpacity=".45" />
            <stop offset="1" stopColor="#dde6ff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        {/* Five brightness steps along the arc; the torch here has one level, all lit when on. */}
        <path d="M50 88a70 70 0 0 1 130 0" strokeWidth={2.5} strokeDasharray="20 6" opacity={torch ? 0.9 : 0.3} />
        {/* The fan of light out of the torch's head, softened so it reads as light and not a shape. */}
        <path
          d="M115 205 L38 105 Q115 78 192 105 Z"
          fill={`url(#${id}b)`}
          filter={`url(#${id}f)`}
          stroke="none"
          {...stylex.props(styles.beam, torch && show && styles.beamOn)}
        />
      </svg>
      <div {...stylex.props(styles.torchSun)}>
        <Sym name="sun" size={13} />
      </div>
      <div {...stylex.props(styles.torchGlyph)}>
        <Sym name={torch ? 'torchOn' : 'torchOff'} size={68} />
      </div>
    </div>
  )
}

// Display brightness, 0..1. Full above .7 so the panel looks as it always has
// until someone pulls the slider down; below that a black veil thickens.
export const Veil = ({ bright }: { bright: number }) => (
  <div data-hud="dim" {...stylex.props(styles.veil, styles.alpha(bright < 0.7 ? ((0.7 - bright) / 0.7) * 0.85 : 0))} />
)

const shrink = stylex.keyframes({ from: { transform: 'scale(4.5)', opacity: 0.6 } })

const styles = stylex.create({
  // Volume HUD. The left edge is where the volume buttons are on the frame, 4.9 cm
  // right of the hinge, in this panel's px, minus half the width (the cover panel
  // is mirrored, so from its left).
  vol: {
    position: 'absolute',
    top: 14,
    width: 140,
    height: 36,
    borderRadius: 18,
    zIndex: 9,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 12,
    opacity: 0,
    transform: 'translateY(-8px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: '.25s',
    pointerEvents: 'none'
  },
  volWide: { left: 630 - 70 },
  volNarrow: { left: 141 - 70 },
  volOn: { opacity: 1, transform: 'none', transitionDuration: '.12s' },
  trk: { flexGrow: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,.28)', overflow: 'hidden' },
  fill: {
    display: 'block',
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 4,
    transitionProperty: 'width',
    transitionDuration: '.1s'
  },
  fillW: (pct: number) => ({ width: `${pct}%` }),

  // Screenshot: a flash, then the page shrinks into the corner and leaves.
  flash: {
    position: 'absolute',
    inset: 0,
    zIndex: 9,
    backgroundColor: colors.white,
    opacity: 0,
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  flashHit: { opacity: 1, transitionProperty: 'none' },
  thumb: {
    position: 'absolute',
    left: 14,
    bottom: 30,
    zIndex: 9,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: '0 6px 18px rgba(0,0,0,.45)',
    transformOrigin: '0 100%',
    animationName: shrink,
    animationDuration: '.5s',
    animationTimingFunction: 'cubic-bezier(.2,.9,.3,1)',
    animationFillMode: 'both',
    transitionProperty: 'transform, opacity',
    transitionDuration: '.35s',
    transitionTimingFunction: 'ease-in, ease'
  },
  thumbOut: { transform: 'translateX(-130%)', opacity: 0 },
  size: (w: number, h: number) => ({ width: w, height: h }),

  // Flashlight card. Grows out of the top edge like the island it stands in for,
  // and the beam only brightens once it is down, so it reads as the torch
  // coming on rather than a lit card arriving.
  torch: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 230,
    height: 300,
    marginLeft: -115,
    borderRadius: 44,
    zIndex: 9,
    backgroundColor: colors.black,
    overflow: 'hidden',
    pointerEvents: 'none',
    opacity: 0,
    transform: 'translateY(-60%) scale(.35, .15)',
    transformOrigin: '50% 0',
    transitionProperty: 'opacity, transform',
    transitionDuration: '.3s, .4s',
    transitionTimingFunction: 'ease-in, cubic-bezier(.4,0,.8,.6)'
  },
  torchIn: {
    opacity: 1,
    transform: 'none',
    transitionTimingFunction: 'ease-out, cubic-bezier(.2,.9,.3,1.08)'
  },
  torchSun: { position: 'absolute', top: 62, left: 186, opacity: 0.85 },
  torchGlyph: { position: 'absolute', top: 196, left: 0, right: 0, display: 'flex', justifyContent: 'center' },
  // The beam grows out of the head once the card is down. `transform-box` so the
  // scale is about the path's own base and not the SVG's origin.
  beam: {
    opacity: 0,
    transform: 'scale(.4)',
    transformBox: 'fill-box',
    transformOrigin: '50% 100%',
    transitionProperty: 'opacity, transform',
    transitionDuration: '.45s',
    transitionTimingFunction: 'ease-out'
  },
  beamOn: { opacity: 1, transform: 'none', transitionDelay: '.2s' },

  // Brightness: a black veil over everything on the display, panel included.
  veil: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    backgroundColor: colors.black,
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: '.12s'
  },
  alpha: (o: number) => ({ opacity: o })
})
