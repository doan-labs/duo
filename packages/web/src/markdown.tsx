// The docs are rendered from the repository's Markdown, not copied. No Markdown
// dependency is installed, so this covers exactly what docs/ uses: ATX headings,
// paragraphs, fenced code, pipe tables, nested bullet and numbered lists, block
// quotes, rules, and inline code, links, bold and italic. Anything else renders
// as text, never as HTML.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Fragment, type ReactNode } from 'react'
import { ROOT, slugOf } from './docs'
import { Pre } from './page-parts'
import { blob } from './site'
import { color, ease, font, radius } from './tokens.stylex'

export type Block =
  | { t: 'h'; level: number; text: string; id: string }
  | { t: 'p'; text: string }
  | { t: 'code'; lang: string; code: string }
  | { t: 'list'; ordered: boolean; items: Block[][] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'quote'; blocks: Block[] }
  | { t: 'hr' }

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[`*_[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function parse(src: string): Block[] {
  return blocks(src.replace(/\r\n/g, '\n').split('\n'))
}

const BLOCK_START = /^(#{1,6}\s|```|\||>|\s*[-*+]\s|\s*\d+[.)]\s|-{3,}\s*$)/
const indentOf = (l: string) => l.length - l.trimStart().length

function listItem(l: string) {
  const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l)
  if (!m) return null
  const indent = m[1]!.length
  return { indent, ordered: /\d/.test(m[2]!), contentIndent: indent + m[2]!.length + 1, rest: m[3]! }
}

