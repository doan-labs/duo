// Math Notes: a page of lines that evaluate as you type - expressions answer
// inline, `price = 20` stores a variable the lines below can use, `y = f(x)`
// and `z = f(x,y)` offer an Insert Graph pill, and the ink canvas can be
// toggled on to write math with the pointer instead of the keyboard.
// Line text persists in os.storage so both displays share the page.

import * as stylex from '@stylexjs/stylex'
import { useMemo, useRef, useState } from 'react'
import { evaluateLine, fmt, type Scope } from './engine.ts'
import type { GraphEq, NotesDoc } from './store.ts'
import { styles } from './styles.ts'

export type NoteResults = { results: ReturnType<typeof evaluateLine>[]; scope: Scope }

export const useNoteEval = (lines: string[], rad: boolean): NoteResults =>
  useMemo(() => {
    const scope: Scope = {}
    const results = lines.map((l) => evaluateLine(l, scope, rad))
    return { results, scope }
  }, [lines, rad])

export const Notes = ({
  doc,
  rad,
  graphs,
  onDoc,
  onGraph
}: {
  doc: NotesDoc
  rad: boolean
  graphs: GraphEq[]
  onDoc: (d: NotesDoc) => void
  onGraph: (g: GraphEq) => void
}) => {
  const lines = doc.lines.length ? doc.lines : ['']
  const { results } = useNoteEval(lines, rad)
  const [focus, setFocus] = useState<number | null>(null)
  const host = useRef<HTMLDivElement | null>(null)

  const put = (i: number, v: string) => onDoc({ lines: lines.map((l, j) => (j === i ? v : l)) })
  const addAfter = (i: number) => {
    const next = [...lines]
    next.splice(i + 1, 0, '')
    onDoc({ lines: next })
    setFocus(i + 1)
  }
  const del = (i: number) => {
    onDoc({ lines: lines.filter((_, j) => j !== i) })
    setFocus(Math.max(0, i - 1))
  }

  return (
    <div ref={host} {...stylex.props(styles.notes)}>
      {lines.length === 1 && lines[0] === '' && (
        <div {...stylex.props(styles.nHint)}>
          Type or write an equation. Try `price = 20` then `price × 4 =`, or `y = x²` for a graph.
        </div>
      )}
      {lines.map((line, i) => {
        const r = results[i]
        const graphable = r?.kind === 'graph'
        const graphed = graphable && graphs.some((g) => g.expr === (r as { expr: string }).expr)
        return (
          // A notes page is a literal list of lines; it never reorders.
          // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
          <div key={i} {...stylex.props(styles.nLine)}>
            {focus === i ? (
              <input
                // biome-ignore lint/a11y/noAutofocus: the line exists only to be typed into
                autoFocus
                {...stylex.props(styles.nInput)}
                value={line}
                placeholder="Type an equation"
                onChange={(e) => put(i, e.target.value)}
                onBlur={() => setFocus(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAfter(i)
                  } else if (e.key === 'Backspace' && line === '' && lines.length > 1) {
                    e.preventDefault()
                    del(i)
                  }
                }}
              />
            ) : (
              <button type="button" {...stylex.props(styles.nText)} onClick={() => setFocus(i)}>
                {line || ' '}
              </button>
            )}
            {r && 'value' in r && r.value !== undefined && <span {...stylex.props(styles.nRes)}>= {fmt(r.value)}</span>}
            {r?.kind === 'error' && <span {...stylex.props(styles.nErr)}>{r.error}</span>}
            {graphable && !graphed && (
              <button
                type="button"
                {...stylex.props(styles.nGraph)}
                onClick={() =>
                  onGraph({
                    id: crypto.randomUUID(),
                    lhs: (r as { lhs: 'y' | 'z' }).lhs,
                    expr: (r as { expr: string }).expr
                  })
                }
              >
                Insert graph
              </button>
            )}
          </div>
        )
      })}
      <button
        type="button"
        {...stylex.props(styles.nText, styles.nMore)}
        onClick={() => {
          onDoc({ lines: [...lines, ''] })
          setFocus(lines.length)
        }}
      >
        +
      </button>
    </div>
  )
}
