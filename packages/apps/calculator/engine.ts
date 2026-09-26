// The math engine every Calculator view shares: a tokenizer, a recursive-descent
// parser producing an AST, and an evaluator. The keypad uses it through the
// immediate-eval state machine; Math Notes and Graphs use it directly.
//
// Grammar, loosest to tightest:
//   expr   := assign | add
//   add    := mul (('+' | '-') mul)*
//   mul    := unary (('*' | '/' | 'mod') unary | <implicit> unary)*
//   unary  := ('-' | '+') unary | pow
//   pow    := post ('^' unary)?            // right-associative
//   post   := prim ('!' | '%' | '°')*
//   prim   := number | const | var | fncall | '(' expr ')' | '√' unary
//
// Implicit multiplication binds like '*': `2π`, `3(4+1)`, `2x`, `)(`.

export type Scope = Record<string, number>

export type Node =
  | { n: 'num'; v: number }
  | { n: 'var'; name: string }
  | { n: 'const'; name: 'pi' | 'e' | 'rand' }
  | { n: 'un'; op: '-' | '+'; a: Node }
  | { n: 'bin'; op: '+' | '-' | '*' | '/' | '^' | 'mod'; l: Node; r: Node }
  | { n: 'post'; op: '!' | '%' | 'deg'; a: Node }
  | { n: 'call'; f: string; args: Node[] }

type Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; name: string }
  | { t: 'fn'; name: string }
  | { t: 'const'; name: 'pi' | 'e' | 'rand' }
  | { t: 'op'; o: '+' | '-' | '*' | '/' | '^' | '(' | ')' | 'mod' }
  | { t: 'post'; o: '!' | '%' | 'deg' }
  | { t: 'eq' }
  | { t: 'sep' }

const FN: Record<string, (a: number, rad: boolean) => number> = {
  sin: (a, rad) => Math.sin(rad ? a : (a * Math.PI) / 180),
  cos: (a, rad) => Math.cos(rad ? a : (a * Math.PI) / 180),
  tan: (a, rad) => Math.tan(rad ? a : (a * Math.PI) / 180),
  sinh: (a) => Math.sinh(a),
  cosh: (a) => Math.cosh(a),
  tanh: (a) => Math.tanh(a),
  ln: (a) => Math.log(a),
  log: (a) => Math.log10(a),
  sqrt: (a) => Math.sqrt(a),
  cbrt: (a) => Math.cbrt(a),
  abs: (a) => Math.abs(a),
  exp: (a) => Math.exp(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
  round: (a) => Math.round(a),
  not: (a) => (a === 0 ? 1 : 0)
}
const FN2: Record<string, (a: number, b: number) => number> = {
  pow: (a, b) => a ** b,
  root: (a, b) => b ** (1 / a),
  logb: (a, b) => Math.log(b) / Math.log(a),
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
  atan2: (a, b) => Math.atan2(a, b),
  ncr: (a, b) => factorial(a) / (factorial(b) * factorial(a - b)),
  npr: (a, b) => factorial(a) / factorial(a - b)
}
const FN1R: Record<string, (a: number, rad: boolean) => number> = {
  asin: (a, rad) => maybeDeg(Math.asin(a), rad),
  acos: (a, rad) => maybeDeg(Math.acos(a), rad),
  atan: (a, rad) => maybeDeg(Math.atan(a), rad),
  asinh: (a) => Math.asinh(a),
  acosh: (a) => Math.acosh(a),
  atanh: (a) => Math.atanh(a)
}
const maybeDeg = (v: number, rad: boolean) => (rad ? v : (v * 180) / Math.PI)

const FUNC_NAMES = new Set([...Object.keys(FN), ...Object.keys(FN2), ...Object.keys(FN1R)])

// Lanczos approximation for gamma on the real line; factorials of non-integers
// and of integers past 170 land here.
const LANCZOS = [
  0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905,
  -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7
]
export function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  z -= 1
  let x = LANCZOS[0]!
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i]! / (z + i)
  const t = z + LANCZOS.length - 1.5
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x
}
export function factorial(n: number): number {
  if (n < 0 && Number.isInteger(n)) throw new Error('factorial of negative integer')
  if (Number.isInteger(n) && n <= 170) {
    let r = 1
    for (let i = 2; i <= n; i++) r *= i
    return r
  }
  return gamma(n + 1)
}

