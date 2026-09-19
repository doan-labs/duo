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
// 768/1072, the width of this panel's glass over the width of theirs.
//
// The cells come from grid.ts, in the order the finger left them, and this is
// where the finger does that: a press held on a tile lifts it, letting go on
// another cell stacks the two into a folder, a tap on a folder opens it, and a
// press held on the paper itself brings up the wallpaper sheet.

import { CalendarWidget } from '@doan-labs/duo-app-calendar/index.tsx'
import type { App } from '@doan-labs/duo-uikit/app.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { chrome, colors, easing, layout, motion, radius } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type Ref, type RefObject, useEffect, useRef, useState } from 'react'
import { byName, DOCK } from '../apps.ts'
import { WeatherSnapshot } from '../runtime/widgets.tsx'
import { FolderView } from './folder.tsx'
import { lift, type Side } from './gestures.ts'
import { eject, grid, type Half, isFolder, rename, type Slot, stack, useGrid } from './grid.ts'
import { Magnifier } from './spotlight.tsx'
import { HOLD, type Open, Tile, WidgetTile } from './tile.tsx'
import { WallpaperSheet } from './wallpaper-sheet.tsx'

const Blank = () => null
/** A folder tile is drawn as an app that never opens as one: Icon knows the shape. */
const asApp = (s: Slot): App | undefined => (isFolder(s) ? { name: s.name, folder: s.apps, view: Blank } : byName(s))

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
  const cells = useGrid()
  const homeWide = wide && !side
  // The open folder, by cell: the grid can change under it (an app carried out,
  // a rename), and the cell is what stays put. Gone, or no longer a folder, it closes.
  const [at, setAt] = useState<{ half: Half; i: number } | null>(null)
  const opened = at && cells[at.half][at.i]
  const folder = opened && isFolder(opened) ? opened : null
  const [papers, setPapers] = useState(false)
  // The tile on a finger and the cell under it. `lifting` says the same to the
  // pointer-up below, which must not read the carry as a swipe between pages.
  const [carry, setCarry] = useState<{ app: string; hot: Slot | null } | null>(null)
  const lifting = useRef(false)

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
  const y0 = useRef(0)
  const hold = useRef(0)

  /** The cell an element is in, as the slot it holds; nothing for the dock, the widgets or the paper. */
  const cellAt = (el: Element | null): Slot | null => {
    const c = el?.closest<HTMLElement>('[data-cell]')?.dataset.cell?.split(':')
    return c ? (grid()[c[0] as Half][Number(c[1])] ?? null) : null
  }
  /** A tile held on the grid: carried until let go, on another cell (they stack) or anywhere else (it springs back). */
  const carryOff = (app: string, down: PointerEvent, el: HTMLElement) => {
    lifting.current = true
    setCarry({ app, hot: null })
    lift(
      down,
      el,
      (under) => setCarry({ app, hot: cellAt(under) }),
      (under) => {
        lifting.current = false
        setCarry(null)
        const target = cellAt(under)
        if (!target || target === app) return false
        stack(app, target)
        return true
      }
    )
  }
  /** A tile held inside the open folder: let go outside the well, it leaves the folder for the grid. */
  const carryOut = (app: string, down: PointerEvent, el: HTMLElement) => {
    lifting.current = true
    lift(
      down,
      el,
      () => {},
      (under) => {
        lifting.current = false
        if (under?.closest('[data-folder-well]')) return false
        setAt(null)
        eject(app)
        return true
      }
    )
  }
  const tiles = (half: Half, first: number) =>
    cells[half].map((s, i) => {
      const a = asApp(s)
      if (!a) return null
      const app = isFolder(s) ? null : s
      return (
        <Tile
          key={app ?? `${half}/${i}`}
          a={a}
          i={i + first}
          cell={`${half}:${i}`}
          hot={!!carry && carry.hot === s}
          shake={!!carry && carry.app !== s}
          onOpen={app ? onOpen : () => setAt({ half, i })}
          onHold={app ? (down, el) => carryOff(app, down, el) : undefined}
        />
      )
    })

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
      {tiles('left', 2)}
    </div>
  )
  const right = (
    <div key="right" {...stylex.props(styles.half)}>
      {tiles('right', 0)}
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
          y0.current = e.clientY
          clearTimeout(hold.current)
          // A press on the paper itself, held still: the wallpaper sheet. Tiles and widgets feel their own.
          if (!(e.target as Element).closest('[data-tile]'))
            hold.current = window.setTimeout(() => setPapers(true), HOLD)
        }}
        onPointerMove={(e) => {
          if (Math.hypot(e.clientX - x0.current, e.clientY - y0.current) > 8) clearTimeout(hold.current)
        }}
        onPointerUp={(e) => {
          clearTimeout(hold.current)
          // A tile let go is not a swipe, however far it went.
          if (!lifting.current && Math.abs(e.clientX - x0.current) > 30)
            turn(pageRef.current + Math.sign(x0.current - e.clientX))
        }}
        onPointerCancel={() => clearTimeout(hold.current)}
        onPointerLeave={() => clearTimeout(hold.current)}
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
      {folder && (
        <FolderView
          folder={folder}
          onOpen={onOpen}
          onHold={carryOut}
          onRename={(name) => rename(folder, name)}
          onClose={() => setAt(null)}
        />
      )}
      {papers && <WallpaperSheet onClose={() => setPapers(false)} />}
    </div>
  )
}

const glassEase = easing.push

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
    transitionTimingFunction: easing.push
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
    borderRadius: radius.circle,
    backgroundColor: chrome.label2,
    cursor: 'pointer',
    transitionProperty: 'background-color, transform',
    transitionDuration: '.25s'
  },
  dotOn: { backgroundColor: colors.white, transform: 'scale(1.15)' },
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
    borderRadius: radius.xxl
  },
  srch: {
    position: 'absolute',
    right: 16,
    bottom: 15,
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    zIndex: 4,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  }
})
