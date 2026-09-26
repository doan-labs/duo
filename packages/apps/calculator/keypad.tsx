// The keypad face: the shrinking readout with its expression trail and
// annunciators, the basic 4x5 grid, and the scientific block that iOS shows in
// landscape - here stacked over the pad on the cover, beside it on the inner
// display (wide).

import { Num, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useLayoutEffect, useRef } from 'react'
import { clearLabel, ERROR, SCI_LABEL, type SciFn } from './calc-state.ts'
import { fmtEntry } from './engine.ts'
import type { CalcState } from './store.ts'
import { styles } from './styles.ts'

const BASIC = [
  ['±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '=']
]

const SCI = [
  ['(', ')', 'mc', 'm+', 'm-', 'mr'],
  ['2nd', 'x²', 'x³', 'xʸ', 'eˣ', '10ˣ'],
  ['1/x', '²√x', '³√x', 'ʸ√x', 'ln', 'log10'],
  ['x!', 'sin', 'cos', 'tan', 'e', 'EE'],
  ['RadDeg', 'sinh', 'cosh', 'tanh', 'π', 'Rand']
]

/** The 2nd key's swaps, exactly what the iOS layout toggles. */
const SECOND: Record<string, SciFn> = {
  sin: 'asin',
  cos: 'acos',
  tan: 'atan',
  sinh: 'asinh',
  cosh: 'acosh',
  tanh: 'atanh',
  ln: 'log2',
  eˣ: '2ˣ'
}

const keyLabel = (k: string, s: CalcState): string => {
  if (k === 'RadDeg') return s.deg ? 'Deg' : 'Rad'
  if (k === '2nd') return '2nd'
  const fn = s.second && SECOND[k] ? SECOND[k] : k
  return SCI_LABEL[fn] ?? k
}
const keyOp = (k: string, s: CalcState): string => (s.second && SECOND[k] ? SECOND[k]! : k)

/** The readout number: plain text while typing, Num's rolling digits after evaluation. */
const BigNum = ({ cur, fresh }: { cur: string; fresh: boolean }) => {
  const ref = useRef<HTMLSpanElement | null>(null)
  const wrap = useRef<HTMLDivElement | null>(null)
  const text = cur === ERROR ? ERROR : fmtEntry(cur)
  const n = Number(cur)
  const num = fresh && cur !== ERROR && Number.isFinite(n) && Math.abs(n) < 1e16 && (n === 0 || Math.abs(n) >= 1e-9)
  useLayoutEffect(() => {
    const n = ref.current
    const w = wrap.current
    if (!n || !w) return
    n.style.transform = 'none'
    const fit = Math.min(1, w.clientWidth / Math.max(1, n.getBoundingClientRect().width))
    n.style.transform = fit < 1 ? `scale(${fit})` : 'none'
  })
  return (
    <div ref={wrap} {...stylex.props(styles.numWrap)}>
      <span ref={ref} {...stylex.props(styles.num)}>
        {num ? <Num value={Number(cur)} format={{ maximumSignificantDigits: 16, maximumFractionDigits: 12 }} /> : text}
      </span>
    </div>
  )
}

export type PadProps = {
  s: CalcState
  sci: boolean
  mem: number
  onKey: (k: string) => void
}

/** Readout plus the two grids; the layout the Basic and Scientific modes share. */
export const Pad = ({ s, sci, mem, onKey }: PadProps) => {
  const [keysBox, wide] = useWide()
  return (
    <div {...stylex.props(styles.pad)}>
      <div {...stylex.props(styles.readout)}>
        <div {...stylex.props(styles.trail)} aria-hidden={!s.expr}>
          {s.expr || ' '}
        </div>
        <div {...stylex.props(styles.annunc)}>
          {sci && <span>{s.deg ? 'Deg' : 'Rad'}</span>}
          {mem !== 0 && <span>M</span>}
        </div>
        <BigNum cur={s.cur} fresh={s.fresh} />
      </div>
      <div ref={keysBox} {...stylex.props(styles.keysRow, !wide && styles.keysCol)}>
        {sci && <SciKeys s={s} onKey={onKey} />}
        <BasicKeys s={s} onKey={onKey} sci={sci} />
      </div>
    </div>
  )
}

export const BasicKeys = ({
  s,
  onKey,
  sci,
  disabled,
  bs
}: Pick<PadProps, 's' | 'onKey'> & { sci?: boolean; disabled?: string[]; bs?: boolean }) => (
  <div {...stylex.props(styles.keys, sci ? styles.keysBasicSci : bs ? styles.keysConv : styles.keysBasic)}>
    <button type="button" {...stylex.props(styles.key, styles.g)} onClick={() => onKey(clearLabel(s))}>
      {clearLabel(s)}
    </button>
    {BASIC.flat().map((k0) => {
      // Convert pads show a backspace where `=` sits.
      const k = bs && k0 === '=' ? '⌫' : k0
      return (
        <button
          type="button"
          key={k0}
          disabled={disabled?.includes(k)}
          {...stylex.props(
            styles.key,
            /[÷×−+=]/.test(k) && styles.o,
            /[±%⌫]/.test(k) && styles.g,
            k === '0' && styles.z,
            disabled?.includes(k) && styles.off
          )}
          onClick={() => onKey(k)}
        >
          {k}
        </button>
      )
    })}
  </div>
)

const SciKeys = ({ s, onKey }: Pick<PadProps, 's' | 'onKey'>) => (
  <div {...stylex.props(styles.keys, styles.keysSci)}>
    {SCI.flat().map((k) => (
      <button
        type="button"
        key={k}
        {...stylex.props(
          styles.key,
          styles.keySci,
          (k === '2nd' && s.second) || (k === 'RadDeg' && s.deg) ? styles.on : undefined
        )}
        onClick={() => onKey(keyOp(k, s))}
      >
        {keyLabel(k, s)}
      </button>
    ))}
  </div>
)
