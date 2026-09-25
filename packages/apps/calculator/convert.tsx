// Unit and currency conversion, like Convert in iOS Calculator: the keypad
// edits one field and the other tracks it live, the unit pickers hang off each
// row, the swap button flips the pair. Currency rates come from the cached FX
// table (os.storage 'fx.v1'), refreshed by the caller when it goes stale.

import { Menu } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { fmt, fmtEntry } from './engine.ts'
import { BasicKeys } from './keypad.tsx'
import type { ConvertState } from './store.ts'
import { EMPTY_PAD } from './store.ts'
import { styles } from './styles.ts'
import { CATEGORIES, convert, type FxTable } from './units.ts'

/** The entry pad in Convert mode: digits, `.`, `±`, `C/AC` and `⌫` only. */
export function convPress(c: ConvertState, k: string): ConvertState {
  let { cur } = c
  if (/^\d$/.test(k)) {
    if (cur === '0') cur = k
    else if (cur === '-0') cur = `-${k}`
    else cur += k
    return cur.replace(/[^0-9]/g, '').length > 15 ? c : { ...c, cur }
  }
  switch (k) {
    case '.':
      return cur.includes('.') ? c : { ...c, cur: `${cur}.` }
    case '±':
      return { ...c, cur: cur.startsWith('-') ? cur.slice(1) : `-${cur}` }
    case '⌫': {
      const next = cur.length > 1 ? cur.slice(0, -1) : '0'
      return { ...c, cur: next === '-' || next === '' ? '0' : next }
    }
    case 'C':
    case 'AC':
      return { ...c, cur: '0' }
  }
  return c
}

const catOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[1]!
const unitOf = (cat: string, id: string) => catOf(cat).units.find((u) => u.id === id) ?? catOf(cat).units[0]!
const unitLabel = (cat: string, id: string) => {
  const u = unitOf(cat, id)
  return cat === 'currency' ? `${u.id} - ${u.name}` : u.name
}

export const Convert = ({
  c,
  fx,
  onChange
}: {
  c: ConvertState
  fx: FxTable | null
  onChange: (c: ConvertState) => void
}) => {
  const [menuFor, setMenuFor] = useState<'from' | 'to' | null>(null)
  const cat = catOf(c.cat)
  const entry = Number(c.cur)
  const valid = c.cur !== '' && c.cur !== '-' && Number.isFinite(entry)
  const other = valid
    ? c.editing === 'from'
      ? convert(entry, cat, c.from, c.to, fx?.rates)
      : convert(entry, cat, c.to, c.from, fx?.rates)
    : NaN
  const rowVal = (side: 'from' | 'to') =>
    c.editing === side ? fmtEntry(c.cur) : Number.isFinite(other) ? fmt(other) : '0'

  const menuItems = (side: 'from' | 'to') =>
    cat.units.map((u) => ({
      label: cat.id === 'currency' ? `${u.id} - ${u.name}` : u.name,
      checked: (side === 'from' ? c.from : c.to) === u.id,
      onSelect: () => onChange({ ...c, [side]: u.id })
    }))

  const swap = () => onChange({ ...c, from: c.to, to: c.from, editing: c.editing === 'from' ? 'to' : 'from' })

  return (
    <>
      <div {...stylex.props(styles.catStrip)}>
        {CATEGORIES.map((cat2) => (
          <button
            type="button"
            key={cat2.id}
            {...stylex.props(styles.cat, cat2.id === c.cat && styles.catOn)}
            onClick={() => {
              const nc = catOf(cat2.id)
              onChange({ ...c, cat: cat2.id, from: nc.units[0]!.id, to: nc.units[1]?.id ?? nc.units[0]!.id })
            }}
          >
            {cat2.name}
          </button>
        ))}
      </div>
      <div {...stylex.props(styles.convRows)}>
        {(['from', 'to'] as const).map((side) => (
          <div key={side} {...stylex.props(styles.convRow, c.editing === side && styles.convRowOn)}>
            <button
              type="button"
              {...stylex.props(styles.convTap)}
              onClick={() => onChange({ ...c, editing: side, cur: Number.isFinite(other) ? String(other) : '0' })}
            >
              <span {...stylex.props(styles.convVal)}>{rowVal(side)}</span>
            </button>
            <button
              type="button"
              {...stylex.props(styles.convUnit)}
              onClick={() => setMenuFor(side)}
              aria-label={`Unit for ${side}`}
            >
              {unitLabel(c.cat, side === 'from' ? c.from : c.to)}
              <Sym name="down" size={9} />
            </button>
          </div>
        ))}
        <button type="button" {...stylex.props(styles.convSwap)} aria-label="Swap units" onClick={swap}>
          ⇅
        </button>
      </div>
      {c.cat === 'currency' && (
        <div {...stylex.props(styles.fxNote)}>
          {fx ? `Rates ${new Date(fx.at).toLocaleDateString('en-US')}` : 'Loading rates…'}
        </div>
      )}
      <Menu
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        items={menuFor ? menuItems(menuFor) : []}
        xstyle={styles.convMenu}
      />
      <BasicKeys s={EMPTY_PAD} disabled={['÷', '×', '−', '+', '=', '%']} onKey={(k) => onChange(convPress(c, k))} />
    </>
  )
}