export function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  const s = src.replaceAll('−', '-').replaceAll('–', '-').replaceAll('×', '*').replaceAll('÷', '/')
  while (i < s.length) {
    const c = s[i]!
    if (c === ' ' || c === '\t' || c === ' ') {
      i++
      continue
    }
    if (/\d|\./.test(c) || (c === ',' && /\d/.test(s[i + 1] ?? ''))) {
      let j = i
      let out = ''
      let dot = false
      while (j < s.length) {
        const d = s[j]!
        if (/\d/.test(d)) out += d
        else if (d === ',') {
          // Grouping commas only count when followed by exactly three digits.
          if (/^\d{3}(?!\d)/.test(s.slice(j + 1))) {
            j++
            continue
          }
          break
        } else if (d === '.' && !dot) {
          dot = true
          out += '.'
        } else break
        j++
      }
      // Scientific notation: digits e±digits.
      const m = /^[eEᴇ][+-]?\d+/.exec(s.slice(j))
      if (out && m) {
        out += `e${m[0].slice(1)}`
        j += m[0].length
      }
      const v = Number(out)
      if (!Number.isFinite(v)) throw new Error(`Bad number "${out}"`)
      toks.push({ t: 'num', v })
      i = j
      continue
    }
    if (/[a-zA-Z_π√∞]/.test(c)) {
      const m = /^[a-zA-Z_]+/.exec(s.slice(i))
      if (c === 'π') {
        toks.push({ t: 'const', name: 'pi' })
        i++
        continue
      }
      if (c === '√') {
        toks.push({ t: 'fn', name: 'sqrt' })
        i++
        continue
      }
      if (c === '∞') {
        toks.push({ t: 'num', v: Infinity })
        i++
        continue
      }
      if (!m) throw new Error(`Unexpected "${c}"`)
      const word = m[0].toLowerCase()
      i += m[0].length
      if (word === 'of' || word === 'and') {
        toks.push({ t: 'op', o: '*' })
        continue
      }
      if (word === 'mod') {
        toks.push({ t: 'op', o: 'mod' })
        continue
      }
      if (word === 'pi') {
        toks.push({ t: 'const', name: 'pi' })
        continue
      }
      if (word === 'e' || word === 'eu') {
        toks.push({ t: 'const', name: 'e' })
        continue
      }
      if (word === 'rand' || word === 'random') {
        toks.push({ t: 'const', name: 'rand' })
        continue
      }
      if (word === 'inf' || word === 'infinity') {
        toks.push({ t: 'num', v: Infinity })
        continue
      }
      if (word === 'ans' || word === 'answer') {
        toks.push({ t: 'id', name: 'ans' })
        continue
      }
      if (FUNC_NAMES.has(word)) {
        toks.push({ t: 'fn', name: word })
        continue
      }
      // Longer names like `price`: a variable. Single letters too.
      toks.push({ t: 'id', name: word })
      continue
    }
    if (c === '(' || c === '[' || c === '{') {
      toks.push({ t: 'op', o: '(' })
      i++
      continue
    }
    if (c === ')' || c === ']' || c === '}') {
      toks.push({ t: 'op', o: ')' })
      i++
      continue
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      toks.push({ t: 'op', o: c })
      i++
      continue
    }
    if (c === '!') {
      toks.push({ t: 'post', o: '!' })
      i++
      continue
    }
    if (c === '%') {
      toks.push({ t: 'post', o: '%' })
      i++
      continue
    }
    if (c === '°') {
      toks.push({ t: 'post', o: 'deg' })
      i++
      continue
    }
    if (c === '²' || c === '³') {
      toks.push({ t: 'op', o: '^' }, { t: 'num', v: c === '²' ? 2 : 3 })
      i++
      continue
    }
    if (c === '⁻' && s[i + 1] === '¹') {
      toks.push({ t: 'op', o: '^' }, { t: 'num', v: -1 })
      i += 2
      continue
    }
    if (c === '=') {
      toks.push({ t: 'eq' })
      i++
      continue
    }
    if (c === ',') {
      toks.push({ t: 'sep' })
      i++
      continue
    }
    throw new Error(`Unexpected "${c}"`)
  }
  return toks
}

