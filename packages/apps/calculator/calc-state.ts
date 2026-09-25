// The keypad's immediate-evaluation state machine: one pending binary operator
// per parenthesis level, a text entry, an expression trail for the readout, and
// `=` repeating the last operation - the same model as iOS, extended with the
// scientific keys.
//
// `cur` stays a string so typing `3.`, `3e` and `-` survive mid-entry; it is
// read with Number() when applied. Unary keys act on `cur` immediately; `xʸ`
// and `ʸ√x` wait as pending binary ops. `(` pushes the pending operation onto
// `stack` and starts a fresh sub-expression; `)` collapses one level and makes
// its value the new operand. `expr` is the literal trail of what was typed
// (`3 × (5 + 4)`), with `curInExpr` marking when `cur` is already written into
// it (after a unary key or a `)`).

import { factorial, fmt } from './engine.ts'
import type { CalcState } from './store.ts'

export type SciFn =
  | 'x²'
  | 'x³'
  | '1/x'
  | '²√x'
  | '³√x'
  | 'x!'
  | 'ln'
  | 'log10'
  | 'log2'
  | 'eˣ'
  | '10ˣ'
  | '2ˣ'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'asin'
  | 'acos'
  | 'atan'
  | 'sinh'
  | 'cosh'
  | 'tanh'
  | 'asinh'
  | 'acosh'
  | 'atanh'

export const SCI_LABEL: Record<string, string> = {
  'x²': 'x²',
  'x³': 'x³',
  xʸ: 'xʸ',
  eˣ: 'eˣ',
  '10ˣ': '10ˣ',
  '2ˣ': '2ˣ',
  '1/x': '1/x',
  '²√x': '²√x',
  '³√x': '³√x',
  'ʸ√x': 'ʸ√x',
  ln: 'ln',
  log10: 'log₁₀',
  log2: 'log₂',
  'x!': 'x!',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  asin: 'sin⁻¹',
  acos: 'cos⁻¹',
  atan: 'tan⁻¹',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  asinh: 'sinh⁻¹',
  acosh: 'cosh⁻¹',
  atanh: 'tanh⁻¹'
}

export const ERROR = 'Error'
const num = (s: string) => Number(s)
const numOk = (s: string) => s !== '' && s !== '-' && Number.isFinite(Number(s)) && !/[eE]-?$/.test(s)

export const applyBin = (a: number, op: string, b: number): number => {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? NaN : a / b
    case '^':
      return a ** b
    case 'root':
      return b ** (1 / a)
  }
  return b
}

export const sciApply = (fn: SciFn, v: number, deg: boolean): number => {
  const r = (x: number) => (deg ? (x * Math.PI) / 180 : x)
  const d = (x: number) => (deg ? (x * 180) / Math.PI : x)
  switch (fn) {
    case 'x²':
      return v * v
    case 'x³':
      return v * v * v
    case '1/x':
      return v === 0 ? NaN : 1 / v
    case '²√x':
      return v < 0 ? NaN : Math.sqrt(v)
    case '³√x':
      return Math.cbrt(v)
    case 'x!':
      return factorial(v)
    case 'ln':
      return v <= 0 ? NaN : Math.log(v)
    case 'log10':
      return v <= 0 ? NaN : Math.log10(v)
    case 'log2':
      return v <= 0 ? NaN : Math.log2(v)
    case 'eˣ':
      return Math.exp(v)
    case '10ˣ':
      return 10 ** v
    case '2ˣ':
      return 2 ** v
    case 'sin':
      return Math.sin(r(v))
    case 'cos':
      return Math.cos(r(v))
    case 'tan':
      return Math.tan(r(v))
    case 'asin':
      return Math.abs(v) > 1 ? NaN : d(Math.asin(v))
    case 'acos':
      return Math.abs(v) > 1 ? NaN : d(Math.acos(v))
    case 'atan':
      return d(Math.atan(v))
    case 'sinh':
      return Math.sinh(v)
    case 'cosh':
      return Math.cosh(v)
    case 'tanh':
      return Math.tanh(v)
    case 'asinh':
      return Math.asinh(v)
    case 'acosh':
      return Math.acosh(v)
    case 'atanh':
      return Math.atanh(v)
  }
}

const TRAIL: Partial<Record<SciFn, string>> = { 'x²': '²', 'x³': '³', 'x!': '!' }
const WRAP: Partial<Record<SciFn, string>> = {
  '²√x': '√',
  '³√x': '∛',
  '10ˣ': '10^',
  '2ˣ': '2^',
  eˣ: 'e^',
  log10: 'log',
  log2: 'log₂'
}
export const unaryLabel = (fn: SciFn, cur: string) =>
  TRAIL[fn] ? `${cur}${TRAIL[fn]}` : fn === '1/x' ? `1/${cur}` : `${WRAP[fn] ?? fn}(${cur})`

