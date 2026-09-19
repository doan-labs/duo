// Control Center, iOS 26: three pages of frosted glass over the blurred display,
// switched from the rail down its right edge — the tile grid, the Now Playing
// card, then connectivity. Unfolded it is the iPad's right-anchored panel, sitting
// left of the status stack so the time stays crisp; folded it spans the cover like
// an iPhone.
//
// Nothing on it is a prop. The switches live in `toggles.ts`, device-wide, and the
// status stack on both displays reports them; volume is `device.level`; brightness
// dims the whole display; the transport drives the one `<audio>` the Music app
// plays through, so a track started here is still playing when the app opens. The
// shell owns the open/close animations, because a finger scrubs them.

import { useNowPlaying } from '@doan-labs/duo-app-music/index.tsx'
import { mmss } from '@doan-labs/duo-fixtures'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import {
  chrome,
  colors,
  easing,
  glass,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, type PointerEvent as ReactPointerEvent, type Ref, useState } from 'react'
import { flip, NETWORK, type Toggles, useToggles } from './toggles.ts'

// ---------- Glyphs SF Symbols does not ship here ----------

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const Bluetooth = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} strokeWidth={2}>
    <path d="M7 7.5l10 9-5 4.5V3l5 4.5-10 9" />
  </svg>
)
const Airplay = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} strokeWidth={1.9}>
    <path d="M6 16.5H4.6A2.6 2.6 0 0 1 2 13.9V6.1a2.6 2.6 0 0 1 2.6-2.6h14.8A2.6 2.6 0 0 1 22 6.1v7.8a2.6 2.6 0 0 1-2.6 2.6H18" />
    <path d="M12 13.5l5.5 7h-11z" fill="currentColor" />
  </svg>
)
const Back = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
    <path d="M12 6.4v11.2L3 12zM21 6.4v11.2L12 12z" />
  </svg>
)
const Play = () => (
  <svg viewBox="0 0 24 24" width={30} height={30} fill="currentColor">
    <path d="M7 4.5v15L19.5 12z" />
  </svg>
)
const Pause = () => (
  <svg viewBox="0 0 24 24" width={30} height={30} fill="currentColor">
    <rect x="6.4" y="4.6" width="4.4" height="14.8" rx="1.4" />
    <rect x="13.2" y="4.6" width="4.4" height="14.8" rx="1.4" />
  </svg>
)
const Forward = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
    <path d="M3 6.4v11.2L12 12zM12 6.4v11.2L21 12z" />
  </svg>
)
// lock.rotation: the arrow circles a padlock.
const RotateLock = () => (
  <svg viewBox="0 0 24 24" width={26} height={26} {...stroke} strokeWidth={1.9}>
    <path d="M20 12.5a8 8 0 0 1-13.6 5.7" />
    <path d="M4 12a8 8 0 0 1 13.6-5.7" />
    <path d="M17.2 3.6l.6 3.2-3.2.4M6.8 20.4l-.6-3.2 3.2-.4" />
    <rect x="9.3" y="11" width="5.4" height="4.4" rx="1" fill="currentColor" stroke="none" />
    <path d="M10.4 11V9.6a1.6 1.6 0 0 1 3.2 0V11" strokeWidth={1.5} />
  </svg>
)
const Flashlight = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} strokeWidth={1.8} fill={on ? 'currentColor' : 'none'}>
    <path d="M8 2.5h8v3.2L13.8 9.4V21a1.8 1.8 0 0 1-3.6 0V9.4L8 5.7z" />
    <path d="M8 5.7h8" stroke={on ? colors.black : 'currentColor'} />
  </svg>
)
const Timer = () => (
  <svg viewBox="0 0 24 24" width={26} height={26} {...stroke} strokeWidth={1.9}>
    <circle cx="12" cy="13.5" r="8" />
    <path d="M12 13.5V9M9.5 2.5h5M17.5 6.5l1.5-1.5" />
  </svg>
)
const Calculator = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} strokeWidth={1.8}>
    <rect x="5.5" y="2.5" width="13" height="19" rx="2.4" />
    <path d="M8.5 6.5h7" strokeWidth={2.2} />
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="11" r="1.1" />
      <circle cx="12" cy="11" r="1.1" />
      <circle cx="15" cy="11" r="1.1" />
      <circle cx="9" cy="14.5" r="1.1" />
      <circle cx="12" cy="14.5" r="1.1" />
      <circle cx="15" cy="14.5" r="1.1" />
      <circle cx="9" cy="18" r="1.1" />
      <circle cx="12" cy="18" r="1.1" />
      <circle cx="15" cy="18" r="1.1" />
    </g>
  </svg>
)
const Camera = () => (
  <svg viewBox="0 0 24 24" width={26} height={26} {...stroke} strokeWidth={1.8}>
    <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.6l1.5-2.2h5.8L16.4 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
    <circle cx="12" cy="12.8" r="3.4" />
  </svg>
)
const Power = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...stroke} strokeWidth={2.2}>
    <path d="M12 3.5v8.5" />
    <path d="M7.3 6.6a7 7 0 1 0 9.4 0" />
  </svg>
)
const Note = ({ size = 15 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M20 3.4v11.9a3 3 0 1 1-2-2.8V7.6l-8 1.7v8.5a3 3 0 1 1-2-2.8V6z" />
  </svg>
)

// ---------- Pieces ----------

/** A round radio toggle inside the connectivity tile. `tint` is its colour when on. */
function Radio({
  on,
  tint,
  onToggle,
  children
}: {
  on: boolean
  tint: string
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div {...stylex.props(styles.radio, on && styles.tint(tint))} onClick={onToggle}>
      {children}
    </div>
  )
}

/**
 * iOS's knob-less slider: the fill rises from the bottom, the glyph sits in it.
 * Drags are relative to where the finger landed, like iOS; a tap does not jump.
 * Pointer deltas and the tile's rect are both screen px, so the ratio holds
 * whatever scale the panel is drawn at.
 */
function Slider({
  name,
  value,
  onChange,
  onEnd,
  children
}: {
  name: string
  value: number
  onChange: (v: number) => void
  onEnd?: () => void
  children: ReactNode
}) {
  const [drag, setDrag] = useState<{ v0: number; y0: number; h: number } | null>(null)
  return (
    <div
      data-cc-slider={name}
      {...stylex.props(styles.tile, styles.slider)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ v0: value, y0: e.clientY, h: e.currentTarget.getBoundingClientRect().height })
      }}
      onPointerMove={(e) => drag && onChange(Math.min(1, Math.max(0, drag.v0 + (drag.y0 - e.clientY) / drag.h)))}
      onPointerUp={() => {
        setDrag(null)
        onEnd?.()
      }}
      onPointerCancel={() => {
        setDrag(null)
        onEnd?.()
      }}
    >
      <i {...stylex.props(styles.fill, styles.fillH(value * 100), drag && styles.fillNow)} />
      <span {...stylex.props(styles.sglyph, value > 0.14 && styles.sglyphIn)}>{children}</span>
    </div>
  )
}