class Parser {
  pos = 0
  constructor(private toks: Tok[]) {}
  private peek(): Tok | undefined {
    return this.toks[this.pos]
  }
  private take(): Tok {
    const t = this.toks[this.pos]
    if (!t) throw new Error('Unexpected end')
    this.pos++
    return t
  }
  atEnd() {
    return !this.peek()
  }
  parseExpr(): Node {
    return this.parseAdd()
  }
  private startsPrimary(t?: Tok): boolean {
    return !!t && (t.t === 'num' || t.t === 'id' || t.t === 'const' || t.t === 'fn' || (t.t === 'op' && t.o === '('))
  }
  private parseAdd(): Node {
    let l = this.parseMul()
    for (;;) {
      const t = this.peek()
      if (t?.t !== 'op' || (t.o !== '+' && t.o !== '-')) return l
      this.take()
      l = { n: 'bin', op: t.o, l, r: this.parseMul() }
    }
  }
  private parseMul(): Node {
    let l = this.parseUnary()
    for (;;) {
      const t = this.peek()
      if (t?.t === 'op' && (t.o === '*' || t.o === '/' || t.o === 'mod')) {
        this.take()
        l = { n: 'bin', op: t.o, l, r: this.parseUnary() }
        continue
      }
      if (this.startsPrimary(t)) {
        l = { n: 'bin', op: '*', l, r: this.parseUnary() }
        continue
      }
      return l
    }
  }
  private parseUnary(): Node {
    const t = this.peek()
    if (t?.t === 'op' && (t.o === '-' || t.o === '+')) {
      this.take()
      const a = this.parseUnary()
      return t.o === '-' ? { n: 'un', op: '-', a } : a
    }
    return this.parsePow()
  }
  private parsePow(): Node {
    const l = this.parsePost()
    const t = this.peek()
    if (t?.t === 'op' && t.o === '^') {
      this.take()
      return { n: 'bin', op: '^', l, r: this.parseUnary() }
    }
    return l
  }
  private parsePost(): Node {
    let a = this.parsePrim()
    while (this.peek()?.t === 'post') {
      const o = (this.take() as Extract<Tok, { t: 'post' }>).o
      a = { n: 'post', op: o, a }
    }
    return a
  }
  private parsePrim(): Node {
    const t = this.take()
    if (t.t === 'num') return { n: 'num', v: t.v }
    if (t.t === 'const') return { n: 'const', name: t.name }
    if (t.t === 'id') return { n: 'var', name: t.name }
    if (t.t === 'fn') {
      // `fn(expr)` or `fn unary`: `sqrt(9)` and `sin 30` both work.
      const next = this.peek()
      if (next?.t === 'op' && next.o === '(') {
        this.take()
        const args: Node[] = [this.parseExpr()]
        while (this.peek()?.t === 'sep') {
          this.take()
          args.push(this.parseExpr())
        }
        const close = this.take()
        if (close.t !== 'op' || close.o !== ')') throw new Error('Expected )')
        return { n: 'call', f: t.name, args }
      }
      return { n: 'call', f: t.name, args: [this.parseUnary()] }
    }
    if (t.t === 'op' && t.o === '(') {
      const e = this.parseExpr()
      const close = this.take()
      if (close.t !== 'op' || close.o !== ')') throw new Error('Expected )')
      return e
    }
    throw new Error('Expected a number or name')
  }
}

export function parse(src: string): Node {
  const toks = tokenize(src)
  const p = new Parser(toks)
  const node = p.parseExpr()
  if (!p.atEnd()) throw new Error('Extra tokens')
  return node
}

export function evalNode(node: Node, scope: Scope, rad: boolean): number {
  switch (node.n) {
    case 'num':
      return node.v
    case 'const':
      if (node.name === 'pi') return Math.PI
      if (node.name === 'e') return Math.E
      return Math.random()
    case 'var': {
      const v = scope[node.name]
      if (v === undefined) throw new Error(`Unknown "${node.name}"`)
      return v
    }
    case 'un':
      return -evalNode(node.a, scope, rad)
    case 'post': {
      const a = evalNode(node.a, scope, rad)
      if (node.op === '!') return factorial(a)
      if (node.op === '%') return a / 100
      return (a * Math.PI) / 180
    }
    case 'bin': {
      const l = evalNode(node.l, scope, rad)
      const r = evalNode(node.r, scope, rad)
      switch (node.op) {
        case '+':
          return l + r
        case '-':
          return l - r
        case '*':
          return l * r
        case '/':
          return l / r
        case '^':
          return l ** r
        case 'mod':
          return l % r
      }
      break
    }
    case 'call': {
      const one = FN[node.f]
      if (one) {
        if (node.args.length !== 1) throw new Error(`${node.f} takes 1 argument`)
        return one(evalNode(node.args[0]!, scope, rad), rad)
      }
      const inv = FN1R[node.f]
      if (inv) {
        if (node.args.length !== 1) throw new Error(`${node.f} takes 1 argument`)
        return inv(evalNode(node.args[0]!, scope, rad), rad)
      }
      const two = FN2[node.f]
      if (two) {
        if (node.args.length !== 2) throw new Error(`${node.f} takes 2 arguments`)
        return two(evalNode(node.args[0]!, scope, rad), evalNode(node.args[1]!, scope, rad))
      }
      throw new Error(`Unknown fn "${node.f}"`)
    }
  }
  throw new Error('Bad expression')
}

export function evaluate(src: string, scope: Scope = {}, rad = true): number {
  return evalNode(parse(src), scope, rad)
}

/** Variable names a node reads (functions and constants excluded). */
export function deps(node: Node, into = new Set<string>()): Set<string> {
  switch (node.n) {
    case 'var':
      into.add(node.name)
      break
    case 'un':
    case 'post':
      deps(node.a, into)
      break
    case 'bin':
      deps(node.l, into)
      deps(node.r, into)
      break
    case 'call':
      for (const a of node.args) deps(a, into)
      break
  }
  return into
}