/** Splits a table row on pipes that are not inside a code span. */
function cells(row: string) {
  const out: string[] = []
  let cur = ''
  let tick = false
  for (const ch of row.replace(/^\|/, '').replace(/\|\s*$/, '')) {
    if (ch === '`') tick = !tick
    if (ch === '|' && !tick) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

function blocks(lines: string[]): Block[] {
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) {
      i++
      continue
    }
    const fence = /^```(\w*)\s*$/.exec(line)
    if (fence) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) buf.push(lines[i++]!)
      i++
      out.push({ t: 'code', lang: fence[1] ?? '', code: buf.join('\n') })
      continue
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (h) {
      out.push({ t: 'h', level: h[1]!.length, text: h[2]!, id: slug(h[2]!) })
      i++
      continue
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push({ t: 'hr' })
      i++
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[] = []
      while (i < lines.length && lines[i]!.startsWith('|')) rows.push(lines[i++]!)
      const head = cells(rows[0]!)
      const body = rows
        .slice(1)
        .filter((r) => !/^\|[\s:|-]+\|?\s*$/.test(r))
        .map(cells)
      out.push({ t: 'table', head, rows: body })
      continue
    }
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i]!.startsWith('>')) buf.push(lines[i++]!.replace(/^>\s?/, ''))
      out.push({ t: 'quote', blocks: blocks(buf) })
      continue
    }
    const li = listItem(line)
    if (li) {
      const items: Block[][] = []
      while (i < lines.length) {
        const m = listItem(lines[i]!)
        if (!m || m.ordered !== li.ordered || m.indent !== li.indent) break
        const buf = [m.rest]
        i++
        while (i < lines.length) {
          const l = lines[i]!
          if (!l.trim()) {
            // A blank line stays inside the item only when indented content follows it.
            let j = i
            while (j < lines.length && !lines[j]!.trim()) j++
            if (j < lines.length && indentOf(lines[j]!) > m.indent) {
              buf.push('')
              i++
              continue
            }
            break
          }
          if (indentOf(l) > m.indent) {
            buf.push(l.slice(Math.min(indentOf(l), m.contentIndent)))
            i++
            continue
          }
          // Lazy continuation: an unindented plain line right after item text.
          if (buf.at(-1) !== '' && !BLOCK_START.test(l)) {
            buf.push(l)
            i++
            continue
          }
          break
        }
        items.push(blocks(buf))
      }
      out.push({ t: 'list', ordered: li.ordered, items })
      continue
    }
    const buf: string[] = []
    while (i < lines.length && lines[i]!.trim() && (buf.length === 0 || !BLOCK_START.test(lines[i]!))) {
      buf.push(lines[i++]!.trim())
    }
    out.push({ t: 'p', text: buf.join(' ') })
  }
  return out
}

// ---- inline ----

const INLINE =
  /(`+)([\s\S]*?[^`])\1(?!`)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*(.+?)\*\*|(?<![\w`*])\*([^*\n]+?)\*(?![\w*])|(?<![\w`])_([^_\n]+?)_(?!\w)|<(https?:\/\/[^>\s]+)>/g

export type LinkCtx = {
  /** Repository path of the document being rendered, e.g. `packages/web/content/docs/manifest.md`. */
  from: string
  /** Every documentation path that has a page, so a link to a missing file goes to GitHub instead of a 404. */
  known: Set<string>
}

/** Resolves `../x.md#y` against the current document into a repository path plus hash. */
function resolve(from: string, href: string) {
  const [path = '', hash] = href.split('#')
  const dir = from.split('/').slice(0, -1)
  const parts = [...dir]
  for (const p of path.split('/')) {
    if (p === '..') parts.pop()
    else if (p !== '.' && p !== '') parts.push(p)
  }
  return { path: parts.join('/'), hash: hash ? `#${hash}` : '' }
}

function A({ href, children, ctx }: { href: string; children: ReactNode; ctx: LinkCtx }) {
  const a = stylex.props(md.a)
  if (/^https?:/.test(href) || href.startsWith('mailto:') || href.startsWith('#')) {
    return (
      <a href={href} {...a}>
        {children}
      </a>
    )
  }
  if (href.startsWith('/')) {
    return (
      <Link to={href} {...a}>
        {children}
      </Link>
    )
  }
  const { path, hash } = resolve(ctx.from, href)
  if (path.startsWith(ROOT) && ctx.known.has(path)) {
    return (
      <Link to="/docs/$" params={{ _splat: slugOf(path) }} hash={hash.slice(1) || undefined} {...a}>
        {children}
      </Link>
    )
  }
  return (
    <a href={blob(path) + hash} {...a}>
      {children}
    </a>
  )
}

export function inline(text: string, ctx: LinkCtx): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    last = m.index + m[0].length
    const key = k++
    if (m[2] !== undefined)
      out.push(
        <code key={key} {...stylex.props(md.code)}>
          {m[2].trim()}
        </code>
      )
    else if (m[3] !== undefined)
      out.push(
        <A key={key} href={m[4]!} ctx={ctx}>
          {inline(m[3], ctx)}
        </A>
      )
    else if (m[5] !== undefined)
      out.push(
        <strong key={key} {...stylex.props(md.strong)}>
          {inline(m[5], ctx)}
        </strong>
      )
    else if (m[6] !== undefined) out.push(<em key={key}>{inline(m[6], ctx)}</em>)
    else if (m[7] !== undefined) out.push(<em key={key}>{inline(m[7], ctx)}</em>)
    else if (m[8] !== undefined)
      out.push(
        <a key={key} href={m[8]} {...stylex.props(md.a)}>
          {m[8]}
        </a>
      )
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// ---- render ----

export function render(bs: Block[], ctx: LinkCtx): ReactNode {
  return bs.map((b, i) => {
    const key = i
    switch (b.t) {
      case 'h': {
        const Tag = `h${Math.min(6, b.level)}` as 'h1'
        const level = (['h1', 'h2', 'h3', 'h4'] as const)[Math.min(3, b.level - 1)]!
        return (
          <Tag key={key} id={b.id} {...stylex.props(md.h, md[level])}>
            <a href={`#${b.id}`} {...stylex.props(md.anchor)}>
              {inline(b.text, ctx)}
            </a>
          </Tag>
        )
      }
      case 'p':
        return (
          <p key={key} {...stylex.props(md.p)}>
            {inline(b.text, ctx)}
          </p>
        )
      case 'code':
        // The same block the hand-written pages use, so a fence in docs/ and a
        // sample in a route are one shape: file tab, copy button, colour.
        return (
          <Pre key={key} lang={b.lang}>
            {b.code}
          </Pre>
        )
      case 'list': {
        const Tag = b.ordered ? 'ol' : 'ul'
        return (
          <Tag key={key} {...stylex.props(md.list)}>
            {b.items.map((it, j) => (
              <li key={j} {...stylex.props(md.li)}>
                {tight(it, ctx)}
              </li>
            ))}
          </Tag>
        )
      }
      case 'table':
        return (
          <div key={key} {...stylex.props(md.tableWrap)}>
            <table {...stylex.props(md.table)}>
              <thead>
                <tr>
                  {b.head.map((c, j) => (
                    <th key={j} {...stylex.props(md.th)}>
                      {inline(c, ctx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} {...stylex.props(md.tr)}>
                    {r.map((c, x) => (
                      <td key={x} {...stylex.props(md.td)}>
                        {inline(c, ctx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'quote':
        return (
          <blockquote key={key} {...stylex.props(md.quote)}>
            {render(b.blocks, ctx)}
          </blockquote>
        )
      case 'hr':
        return <hr key={key} {...stylex.props(md.hr)} />
    }
  })
}

/** A list item whose only block is a paragraph renders without the `<p>`, like every Markdown renderer. */
function tight(bs: Block[], ctx: LinkCtx): ReactNode {
  return bs.map((b, i) => (b.t === 'p' ? <Fragment key={i}>{inline(b.text, ctx)}</Fragment> : render([b], ctx)))
}

/** Headings of level 2 and 3, for a page's table of contents. */
export const outline = (bs: Block[]) =>
  bs.flatMap((b) => (b.t === 'h' && b.level >= 2 && b.level <= 3 ? [{ level: b.level, text: b.text, id: b.id }] : []))

const SMALL = '@media (max-width: 734px)'

const md = stylex.create({
  h: {
    fontFamily: font.display,
    color: color.text,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    scrollMarginTop: '96px'
  },
  h1: {
    fontSize: { default: '40px', [SMALL]: '32px' },
    lineHeight: 1.05,
    marginTop: 0,
    marginBottom: '18px',
    letterSpacing: '-0.03em'
  },
  h2: {
    fontSize: { default: '26px', [SMALL]: '23px' },
    lineHeight: 1.15,
    marginTop: '56px',
    marginBottom: '14px',
    paddingTop: '28px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  h3: { fontSize: '21px', lineHeight: 1.25, marginTop: '40px', marginBottom: '10px' },
  h4: {
    fontSize: '15px',
    lineHeight: 1.35,
    marginTop: '28px',
    marginBottom: '8px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: color.text2
  },
  // The link wraps the whole heading, so its own `:hover` is the heading's; a
  // descendant selector would be needed otherwise, and StyleX has none.
  anchor: {
    position: 'relative',
    color: 'inherit',
    textDecoration: 'none',
    borderRadius: radius.sm,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '6px',
    '::after': {
      content: '"#"',
      marginLeft: '0.32em',
      fontFamily: font.mono,
      fontWeight: 400,
      fontSize: '0.62em',
      color: color.accent,
      // It holds its space at zero opacity, so revealing it never reflows the line.
      opacity: { default: 0, ':hover': 1, ':focus-visible': 1 },
      transitionProperty: 'opacity',
      transitionDuration: '0.2s',
      transitionTimingFunction: ease.out
    }
  },
  p: { marginTop: 0, marginBottom: '20px', fontSize: '17px', lineHeight: 1.65, color: color.text },
  a: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: 'none',
    textUnderlineOffset: '3px',
    borderRadius: '3px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: { default: color.accentSoft, ':hover': color.accent },
    transitionProperty: 'color, border-bottom-color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  },
  strong: { fontWeight: 600 },
  code: {
    fontFamily: font.mono,
    fontSize: '0.86em',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    overflowWrap: 'break-word'
  },
  list: {
    marginTop: 0,
    marginBottom: '20px',
    paddingLeft: '24px',
    fontSize: '17px',
    lineHeight: 1.65,
    color: color.text
  },
  li: { marginBottom: '10px', paddingLeft: '4px', '::marker': { color: color.text3 } },
  tableWrap: {
    overflowX: 'auto',
    // `overflow-x: auto` alone computes `overflow-y` to `auto` as well, and the
    // table's -1px bottom margin is then a 1px vertical overflow with a scrollbar.
    overflowY: 'hidden',
    overscrollBehaviorX: 'contain',
    marginBottom: '28px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    // The last row's rule would otherwise double up with the box's own bottom edge.
    marginBottom: '-1px',
    minWidth: '440px',
    fontSize: '14.5px',
    lineHeight: 1.55
  },
  tr: {
    backgroundColor: { default: 'transparent', ':hover': color.well },
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
    transitionTimingFunction: ease.out
  },
  th: {
    textAlign: 'left',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '16px',
    paddingRight: '16px',
    backgroundColor: color.well,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    color: color.text3,
    verticalAlign: 'bottom'
  },
  td: {
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    verticalAlign: 'top',
    color: color.text
  },
  quote: {
    marginTop: 0,
    marginBottom: '24px',
    marginLeft: 0,
    marginRight: 0,
    paddingTop: '18px',
    // The last paragraph inside brings its own 20px margin; a zero here would let
    // that margin collapse out of the box and cut the wash off at the baseline.
    paddingBottom: '2px',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: color.well,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderLeftWidth: '2px',
    borderLeftStyle: 'solid',
    borderLeftColor: color.accent,
    color: color.text2
  },
  hr: {
    borderWidth: 0,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    marginTop: '48px',
    marginBottom: '48px'
  }
})
