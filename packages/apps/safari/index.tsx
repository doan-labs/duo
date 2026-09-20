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
const tab = (url: string): Tab => ({ id: seq++, hist: [url], at: 0 })

export const Safari = ({ os }: { os: Os }) => {
  const [tabs, setTabs] = useState(() => [tab(os.arg ?? HOME)])
  const [cur, setCur] = useState(0)
  const [grid, setGrid] = useState(false)
  const [marks, setMarks] = useState(false)
  const strip = usePresence(marks)
  const cards = usePresence(grid)
  const t = tabs[cur]!
  const url = t.hist[t.at]!
  const [text, setText] = useState(() => host(url))
  const frame = useRef<HTMLIFrameElement>(null)
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
    if (frame.current) frame.current.src = url
    setText(host(url))
  }
  const pick = (i: number) => {
    setCur(i)
    setText(host(tabs[i]!.hist[tabs[i]!.at]!))
    setGrid(false)
  }
  const open = () => {
    setTabs([...tabs, tab(HOME)])
    setCur(tabs.length)
    setText(host(HOME))
    setGrid(false)
  }
  // Closing the last tab leaves a fresh one, as Safari does.
  const close = (i: number) => {
    const rest = tabs.filter((_, j) => j !== i)
    if (!rest.length) rest.push(tab(HOME))
    const n = Math.min(cur > i ? cur - 1 : cur, rest.length - 1)
    setTabs(rest)
    setCur(n)
    setText(host(rest[n]!.hist[rest[n]!.at]!))
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
        <iframe ref={frame} title="Page" src={url} referrerPolicy="no-referrer" />
        {cards.mounted && (
          <div {...stylex.props(styles.grid, cards.closing ? animations.floatOut : animations.float)}>
            {tabs.map((x, i) => {
              const u = x.hist[x.at]!
              return (
                <div key={x.id} {...stylex.props(styles.card)}>
                  <button
                    type="button"
                    {...stylex.props(styles.cardPick, i === cur && styles.cardOn)}
                    onClick={() => pick(i)}
                    aria-label={host(u)}
                  >
                    <iframe title={host(u)} src={u} referrerPolicy="no-referrer" {...stylex.props(styles.peek)} />
                  </button>
                  <button
                    type="button"
                    {...stylex.props(styles.cardClose)}
                    onClick={() => close(i)}
                    aria-label="Close tab"
                  >
                    <Sym name="close" size={9} />
                  </button>
                  <div {...stylex.props(styles.cardName)}>{host(u)}</div>
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
              {...stylex.props(styles.input)}
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
          <Btn name="share" onClick={() => navigator.clipboard?.writeText(url)} />
          <Btn name="book" onClick={() => setMarks((m) => !m)} />
          <Btn name="tabs" onClick={() => setGrid((g) => !g)} />
        </div>
      )}
    </Screen>
  )
}
