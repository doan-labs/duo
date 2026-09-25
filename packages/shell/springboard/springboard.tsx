// The shell one display runs: the layer stack, and the state that outlives any
// one layer. Status stack, home screen, lock screen, Spotlight, Control Center,
// the system HUDs and the open apps all stack here, in z-order, and each is its
// own file. What is left in this one is the wiring: which layer is up, what the
// frame buttons reach, and the animations the layers hand back to be scrubbed.
//
// Sizes are CSS px at 5 px/mm (PXM in main.ts).
//
// React owns the structure; Web Animations own the timing. Everything a finger
// scrubs (the unlock lift, the app zoom, the home-bar drag) is imperative on refs,
// because a scrubbed animation has no declarative equivalent.

// An app wears the kit's light or dark theme, inherited by every nav page inside.
import { dark, light } from '@doan-labs/duo-uikit/styles.ts'
import {
  app,
  chrome,
  colors,
  easing,
  layout,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { byName } from '../apps.ts'
import { addDisplay, type Display, device, lockState, unlockAll } from '../device.ts'
import { Sandbox } from '../runtime/sandbox.tsx'
import { ControlCenter } from './control-center.tsx'
import { settle, swipe } from './gestures.ts'
import { type Drop, HomeBar, HomeBars } from './home-bar.tsx'
import { HomeScreen } from './home-screen.tsx'
import { LockScreen } from './lock-screen.tsx'
import { BOOT_FADE_MS, BOOT_MS, BootScreen, PowerSheet } from './power.tsx'
import { useScenes } from './scenes.ts'
import { Spotlight } from './spotlight.tsx'
import { StatusBar } from './status-bar.tsx'
import { Switcher } from './switcher.tsx'
import { Flash, Thumbs, TorchHud, useScreenshot, useVolumeHud, Veil, VolumeHud } from './system-hud.tsx'
import { useToggles } from './toggles.ts'
import { useWallpaper } from './wallpaper.ts'

export type SpringBoardProps = { w: number; hgt: number; boot?: string | null; arg?: string | null; shots: string[] }

export function SpringBoard({ w, hgt, boot, arg, shots }: SpringBoardProps) {
  // Folded, the cover display shows the left half of both the grid and the
  // wallpaper, so the picture does not jump when the hinge closes.
  const wide = w > 600
  const wall = useWallpaper()
  const disp = useRef<HTMLDivElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const lockEl = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLDivElement>(null)
  const pageNow = useRef(0)

  const ctl = useScenes({ w, hgt, shots, disp, pageRef: pageNow })
  const { at, parkAll, launch, open, openFrom, scenes, split } = ctl
  const t = useToggles()

  const [drop, setDrop] = useState<Drop>(null)
  const [switcher, setSwitcher] = useState(false)
  const [land, setLand] = useState(0)
  const [locked, setLocked] = useState(lockState.locked)
  const hasLock = useRef(lockState.locked)
  const [lockOn, setLockOn] = useState(lockState.locked)
  const [lockKey, setLockKey] = useState(0)
  const [asleep, setAsleep] = useState(false)
  const [searching, setSearching] = useState(false)
  const [poff, setPoff] = useState(false)
  const [booting, setBooting] = useState<false | 'up' | 'leaving'>(false)
  const [cc, setCc] = useState(false)
  const ccOn = useRef(false)
  const ccScrim = useRef<HTMLDivElement>(null)
  const ccPanel = useRef<HTMLDivElement>(null)
  const [bright, setBright] = useState(0.7)
  const { vol, show: hud, setLevel } = useVolumeHud()
  const { flash, thumbs, screenshot } = useScreenshot(disp)

  /**
   * The home screen scaling in from behind whatever is leaving. Scrubbed by a
   * finger as often as played, so a plain ease-out: a steep curve makes the
   * first centimetre of drag do most of the work.
   */
  const reveal = () =>
    shell.current!.animate(
      [
        { transform: 'scale(1.1)', opacity: 0 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: 420, easing: 'ease-out', fill: 'both' }
    )
  const lift = (el: HTMLElement) => [
    el.animate(
      [
        { transform: 'none', opacity: 1, filter: 'blur(0)' },
        { transform: 'translateY(-8%) scale(1.08)', opacity: 0, filter: 'blur(10px)' }
      ],
      { duration: 380, easing: 'ease-out', fill: 'both' }
    ),
    reveal()
  ]

  function lock() {
    if (hasLock.current) return
    setSwitcher(false)
    parkAll()
    hasLock.current = true
    setLocked(true)
    setLockOn(true)
    // A fresh element: one still lifting out cannot be the one that comes back.
    setLockKey((k) => k + 1)
  }
  /** Plays the lock screen out. Pass the animations a swipe already scrubbed. */
  function unlock(anims?: Animation[]) {
    if (!hasLock.current) return
    hasLock.current = false
    setLocked(false)
    // Icons land again, as on first paint: the unlock is what reveals them.
    setLand((k) => k + 1)
    const el = lockEl.current
    if (!el) return setLockOn(false)
    settle(anims ?? lift(el), () => {
      if (!hasLock.current) setLockOn(false)
    })
  }
  const powerOn = () => {
    setBooting('up')
    setTimeout(() => {
      device.wake()
      setBooting('leaving')
      setTimeout(() => setBooting(false), BOOT_FADE_MS)
    }, BOOT_MS)
  }

  const cur = scenes.filter((e) => !e.leaving && !e.parked)
  const away = switcher || cur.length === 2 || cur.some((e) => !e.side)
  // The status stack sits top-right, so the app under it decides its colour.
  const topRight = cur.find((e) => e.side !== 'left')
  const lit = !!topRight?.a.light && !t.darkMode
  // A `rail` app on the cover runs its chrome down the punch-hole column, so the stack stays whole.
  const railed = !wide && !!topRight?.a.rail
  // One half taken, the home screen squeezes into the other as a whole narrow
  // home, like the cover display's. An app still shrinking out of a half keeps
  // the home there until it is gone, so it lands on the icon it is aiming at.
  const half = cur.filter((e) => e.side)
  const holder = half.length === 1 ? half[0] : half.length === 0 ? scenes.find((e) => e.leaving && e.side) : undefined
  const homeSide = holder ? (holder.side === 'left' ? 'right' : 'left') : undefined
  // The divider is only there with an app on each side, and goes back to the
  // middle once one leaves: the narrow home the other half shows is always half.
  const two = half.length === 2
  // biome-ignore lint/correctness/useExhaustiveDependencies: setRatio writes a ref and a setter, never stale
  useEffect(() => {
    if (!two) ctl.setRatio(0.5)
  }, [two])
  /** Nothing on the glass but apps parked behind it: a swipe up from the bottom finds them. */
  const parked = scenes.some((e) => e.parked && !e.leaving)
  const rise = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = disp.current!
    const s = d.clientWidth / d.getBoundingClientRect().width
    const y0 = e.clientY
    let dy = 0
    let v = 0
    let t = e.timeStamp
    const move = (m: PointerEvent) => {
      const ny = (y0 - m.clientY) * s
      v = (ny - dy) / Math.max(1, m.timeStamp - t)
      t = m.timeStamp
      dy = ny
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      // swipe()'s commit rule: a third of the way or a flick.
      if (dy > 49 || v > 0.6) setSwitcher(true)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }
  const divide = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = disp.current!
    const s = d.clientWidth / d.getBoundingClientRect().width
    const from = ctl.splitRef.current
    const x0 = e.clientX
    const move = (m: PointerEvent) =>
      ctl.setRatio(Math.min(0.7, Math.max(0.3, from + ((m.clientX - x0) * s) / d.clientWidth)))
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  // ---------- Control Center ----------

  /** The scrim fading and the panel sliding down, both scrubbable; `out` reverses them. */
  const ccAnim = (out: boolean) => {
    const opts = { duration: 400, easing: out ? 'ease-in' : 'ease-out', fill: 'both' as const }
    const scrim: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }]
    const slide: Keyframe[] = [{ transform: 'translateY(-100%)' }, { transform: 'none' }]
    if (out) {
      scrim.reverse()
      slide.reverse()
    }
    return [ccScrim.current!.animate(scrim, opts), ccPanel.current!.animate(slide, opts)]
  }
  /** A finger on the top strip: the panel is mounted at once so the drag can scrub it in. */
  const ccPull = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (ccOn.current || device.asleep) return
    ccOn.current = true
    flushSync(() => setCc(true))
    swipe(e.nativeEvent, ccAnim(false), (anims) => settle(anims, () => {}), {
      down: true,
      back: () => {
        ccOn.current = false
        setCc(false)
      }
    })
  }
  /** Plays the panel out. Pass the animations a swipe already scrubbed. */
  const ccClose = (anims?: Animation[]) => {
    if (!ccOn.current) return
    ccOn.current = false
    settle(anims ?? ccAnim(true), () => setCc(false))
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: registered once; every callback reads refs and calls stable setters, so none goes stale
  useEffect(() => {
    const d: Display = {
      wide,
      dark: setAsleep,
      launch,
      stage: ctl.stage,
      mirror: ctl.mirror,
      covered: ctl.covered,
      cam: ctl.cam,
      hud,
      screenshot,
      power: () => setPoff(true),
      boot: powerOn
    }
    const detach = addDisplay(d, { home: [() => setSwitcher(false), parkAll, ccClose], lock, unlock })
    const first = boot && byName(boot)
    if (first) open(first, undefined, arg ?? undefined)
    return detach
  }, [])

  return (
    <>
      <div
        ref={disp}
        {...stylex.props(
          styles.disp,
          styles.wall(wall),
          wide ? styles.dispWide : styles.dispNarrow,
          asleep && styles.dispAsleep
        )}
      >
        <StatusBar
          wide={wide}
          light={lit && !cc}
          covered={!!topRight && !railed}
          cc={cc}
          open={locked || asleep ? undefined : launch}
        />

        <HomeScreen
          ref={shell}
          searchRef={search}
          wide={wide}
          side={homeSide}
          away={away}
          locked={locked}
          land={land}
          pageRef={pageNow}
          onOpen={openFrom}
          onSearch={() => setSearching(true)}
        />

        <HomeBars
          ctl={ctl}
          wide={wide}
          lockedRef={hasLock}
          reveal={reveal}
          off={cc || switcher}
          drop={drop}
          onDrop={setDrop}
          onSwitch={() => setSwitcher(true)}
        />
        {switcher && <Switcher ctl={ctl} onClose={() => setSwitcher(false)} />}
        {/* Under the switcher's cards, the bar is the way back to the last app: a tap on it. */}
        {switcher && <HomeBar onPointerDown={() => setSwitcher(false)} />}
        {!switcher && !cur.length && !locked && !cc && parked && <HomeBar faint onPointerDown={rise} />}
        {two && !switcher && (
          <div data-divider {...stylex.props(styles.divider, styles.dividerAt(split * 100))} onPointerDown={divide} />
        )}

        {lockOn && (
          <LockScreen
            key={lockKey}
            ref={lockEl}
            wide={wide}
            hidden={cur.length > 0}
            // This display plays out the animations the finger scrubbed; the other
            // one just drops its lock screen.
            onSwipe={(e) =>
              swipe(e.nativeEvent, lift(e.currentTarget), (anims) => {
                unlock(anims)
                unlockAll()
              })
            }
            onCamera={(el) => open(byName('Camera')!, at(el))}
          />
        )}

        {searching && <Spotlight onPick={(a) => open(a, at(search.current!))} onClose={() => setSearching(false)} />}

        {/* Swipe down from the top edge, from the lock screen too, as on a Face ID
            iPhone. The status stack is pointer-events none, so the strip sits under it. */}
        {!cc && <div data-cc-pull {...stylex.props(styles.pull)} onPointerDown={ccPull} />}
        {cc && (
          <ControlCenter
            wide={wide}
            volume={device.level}
            onVolume={setLevel}
            bright={bright}
            onBright={setBright}
            open={(name) => {
              ccClose()
              launch(name)
            }}
            onPower={() => {
              ccClose()
              setPoff(true)
            }}
            onClose={() => ccClose()}
            onDismiss={(e) => swipe(e.nativeEvent, ccAnim(true), ccClose)}
            scrimRef={ccScrim}
            panelRef={ccPanel}
          />
        )}
        <Veil bright={bright} />

        {scenes.map((e) => {
          const View = e.a.view
          return (
            <div
              key={e.id}
              data-app={e.a.name}
              data-side={e.side}
              ref={(el) => {
                if (el) ctl.els.current.set(e.id, el)
                else ctl.els.current.delete(e.id)
              }}
              {...stylex.props(
                styles.app,
                !e.a.edge && !(e.a.rail && !wide) && styles.appPad,
                e.side === 'left' && styles.appLeft(split * 100),
                e.side === 'right' && styles.appRight(split * 100),
                (drop?.id === e.id || switcher) && styles.appDrag,
                e.parked && !switcher && styles.appParked,
                e.a.light && !t.darkMode ? light : dark
              )}
            >
              {e.a.id ? <Sandbox id={e.a.id} os={e.ctx} wide={wide} side={e.side} /> : <View os={e.ctx} />}
              {e.a.mock && <span {...stylex.props(styles.mockPill)}>Mockup · in development</span>}
            </div>
          )
        })}

        <VolumeHud wide={wide} on={vol.on} level={vol.level} />
        <Flash on={flash} />
        <Thumbs thumbs={thumbs} />
        <TorchHud />

        {poff && (
          <PowerSheet
            disp={disp}
            onCancel={() => setPoff(false)}
            onCommit={() => {
              setPoff(false)
              device.powerOff()
            }}
          />
        )}
      </div>
      {booting && <BootScreen leaving={booting === 'leaving'} />}
    </>
  )
}

