// The macOS Photos window: a sidebar of albums, a toolbar with the zoom pill,
// the Years / Months / All Photos switch and the item actions, and a grid of
// aspect-fit thumbnails. Folded, the sidebar becomes a panel over the grid.
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import {
  filter,
  itemName,
  month,
  type Pic,
  range,
  toggle,
  update,
  useLibrary,
  useStore,
  VIEWS,
  type View,
  year
} from './data.ts'
import { Sidebar } from './sidebar.tsx'
import { styles } from './styles.ts'

/** Thumbnail minimum widths the − / + pill steps through. */
const ZOOM = [56, 76, 96, 130, 190]

export const Photos = () => {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  // Unfolded the sidebar is open until hidden; folded it starts closed and slides over the grid.
  const [side, setSide] = useState<boolean | null>(null)
  const [zoom, setZoom] = useState(2)
  const [fit, setFit] = useState(true)
  const [q, setQ] = useState<string | null>(null)
  const { place, view, sel, open, fav, del } = useStore()
  const setSel = (sel: string) => update({ sel })
  const setOpen = (open: string) => update({ open })
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  const { pics: all, loading } = useLibrary()
  const pics = filter(place, all, fav, del, q ?? '')
  const selected = pics.find((p) => p.id === sel)
  const viewing = pics.find((p) => p.id === open)
  const pick = (place: string) => {
    update({ place, sel: '' })
    if (!wide) setSide(false)
  }
  const act = (p: Pic, what: 'fav' | 'del') => {
    toggle(what === 'fav' ? fav : del, p.id)
    if (what === 'del') update({ sel: '', open: '' })
  }
  const showSide = (side ?? wide) && (wide || !viewing)
  return (
    <div ref={root} {...stylex.props(styles.root)}>
      {showSide && (
        <>
          {!wide && (
            <button
              type="button"
              aria-label="Hide sidebar"
              onClick={() => setSide(false)}
              {...stylex.props(styles.scrim, animations.fade)}
            />
          )}
          <div {...stylex.props(!wide && styles.overlay, !wide && animations.fade)}>
            <Sidebar current={place} pick={pick} close={() => setSide(false)} />
          </div>
        </>
      )}
      <div {...stylex.props(styles.main)} inert={!!viewing || (!wide && showSide)}>
        <header {...stylex.props(styles.bar)}>
          {!showSide && (
            <button
              type="button"
              aria-label="Show sidebar"
              onClick={() => setSide(true)}
              {...stylex.props(styles.tool, shared.press)}
            >
              <Sym name="sidebar" size={16} />
            </button>
          )}
          <div {...stylex.props(styles.heading)}>
            <div {...stylex.props(styles.title)}>{itemName(place)}</div>
            <div {...stylex.props(styles.subtitle)}>{range(pics) || 'No Photos'}</div>
          </div>
          <div {...stylex.props(styles.pill, styles.wideOnly)}>
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom === 0}
              onClick={() => setZoom(zoom - 1)}
              {...stylex.props(styles.pillBtn)}
            >
              <Sym name="minus" size={11} />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom === ZOOM.length - 1}
              onClick={() => setZoom(zoom + 1)}
              {...stylex.props(styles.pillBtn)}
            >
              <Sym name="plus" size={11} />
            </button>
          </div>
          <div role="tablist" aria-label="View" {...stylex.props(styles.segments, styles.wideOnly)}>
            {VIEWS.map(([id, name]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => update({ view: id })}
                {...stylex.props(styles.segment, view === id && styles.segmentOn)}
              >
                {name}
              </button>
            ))}
          </div>
          <div {...stylex.props(styles.actions)}>
            <button
              type="button"
              aria-label={fit ? 'Fill squares' : 'Show aspect ratios'}
              aria-pressed={!fit}
              onClick={() => setFit(!fit)}
              {...stylex.props(styles.tool, shared.press, styles.wideOnly)}
            >
              <Sym name="aspect" size={15} />
            </button>
            <i {...stylex.props(styles.divider, styles.wideOnly)} />
            <button
              type="button"
              aria-label={selected && fav.has(selected.id) ? 'Unfavorite' : 'Favorite'}
              disabled={!selected}
              onClick={() => selected && act(selected, 'fav')}
              {...stylex.props(styles.tool, shared.press)}
            >
              <Sym name={selected && fav.has(selected.id) ? 'heartFill' : 'heart'} size={15} />
            </button>
            <button
              type="button"
              aria-label={place === 'deleted' ? 'Recover' : 'Delete'}
              disabled={!selected}
              onClick={() => selected && act(selected, 'del')}
              {...stylex.props(styles.tool, shared.press)}
            >
              <Sym name={place === 'deleted' ? 'undo' : 'trashOutline'} size={15} />
            </button>
            <i {...stylex.props(styles.divider, styles.wideOnly)} />
            <button
              type="button"
              aria-label="Search"
              aria-pressed={q !== null}
              onClick={() => setQ(q === null ? '' : null)}
              {...stylex.props(styles.tool, shared.press)}
            >
              <Sym name="search" size={14} />
            </button>
          </div>
        </header>
        {q !== null && (
          <div {...stylex.props(styles.searchRow, animations.row)}>
            <label {...stylex.props(styles.search)}>
              <Sym name="search" size={12} />
              <input
                // biome-ignore lint/a11y/noAutofocus: the row exists only to be typed into
                autoFocus
                {...stylex.props(styles.searchIn)}
                placeholder="Search"
                aria-label="Search photos"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => setQ(null)} {...stylex.props(styles.cancel, shared.press)}>
              Cancel
            </button>
          </div>
        )}
        <div role="tablist" aria-label="View" {...stylex.props(styles.segments, styles.narrowOnly)}>
          {VIEWS.map(([id, name]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => update({ view: id })}
              {...stylex.props(styles.segment, view === id && styles.segmentOn)}
            >
              {name}
            </button>
          ))}
        </div>
        <div {...stylex.props(styles.scroll)}>
          {group(pics, view).map(([name, group]) => (
            <section key={name} aria-label={name}>
              {name && <h2 {...stylex.props(styles.groupTitle)}>{name}</h2>}
              <div {...stylex.props(styles.grid, styles.cells(ZOOM[zoom]!))}>
                {group.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`Photo, ${month(p.takenAt)}`}
                    aria-pressed={p.id === sel}
                    onClick={() => (p.id === sel ? setOpen(p.id) : setSel(p.id))}
                    {...stylex.props(styles.cell, p.id === sel && styles.cellOn)}
                  >
                    <span
                      {...stylex.props(
                        styles.frame,
                        fit ? styles.ratio(p.ratio) : styles.square,
                        fit && (p.ratio >= 1 ? styles.landscape : styles.portrait)
                      )}
                    >
                      <img src={p.src} alt="" loading="lazy" {...stylex.props(styles.img)} />
                      {fav.has(p.id) && (
                        <span {...stylex.props(styles.badge)}>
                          <Sym name="heartFill" size={11} />
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <div {...stylex.props(styles.count)}>
            {loading
              ? 'Loading'
              : pics.length
                ? `${pics.length} ${pics.length === 1 ? 'Photo' : 'Photos'}`
                : 'No Photos'}
          </div>
        </div>
      </div>
      {viewing && (
        <Viewer
          pic={viewing}
          fav={fav.has(viewing.id)}
          onFav={() => act(viewing, 'fav')}
          onDel={() => act(viewing, 'del')}
          close={() => setOpen('')}
        />
      )}
    </div>
  )
}

/** Sections for the segmented control: one per year, one per month, or a single unnamed run. */
function group(pics: Pic[], view: View): [string, Pic[]][] {
  if (view === 'all') return [['', pics]]
  const key = view === 'years' ? year : month
  const out = new Map<string, Pic[]>()
  for (const p of [...pics].sort((a, b) => b.takenAt - a.takenAt)) {
    const k = key(p.takenAt)
    out.set(k, [...(out.get(k) ?? []), p])
  }
  return [...out]
}

const Viewer = ({
  pic,
  fav,
  onFav,
  onDel,
  close
}: {
  pic: Pic
  fav: boolean
  onFav: () => void
  onDel: () => void
  close: () => void
}) => {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [close])
  return (
    <div role="dialog" aria-label="Photo" {...stylex.props(styles.viewer, animations.fade)}>
      <div {...stylex.props(styles.viewerBar)}>
        <button
          ref={first}
          type="button"
          aria-label="Close"
          onClick={close}
          {...stylex.props(styles.tool, shared.press)}
        >
          <Sym name="close" size={15} />
        </button>
        <span {...stylex.props(styles.viewerTitle)}>{month(pic.takenAt)}</span>
        <button
          type="button"
          aria-label={fav ? 'Unfavorite' : 'Favorite'}
          onClick={onFav}
          {...stylex.props(styles.tool, shared.press)}
        >
          <Sym name={fav ? 'heartFill' : 'heart'} size={15} />
        </button>
        <button type="button" aria-label="Delete" onClick={onDel} {...stylex.props(styles.tool, shared.press)}>
          <Sym name="trashOutline" size={15} />
        </button>
      </div>
      <img src={pic.src} alt="" {...stylex.props(styles.viewerImg)} />
    </div>
  )
}
