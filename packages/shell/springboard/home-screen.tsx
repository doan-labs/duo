// Everything behind the apps: the paged grid, the two widget cells, the page
// dots, the vertical dock and the search button. One component, so the shell
// stops carrying page state it never reads.
//
// The layout is Apple's, off the iPhone Duo HIG page: a left-anchored grid with
// two 2x2 widgets in its top-left, a *vertical* dock hugging the right edge, and
// the status read as a top-right stack instead of a bar. Content stays off the
// hinge, so the eight columns run 4 + a seam + 4. What that buys is the whole
// point of the device: the cover display is the left four columns, unchanged, so
// folding and unfolding moves nothing that was already on screen.
//
// Metrics below are Apple's own, measured off the HIG renders and scaled by
// 768/1072 — the width of this panel's glass over the width of theirs.

import { CalendarWidget } from '@doan-labs/duo-app-calendar/index.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { layout } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type Ref, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { byName, DOCK, LEFT, RIGHT } from '../apps.ts'
import { registryRevision, subscribeRegistry } from '../runtime/registry.ts'
import { WeatherSnapshot } from '../runtime/widgets.tsx'
import type { Side } from './gestures.ts'
import { Magnifier } from './spotlight.tsx'
import { type Open, Tile, WidgetTile } from './tile.tsx'