const show = (v: number) => (Number.isFinite(v) ? String(v) : ERROR)
const BIN_OPS = ['+', '−', '×', '÷', '^', 'root']
const PAREN_DEPTH = 8

export function press(s: CalcState, k: string): CalcState {
  let { acc, op, cur, expr, lastOp, lastB, stack, curInExpr } = s
  stack = stack ?? []
  const isError = cur === ERROR
  const done = () => ({ ...s, acc, op, cur, expr, lastOp, lastB, stack, curInExpr, fresh: true })
  // A key after `=` starts a new expression's trail.
  if (expr.endsWith('=') && k !== '=') expr = ''
  if (isError) {
    if (k === 'AC') return { ...s, acc: null, op: null, cur: '0', expr: '', stack: [], curInExpr: false, fresh: true }
    if (/^\d$/.test(k)) return { ...s, cur: k, expr, stack, fresh: false, curInExpr: false }
    if (k === '.') return { ...s, cur: '0.', expr, stack, fresh: false, curInExpr: false }
    return s
  }

  if (/^\d$/.test(k)) {
    if (s.fresh) cur = ''
    if (cur === '0') cur = ''
    const plain = cur.replace(/[^0-9]/g, '')
    if (plain.length >= 16) return s
    cur = cur === '' ? k : cur + k
    return { ...s, cur, expr, fresh: false, curInExpr: false }
  }
  switch (k) {
    case '.':
      if (s.fresh) return { ...s, cur: '0.', expr, fresh: false, curInExpr: false }
      if (cur.includes('e') || cur.includes('.')) return s
      return { ...s, cur: `${cur}.`, expr, curInExpr: false }
    case 'AC':
      return { ...s, acc: null, op: null, cur: '0', expr: '', stack: [], curInExpr: false, fresh: true }
    case 'C':
      return { ...s, cur: '0', fresh: true, curInExpr: false }
    case '±':
      if (!numOk(cur) && !cur.includes('e')) return s
      // Under an exponent the sign flips after the `e`, like the real key.
      cur = cur.includes('e')
        ? cur.replace(/e(-?)(\d*)$/, (_m, sign: string, d: string) => `e${sign === '-' ? '' : '-'}${d}`)
        : cur.startsWith('-')
          ? cur.slice(1)
          : `-${cur}`
      return { ...s, cur, expr }
    case '%': {
      if (!numOk(cur)) return s
      const v = num(cur)
      // iOS percent is contextual: against a pending +/- it is a share of acc.
      cur = show(acc !== null && (op === '+' || op === '−') ? (acc * v) / 100 : v / 100)
      return { ...s, cur, expr, fresh: false, curInExpr: false }
    }
    case '⌫':
      if (s.fresh || curInExpr) return s
      cur = cur.length > 1 ? cur.slice(0, -1) : '0'
      if (cur === '-' || cur === '') cur = '0'
      return { ...s, cur, expr }
    case 'EE':
      if (!numOk(cur) || cur.includes('e')) return s
      return { ...s, cur: `${cur}e`, expr, fresh: false }
    case 'Rand':
      return { ...s, cur: show(Math.random()), expr, fresh: false, curInExpr: false }
    case 'π':
      return { ...s, cur: show(Math.PI), expr, fresh: true, curInExpr: false }
    case 'e':
      return { ...s, cur: show(Math.E), expr, fresh: true, curInExpr: false }
    case 'Rad':
      return { ...s, deg: false }
    case 'Deg':
      return { ...s, deg: true }
    case 'RadDeg':
      return { ...s, deg: !s.deg }
    case '2nd':
      return { ...s, second: !s.second }
    case '(':
      if (stack.length >= PAREN_DEPTH) return s
      // A typed operand or a completed `)` in front of `(` means `×`.
      if (op === null && acc === null && numOk(cur) && (!s.fresh || curInExpr)) {
        stack = [...stack, { acc: num(cur), op: '×' }]
        expr = `${expr}${fmtEntry(cur)} × (`
      } else {
        stack = [...stack, { acc, op }]
        expr = `${expr}(`
      }
      return { ...s, stack, acc: null, op: null, cur: '0', expr, fresh: true, curInExpr: false }
    case ')': {
      if (stack.length === 0 || !numOk(cur)) return s
      const inner = op !== null && acc !== null ? applyBin(acc, op, num(cur)) : num(cur)
      const f = stack[stack.length - 1]!
      stack = stack.slice(0, -1)
      acc = f.acc
      op = f.op
      expr = `${expr}${curInExpr ? '' : fmtEntry(cur)})`
      cur = show(inner)
      return { ...s, acc, op, cur, expr, stack, fresh: true, curInExpr: true }
    }
    case '=': {
      // Unclosed parens close silently, like the real key.
      while (stack.length > 0) {
        if (!numOk(cur)) return s
        const inner = op !== null && acc !== null ? applyBin(acc, op, num(cur)) : num(cur)
        const f = stack[stack.length - 1]!
        stack = stack.slice(0, -1)
        acc = f.acc
        op = f.op
        expr = `${expr}${curInExpr ? '' : fmtEntry(cur)})`
        cur = show(inner)
        curInExpr = true
      }
      if (op !== null && acc !== null) {
        if (!numOk(cur)) return s
        const a = acc
        const b = num(cur)
        const r = applyBin(a, op, b)
        lastOp = op
        lastB = b
        expr = curInExpr ? `${expr} =` : `${expr}${fmtEntry(b)} =`
        acc = null
        op = null
        cur = show(r)
        return done()
      }
      if (lastOp !== null && lastB !== null && numOk(cur)) {
        const a = num(cur)
        const r = applyBin(a, lastOp, lastB)
        expr = `${fmtEntry(a)} ${lastOp} ${fmtEntry(lastB)} =`
        cur = show(r)
        return done()
      }
      if (!numOk(cur)) return s
      expr = curInExpr ? `${expr} =` : `${fmtEntry(cur)} =`
      return done()
    }
  }
  // Pending binary operators: + − × ÷ xʸ ʸ√x.
  const bin = k === 'xʸ' ? '^' : k === 'ʸ√x' ? 'root' : k
  if (BIN_OPS.includes(bin)) {
    if (!numOk(cur)) return s
    if (op !== null && acc !== null && (!s.fresh || curInExpr)) {
      const b = num(cur)
      acc = applyBin(acc, op, b)
      expr = `${expr}${curInExpr ? '' : fmtEntry(b)}`
      if (!Number.isFinite(acc)) return { ...s, acc: null, op: null, cur: ERROR, expr, stack: [], fresh: true }
      cur = show(acc)
    } else if (op !== null && acc !== null) {
      // Still fresh on a pending op: a second operator replaces it in the trail.
      expr = expr.replace(/\s\S+\s$/, '')
    } else if (curInExpr) {
      acc = num(cur)
    } else {
      acc = num(cur)
      expr = `${expr}${fmtEntry(acc)}`
    }
    expr = `${expr} ${bin === '^' ? 'xʸ' : bin === 'root' ? 'ʸ√x' : bin} `
    op = bin
    return { ...s, acc, op, cur, expr, fresh: true, curInExpr: false }
  }
  // Instant unary functions.
  if (k in SCI_LABEL) {
    if (!numOk(cur)) return s
    const v = num(cur)
    const r = sciApply(k as SciFn, v, s.deg)
    expr = `${expr}${unaryLabel(k as SciFn, fmtEntry(v))}`
    if (!Number.isFinite(r))
      return { ...s, acc: null, op: null, cur: ERROR, expr, stack: [], fresh: true, curInExpr: false }
    cur = show(r)
    curInExpr = true
    return { ...s, acc, op, cur, expr, curInExpr, fresh: false }
  }
  return s
}

/** Memory keys act on the storage-backed register; `mr` recalls into the entry. */
export function memPress(s: CalcState, k: string, mem: number): { s: CalcState; mem: number } {
  if (!numOk(s.cur) && k !== 'mc') return { s, mem }
  const v = Number(s.cur)
  if (k === 'mc') return { s, mem: 0 }
  if (k === 'm+') return { s, mem: mem + v }
  if (k === 'm-') return { s, mem: mem - v }
  if (k === 'mr') return { s: { ...s, cur: show(mem), fresh: true, curInExpr: false }, mem }
  return { s, mem }
}

/** The AC/C split: while a number is being typed the clear key only clears the entry. */
export const clearLabel = (s: CalcState) => (!s.fresh && numOk(s.cur) && s.cur !== '0' ? 'C' : 'AC')

const fmtEntry = (v: number | string) => {
  const n = typeof v === 'string' ? Number(v) : v
  if (!Number.isFinite(n)) return String(v)
  return fmt(n)
}