/**
 * The flat bar the Now Playing card uses twice, for the scrubber and for volume.
 * Absolute, not relative: a tap on a scrubber jumps, as it does on iOS. `offsetX`
 * is element-local, so it survives this panel being a CSS3D object at any scale,
 * which `getBoundingClientRect` would not; the children take no pointer events so
 * the offset is always measured from the same box.
 */
function Bar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [drag, setDrag] = useState(false)
  const set = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    onChange(Math.min(1, Math.max(0, e.nativeEvent.offsetX / (el.offsetWidth || 1))))
  }
  return (
    <div
      {...stylex.props(styles.bar)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(true)
        set(e)
      }}
      onPointerMove={(e) => drag && set(e)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
    >
      <i {...stylex.props(styles.trk)}>
        <i {...stylex.props(styles.trkFill, styles.barW(value * 100))} />
      </i>
    </div>
  )
}

/** ⏪ ▶ ⏩ over whatever deck is passed. Shared by the media tile and its page. */
function Transport({ big }: { big?: boolean }) {
  const d = useNowPlaying()
  return (
    <>
      <div {...stylex.props(styles.hit)} onClick={() => d.skip(-1)}>
        <Back />
      </div>
      <div {...stylex.props(styles.hit, big && styles.hitWide)} onClick={() => d.toggle()}>
        {d.playing ? <Pause /> : <Play />}
      </div>
      <div {...stylex.props(styles.hit)} onClick={() => d.skip(1)}>
        <Forward />
      </div>
    </>
  )
}

