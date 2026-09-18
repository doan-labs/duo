// Syntax colour for the short TypeScript samples on the site. A hand-rolled
// tokenizer, not a grammar: keywords, strings, numbers, JSX tags, calls and
// punctuation are all the samples use, and it keeps a highlighter dependency
// off the page.
import * as stylex from '@stylexjs/stylex'
import { Fragment } from 'react'
import { color } from './tokens.stylex'

type Kind = 'kw' | 'str' | 'num' | 'tag' | 'fn' | 'prop' | 'punct' | 'cmt' | 'plain'

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'if',
  'else',
  'return',
  'import',
  'from',
  'export',
  'function',
  'await',
  'async',
  'type',
  'interface',
  'new',
  'default',
  'true',
  'false',
  'null',
  'undefined',
  'as',
  'of',
  'for',
  'while',
  'string',
  'number',
  'boolean',
  'void',
  'never',
  'unknown',
  'any'
])
// Order matters: comments and strings first so their insides are never split.
const TOKEN =
  /(\/\/.*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(<\/?[A-Za-z][\w.]*|\/?>)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\],;:.=<>!&|+\-*/?]+)|(\s+)/g

export function tokens(code: string): { kind: Kind; text: string }[] {
  const out: { kind: Kind; text: string }[] = []
  for (const m of code.matchAll(TOKEN)) {
    const [text, cmt, str, tag, num, word, punct] = m
    let kind: Kind = 'plain'
    if (cmt) kind = 'cmt'
    else if (str) kind = 'str'
    else if (tag) kind = 'tag'
    else if (num) kind = 'num'
    else if (word) {
      const after = code.slice(m.index + text.length)
      const before = code.slice(0, m.index)
      if (KEYWORDS.has(text)) kind = 'kw'
      else if (after.startsWith('(')) kind = 'fn'
      else if (
        /\.\s*$/.test(before) ||
        (/^\s*[:=]/.test(after) && /[{,]\s*$/.test(before)) ||
        // A member on its own line in a type body: `  build: {...}` after a newline or `;`.
        (/^\s*\??:/.test(after) && /(?:^|[;\n])\s*$/.test(before))
      )
        kind = 'prop'
    } else if (punct) kind = 'punct'
    out.push({ kind, text })
  }
  return out
}

/** One highlighted line; the caller decides how lines are laid out. */
export function Line({ code }: { code: string }) {
  let at = 0
  return (
    <>
      {tokens(code).map((t) => {
        const key = at
        at += t.text.length
        return (
          <Fragment key={key}>
            {t.kind === 'plain' ? t.text : <span {...stylex.props(styles[t.kind])}>{t.text}</span>}
          </Fragment>
        )
      })}
    </>
  )
}

const styles = stylex.create({
  kw: { color: color.synKw },
  str: { color: color.synStr },
  num: { color: color.synNum },
  tag: { color: color.synTag },
  fn: { color: color.synFn },
  prop: { color: color.synProp },
  punct: { color: color.synPunct },
  cmt: { color: color.synCmt, fontStyle: 'italic' }
})
