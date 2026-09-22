import { Menu, type MenuEntry, type MenuItem, Screen, usePresence } from '@doan-labs/duo-uikit'
// A real browser in an iframe. Sites that refuse to be framed show blank; the
// bookmarks are ones that don't.

import type { Os } from '@doan-labs/duo-sdk'
import { animations, dark } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { Bookmarks, recent } from './bookmarks.tsx'
import { styles } from './styles.ts'

// The home page is our own site, and only our own site can run the scroll
// bridge the address bar shrinks from. In dev that has to be the web package's
// own server: the deployed build is whatever last landed on main, so framing it
// while developing tests an old copy of the very page being worked on. The
// shell is often reached through a proxy host like duo.localhost rather than
// localhost itself.
const HOME = 'https://duo.doan-labs.com'
const DEV_HOME = 'http://localhost:3001'
const isDev = (h: string) => h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')
const MARKS: [string, string][] = [
  ['Duo', 'duo.doan-labs.com'],
  ['Wikipedia', 'en.m.wikipedia.org'],
  ['three.js', 'threejs.org'],
  ['Bun', 'bun.sh/docs'],
  ['Internet Archive', 'archive.org'],
  ['Bing', 'www.bing.com/search?q=iphone+duo']
]

const host = (url: string) => url.replace(/^https?:\/\//, '').split('/')[0]!
// The compact pill hugs the host name, and an input never sizes to its own text.
const textWidth = (el: HTMLInputElement | null, s: string) => {
  const c = document.createElement('canvas').getContext('2d')
  if (!el || !c) return 0
  const f = getComputedStyle(el)
  c.font = `${f.fontWeight} ${f.fontSize} ${f.fontFamily}`
  return c.measureText(s).width
}
// Safari's Page Zoom steps, 50% to 300%, remembered per site.
const ZOOM = [0.5, 0.75, 0.85, 1, 1.15, 1.25, 1.5, 1.75, 2, 2.5, 3]

// Cross-origin frames hide their own history, so each tab keeps its own list.
type Tab = { id: number; hist: string[]; at: number; priv: boolean }
let seq = 0
// A tab with no history shows the start page: favourites and a focused address bar.
const tab = (url?: string, priv = false): Tab => ({ id: seq++, hist: url ? [url] : [], at: 0, priv })
const at = (x: Tab) => x.hist[x.at]
const name = (x: Tab) => (at(x) ? host(at(x)!) : 'Start Page')

export const Safari = ({ os }: { os: Os }) => {
  const home = typeof window !== 'undefined' && isDev(window.location.hostname) ? DEV_HOME : HOME
  const [tabs, setTabs] = useState(() => [tab(os.arg ?? home)])
  // The open tab by id, which a tab closing before it cannot shift; the first
  // tab until one is picked.
  const [cur, setCur] = useState(-1)
  const [grid, setGrid] = useState(false)
  // The overview's segment: the private list or the normal one.
  const [priv, setPriv] = useState(false)
  const [bookmarks, setBookmarks] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [pageMenu, setPageMenu] = useState(false)
  const [urlCompact, setUrlCompact] = useState(false)
  const [zooms, setZooms] = useState<Record<string, number>>({})
  const bookmarkPage = usePresence(bookmarks)
  const cards = usePresence(grid)
  const t = tabs.find((x) => x.id === cur) ?? tabs[0]!
  const list = tabs.filter((x) => x.priv === priv)
  const count = tabs.length - tabs.filter((x) => x.priv).length
  const url = at(t)
  const [text, setText] = useState(() => (url ? host(url) : ''))
  const surface = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const scrollTop = useRef(0)
  const travel = useRef(0)
  const fresh = (x: Tab) => setText(at(x) ? host(at(x)!) : '')
  useEffect(() => {
    const currentUrl = url
    if (!currentUrl) return
    const origin = new URL(currentUrl).origin
    // One flick arrives as a stream of small deltas, and a smooth-scrolled page
    // ends its easing with a sub-pixel bounce the other way. Flipping the pill
    // on each of those flickers, so commit only after 24 px one way; the top of
    // a page always shows the full bar, as Safari does.
    const drive = (top: number) => {
      const step = top - scrollTop.current
      scrollTop.current = top
      if (top < 24) {
        travel.current = 0
        return setUrlCompact(false)
      }
      travel.current = travel.current * step > 0 ? travel.current + step : step
      if (Math.abs(travel.current) > 24) setUrlCompact(travel.current > 0)
    }
    const onMessage = (event: MessageEvent<{ type?: string; top?: number }>) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return
      if (event.data?.type !== 'duo-safari-scroll' || typeof event.data.top !== 'number') return
      drive(event.data.top)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [url])
  useEffect(() => {
    if (bookmarks) surface.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [bookmarks])
  const show = (hist: string[], at: number) => {
    setTabs(tabs.map((x) => (x.id === t.id ? { ...x, hist, at } : x)))
    setText(host(hist[at]!))
  }
  const step = (d: number) => show(t.hist, Math.min(t.hist.length - 1, Math.max(0, t.at + d)))
  const go = (v: string) => {
    v = v.trim()
    if (!v) return
    if (!/^https?:\/\//.test(v))
      v = /\s|^[^.]+$/.test(v)
        ? `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(v)}`
        : `https://${v}`
    const h = [...t.hist.slice(0, t.at + 1), v]
    show(h, h.length - 1)
    setBookmarks(false)
    setMoreOpen(false)
    setPageMenu(false)
    setUrlCompact(false)
  }
  // Re-assigning the same src is how an iframe reloads; React would see no change.
  const reload = () => {
    if (frame.current && url) frame.current.src = url
    if (url) setText(host(url))
  }
  const pick = (x: Tab) => {
    setCur(x.id)
    fresh(x)
    setGrid(false)
    setUrlCompact(false)
  }
  // A new tab joins the list on show: the overview's segment, else the open tab's.
  const open = (p = grid ? priv : t.priv) => {
    const x = tab(undefined, p)
    setTabs([...tabs, x])
    setCur(x.id)
    setText('')
    setBookmarks(false)
    setMoreOpen(false)
    setGrid(false)
    setUrlCompact(false)
    setTimeout(() => field.current?.focus())
  }
  // Closing the last tab leaves a fresh one, as Safari does; the private list
  // may run empty. Closing the open tab opens the one that takes its place in
  // its list, else a normal tab.
  const close = (x: Tab) => {
    const rest = tabs.filter((y) => y !== x)
    if (!rest.some((y) => !y.priv)) rest.push(tab())
    const same = rest.filter((y) => y.priv === x.priv)
    const k = Math.min(tabs.filter((y) => y.priv === x.priv).indexOf(x), same.length - 1)
    const next = x !== t ? t : (same[k] ?? rest.find((y) => !y.priv)!)
    setTabs(rest)
    setCur(next.id)
    fresh(next)
    setMoreOpen(false)
    setUrlCompact(false)
  }
  const overview = () => {
    setPriv(t.priv)
    setMoreOpen(false)
    setPageMenu(false)
    setGrid(true)
  }
  // Done goes back to the open tab if it is in the list on show, else to that
  // list's last tab, else to a new one in it.
  const done = () => {
    const back = t.priv === priv ? t : list.at(-1)
    back ? pick(back) : open()
  }
  // Safari's page menu, row for row. Everything on it but text size reads or
  // rewrites the page, and the page is a cross-origin frame the shell cannot see
  // into, so those rows sit greyed rather than pretend. Text size is real: Safari
  // zooms the page, and a frame laid out at 100/z and scaled by z is that zoom.
  const key = url ? new URL(url).host : ''
  const zoom = zooms[key] ?? 1
  const zoomBy = (d: number) => {
    const i = Math.min(ZOOM.length - 1, Math.max(0, ZOOM.indexOf(zoom) + d))
    setZooms({ ...zooms, [key]: ZOOM[i]! })
  }
  const none = () => {}
  const actions: MenuEntry[] = [
    { icon: 'eyeSlash', label: 'Hide Distracting Items', disabled: true, onSelect: none },
    { icon: 'translate', label: 'Translate to English', disabled: true, onSelect: none },
    'separator',
    { icon: 'extension', label: 'Manage Extensions', disabled: true, onSelect: none }
  ]
  const actionsFoot: MenuItem[] = [
    { icon: 'findOnPage', label: 'Find', name: 'Find on Page', disabled: true, onSelect: none },
    {
      icon: 'textSmaller',
      label: 'Smaller',
      name: 'Smaller text',
      disabled: zoom === ZOOM[0],
      onSelect: () => zoomBy(-1)
    },
    {
      icon: 'textLarger',
      label: 'Larger',
      name: 'Larger text',
      disabled: zoom === ZOOM.at(-1),
      onSelect: () => zoomBy(1)
    }
  ]
  // The round more button beside the pill, row for row. A private tab is a plain
  // one in a list of its own: the shell keeps no history or storage for any tab
  // to begin with.
  const share = () => url && (navigator.share?.({ url }) ?? navigator.clipboard?.writeText(url))
  const more: MenuEntry[] = [
    { icon: 'share', label: 'Share', onSelect: share },
    { icon: 'bookmark', label: 'Add to Bookmarks', disabled: !url, onSelect: () => recent.push([key, url!, key]) },
    { icon: 'bookOutline', label: 'Add Bookmark to…', onSelect: () => setBookmarks(true) },
    'separator',
    { icon: 'plus', label: 'New Tab', onSelect: () => open() },
    { icon: 'privacy', label: 'New Private Tab', onSelect: () => open(true) }
  ]
  const moreFoot: MenuItem[] = [
    { icon: 'book', label: 'Bookmarks', onSelect: () => setBookmarks(true) },
    { icon: 'tabs', label: 'All Tabs', onSelect: overview }
  ]
  // The cover's camera column: Apple runs Safari's buttons down beside the status
  // stack there, and the page keeps the rest. The row bar is the inner display's.
  const rail = os.display === 'cover'
  const Btn = ({ name, ...p }: { name: SymProps['name']; disabled?: boolean; onClick?: () => void }) => (
    <button type="button" {...stylex.props(styles.barBtn, rail && styles.railBtn)} {...p}>
      <Sym name={name} size={rail ? 16 : 22} />
    </button>
  )
  return (
    <Screen xstyle={[styles.body, rail && styles.bodyRail]}>
      <div {...stylex.props(styles.page)}>
        <div ref={surface} {...stylex.props(styles.scroll)}>
          {url ? (
            <iframe
              ref={frame}
              title="Page"
              src={url}
              referrerPolicy="no-referrer"
              {...stylex.props(styles.frame, zoom !== 1 && styles.zoom(zoom))}
            />
          ) : (
            <div {...stylex.props(styles.start, animations.fade)}>
              <div {...stylex.props(styles.startTitle)}>Favourites</div>
              <div {...stylex.props(styles.favs)}>
                {MARKS.map(([n, u]) => (
                  <button type="button" key={u} {...stylex.props(styles.fav)} onClick={() => go(u)}>
                    <span {...stylex.props(styles.favIcon)}>{n[0]}</span>
                    <span {...stylex.props(styles.favName)}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {bookmarkPage.mounted && (
            <div
              {...stylex.props(styles.bookmarkLayer, bookmarkPage.closing ? styles.bookmarksOut : styles.bookmarksIn)}
            >
              <Bookmarks onNavigate={go} onClose={rail ? undefined : () => setBookmarks(false)} />
            </div>
          )}
          {cards.mounted && (
            <div {...stylex.props(dark, styles.grid, cards.closing ? animations.floatOut : animations.float)}>
              {list.map((x) => {
                const u = at(x)
                return (
                  <div key={x.id} {...stylex.props(styles.card)}>
                    <button
                      type="button"
                      {...stylex.props(styles.cardPick, x === t && list.length > 1 && styles.cardOn)}
                      onClick={() => pick(x)}
                      aria-label={name(x)}
                    >
                      {u ? (
                        <iframe title={name(x)} src={u} referrerPolicy="no-referrer" {...stylex.props(styles.peek)} />
                      ) : (
                        <span {...stylex.props(styles.peekStart)}>{name(x)}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      {...stylex.props(styles.cardClose)}
                      onClick={() => close(x)}
                      aria-label="Close tab"
                    >
                      <Sym name="close" size={10} />
                    </button>
                    <div {...stylex.props(styles.cardName)}>{name(x)}</div>
                  </div>
                )
              })}
              {!list.length && (
                <div {...stylex.props(styles.privateEmpty)}>
                  <div {...stylex.props(styles.privateTitle)}>Private Browsing</div>
                  Safari won't remember the pages you visit in these tabs.
                </div>
              )}
            </div>
          )}
          {bookmarks && (
            <Menu
              open={moreOpen}
              onClose={() => setMoreOpen(false)}
              xstyle={styles.moreMenu}
              itemStyle={styles.moreItem}
              items={[
                { label: 'New Tab', onSelect: () => open() },
                { label: 'Close Bookmarks', onSelect: () => setBookmarks(false) }
              ]}
            />
          )}
        </div>
        {(pageMenu || moreOpen) && (
          <button
            type="button"
            {...stylex.props(styles.pageScrim)}
            aria-label="Close menu"
            onClick={() => {
              setPageMenu(false)
              setMoreOpen(false)
            }}
          />
        )}
        {!bookmarks && (
          <div {...stylex.props(styles.foot)}>
            <Menu
              open={pageMenu}
              onClose={() => setPageMenu(false)}
              size={18}
              xstyle={styles.pageMenu}
              itemStyle={styles.moreItem}
              items={actions}
              footer={actionsFoot}
            />
            <Menu
              open={moreOpen}
              onClose={() => setMoreOpen(false)}
              size={18}
              xstyle={[styles.pageMenu, styles.menuRight]}
              itemStyle={styles.moreItem}
              items={more}
              footer={moreFoot}
            />
            <div {...stylex.props(dark, styles.footRow)}>
              {grid ? (
                <>
                  <button
                    type="button"
                    {...stylex.props(styles.footBtn)}
                    aria-label={priv ? 'New private tab' : 'New tab'}
                    onClick={() => open()}
                  >
                    <Sym name="plus" size={20} />
                  </button>
                  <div {...stylex.props(styles.tabSegs)} role="tablist" aria-label="Tab lists">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={priv}
                      {...stylex.props(styles.tabSeg, priv && styles.tabSegOn)}
                      onClick={() => setPriv(true)}
                    >
                      Private
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!priv}
                      {...stylex.props(styles.tabSeg, !priv && styles.tabSegOn)}
                      onClick={() => setPriv(false)}
                    >
                      {count} {count === 1 ? 'Tab' : 'Tabs'}
                    </button>
                  </div>
                  <button type="button" {...stylex.props(styles.footBtn, styles.done)} aria-label="Done" onClick={done}>
                    <Sym name="tick" size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    {...stylex.props(styles.footBtn, urlCompact && styles.footBtnOff)}
                    aria-label="Back"
                    disabled={t.at === 0}
                    tabIndex={urlCompact ? -1 : undefined}
                    onClick={() => step(-1)}
                  >
                    <Sym name="back" size={18} />
                  </button>
                  <div
                    {...stylex.props(styles.url, urlCompact && styles.urlCompact(textWidth(field.current, text) + 50))}
                  >
                    <button
                      type="button"
                      {...stylex.props(styles.urlSide, urlCompact && styles.urlSideOff)}
                      aria-label="Page actions"
                      aria-expanded={pageMenu}
                      tabIndex={urlCompact ? -1 : undefined}
                      onClick={() => setPageMenu((o) => !o)}
                    >
                      <Sym name="pageMenu" size={20} />
                    </button>
                    <input
                      ref={field}
                      {...stylex.props(styles.input, rail && styles.inputRail)}
                      placeholder="Search or enter website name"
                      value={text}
                      spellCheck={false}
                      // A tap on the compact pill only brings the bar back, as on the
                      // phone; the next tap is the one that edits the address.
                      onMouseDown={(e) => {
                        if (!urlCompact) return
                        e.preventDefault()
                        setUrlCompact(false)
                      }}
                      onChange={(e) => setText(e.currentTarget.value)}
                      onFocus={(e) => {
                        setUrlCompact(false)
                        e.currentTarget.select()
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && go(text)}
                    />
                    <button
                      type="button"
                      {...stylex.props(styles.urlSide, urlCompact && styles.urlSideOff)}
                      aria-label="Reload page"
                      tabIndex={urlCompact ? -1 : undefined}
                      onClick={reload}
                    >
                      <Sym name="reload" size={20} />
                    </button>
                  </div>
                  <button
                    type="button"
                    {...stylex.props(styles.footBtn, urlCompact && styles.footBtnOff)}
                    aria-label="More"
                    aria-expanded={moreOpen}
                    tabIndex={urlCompact ? -1 : undefined}
                    onClick={() => setMoreOpen((o) => !o)}
                  >
                    <Sym name="ellipsis" size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {rail && (
        <div {...stylex.props(styles.rail)}>
          {bookmarks ? (
            <div {...stylex.props(styles.railPill)}>
              <Btn name="more" onClick={() => setMoreOpen((open) => !open)} />
              <Btn
                name="close"
                onClick={() => {
                  setBookmarks(false)
                  setMoreOpen(false)
                }}
              />
            </div>
          ) : (
            <>
              <div {...stylex.props(styles.railPill)}>
                <Btn name="back" disabled={t.at === 0} onClick={() => step(-1)} />
                <Btn
                  name="bookOutline"
                  onClick={() => {
                    setMoreOpen(false)
                    setBookmarks(true)
                  }}
                />
              </div>
              <div {...stylex.props(styles.railGap)} />
              <div {...stylex.props(styles.railPill)}>
                <Btn name="plus" onClick={() => open()} />
                <Btn name="tabs" onClick={grid ? done : overview} />
              </div>
            </>
          )}
        </div>
      )}
    </Screen>
  )
}
