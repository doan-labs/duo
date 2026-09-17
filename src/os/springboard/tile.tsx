// One cell of the home grid: an icon and the name under it. Its own file because
// three callers draw one — the home screen, the dock and Spotlight's results all
// use Icon — and the two 2x2 widgets sit in the same kind of labelled cell, so
// the tile, wtile and land looks have exactly one home here.

import type { StyleXStyles } from '@stylexjs/stylex'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, type Ref, useRef, useState } from 'react'
import { ICONS } from '../../icons/index.ts'
import type { App } from '../uikit/app.ts'
import { delay } from '../uikit/styles.ts'
import { layout } from '../uikit/tokens.stylex.ts'

/** A folder shows the grid it holds; everything else shows Apple's artwork. */
export const Icon = ({
  a,
  size,
  pressed,
  ref
}: {
  a: App
  size?: StyleXStyles
  pressed?: boolean
  ref?: Ref<HTMLElement>
}) =>
  a.folder ? (
    <div
      ref={ref as Ref<HTMLDivElement>}
      {...stylex.props(styles.icon, styles.fold, size, pressed && styles.iconPressed)}
    >
      {a.folder.slice(0, 9).map((n) => (
        <img key={n} src={ICONS[n] ?? ''} alt="" {...stylex.props(styles.foldImg)} />
      ))}
    </div>
  ) : (
    <img
      ref={ref as Ref<HTMLImageElement>}
      src={ICONS[a.name] ?? ''}
      alt=""
      {...stylex.props(styles.icon, size, pressed && styles.iconPressed)}
    />
  )

export type Open = (a: App, from: HTMLElement) => void

/** An icon and its name. `i` is its place in the landing stagger; the dock has none. */
export function Tile({ a, i, dock, onOpen }: { a: App; i?: number; dock?: boolean; onOpen: Open }) {
  const icon = useRef<HTMLElement>(null)
  // The whole tile is the hit target but only the icon shrinks, so :active
  // cannot sit on the icon itself; the press is tracked instead.
  const [pressed, setPressed] = useState(false)
  const up = () => setPressed(false)
  return (
    <div
      {...stylex.props(styles.tile, dock && styles.tileDock, i !== undefined && [styles.land, delay.ms(i * 17)])}
      onClick={() => onOpen(a, icon.current!)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
    >
      <Icon ref={icon} a={a} size={dock ? styles.iconDock : undefined} pressed={pressed} />
      {a.name}
    </div>
  )
}

/** The same labelled cell, two columns and two rows of it, around a widget. */
export const WidgetTile = ({ i, name, children }: { i: number; name: string; children: ReactNode }) => (
  <div {...stylex.props(styles.tile, styles.wtile, styles.land, delay.ms(i * 17))}>
    {children}
    {name}
  </div>
)

// Same frame as styles.ts's rise: StyleX only resolves keyframes defined in the
// file that uses them or in a .stylex file, and identical frames share a name.
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

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
    whiteSpace: 'nowrap'
  },
  tileDock: { fontSize: 0, gap: 0 },
  icon: {
    width: layout.icon,
    height: layout.icon,
    display: 'block',
    transitionProperty: 'transform',
    transitionDuration: '.12s'
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
