// Calculator rebuilt toward the real iPadOS app: a mode menu (Basic,
// Scientific, Convert, Math Notes) off the calculator glyph, history off the
// clock, Math Notes with variables and an ink canvas, and graph sheets for
// y = f(x) and z = f(x,y) lines. Pad state rides os.session and history,
// memory, notes, graphs and FX rates ride os.storage, so both displays share
// one calculator.

import { type Os, os } from '@doan-labs/duo-sdk'
import { useJSON } from '@doan-labs/duo-sdk/react.ts'
import { Menu, Screen, useWide } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { ERROR, memPress, press } from './calc-state.ts'
import { Convert } from './convert.tsx'
import { fmt } from './engine.ts'
import { Graphs } from './graphs.tsx'
import { History } from './history.tsx'
import { Ink } from './ink.tsx'
import { Pad } from './keypad.tsx'
import { Notes, useNoteEval } from './notes.tsx'
import {
  type CalcState,
  type ConvertState,
  EMPTY_CONVERT,
  EMPTY_NOTES,
  EMPTY_PAD,
  type GraphEq,
  type HistoryEntry,
  K_FX,
  K_GRAPHS,
  K_HISTORY,
  K_MEMORY,
  K_NOTES,
  type NotesDoc,
  pushHistory
} from './store.ts'
import { styles } from './styles.ts'
import { FX_MAX_AGE, type FxTable, fetchRates } from './units.ts'

type Mode = 'basic' | 'sci' | 'convert' | 'notes'

export const Calculator = (_: { os: Os }) => {
  const [root, wide] = useWide()
  const pad = useJSON<CalcState>(os.session, 'pad', EMPTY_PAD)
  const conv = useJSON<ConvertState>(os.session, 'conv', EMPTY_CONVERT)
  const modeKv = useJSON<Mode>(os.session, 'mode', 'basic')
  const mem = useJSON<number>(os.storage, K_MEMORY, 0)
  const hist = useJSON<HistoryEntry[]>(os.storage, K_HISTORY, [])
  const notes = useJSON<NotesDoc>(os.storage, K_NOTES, EMPTY_NOTES)
  const graphs = useJSON<GraphEq[]>(os.storage, K_GRAPHS, [])
  const fx = useJSON<FxTable | null>(os.storage, K_FX, null)
  const [histOpen, setHistOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [ink, setInk] = useState(false)

  const mode = modeKv.value
  const setMode = modeKv.set
  const rad = !pad.value.deg
  const noteEval = useNoteEval(notes.value.lines, rad)

  // FX rates refresh when the cached table is stale; the app works offline on
  // the last fetched table. fetchRates dedupes concurrent calls. The ref stops
  // a refetch loop when the served table itself is older than FX_MAX_AGE.
  const fxTried = useRef(NaN)
  useEffect(() => {
    const at = fx.value?.at ?? -1
    if (at >= 0 && Date.now() - at < FX_MAX_AGE) return
    if (fxTried.current === at) return
    let live = true
    fetchRates()
      .then((r) => {
        fxTried.current = r.at
        if (live) fx.set(r)
      })
      .catch(() => {
        fxTried.current = at
      })
    return () => {
      live = false
    }
  }, [fx])

  const sci = mode === 'sci' || (wide && mode !== 'notes' && mode !== 'convert')

  const onKey = (k: string) => {
    const s = pad.value
    if (k === 'mc' || k === 'm+' || k === 'm-' || k === 'mr') {
      const r = memPress(s, k, mem.value)
      mem.set(r.mem)
      pad.set(r.s)
      return
    }
    const next = press(s, k)
    if (k === '=' && next.cur !== ERROR && next.expr.endsWith('=')) {
      const n = Number(next.cur)
      if (Number.isFinite(n)) hist.set(pushHistory(hist.value, next.expr.replace(/ =$/, ''), fmt(n)))
    }
    pad.set(next)
  }

  const addGraph = (g: GraphEq) => {
    if (!graphs.value.some((x) => x.expr === g.expr && x.lhs === g.lhs)) graphs.set([...graphs.value, g])
    setGraphOpen(true)
  }

  const inkText = (t: string) => {
    const lines = notes.value.lines.length ? [...notes.value.lines] : []
    lines.push(t)
    notes.set({ lines })
  }

  const menu = [
    { label: 'Basic', icon: 'keypad' as const, checked: mode === 'basic', onSelect: () => setMode('basic') },
    { label: 'Scientific', icon: 'list' as const, checked: mode === 'sci', onSelect: () => setMode('sci') },
    { label: 'Convert', icon: 'reload' as const, checked: mode === 'convert', onSelect: () => setMode('convert') },
    { label: 'Math Notes', icon: 'note' as const, checked: mode === 'notes', onSelect: () => setMode('notes') }
  ]

  return (
    <Screen ref={root} xstyle={[styles.body]}>
      <div {...stylex.props(styles.bar)}>
        <div {...stylex.props(styles.barSide)}>
          <button
            type="button"
            {...stylex.props(styles.tool, menuOpen && styles.toolOn)}
            aria-label="Calculator modes"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Sym name="keypad" size={16} />
          </button>
          {mode === 'notes' && (
            <>
              <button
                type="button"
                {...stylex.props(styles.tool, ink && styles.toolOn)}
                aria-label="Ink input"
                onClick={() => setInk((v) => !v)}
              >
                <Sym name="handwriting" size={16} />
              </button>
              <button
                type="button"
                {...stylex.props(styles.tool, graphOpen && styles.toolOn)}
                aria-label="Graphs"
                onClick={() => setGraphOpen((v) => !v)}
              >
                <Sym name="grid" size={16} />
              </button>
            </>
          )}
        </div>
        <div {...stylex.props(styles.barSide)}>
          {mode !== 'notes' && (
            <button
              type="button"
              {...stylex.props(styles.tool, histOpen && styles.toolOn)}
              aria-label="History"
              onClick={() => setHistOpen((v) => !v)}
            >
              <Sym name="clockSym" size={16} />
            </button>
          )}
        </div>
      </div>

      {(mode === 'basic' || mode === 'sci') && <Pad s={pad.value} sci={sci} mem={mem.value} onKey={onKey} />}
      {mode === 'convert' && <Convert c={conv.value} fx={fx.value} onChange={conv.set} />}
      {mode === 'notes' && (
        <Notes doc={notes.value} rad={rad} graphs={graphs.value} onDoc={notes.set} onGraph={addGraph} />
      )}

      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} items={menu} xstyle={styles.modeMenu} />
      <History
        open={histOpen}
        entries={hist.value}
        onPick={(e) => {
          pad.set({
            ...pad.value,
            acc: null,
            op: null,
            stack: [],
            cur: e.r.replace(/,/g, ''),
            fresh: true,
            expr: '',
            curInExpr: false
          })
          setHistOpen(false)
        }}
        onDel={(i) => hist.set(hist.value.filter((_, j) => j !== i))}
        onClear={() => hist.set([])}
        onClose={() => setHistOpen(false)}
      />
      <Graphs
        open={graphOpen && mode === 'notes'}
        eqs={graphs.value}
        scope={noteEval.scope}
        rad={rad}
        onRemove={(id) => graphs.set(graphs.value.filter((g) => g.id !== id))}
        onClose={() => setGraphOpen(false)}
      />
      {mode === 'notes' && ink && <Ink onText={inkText} onClose={() => setInk(false)} />}
    </Screen>
  )
}
