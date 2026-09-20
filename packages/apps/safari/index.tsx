import { Screen, usePresence } from '@doan-labs/duo-uikit'
// A real browser in an iframe. Sites that refuse to be framed show blank; the
// bookmarks are ones that don't.

import type { Os } from '@doan-labs/duo-sdk'
import { animations } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'react'
import { styles } from './styles.ts'

const HOME = 'https://duo.doan-labs.com'
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
  const [tabs, setTabs] = useState(() => [tab(os.arg ?? HOME)])
  const [cur, setCur] = useState(0)
  const [grid, setGrid] = useState(false)
  const [marks, setMarks] = useState(false)
  const strip = usePresence(marks)
  const cards = usePresence(grid)
  const t = tabs[cur]!
  const url = at(t)
  const [text, setText] = useState(() => (url ? host(url) : ''))
  const frame = useRef<HTMLIFrameElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const fresh = (x: Tab) => setText(at(x) ? host(at(x)!) : '')
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
    setMarks(false)
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
  }
  const open = () => {
    setTabs([...tabs, tab()])
    setCur(tabs.length)
    setText('')
    setGrid(false)
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
  }
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
        {url ? (
          <iframe ref={frame} title="Page" src={url} referrerPolicy="no-referrer" />
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
        <div {...stylex.props(styles.foot)}>
          {strip.mounted && (
            <div {...stylex.props(styles.marks, strip.closing && styles.marksOut)}>
              {MARKS.map(([n, u]) => (
                <button type="button" key={u} {...stylex.props(styles.mark)} onClick={() => go(u)}>
                  {n}
                </button>
              ))}
            </div>
          )}
          <div {...stylex.props(styles.url)}>
            <input
              ref={field}
              {...stylex.props(styles.input)}
              placeholder="Search or enter website name"
              value={text}
              spellCheck={false}
              onChange={(e) => setText(e.currentTarget.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => e.key === 'Enter' && go(text)}
            />
            <button type="button" onClick={reload}>
              <Sym name="reload" size={20} />
            </button>
          </div>
        </div>
      </div>
      {rail ? (
        <div {...stylex.props(styles.rail)}>
          <div {...stylex.props(styles.railPill)}>
            <Btn name="back" disabled={t.at === 0} onClick={() => step(-1)} />
            <Btn name="bookOutline" onClick={() => setMarks((m) => !m)} />
          </div>
          <div {...stylex.props(styles.railGap)} />
          <div {...stylex.props(styles.railPill)}>
            <Btn name="plus" onClick={open} />
            <Btn name="tabs" onClick={() => setGrid((g) => !g)} />
          </div>
        </div>
      ) : (
        <div {...stylex.props(styles.bar)}>
          <Btn name="back" disabled={t.at === 0} onClick={() => step(-1)} />
          <Btn name="forward" disabled={t.at === t.hist.length - 1} onClick={() => step(1)} />
          <Btn name="share" onClick={() => url && navigator.clipboard?.writeText(url)} />
          <Btn name="book" onClick={() => setMarks((m) => !m)} />
          <Btn name="tabs" onClick={() => setGrid((g) => !g)} />
        </div>
      )}
    </Screen>
  )
}
