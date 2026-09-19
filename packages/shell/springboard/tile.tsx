// One cell of the home grid: an icon and the name under it. Its own file because
// three callers draw one (the home screen, the dock and Spotlight's results all
// use Icon) and the two 2x2 widgets sit in the same kind of labelled cell, so
// the tile, wtile and land looks have exactly one home here. The hold that
// lifts a tile off the grid starts here too, since the tile is what feels the press.

import type { App } from '@doan-labs/duo-uikit/app.ts'
import { ICONS } from '@doan-labs/duo-uikit/icons/index.ts'
import { delay } from '@doan-labs/duo-uikit/styles.ts'
import { colors, layout } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import type { StyleXStyles } from '@stylexjs/stylex'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, type Ref, useRef, useState } from 'react'
import { byName } from '../apps.ts'

/** How long a press stays still before it is a hold: iOS's home-screen figure. */
export const HOLD = 500

/** A folder shows the grid it holds; everything else shows Apple's artwork. */
export const Icon = ({
  a,
  size,
  pressed,
  hot,
  ref
}: {
  a: App
  size?: StyleXStyles
  pressed?: boolean
  /** The cell a carried tile is over. */
  hot?: boolean
  ref?: Ref<HTMLElement>
}) =>
  a.folder ? (
    <div
      ref={ref as Ref<HTMLDivElement>}
      {...stylex.props(styles.icon, styles.fold, size, pressed && styles.iconPressed, hot && styles.iconHot)}
    >
      {a.folder.slice(0, 9).map((n) => {
        const b = byName(n)
        return (
          <img
            key={n}
            src={b?.icon ?? ICONS[b?.name ?? n] ?? ''}
            alt=""
            draggable={false}
            {...stylex.props(styles.foldImg)}
          />
        )
      })}
    </div>
  ) : (
    <img
      ref={ref as Ref<HTMLImageElement>}
      src={a.icon ?? ICONS[a.name] ?? ''}
      alt=""
      draggable={false}
      {...stylex.props(styles.icon, size, pressed && styles.iconPressed, hot && styles.iconHot)}
    />
  )

export type Open = (a: App, from: HTMLElement) => void
/** A press held still on a tile: the native event that began it, and the tile's element. */
export type Hold = (down: PointerEvent, tile: HTMLElement) => void

/**
 * An icon and its name. `i` is its place in the landing stagger; the dock has none.
 * With `onHold`, a press held still for HOLD ms lifts the tile instead of opening
 * it. `cell` names the grid cell for hit-testing, `hot` marks the cell a carried
 * tile is over, and `shake` is the arranging jiggle.
 */
export function Tile({
  a,
  i,
  dock,
  cell,
  hot,
  shake,
  onOpen,
  onHold
}: {
  a: App
  i?: number
  dock?: boolean
  cell?: string
  hot?: boolean
  shake?: boolean
  onOpen: Open
  onHold?: Hold
}) {
  const icon = useRef<HTMLElement>(null)
  const tile = useRef<HTMLDivElement>(null)
  // The whole tile is the hit target but only the icon shrinks, so :active
  // cannot sit on the icon itself; the press is tracked instead.
  const [pressed, setPressed] = useState(false)
  // The hold: its timer, where the press began (8 px away it is a swipe), and
  // whether it fired, so a click that follows does not open the app as well.
  const timer = useRef(0)
  const from = useRef<[number, number]>([0, 0])
  const held = useRef(false)
  const up = () => {
    setPressed(false)
    clearTimeout(timer.current)
  }
  return (
    <div
      ref={tile}
      data-tile
      data-cell={cell}
      {...stylex.props(styles.tile, dock && styles.tileDock, i !== undefined && [styles.land, delay.ms(i * 17)])}
      onClick={() => !held.current && onOpen(a, icon.current!)}
      onPointerDown={(e) => {
        setPressed(true)
        held.current = false
        if (!onHold) return
        const down = e.nativeEvent
        from.current = [down.clientX, down.clientY]
        clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          held.current = true
          setPressed(false)
          onHold(down, tile.current!)
        }, HOLD)
      }}
      onPointerMove={(e) => {
        if (Math.hypot(e.clientX - from.current[0], e.clientY - from.current[1]) > 8) clearTimeout(timer.current)
      }}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
    >
      <div {...stylex.props(styles.iconWrap, hot && styles.iconWrapHot, shake && styles.shake)}>
        <Icon ref={icon} a={a} size={dock ? styles.iconDock : undefined} pressed={pressed} hot={hot} />
        {a.mock && <span {...stylex.props(styles.mockDot)} title="Mockup" />}
      </div>
      {a.name}
    </div>
  )
}

/** The same labelled cell, two columns and two rows of it, around a widget. */
export const WidgetTile = ({ i, name, children }: { i: number; name: string; children: ReactNode }) => (
  <div data-tile {...stylex.props(styles.tile, styles.wtile, styles.land, delay.ms(i * 17))}>
    {children}
    {name}
  </div>
)

// Same frame as styles.ts's rise: StyleX only resolves keyframes defined in the
// file that uses them or in a .stylex file, and identical frames share a name.
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })
const shake = stylex.keyframes({
  '0%': { transform: 'rotate(-1.5deg)' },
  '50%': { transform: 'rotate(1.5deg)' },
  '100%': { transform: 'rotate(-1.5deg)' }
})

const styles = stylex.create({
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    fontSize: 10.5,
    lineHeight: 1.2,
    fontWeight: 400,
    letterSpacing: 0.02,
    textShadow: '0 1px 3px rgba(0,0,0,.5)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    // A held tile is carried by pointer events; the page must not scroll under a finger instead.
    touchAction: 'none'
  },
  tileDock: { fontSize: 0, gap: 0 },
  icon: {
    width: layout.icon,
    height: layout.icon,
    display: 'block',
    // Apple's artwork carries its own rounded corners; a release icon may arrive square.
    borderRadius: '22.5%',
    transitionProperty: 'transform',
    transitionDuration: '.12s'
  },
  iconWrap: {
    position: 'relative',
    borderRadius: 16,
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.15s'
  },
  // The cell a carried tile is over: a well behind the icon and the icon grown a
  // little, the way iOS offers to stack the two.
  iconWrapHot: { backgroundColor: 'rgba(255,255,255,.32)', boxShadow: '0 0 0 5px rgba(255,255,255,.32)' },
  iconHot: { transform: 'scale(1.1)' },
  // Arranging: every other tile wobbles while one is on a finger.
  shake: {
    animationName: { default: shake, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  // Marks the tiles whose app is invented data, so a visitor knows before tapping.
  mockDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.orange,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: 'white'
  },
  iconDock: { width: 41, height: 41 },
  iconPressed: { transform: 'scale(.88)' },
  // Folder tile: a blurred well showing the grid it holds.
  fold: {
    borderRadius: 14,
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 2,
    padding: 4,
    backgroundColor: 'rgba(120,120,128,.42)',
    backdropFilter: 'blur(8px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)'
  },
  // Sized off the column, never the row: WebKit resolves a percentage height
  // against the artwork's own size here and spills the last row under the label.
  foldImg: { width: '100%', height: 'auto', aspectRatio: '1', minWidth: 0, borderRadius: 3, objectFit: 'contain' },
  wtile: { gridColumnStart: 'span 2', gridRowStart: 'span 2', alignSelf: 'start', marginTop: -4 },
  // Icons land one after another on first paint. Runs once, on mount.
  land: {
    animationName: rise,
    animationDuration: '.5s',
    animationFillMode: 'backwards',
    animationTimingFunction: 'cubic-bezier(.2,.9,.3,1)'
  }
})