export function HomeScreen({
  wide,
  side,
  away,
  locked,
  land,
  pageRef,
  onOpen,
  onSearch,
  ref,
  searchRef
}: {
  /** The inner display, not the cover. */
  wide: boolean
  /** The half the home is squeezed into while an app holds the other. */
  side?: Side
  /** Apps cover it: scale back and fade out. */
  away: boolean
  /** The same, for the lock screen. */
  locked: boolean
  /** Remount key: bump it and the icons land again. */
  land: number
  /**
   * The page this component is on, written back to the shell. The shell's
   * `spot()` has to subtract the page offset to find where a tile sits, because
   * the strip is moved by a CSS transform `offsetLeft` cannot see, and a ref it
   * already holds is the smallest way to tell it.
   */
  pageRef: RefObject<number>
  /** A tile was tapped. */
  onOpen: Open
  /** The search button was tapped. */
  onSearch: () => void
  /** The shell layer; the caller animates it. */
  ref: Ref<HTMLDivElement>
  /** The search button; Spotlight zooms out of it. */
  searchRef: Ref<HTMLDivElement>
}) {
  const [page, setPage] = useState(0)
  useSyncExternalStore(subscribeRegistry, registryRevision)
  const homeWide = wide && !side

  // Swipe between pages; a short drag still counts as a tap on an icon.
  const pageCount = homeWide ? 1 : 2
  const turn = (i: number) => {
    pageRef.current = Math.min(pageCount - 1, Math.max(0, i))
    setPage(pageRef.current)
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: back to the single page when the grid widens again
  useEffect(() => {
    if (homeWide) turn(0)
  }, [homeWide])
  const x0 = useRef(0)

  const left = (
    <div key="left" {...stylex.props(styles.half)}>
      <WidgetTile i={0} name="Weather">
        <WeatherSnapshot
          onOpen={(el) => {
            const app = byName('Weather')
            if (app) onOpen(app, el)
          }}
        />
      </WidgetTile>
      <WidgetTile i={1} name="Calendar">
        <CalendarWidget onOpen={(el) => onOpen(byName('Calendar')!, el)} />
      </WidgetTile>
      {LEFT.map((a, i) => (
        <Tile key={a.name} a={a} i={i + 2} onOpen={onOpen} />
      ))}
    </div>
  )
  const right = (
    <div key="right" {...stylex.props(styles.half)}>
      {RIGHT.map((a, i) => (
        <Tile key={a.name} a={a} i={i} onOpen={onOpen} />
      ))}
    </div>
  )
  // Unfolded the two halves sit either side of the hinge on one page; folded,
  // the cover display shows the first and page two holds the second.
  const pages = homeWide
    ? [{ id: 'both', halves: [left, right] }]
    : [
        { id: 'left', halves: [left] },
        { id: 'right', halves: [right] }
      ]

  return (
    <div
      ref={ref}
      {...stylex.props(
        styles.shell,
        side === 'left' && styles.shellLeft,
        side === 'right' && styles.shellRight,
        (away || locked) && styles.shellAway
      )}
    >
      <div
        {...stylex.props(styles.homewrap)}
        onPointerDown={(e) => {
          x0.current = e.clientX
        }}
        onPointerUp={(e) =>
          Math.abs(e.clientX - x0.current) > 30 && turn(pageRef.current + Math.sign(x0.current - e.clientX))
        }
      >
        <div key={land} data-pages {...stylex.props(styles.pages, styles.shift(-page * 100))}>
          {pages.map((p) => (
            <div key={p.id} {...stylex.props(styles.page, homeWide ? styles.pageWide : styles.pageNarrow)}>
              {p.halves}
            </div>
          ))}
        </div>
      </div>
      {pages.length > 1 && (
        <div {...stylex.props(styles.dots)}>
          {pages.map((p, i) => (
            <i key={p.id} {...stylex.props(styles.dot, i === page && styles.dotOn)} onClick={() => turn(i)} />
          ))}
        </div>
      )}
      <div {...stylex.props(shared.glass, styles.dock)}>
        {DOCK.map((a) => (
          <Tile key={a.name} a={a} dock onOpen={onOpen} />
        ))}
      </div>
      <div ref={searchRef} {...stylex.props(shared.glass, styles.srch)} onClick={onSearch}>
        <Magnifier />
      </div>
    </div>
  )
}

const glassEase = 'cubic-bezier(.3,.8,.3,1)'

const styles = stylex.create({
  // Home screen. It sits on one layer so opening an app pushes the whole thing
  // back at once: icons, page dots and dock cannot drift apart mid-animation.
  shell: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transitionProperty: 'transform, opacity, left, right',
    transitionDuration: '.42s, .3s, .42s, .42s',
    transitionTimingFunction: `${glassEase}, ease, ${glassEase}, ${glassEase}`,
    transformOrigin: '78% 52%'
  },
  // Squeezed into one half while an app holds the other.
  shellLeft: { right: '50%' },
  shellRight: { left: '50%' },
  shellAway: { transform: 'scale(1.1)', opacity: 0, pointerEvents: 'none' },
  homewrap: { position: 'absolute', inset: 0, overflow: 'hidden' },
  pages: {
    display: 'flex',
    height: '100%',
    transitionProperty: 'transform',
    transitionDuration: '.34s',
    transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)'
  },
  shift: (pct: number) => ({ transform: `translateX(${pct}%)` }),
  page: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '100%',
    display: 'flex',
    gap: layout.seam,
    paddingTop: layout.top,
    paddingRight: 0,
    paddingBottom: 0
  },
  pageWide: { paddingLeft: 48 },
  pageNarrow: { paddingLeft: 7 },
  half: {
    display: 'grid',
    gridTemplateColumns: `repeat(4,${layout.cell})`,
    gridAutoRows: layout.row,
    alignContent: 'start',
    justifyItems: 'center'
  },
  // Dots and dock both clear the hinge side: the dots centre on the content, not
  // on the glass, or they sit visibly right of the apps they belong to.
  dots: {
    position: 'absolute',
    bottom: 21,
    left: 0,
    right: `calc(${layout.dock} + ${layout.dockRight})`,
    display: 'flex',
    justifyContent: 'center',
    gap: 7,
    zIndex: 3
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,.35)',
    cursor: 'pointer',
    transitionProperty: 'background-color, transform',
    transitionDuration: '.25s'
  },
  dotOn: { backgroundColor: 'rgba(255,255,255,.95)', transform: 'scale(1.15)' },
  dock: {
    position: 'absolute',
    right: layout.dockRight,
    top: 'calc(52.5% - 104px)',
    width: layout.dock,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 9,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 21
  },
  srch: {
    position: 'absolute',
    right: 16,
    bottom: 15,
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    zIndex: 4,
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.86)' }
  }
})
