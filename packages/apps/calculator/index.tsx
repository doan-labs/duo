// The iOS calculator: one pending operator, immediate evaluation on the next.

import type { Os } from '@doan-labs/ipduo-sdk'
import { Num } from '@doan-labs/ipduo-uikit/num.tsx'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

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
        <div {...stylex.props(styles.out)}>
          <Num value={Number(s.cur)} locale="en" format={{ maximumFractionDigits: 8 }} />
        </div>
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
