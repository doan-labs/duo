// Calculation history: a glass sheet over the pad listing past expressions and
// their results, newest first. Tap a row to drop the result back into the
// entry; the trailing mark deletes one entry, Clear empties the list.

import { usePresence } from '@doan-labs/duo-uikit'
import { animations } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import type { HistoryEntry } from './store.ts'
import { styles } from './styles.ts'

export const History = ({
  open,
  entries,
  onPick,
  onDel,
  onClear,
  onClose
}: {
  open: boolean
  entries: HistoryEntry[]
  onPick: (e: HistoryEntry) => void
  onDel: (i: number) => void
  onClear: () => void
  onClose: () => void
}) => {
  const { mounted, closing } = usePresence(open)
  if (!mounted) return null
  return (
    <div {...stylex.props(styles.sheet, closing ? animations.floatOut : animations.float)}>
      <div {...stylex.props(styles.sheetBar)}>
        <button type="button" {...stylex.props(styles.mini)} aria-label="Close" onClick={onClose}>
          <Sym name="xmark" size={15} />
        </button>
        <span {...stylex.props(styles.sheetTitle)}>History</span>
        <button
          type="button"
          {...stylex.props(styles.mini)}
          aria-label="Clear history"
          disabled={entries.length === 0}
          onClick={onClear}
        >
          <Sym name="trash" size={15} />
        </button>
      </div>
      <div {...stylex.props(styles.sheetBody)}>
        {entries.length === 0 && <div {...stylex.props(styles.empty)}>No calculations yet</div>}
        {entries.map((e, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: entries are positionally ordered and never reshuffled
          <div key={`${e.t}-${i}`} {...stylex.props(styles.histRow)}>
            <button
              type="button"
              {...stylex.props(styles.mini)}
              aria-label="Delete entry"
              onClick={(ev) => {
                ev.stopPropagation()
                onDel(i)
              }}
            >
              <Sym name="xmark" size={11} />
            </button>
            <button type="button" onClick={() => onPick(e)} {...stylex.props(styles.histTap)}>
              <span {...stylex.props(styles.histExpr)}>{e.e}</span>
              <span {...stylex.props(styles.histRes)}>{e.r}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
