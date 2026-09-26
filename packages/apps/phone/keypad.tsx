// The keypad: the dial pad itself, the number it is dialling and the contact it
// resolves to. Pad is also the in-call DTMF sheet, so the two keypads are the
// same piece drawn two ways.

import { beep } from '@doan-labs/duo-fixtures'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'
import { type Book, formatNumber, fullName, matchNumber } from './data.ts'
import { place, ring, useShared } from './store.ts'
import { styles } from './styles.ts'

// Real DTMF: each key is its row tone plus its column tone, which is why a
// keypad sounds like a chord and not a blip.
const DTMF_R = [697, 770, 852, 941]
const DTMF_C = [1209, 1336, 1477]
export const KEYS: [string, string][] = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', '']
]

const tone = (i: number) => beep([DTMF_R[(i / 3) | 0]!, DTMF_C[i % 3]!], 0.1, 0.09)

/**
 * The twelve keys. `long(i)` is the press-and-hold alternative: 0 becomes +.
 * Used by the dial pad and by the in-call DTMF sheet.
 */
export function Pad({ onKey, small }: { onKey: (key: string) => void; small?: boolean }) {
  const hold = useRef(0)
  return (
    <div {...stylex.props(small ? styles.keysSm : styles.keys)}>
      {KEYS.map(([k, sub], i) => (
        <button
          key={k}
          type="button"
          {...stylex.props(styles.key, small && styles.keySm)}
          onPointerDown={() => {
            if (k !== '0') return
            hold.current = window.setTimeout(() => {
              hold.current = 0
              tone(i)
              onKey('+')
            }, 500)
          }}
          onPointerUp={() => {
            if (k === '0' && hold.current) {
              window.clearTimeout(hold.current)
              hold.current = 0
              onKey('0')
              tone(i)
            } else if (k !== '0') {
              tone(i)
              onKey(k)
            }
          }}
          onPointerLeave={() => {
            if (hold.current) window.clearTimeout(hold.current)
            hold.current = 0
          }}
        >
          {k}
          {sub && <s {...stylex.props(styles.keySub)}>{sub}</s>}
        </button>
      ))}
    </div>
  )
}

/** The dial pad pane: number display, the contact it resolves to, delete, call. */
export function Keypad({ book }: { book: Book }) {
  const [n, setN] = useShared('digits', '')
  const clearTimer = useRef(0)
  const cleared = useRef(false)
  const hit = matchNumber(book, n)

  const press = (k: string) => {
    const next = (n + k).slice(0, 18)
    // *#0# dials the test line: the phone rings itself a few beats later.
    if (next === '*#0#') {
      setN('')
      window.setTimeout(() => ring(), 300)
      return
    }
    setN(next)
  }
  const backDown = () => {
    cleared.current = false
    clearTimer.current = window.setTimeout(() => {
      cleared.current = true
      setN('')
      beep([220], 0.12, 0.07)
    }, 550)
  }
  const backUp = () => {
    window.clearTimeout(clearTimer.current)
    if (!cleared.current) setN(n.slice(0, -1))
  }
  const call = () => {
    if (!n) return
    place({ number: n })
    setN('')
  }

  return (
    <div {...stylex.props(styles.keypad)}>
      <div {...stylex.props(styles.dialZone)}>
        <div {...stylex.props(styles.dial)}>{formatNumber(n) || <span {...stylex.props(styles.dialPh)}> </span>}</div>
        <div {...stylex.props(styles.dialMatch)}>{hit && fullName(hit)}</div>
      </div>
      <Pad onKey={press} />
      <div {...stylex.props(styles.dialRow)}>
        <span {...stylex.props(styles.dialSide)}>
          {!!n && (
            <button
              type="button"
              aria-label="Delete"
              {...stylex.props(styles.back)}
              onPointerDown={backDown}
              onPointerUp={backUp}
              onPointerLeave={() => window.clearTimeout(clearTimer.current)}
            >
              <Sym name="back" size={22} />
            </button>
          )}
        </span>
        <button type="button" aria-label="Call" {...stylex.props(styles.grn, styles.dialBtn)} onClick={call}>
          <Sym name="call" size={30} />
        </button>
        <span {...stylex.props(styles.dialSide)} />
      </div>
    </div>
  )
}