/** The 2x2 Now Playing tile on the grid page. Its title opens the media page. */
function NowTile({ onExpand }: { onExpand: () => void }) {
  const d = useNowPlaying()
  const { title: name, artist: who, cover } = d.now
  return (
    <div {...stylex.props(styles.tile, styles.playing)}>
      <div {...stylex.props(styles.playHead)} onClick={onExpand}>
        <div {...stylex.props(styles.playText)}>
          <b {...stylex.props(styles.playTitle)}>{d.started ? name : 'Not Playing'}</b>
          {d.started && <div {...stylex.props(styles.playSub)}>{who}</div>}
        </div>
        <span {...stylex.props(styles.dim)}>
          <Airplay />
        </span>
      </div>
      <div {...stylex.props(styles.transport, !d.started && styles.dim)}>
        <Transport />
      </div>
    </div>
  )
}

/** Page two: the deck at full size, as the cover display shows it. */
function Media({ level, onLevel }: { level: number; onLevel: (v: number) => void }) {
  const d = useNowPlaying()
  const { title: name, artist: who, cover } = d.now
  return (
    <div {...stylex.props(styles.card, styles.media)}>
      {/* Artwork, and the biggest play target on the page. */}
      <div {...stylex.props(styles.cover, d.started && styles.coverArt(`url(${cover})`))} onClick={() => d.toggle()} />
      <div {...stylex.props(styles.playHead)}>
        <div {...stylex.props(styles.playText)}>
          <b {...stylex.props(styles.mTitle)}>{d.started ? name : 'Not Playing'}</b>
          {d.started && <div {...stylex.props(styles.playSub)}>{who}</div>}
        </div>
        <span {...stylex.props(styles.dim)}>
          <Airplay />
        </span>
      </div>
      <Bar value={d.started ? d.at / d.dur : 0} onChange={(v) => d.seek(v)} />
      <div {...stylex.props(styles.times)}>
        <span>{mmss(d.started ? d.at : 0)}</span>
        <span>-{mmss(d.started ? Math.max(0, d.dur - d.at) : 0)}</span>
      </div>
      <div {...stylex.props(styles.transport, !d.started && styles.dim)}>
        <Transport big />
      </div>
      <div {...stylex.props(styles.volRow)}>
        <Sym name="volume" size={13} />
        <div {...stylex.props(styles.grow)}>
          <Bar value={level} onChange={onLevel} />
        </div>
        <Sym name="volume" size={19} />
      </div>
    </div>
  )
}

