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

import { CalendarWidget } from '@doan-labs/duo-app-calendar/widget.tsx'
import type { App } from '@doan-labs/duo-uikit/app.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { chrome, colors, easing, layout, motion, radius } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type Ref, type RefObject, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { byName } from '../apps.ts'
import { WeatherSnapshot } from '../runtime/widgets.tsx'
import { FolderView } from './folder.tsx'
import { type Carried, lift, type Side } from './gestures.ts'
import { DOCK_MAX, dock, eject, grid, type Half, isFolder, place, rename, type Slot, stack, useGrid } from './grid.ts'
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
  // The tile on a finger, where it came from and what is under it: a grid cell
  // it could stack on, or the dock index it would drop into. `lifting` says the
  // same to the pointer-up below, which must not read the carry as a swipe
  // between pages; `last` mirrors the state so pointer handlers do not
  // re-render per frame and the drop can read the final dock index.
  type Carry = { app: string; from: 'dock' | 'grid'; hot: Slot | null; dockAt: number | null }
  const [carry, setCarry] = useState<Carry | null>(null)
  const last = useRef<Carry | null>(null)
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
  /** The dock index `app` would drop into for a finger over the dock at `at`, or null when it has no room. */
  const dockAtOf = (d: Element, app: string, at: PointerEvent) => {
    const now = grid()
    if (!now.dock.includes(app) && now.dock.length >= DOCK_MAX) return null
    let n = 0
    for (const t of d.querySelectorAll<HTMLElement>('[data-dock-slot]')) {
      if (t.dataset.app === app) continue
      const r = t.getBoundingClientRect()
      if (r.top + r.height / 2 < at.clientY) n++
    }
    return n
  }
  // The let-go into a new cell: the grid updates, then the freshly mounted tile
  // flies from where the finger left it. Its landing stagger is cancelled or the
  // two transforms compose.
  const landTile = (app: string, was: Carried, el: HTMLElement, move: () => boolean) => {
    let ok = false
    flushSync(() => {
      ok = move()
    })
    if (!ok) return false
    const root = el.closest('[data-os]') ?? document
    const to = root.querySelector<HTMLElement>(`[data-tile][data-app="${CSS.escape(app)}"]`)
    if (!to) return true
    for (const x of to.getAnimations()) x.cancel()
    const now = to.getBoundingClientRect()
    const dx = (was.box.left + was.box.width / 2 - now.left - now.width / 2) * was.s
    const dy = (was.box.top + was.box.height / 2 - now.top - now.height / 2) * was.s
    // lift carried the tile at 1.12; dock icons are 41 px, grid icons 51.
    const k = was.box.width / 1.12 / now.width
    const a = to.animate([{ transform: `translate(${dx}px,${dy}px) scale(${k * 1.12})` }, { transform: 'none' }], {
      duration: 300,
      easing: 'cubic-bezier(.2,.9,.3,1)'
    })
    a.finished.then(
      () => a.cancel(),
      () => {}
    )
    return true
  }
  /** A tile held on the grid or in the dock: carried until let go, onto another cell (they stack), into the dock, or onto the paper of a half (it lands there loose); anywhere else it springs back. */
  const carryOff = (app: string, from: 'dock' | 'grid', down: PointerEvent, el: HTMLElement) => {
    lifting.current = true
    last.current = { app, from, hot: null, dockAt: null }
    setCarry(last.current)
    lift(
      down,
      el,
      (under, at) => {
        const d = under?.closest('[data-dock]')
        const dockAt = d ? dockAtOf(d, app, at) : null
        const hot = dockAt === null ? cellAt(under) : null
        const prev = last.current
        if (prev && prev.hot === hot && prev.dockAt === dockAt) return
        last.current = { app, from, hot, dockAt }
        setCarry(last.current)
      },
      (under, was) => {
        lifting.current = false
        const c = last.current
        last.current = null
        setCarry(null)
        if (under?.closest('[data-dock]')) {
          const i = c?.dockAt
          if (i == null) return false
          return landTile(app, was, el, () => dock(app, i))
        }
        const target = cellAt(under)
        if (target) {
          if (target === app) return false
          stack(app, target)
          return true
        }
        const half = under?.closest<HTMLElement>('[data-half]')?.dataset.half as Half | undefined
        if (half) return landTile(app, was, el, () => place(app, half))
        return false
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
          onHold={app ? (down, el) => carryOff(app, 'grid', down, el) : undefined}
        />
      )
    })

  const left = (
    <div key="left" data-half="left" {...stylex.props(styles.half)}>
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
    <div key="right" data-half="right" {...stylex.props(styles.half)}>
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

  // The dock makes room: a finger over it opens a slot at `dockAt`, and a dock
  // tile carried away closes its slot behind it. Both are transforms and an
  // animated height, so a retarget mid-drag slides rather than jumps. Slot
  // pitch is the 41 px icon plus the 9 px gap.
  const gap = carry?.dockAt != null
  const out = !!carry && carry.from === 'dock' && carry.dockAt === null
  const shiftOf = (n: string, k: number) => {
    if (!carry || carry.app === n) return undefined
    let vis = cells.dock.filter((x) => x !== carry.app).indexOf(n)
    if (gap && vis >= carry.dockAt!) vis += 1
    const shift = (vis - k) * 50
    return shift === 0 ? undefined : shift
  }
  const dockN = cells.dock.length + (gap ? 1 : 0) - (out ? 1 : 0)

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
      <div data-dock {...stylex.props(shared.glass, styles.dock, styles.dockHeight(dockN))}>
        {cells.dock.map((n, k) => {
          const a = byName(n)
          return (
            a && (
              <Tile
                key={n}
                a={a}
                dock
                onOpen={onOpen}
                onHold={(down, el) => carryOff(n, 'dock', down, el)}
                shake={!!carry && carry.app !== n}
                shift={shiftOf(n, k)}
              />
            )
          )
        })}
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
    // Centred on the content, not measured: the column grows with DOCK and the
    // baked one in screen.ts derives the same centre from its own height.
    top: '52.5%',
    transform: 'translateY(-50%)',
    width: layout.dock,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 9,
    paddingTop: 8,
    overflow: 'visible',
    borderRadius: radius.xxl,
    // The glass grows and shrinks with the slot that opens or closes under a
    // carried tile; translateY(-50%) keeps it centred as the height animates.
    transitionProperty: 'height',
    transitionDuration: '.25s',
    transitionTimingFunction: easing.push
  },
  // 8 px top and bottom, one 41 px slot per app plus its 9 px gap.
  dockHeight: (n: number) => ({ height: 8 + n * 41 + Math.max(0, n - 1) * 9 + 8 }),
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
