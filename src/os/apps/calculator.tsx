// The iOS calculator: one pending operator, immediate evaluation on the next.
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'

const KEYS = ['AC', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '=']

type State = { acc: number; op: string; cur: string; fresh: boolean }
const apply = ({ acc, op, cur }: State) => {
  const b = Number(cur)
  return op === '+' ? acc + b : op === '−' ? acc - b : op === '×' ? acc * b : op === '÷' ? acc / b : b
}
function press(s: State, k: string): State {
  let { acc, op, cur } = s
  if (/\d/.test(k)) cur = s.fresh || cur === '0' ? k : cur + k
  else if (k === '.') cur = s.fresh ? '0.' : cur.includes('.') ? cur : `${cur}.`
  else if (k === 'AC') {
    acc = 0
    op = ''
    cur = '0'
  } else if (k === '±') cur = String(-Number(cur))
  else if (k === '%') cur = String(Number(cur) / 100)
  else if (k === '=') {
    cur = String(apply(s))
    op = ''
  } else {
    acc = apply(s)
    op = k
    cur = String(acc)
  }
  return { acc, op, cur, fresh: !/[\d.]/.test(k) }
}

export const Calculator = (_: { os: Os }) => {
  const [s, setS] = useState<State>({ acc: 0, op: '', cur: '0', fresh: true })
  return (
    <div {...stylex.props(shared.body, styles.body)}>
      <div {...stylex.props(styles.calc)}>
        <div {...stylex.props(styles.out)}>{Number(s.cur).toLocaleString('en', { maximumFractionDigits: 8 })}</div>
        {KEYS.map((k) => (
          <button
            type="button"
            key={k}
            {...stylex.props(
              styles.key,
              /[÷×−+=]/.test(k) && styles.o,
              /[A±%]/.test(k) && styles.g,
              k === '0' && styles.z
            )}
            onClick={() => setS((p) => press(p, k))}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  calc: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4,72px)',
    justifyContent: 'center',
    gap: 9,
    paddingInline: 14,
    paddingBottom: 12
  },
  key: {
    aspectRatio: 1,
    borderRadius: '50%',
    backgroundColor: '#333',
    fontSize: 26,
    color: colors.white,
    transitionProperty: 'transform, filter',
    transitionDuration: '.1s',
    transform: { default: null, ':active': 'scale(.93)' },
    filter: { default: null, ':active': 'brightness(1.5)' }
  },
  g: { backgroundColor: '#a5a5a5', color: colors.black },
  o: { backgroundColor: colors.orange },
  z: { gridColumn: 'span 2', aspectRatio: 'auto', borderRadius: 40, textAlign: 'left', paddingLeft: 28 },
  out: {
    gridColumn: 'span 4',
    textAlign: 'right',
    fontSize: 56,
    fontWeight: 300,
    paddingInline: 10,
    paddingBottom: 4,
    minHeight: 70,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  }
})