/** Page three: the radios as rows, the same switches the grid's four circles flip. */
function Network() {
  const t = useToggles()
  const rows = [
    ['airplane', 'Airplane Mode', colors.orange, <Sym key="a" name="airplane" size={18} />, t.airplane ? 'On' : 'Off'],
    ['drop', 'AirDrop', colors.blueDark, <Sym key="d" name="bluetooth" size={18} />, t.drop ? 'Contacts Only' : 'Off'],
    ['wifi', 'Wi-Fi', colors.blueDark, <Sym key="w" name="wifi" size={18} />, t.wifi ? NETWORK : 'Off'],
    ['bt', 'Bluetooth', colors.blueDark, <Bluetooth key="b" size={18} />, t.bt ? 'On' : 'Off'],
    ['cell', 'Cellular Data', colors.green, <Sym key="c" name="antenna" size={18} />, t.cell ? 'On' : 'Off'],
    ['hotspot', 'Personal Hotspot', colors.green, <Sym key="h" name="iphone" size={18} />, t.hotspot ? 'On' : 'Off']
  ] as const satisfies readonly (readonly [keyof Toggles, string, string, ReactNode, string])[]
  return (
    <div {...stylex.props(styles.card, styles.list)}>
      {rows.map(([k, label, tint, glyph, value]) => (
        <div key={k} {...stylex.props(styles.row)} onClick={() => flip(k)}>
          <div {...stylex.props(styles.rowIc, t[k] && styles.tint(tint))}>{glyph}</div>
          <div>
            <b {...stylex.props(styles.rowName)}>{label}</b>
            <div {...stylex.props(styles.rowVal)}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export type ControlCenterProps = {
  wide: boolean
  /** Ringer level in sixteenths, the device's. */
  volume: number
  onVolume: (level: number) => void
  /** 0..1, the display's. */
  bright: number
  onBright: (v: number) => void
  /** Opens an app by name, closing the panel. */
  open: (name: string) => void
  /** The power glyph: the shell's slide-to-power-off sheet. */
  onPower: () => void
  onClose: () => void
  /** A finger on the bottom strip: the shell scrubs the panel back up. */
  onDismiss: (e: ReactPointerEvent<HTMLDivElement>) => void
  /** The scrim, faded by the shell. */
  scrimRef: Ref<HTMLDivElement>
  /** The panel, slid by the shell. */
  panelRef: Ref<HTMLDivElement>
}

export function ControlCenter({
  wide,
  volume,
  onVolume,
  bright,
  onBright,
  open,
  onPower,
  onClose,
  onDismiss,
  scrimRef,
  panelRef
}: ControlCenterProps) {
  const t = useToggles()
  const [page, setPage] = useState(0)
  // `+` puts the grid in edit mode: tiles wobble and a removed one leaves the
  // empty slot behind, which is how you get it back.
  const [edit, setEdit] = useState(false)
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set())
  // The finger's position while it drags volume; the device's sixteenth otherwise.
  const [vol, setVol] = useState<number | null>(null)
  const level = vol ?? volume / 16
  const setLevel = (v: number) => {
    setVol(v)
    onVolume(Math.round(v * 16))
  }
  const drop = (id: string) => setGone((s) => new Set(s).add(id))
  const restore = (id: string) =>
    setGone((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })

  /** The grid, in placement order: two 2x2s, then the row that carries the sliders. */
  const controls: { id: string; c2?: boolean; r2?: boolean; el: ReactNode }[] = [
    {
      id: 'radios',
      c2: true,
      r2: true,
      el: (
        <div {...stylex.props(styles.tile, styles.radios)}>
          <Radio on={t.airplane} tint={colors.orange} onToggle={() => flip('airplane')}>
            <Sym name="airplane" size={24} />
          </Radio>
          <Radio on={t.cell} tint={colors.green} onToggle={() => flip('cell')}>
            <Sym name="antenna" size={24} />
          </Radio>
          <Radio on={t.wifi} tint={colors.blueDark} onToggle={() => flip('wifi')}>
            <Sym name="wifi" size={24} />
          </Radio>
          <Radio on={t.bt} tint={colors.blueDark} onToggle={() => flip('bt')}>
            <Bluetooth />
          </Radio>
        </div>
      )
    },
    { id: 'media', c2: true, r2: true, el: <NowTile onExpand={() => setPage(1)} /> },
    {
      id: 'rotate',
      el: (
        <div {...stylex.props(styles.tile, t.rotate && styles.tint(colors.red))} onClick={() => flip('rotate')}>
          <RotateLock />
        </div>
      )
    },
    {
      id: 'mirror',
      el: (
        <div {...stylex.props(styles.tile, t.mirror && styles.lit)} onClick={() => flip('mirror')}>
          <Sym name="tabs" size={24} />
        </div>
      )
    },
    {
      id: 'bright',
      r2: true,
      el: (
        <Slider name="bright" value={bright} onChange={onBright}>
          <Sym name="sun" size={22} />
        </Slider>
      )
    },
    {
      id: 'volume',
      r2: true,
      el: (
        <Slider name="volume" value={level} onChange={setLevel} onEnd={() => setVol(null)}>
          <Sym name="volume" size={22} />
        </Slider>
      )
    },
    {
      id: 'focus',
      c2: true,
      el: (
        <div
          {...stylex.props(styles.tile, styles.focus, t.focus && styles.tint(colors.indigo))}
          onClick={() => flip('focus')}
        >
          <Sym name="moon" size={22} />
          <span {...stylex.props(styles.focusLabel)}>Focus</span>
        </div>
      )
    },
    {
      id: 'torch',
      el: (
        <div {...stylex.props(styles.tile, t.torch && styles.lit)} onClick={() => flip('torch')}>
          <Flashlight on={t.torch} />
        </div>
      )
    },
    {
      id: 'timer',
      el: (
        <div {...stylex.props(styles.tile)} onClick={() => open('Clock')}>
          <Timer />
        </div>
      )
    },
    {
      id: 'calc',
      el: (
        <div {...stylex.props(styles.tile)} onClick={() => open('Calculator')}>
          <Calculator />
        </div>
      )
    },
    {
      id: 'camera',
      el: (
        <div {...stylex.props(styles.tile)} onClick={() => open('Camera')}>
          <Camera />
        </div>
      )
    }
  ]

  return (
    <div data-cc data-hud="cc" {...stylex.props(styles.root)}>
      <div ref={scrimRef} {...stylex.props(styles.scrim)} onClick={onClose} />
      <div ref={panelRef} {...stylex.props(styles.panel, wide ? styles.panelWide : styles.panelNarrow)}>
        <div {...stylex.props(styles.main, !wide && styles.mainNarrow)}>
          <div {...stylex.props(styles.stack)}>
            <div {...stylex.props(styles.top)}>
              <div {...stylex.props(styles.tile, styles.round, edit && styles.turn)} onClick={() => setEdit(!edit)}>
                <Sym name="plus" size={16} />
              </div>
              <div {...stylex.props(styles.tile, styles.round)} onClick={onPower}>
                <Power />
              </div>
            </div>

            {/* Three pages on one rail; the rail is the only way across. */}
            <div data-cc-page={page} {...stylex.props(styles.pages)}>
              <div {...stylex.props(styles.track, styles.at(page))}>
                <div {...stylex.props(styles.page)}>
                  <div {...stylex.props(styles.grid)}>
                    {controls.map(({ id, c2, r2, el }, i) =>
                      gone.has(id) ? (
                        // Only in edit mode: outside it the grid closes the gap.
                        edit && (
                          <div
                            key={id}
                            {...stylex.props(styles.cell, c2 && styles.c2, r2 && styles.r2, styles.slot)}
                            onClick={() => restore(id)}
                          >
                            <Sym name="plus" size={20} />
                          </div>
                        )
                      ) : (
                        <div
                          key={id}
                          {...stylex.props(
                            styles.cell,
                            c2 && styles.c2,
                            r2 && styles.r2,
                            edit && styles.wobble,
                            edit && styles.wobbleAt(i % 3)
                          )}
                        >
                          {el}
                          {edit && (
                            <div {...stylex.props(styles.minus)} onClick={() => drop(id)}>
                              <i {...stylex.props(styles.minusBar)} />
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div {...stylex.props(styles.page)}>
                  <Media level={level} onLevel={setLevel} />
                </div>
                <div {...stylex.props(styles.page)}>
                  <Network />
                </div>
              </div>
            </div>
          </div>

          <div {...stylex.props(styles.rail, !wide && styles.railNarrow)}>
            {[0, 1, 2].map((i) => (
              <div key={i} {...stylex.props(styles.pip, page === i && styles.pipOn)} onClick={() => setPage(i)}>
                {i === 0 ? (
                  <i {...stylex.props(styles.dot)} />
                ) : i === 1 ? (
                  <Note />
                ) : (
                  <Sym name="bluetooth" size={15} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div {...stylex.props(styles.grab)} onPointerDown={onDismiss} />
      </div>
    </div>
  )
}

// Tiles are 64 px on a 12 px gutter: 76 pt on a 14 pt gutter on a 393 pt iPhone,
// scaled to the cover's 365 px. A page is exactly the five rows the grid needs,
// so the media and connectivity cards line up with it and the rail never moves.
const T = 64
const G = 12
const COLS = T * 4 + G * 3
const ROWS = T * 5 + G * 4
const RAIL = 26

const wobble = stylex.keyframes({
  '0%, 100%': { transform: 'rotate(-.75deg)' },
  '50%': { transform: 'rotate(.75deg)' }
})

const styles = stylex.create({
  // Same layer as the lock screen and after it in the DOM: over the lock and
  // every app, under the status stack, which stays sharp above the blur.
  root: { position: 'absolute', inset: 0, zIndex: 5, touchAction: 'none' },
  // Lighter than a scrim usually is: iOS 26's material lets the home screen's
  // colour through, and the tiles have to read as glass over something.
  scrim: {
    position: 'absolute',
    inset: 0,
    backgroundColor: chrome.scrim,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  // Taps between tiles fall through to the scrim and close the panel, as on an
  // iPhone, where the panel is the whole display.
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: colors.white,
    pointerEvents: 'none'
  },
  // Left of the status stack (right 24, 34 wide) with the same gap the tiles keep.
  panelWide: { right: 72, paddingTop: 40 },
  // The top row lines up with the time in the status stack. The cover is 365 px:
  // the grid plus a rail beside it is 324, and the status stack needs 58 on the
  // right, so here the rail goes under the pages and the panel stops short of the stack.
  panelNarrow: { left: 0, right: 58, paddingTop: 36 },
  main: { display: 'flex', alignItems: 'stretch', gap: 6 },
  mainNarrow: { flexDirection: 'column', alignItems: 'center', gap: G },
  stack: { display: 'flex', flexDirection: 'column' },
  top: { width: COLS, display: 'flex', justifyContent: 'space-between', marginBottom: G, pointerEvents: 'auto' },

  pages: { width: COLS, height: ROWS, overflow: 'hidden' },
  track: {
    display: 'flex',
    width: COLS * 3,
    height: '100%',
    transitionProperty: 'transform',
    transitionDuration: '.38s',
    transitionTimingFunction: easing.push
  },
  at: (i: number) => ({ transform: `translateX(${-i * COLS}px)` }),
  page: { width: COLS, flexShrink: 0 },

  grid: {
    pointerEvents: 'auto',
    display: 'grid',
    gridTemplateColumns: `repeat(4,${T}px)`,
    gridAutoRows: T,
    gap: G
  },
  cell: { position: 'relative' },
  c2: { gridColumnStart: 'span 2' },
  r2: { gridRowStart: 'span 2' },

  // The frosted tile. Neutral, not white: since beta 2 the material reads as
  // smoked glass, and the tint of an active control has to stand out from it.
  // No backdrop-filter of its own: the scrim has already blurred everything
  // under it, and WebKit paints a nested backdrop-filter inside the clipped,
  // sliding track over the whole page box, flickering at its edges (decisions 28).
  tile: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: glass.tint,
    // Inset only: an outer shadow spills into the page box, which clips it at its
    // edge and shows up as a faint rectangle around the grid.
    boxShadow: shadow.rim,
    color: colors.white,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: `${motion.pressDuration}, .25s, .25s`,
    transform: { default: null, ':active': motion.press }
  },
  tint: (c: string) => ({ backgroundColor: c }),
  lit: { backgroundColor: colors.white, color: colors.black },
  round: { width: 34, height: 34, borderRadius: radius.circle, pointerEvents: 'auto' },
  turn: { backgroundColor: colors.white, color: colors.black, transform: 'rotate(45deg)' },

  // Edit mode: the wobble is the tile's, the badge the slot's, so a tile keeps
  // its own :active scale while it shakes.
  wobble: {
    animationName: wobble,
    animationDuration: '.26s',
    animationIterationCount: 'infinite',
    animationTimingFunction: easing.inOut
  },
  wobbleAt: (n: number) => ({ animationDelay: `${n * -70}ms` }),
  minus: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 21,
    height: 21,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    cursor: 'pointer'
  },
  minusBar: { width: 9, height: 2, borderRadius: 1, backgroundColor: colors.black },
  slot: {
    borderRadius: radius.xxl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: chrome.label2,
    display: 'grid',
    placeItems: 'center',
    color: chrome.label,
    cursor: 'pointer'
  },

  radios: {
    gridTemplateColumns: `repeat(2,${T - 8}px)`,
    gridAutoRows: T - 8,
    gap: 8,
    padding: 8
  },
  radio: {
    width: T - 8,
    height: T - 8,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: chrome.fill3,
    transitionProperty: 'background-color, transform',
    transitionDuration: `.25s, ${motion.pressDuration}`,
    transform: { default: null, ':active': motion.press }
  },

  playing: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    padding: 14,
    cursor: 'default',
    transform: { default: null, ':active': null }
  },
  playHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' },
  // One line each, ellipsed: a long title must not push the transport out of the tile.
  playText: { minWidth: 0, overflow: 'hidden' },
  playTitle: {
    display: 'block',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    paddingTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  playSub: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.6,
    paddingTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  transport: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 },
  hit: {
    display: 'grid',
    placeItems: 'center',
    padding: 4,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  hitWide: { paddingRight: 12, paddingLeft: 12 },
  dim: { opacity: 0.45 },

  slider: { display: 'block', cursor: 'ns-resize', touchAction: 'none' },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    transitionProperty: 'height',
    transitionDuration: '.12s'
  },
  fillH: (pct: number) => ({ height: `${pct}%` }),
  fillNow: { transitionProperty: 'none' },
  sglyph: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    display: 'flex',
    justifyContent: 'center',
    color: colors.white,
    transitionProperty: 'color',
    transitionDuration: '.12s'
  },
  sglyphIn: { color: colors.grey },

  focus: {
    gridTemplateColumns: 'auto auto',
    justifyContent: 'start',
    columnGap: 8,
    paddingLeft: 14
  },
  focusLabel: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },

  // Pages two and three are one card each, milkier than a tile so the page
  // reads as a single sheet of glass rather than a tile grown large.
  card: {
    pointerEvents: 'auto',
    height: '100%',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: chrome.fill,
    boxShadow: shadow.rim
  },
  media: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 14,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16
  },
  // Artwork; empty and a shade lighter until something has played.
  cover: {
    flexGrow: 1,
    minHeight: 0,
    borderRadius: radius.xxl,
    backgroundColor: chrome.fill,
    backgroundSize: 'cover',
    cursor: 'pointer',
    boxShadow: shadow.rim,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  coverArt: (image: string) => ({ backgroundImage: image }),
  mTitle: {
    display: 'block',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  times: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.5,
    marginTop: -6
  },
  volRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 },

  // Never flex: in the media card's column a growing bar would eat the artwork.
  bar: {
    width: '100%',
    height: 22,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    touchAction: 'none'
  },
  grow: { flexGrow: 1, minWidth: 0 },
  trk: {
    pointerEvents: 'none',
    width: '100%',
    height: 7,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: chrome.fill
  },
  trkFill: { pointerEvents: 'none', display: 'block', height: '100%', backgroundColor: colors.white },
  barW: (pct: number) => ({ width: `${pct}%` }),

  list: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: 12 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.xl,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':active': chrome.fill2 }
  },
  rowIc: {
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: chrome.fill2,
    transitionProperty: 'background-color',
    transitionDuration: '.25s'
  },
  rowName: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  rowVal: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.6
  },

  // The page rail, on the panel's right edge like the iPad's. The active page is
  // a filled circle with its glyph knocked out.
  rail: {
    pointerEvents: 'auto',
    width: RAIL,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  railNarrow: { width: COLS, flexDirection: 'row' },
  pip: {
    width: RAIL,
    height: RAIL,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    color: chrome.indicator,
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: '.25s'
  },
  pipOn: { backgroundColor: colors.white, color: colors.black },
  dot: { width: 7, height: 7, borderRadius: radius.circle, backgroundColor: 'currentColor' },

  // The home indicator, and the strip you grab to swipe the panel back up.
  grab: {
    pointerEvents: 'auto',
    marginTop: 'auto',
    width: COLS,
    height: 26,
    flexShrink: 0,
    cursor: 'pointer',
    '::after': {
      content: '""',
      display: 'block',
      width: 120,
      height: 5,
      marginLeft: 'auto',
      marginRight: 'auto',
      marginTop: 14,
      borderRadius: radius.xs,
      backgroundColor: chrome.indicator
    }
  }
})
