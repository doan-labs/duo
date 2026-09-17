// A real browser in an iframe. Sites that refuse to be framed show blank; the
// bookmarks are ones that don't.
import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { colors } from '../uikit/tokens.stylex.ts'

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
  return (
    <div {...stylex.props(shared.body, styles.body)}>
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
      <div {...stylex.props(styles.bar)}>
        <button type="button" {...stylex.props(styles.barBtn)} disabled={at === 0} onClick={() => step(-1)}>
          <Sym name="back" size={22} />
        </button>
        <button
          type="button"
          {...stylex.props(styles.barBtn)}
          disabled={at === hist.length - 1}
          onClick={() => step(1)}
        >
          <Sym name="forward" size={22} />
        </button>
        <button type="button" {...stylex.props(styles.barBtn)} onClick={() => navigator.clipboard?.writeText(url)}>
          <Sym name="share" size={22} />
        </button>
        <button type="button" {...stylex.props(styles.barBtn)} onClick={() => setMarks((m) => !m)}>
          <Sym name="book" size={22} />
        </button>
        <button type="button" {...stylex.props(styles.barBtn)}>
          <Sym name="tabs" size={22} />
        </button>
      </div>
    </div>
  )
}

const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  marks: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    overflowX: 'auto',
    backgroundColor: colors.barLight,
    flexShrink: 0
  },
  mark: {
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    fontSize: 12,
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 2px rgba(0,0,0,.1)',
    color: colors.black
  },
  url: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    alignItems: 'center',
    backgroundColor: colors.barLight,
    flexShrink: 0,
    color: colors.blue
  },
  input: {
    flexGrow: 1,
    borderWidth: 0,
    borderRadius: 11,
    paddingBlock: 9,
    paddingInline: 12,
    backgroundColor: colors.white,
    boxShadow: '0 1px 3px rgba(0,0,0,.12)',
    fontSize: 14,
    textAlign: 'center',
    color: colors.black,
    outline: 0
  },
  bar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingInline: 20,
    paddingBottom: 10,
    backgroundColor: colors.barLight,
    flexShrink: 0,
    color: colors.blue
  },
  barBtn: {
    display: 'grid',
    placeItems: 'center',
    paddingBlock: 4,
    paddingInline: 10,
    opacity: { default: null, ':disabled': 0.3 }
  }
})