const styles = stylex.create({
  disp: {
    position: 'absolute',
    inset: 6,
    overflow: 'hidden',
    backgroundColor: colors.black,
    backgroundSize: 'cover, cover',
    transitionProperty: 'opacity',
    transitionDuration: '.22s'
  },
  wall: (url: string) => ({ backgroundImage: `${chrome.wash},url("${url}")` }),
  dispWide: { backgroundPosition: 'center, center', borderRadius: layout.screenInner },
  dispNarrow: {
    backgroundPosition: 'center, 22% center',
    borderTopLeftRadius: layout.screenCoverHinge,
    borderTopRightRadius: layout.screenCoverFree,
    borderBottomRightRadius: layout.screenCoverFree,
    borderBottomLeftRadius: layout.screenCoverHinge
  },
  // Asleep: the panel stays where it is, black, and any tap wakes it. Powered off
  // looks the same; only the side button answers.
  dispAsleep: { opacity: 0, pointerEvents: 'none' },

  // Control Center's pull strip: over apps and the lock screen, under the status
  // stack, which takes no pointer events anyway.
  pull: { position: 'absolute', top: 0, left: 0, right: 0, height: 26, zIndex: 6, touchAction: 'none' },

  app: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg,
    color: app.fg,
    zIndex: 2,
    overflow: 'hidden'
  },
  // Room for the status stack. `edge` apps skip it and run under the clock like Apple's footage.
  appPad: { paddingTop: 40 },
  mockPill: {
    position: 'absolute',
    top: 44,
    right: 12,
    zIndex: 2,
    pointerEvents: 'none',
    fontSize: typeScale.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    lineHeight: 1,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: radius.pill,
    color: colors.white,
    backgroundColor: colors.orange
  },
  // Split at the divider, the hinge by default, as Apple's footage shows: no seam, the two just meet.
  appLeft: (pct: number) => ({ right: `${100 - pct}%` }),
  appRight: (pct: number) => ({ left: `${pct}%` }),
  // Off the glass but running, for the switcher to bring back.
  appParked: { display: 'none' },
  // The grab strip over the seam between two apps; the pill on it is the handle you see.
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    marginLeft: -9,
    zIndex: 3,
    cursor: 'col-resize',
    touchAction: 'none',
    '::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: 6,
      width: 6,
      height: 56,
      marginTop: -28,
      borderRadius: radius.xs,
      backgroundColor: chrome.indicator,
      boxShadow: shadow.card
    }
  },
  dividerAt: (pct: number) => ({ left: `${pct}%` }),
  // On a finger: over the other app and the halves offered, deaf to the pointer
  // so the drop lands, and a short ease so the card trails the hand instead of
  // snapping to each pointer event.
  appDrag: {
    zIndex: 4,
    pointerEvents: 'none',
    boxShadow: shadow.float,
    transitionProperty: 'transform, border-radius',
    transitionDuration: '.16s',
    transitionTimingFunction: easing.out
  }
})
