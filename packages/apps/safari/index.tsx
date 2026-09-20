import { Menu, type MenuItem, Screen, usePresence } from '@doan-labs/duo-uikit'
// A real browser in an iframe. Sites that refuse to be framed show blank; the
// bookmarks are ones that don't.

import type { Os } from '@doan-labs/duo-sdk'
import { animations } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { Bookmarks } from './bookmarks.tsx'
import { styles } from './styles.ts'

const HOME = 'https://duo.doan-labs.com'
// The home page is our own site, and only our own site can run the scroll
// bridge. In dev it is the web package's vite server, and the shell is often
// reached through a proxy host like duo.localhost rather than localhost itself.
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

// Cross-origin frames hide their own history, so each tab keeps its own list.
type Tab = { id: number; hist: string[]; at: number }
let seq = 0
// A tab with no history shows the start page: favourites and a focused address bar.
const tab = (url?: string): Tab => ({ id: seq++, hist: url ? [url] : [], at: 0 })
const at = (x: Tab) => x.hist[x.at]
const name = (x: Tab) => (at(x) ? host(at(x)!) : 'Start Page')

export const Safari = ({ os }: { os: Os }) => {
  const home = typeof window !== 'undefined' && isDev(window.location.hostname) ? DEV_HOME : HOME
  const [tabs, setTabs] = useState(() => [tab(os.arg ?? home)])
  const [cur, setCur] = useState(0)
  const [grid, setGrid] = useState(false)
  const [bookmarks, setBookmarks] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [pageMenu, setPageMenu] = useState(false)
  const [urlCompact, setUrlCompact] = useState(false)
  const bookmarkPage = usePresence(bookmarks)
  const cards = usePresence(grid)
  const t = tabs[cur]!
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
    setTabs(tabs.map((x, i) => (i === cur ? { ...x, hist, at } : x)))
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
  const pick = (i: number) => {
    setCur(i)
    fresh(tabs[i]!)
    setGrid(false)
    setUrlCompact(false)
  }
  const open = () => {
    setTabs([...tabs, tab()])
    setCur(tabs.length)
    setText('')
    setBookmarks(false)
    setMoreOpen(false)
    setGrid(false)
    setUrlCompact(false)
    setTimeout(() => field.current?.focus())
  }
  // Closing the last tab leaves a fresh one, as Safari does.
  const close = (i: number) => {
    const rest = tabs.filter((_, j) => j !== i)
    if (!rest.length) rest.push(tab())
    const n = Math.min(cur > i ? cur - 1 : cur, rest.length - 1)
    setTabs(rest)
    setCur(n)
    fresh(rest[n]!)
    setMoreOpen(false)
    setUrlCompact(false)
  }
  // Safari's page menu. Text size, Find on Page and Request Desktop Site are the
  // rest of Apple's list and none of them can reach into a cross-origin frame, so
  // the menu holds what the shell can actually carry out.
  const actions: MenuItem[] = [
    { icon: 'reload', label: 'Reload Page', onSelect: reload },
    { icon: 'share', label: 'Copy Link', onSelect: () => url && navigator.clipboard?.writeText(url) },
    { icon: 'bookOutline', label: 'Bookmarks', onSelect: () => setBookmarks(true) },
    { icon: 'plus', label: 'New Tab', onSelect: open },
    { icon: 'eye', label: 'Hide Toolbar', onSelect: () => setUrlCompact(true) }
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
            <iframe ref={frame} title="Page" src={url} referrerPolicy="no-referrer" {...stylex.props(styles.frame)} />
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
              <Bookmarks onNavigate={go} />
            </div>
          )}
          {cards.mounted && (
            <div {...stylex.props(styles.grid, cards.closing ? animations.floatOut : animations.float)}>
              {tabs.map((x, i) => {
                const u = at(x)
                return (
                  <div key={x.id} {...stylex.props(styles.card)}>
                    <button
                      type="button"
                      {...stylex.props(styles.cardPick, i === cur && styles.cardOn)}
                      onClick={() => pick(i)}
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
                      onClick={() => close(i)}
                      aria-label="Close tab"
                    >
                      <Sym name="close" size={9} />
                    </button>
                    <div {...stylex.props(styles.cardName)}>{name(x)}</div>
                  </div>
                )
              })}
            </div>
          )}
          {bookmarks && (
            <Menu
              open={moreOpen}
              onClose={() => setMoreOpen(false)}
              xstyle={styles.moreMenu}
              itemStyle={styles.moreItem}
              items={[
                { label: 'New Tab', onSelect: open },
                { label: 'Close Bookmarks', onSelect: () => setBookmarks(false) }
              ]}
            />
          )}
        </div>
        {pageMenu && (
          <button
            type="button"
            {...stylex.props(styles.pageScrim)}
            aria-label="Close page menu"
            onClick={() => setPageMenu(false)}
          />
        )}
        {!bookmarks && (
          <div {...stylex.props(styles.foot, rail && styles.footRail)}>
            <Menu
              open={pageMenu}
              onClose={() => setPageMenu(false)}
              size={18}
              xstyle={styles.pageMenu}
              itemStyle={styles.moreItem}
              items={actions}
            />
            <div {...stylex.props(styles.url, urlCompact && styles.urlCompact)}>
              <button
                type="button"
                {...stylex.props(styles.urlMenu, urlCompact && styles.urlSideOff)}
                aria-label="Page actions"
                aria-expanded={pageMenu}
                tabIndex={urlCompact ? -1 : undefined}
                onClick={() => setPageMenu((o) => !o)}
              >
                <span {...stylex.props(styles.menuLine)} />
                <span {...stylex.props(styles.menuLine)} />
                <span {...stylex.props(styles.menuLine)} />
              </button>
              <input
                ref={field}
                {...stylex.props(styles.input, urlCompact && styles.inputCompact)}
                placeholder="Search or enter website name"
                value={text}
                spellCheck={false}
                onChange={(e) => setText(e.currentTarget.value)}
                onFocus={(e) => {
                  setUrlCompact(false)
                  e.currentTarget.select()
                }}
                onKeyDown={(e) => e.key === 'Enter' && go(text)}
              />
              <button
                type="button"
                {...stylex.props(styles.urlReload, urlCompact && styles.urlSideOff)}
                aria-label="Reload page"
                tabIndex={urlCompact ? -1 : undefined}
                onClick={reload}
              >
                <Sym name="reload" size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
      {rail ? (
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
                <Btn name="plus" onClick={open} />
                <Btn name="tabs" onClick={() => setGrid((g) => !g)} />
              </div>
            </>
          )}
        </div>
      ) : (
        <div {...stylex.props(styles.bar)}>
          <Btn name="back" disabled={t.at === 0} onClick={() => step(-1)} />
          <Btn name="forward" disabled={t.at === t.hist.length - 1} onClick={() => step(1)} />
          <Btn name="share" onClick={() => url && navigator.clipboard?.writeText(url)} />
          {/* The row bar has no Done button of its own, so the book button is the toggle. */}
          <Btn
            name="book"
            onClick={() => {
              setMoreOpen(false)
              setBookmarks((b) => !b)
            }}
          />
          <Btn name="tabs" onClick={() => setGrid((g) => !g)} />
        </div>
      )}
    </Screen>
  )
}