/** What a line of Math Notes text means once evaluated. */
export type LineEval =
  | { kind: 'blank' }
  | { kind: 'expr'; value?: number; error?: string }
  | { kind: 'assign'; name: string; value: number }
  | { kind: 'graph'; dim: '2d' | '3d'; expr: string; lhs: string }
  | { kind: 'error'; error: string }

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Evaluates one line in the Math Notes sense: assignments create variables,
 * `y =`/`z =` equations become graphable, a trailing `=` asks for the result.
 */
export function evaluateLine(text: string, scope: Scope, rad: boolean): LineEval {
  const src = text.trim()
  if (!src) return { kind: 'blank' }
  try {
    // One trailing '=' asks for the result; `x = 2 + 1 =` still assigns first.
    const ask = src.endsWith('=')
    const body = ask ? src.slice(0, -1).trim() : src
    if (!body) return { kind: 'blank' }
    const eq = body.indexOf('=')
    if (eq < 0) {
      const r = evalSafe(body, scope, rad)
      return r.error ? { kind: 'expr', error: r.error } : { kind: 'expr', value: r.value }
    }
    const lhs = body.slice(0, eq).trim()
    const rhs = body.slice(eq + 1).trim()
    if (!rhs) {
      const r = evalSafe(lhs, scope, rad)
      return r.error ? { kind: 'error', error: r.error } : { kind: 'expr', value: r.value }
    }
    const fn = /^f\((\w+)\)$/.exec(lhs)
    if (/^y$/i.test(lhs) || (fn && fn[1] === 'x')) {
      // Anything parseable is graphable; vars beyond x resolve from the scope
      // or become sliders in the graph sheet.
      parse(rhs)
      return { kind: 'graph', dim: '2d', expr: rhs, lhs: 'y' }
    }
    if (/^z$/i.test(lhs) || /^f\(\s*x\s*,\s*y\s*\)$/.test(lhs) || /^z\(x,y\)$/i.test(lhs)) {
      parse(rhs)
      return { kind: 'graph', dim: '3d', expr: rhs, lhs: 'z' }
    }
    if (IDENT.test(lhs)) {
      const r = evalSafe(rhs, scope, rad)
      if (r.error) return { kind: 'error', error: r.error }
      scope[lhs] = r.value!
      return { kind: 'assign', name: lhs, value: r.value! }
    }
    if (!lhs) {
      const r = evalSafe(rhs, scope, rad)
      return r.error ? { kind: 'error', error: r.error } : { kind: 'expr', value: r.value }
    }
    // `12 + 34 = 46` as written: both sides must agree.
    const l = evalSafe(lhs, scope, rad)
    if (!l.error) {
      const r = evalSafe(rhs, scope, rad)
      if (r.error) return { kind: 'error', error: r.error }
      const close = Math.abs(l.value! - r.value!) <= 1e-9 * Math.max(1, Math.abs(l.value!))
      return close ? { kind: 'expr', value: r.value } : { kind: 'error', error: 'Result differs' }
    }
    return { kind: 'error', error: 'Left side is not a name' }
  } catch (e) {
    return { kind: 'error', error: e instanceof Error ? e.message : 'Error' }
  }
}
const evalSafe = (src: string, scope: Scope, rad: boolean) => {
  try {
    const v = evaluate(src, scope, rad)
    if (!Number.isFinite(v) || Number.isNaN(v)) return { error: 'Not a number' }
    return { value: v }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error' }
  }
}

/**
 * Number display for results and unit-converted values: grouped when it fits,
 * scientific `e`-notation outside it, `Error` for non-finite.
 */
export function fmt(v: number, sig = 9): string {
  if (!Number.isFinite(v) || Number.isNaN(v)) return 'Error'
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e16 || a < 1e-9) {
    const [m, e] = v.toExponential(6).split('e')
    return `${m!.replace(/\.?0+$/, '')}e${e}`
  }
  const out = new Intl.NumberFormat('en-US', { maximumSignificantDigits: sig }).format(v)
  // Rounding can overflow into 1e+16-style output from Intl as 10,000,000,000,000,000
  return out
}

/** Grouping for a partially typed number string: `1234.5` -> `1,234.5`, `3e` and `-` pass through. */
export function fmtEntry(cur: string): string {
  const m = /^(-?)(\d*)(\.\d*)?([eE][+-]?\d*)?$/.exec(cur)
  if (!m) return cur
  const [, sign, int, frac = '', exp = ''] = m
  const grouped = int ? Number(int).toLocaleString('en-US', { maximumFractionDigits: 0 }) : int
  return `${sign}${grouped}${frac}${exp.replace('E', 'e')}`
}
