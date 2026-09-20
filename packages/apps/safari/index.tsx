import { Screen } from '@doan-labs/duo-uikit'
// A real browser in an iframe. Sites that refuse to be framed show blank; the
// bookmarks are ones that don't.

import type { Os } from '@doan-labs/duo-sdk'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'react'
import { styles } from './styles.ts'

const MARKS: [string, string][] = [
  ['Wikipedia', 'en.m.wikipedia.org'],
  ['three.js', 'threejs.org'],
  ['Bun', 'bun.sh/docs'],
  ['Internet Archive', 'archive.org'],
  ['Bing', 'www.bing.com/search?q=iphone+duo']
]

const host = (url: string) => url.replace(/^https?:\/\//, '').split('/')[0]!

export const Safari = ({ os }: { os: Os }) => {
  const start = os.arg ?? 'https://en.m.wikipedia.org/wiki/Foldable_smartphone'
  // Cross-origin frames hide their own history, so Safari keeps its own list.
  const [hist, setHist] = useState([start])
  const [at, setAt] = useState(0)
  const [text, setText] = useState(() => host(start))
  const [marks, setMarks] = useState(true)
  const frame = useRef<HTMLIFrameElement>(null)
  const url = hist[at]!
  const show = (h: string[], i: number) => {
    setHist(h)
    setAt(i)
    setText(host(h[i]!))
  }
  const step = (d: number) => show(hist, Math.min(hist.length - 1, Math.max(0, at + d)))
  const go = (v: string) => {
    v = v.trim()
    if (!v) return
    if (!/^https?:\/\//.test(v))
      v = /\s|^[^.]+$/.test(v)
        ? `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(v)}`
        : `https://${v}`
    const h = [...hist.slice(0, at + 1), v]
    show(h, h.length - 1)
  }
  // Re-assigning the same src is how an iframe reloads; React would see no change.
  const reload = () => {
    if (frame.current) frame.current.src = url
    setText(host(url))
  }
  // The cover's camera column: Apple runs Safari's buttons down beside the status
  // stack there, and the page keeps the rest. The row bar is the inner display's.
  const rail = os.display === 'cover'
  const Btn = ({ name, ...p }: { name: SymProps['name']; disabled?: boolean; onClick?: () => void }) => (
    <button type="button" {...stylex.props(styles.barBtn)} {...p}>
      <Sym name={name} size={22} />
    </button>
  )
  return (
    <Screen xstyle={[styles.body, rail && styles.bodyRail]}>
      <div {...stylex.props(styles.page)}>
        <iframe ref={frame} title="Page" src={url} referrerPolicy="no-referrer" />
        <div {...stylex.props(styles.marks, !marks && shared.hide)}>
          {MARKS.map(([n, u]) => (
            <button type="button" key={u} {...stylex.props(styles.mark)} onClick={() => go(u)}>
              {n}
            </button>
          ))}
        </div>
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
      {rail ? (
        <div {...stylex.props(styles.rail)}>
          <Btn name="back" disabled={at === 0} onClick={() => step(-1)} />
          <Btn name="book" onClick={() => setMarks((m) => !m)} />
          <div {...stylex.props(styles.railGap)} />
          <Btn name="plus" onClick={() => go(start)} />
          <Btn name="tabs" />
        </div>
      ) : (
        <div {...stylex.props(styles.bar)}>
          <Btn name="back" disabled={at === 0} onClick={() => step(-1)} />
          <Btn name="forward" disabled={at === hist.length - 1} onClick={() => step(1)} />
          <Btn name="share" onClick={() => navigator.clipboard?.writeText(url)} />
          <Btn name="book" onClick={() => setMarks((m) => !m)} />
          <Btn name="tabs" />
        </div>
      )}
    </Screen>
  )
}
