import * as stylex from '@stylexjs/stylex'
import type { ApiEntry } from './api-types'
import { known } from './docs'
import { Line } from './highlight'
import { inline, parse, render } from './markdown'
import { blob } from './site'
import { color, font, radius } from './tokens.stylex'

const KIND: Record<ApiEntry['kind'], string> = {
  component: 'Component',
  hook: 'Hook',
  function: 'Function',
  class: 'Class',
  type: 'Type',
  value: 'Value'
}

/** One export, straight from its TSDoc: description, declaration, props or members, and the line it lives on. */
export function ApiCard({ entry, heading = 'h2' }: { entry: ApiEntry; heading?: 'h1' | 'h2' }) {
  const H = heading
  const ctx = { from: entry.file, known }
  return (
    <section id={entry.name} {...stylex.props(styles.card)}>
      <H {...stylex.props(styles.name, heading === 'h1' && styles.nameBig)}>
        <code {...stylex.props(styles.nameCode)}>{entry.name}</code>
        <span {...stylex.props(styles.kind)}>{KIND[entry.kind]}</span>
      </H>
      {entry.doc ? (
        <div {...stylex.props(styles.doc)}>{render(parse(entry.doc), ctx)}</div>
      ) : (
        <p {...stylex.props(styles.undocumented)}>No TSDoc on this export yet.</p>
      )}
      <pre {...stylex.props(styles.pre)}>
        <code>
          <Line code={entry.signature} />
        </code>
      </pre>
      <ApiTable entry={entry} />
      <p {...stylex.props(styles.source)}>
        <a href={`${blob(entry.file)}#L${entry.line}`} {...stylex.props(styles.link)}>
          {entry.file}:{entry.line}
        </a>
      </p>
    </section>
  )
}

/** Props or members table plus the "Also accepts" line; the kit pages use it under their own heading. */
export function ApiTable({ entry }: { entry: ApiEntry }) {
  const ctx = { from: entry.file, known }
  return (
    <>
      {entry.members && entry.members.length > 0 && (
        <div {...stylex.props(styles.tableWrap)}>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th {...stylex.props(styles.th)}>{entry.kind === 'component' ? 'Prop' : 'Member'}</th>
                <th {...stylex.props(styles.th)}>Type</th>
                {entry.kind === 'component' && <th {...stylex.props(styles.th)}>Default</th>}
                <th {...stylex.props(styles.th)}>Description</th>
              </tr>
            </thead>
            <tbody>
              {entry.members.map((m) => (
                <tr key={m.name}>
                  <td {...stylex.props(styles.td)}>
                    <code {...stylex.props(styles.code)}>
                      {m.name}
                      {m.optional ? '?' : ''}
                    </code>
                  </td>
                  <td {...stylex.props(styles.td)}>
                    <code {...stylex.props(styles.code, styles.type)}>{m.type}</code>
                  </td>
                  {entry.kind === 'component' && (
                    <td {...stylex.props(styles.td)}>
                      {m.default ? <code {...stylex.props(styles.code, styles.type)}>{m.default}</code> : '–'}
                    </td>
                  )}
                  <td {...stylex.props(styles.td)}>{m.doc ? inline(m.doc.replace(/\n+/g, ' '), ctx) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {entry.extends && entry.extends.length > 0 && (
        <p {...stylex.props(styles.extends)}>{extendsLine(entry.extends)}</p>
      )}
    </>
  )
}

/** `PrimitiveProps<'button'>` is the kit's shared contract; spell it out rather than naming the type. */
function extendsLine(types: string[]) {
  const parts = types.map((t, i) => {
    const primitive = /^PrimitiveProps<(.+)>$/.exec(t)
    const tag = primitive?.[1]?.match(/^'(\w+)'$/)?.[1]
    return primitive ? (
      <span key={t}>
        every attribute of {tag ? <code {...stylex.props(styles.code)}>{`<${tag}>`}</code> : 'the rendered element'},
        plus <code {...stylex.props(styles.code)}>as</code>, <code {...stylex.props(styles.code)}>xstyle</code> and{' '}
        <code {...stylex.props(styles.code)}>animate</code>
        {i < types.length - 1 ? ', ' : ''}
      </span>
    ) : (
      <span key={t}>
        <code {...stylex.props(styles.code)}>{t}</code>
        {i < types.length - 1 ? ', ' : ''}
      </span>
    )
  })
  return (
    <>
      Also accepts {parts}. Raw <code {...stylex.props(styles.code)}>style</code> and{' '}
      <code {...stylex.props(styles.code)}>className</code> are refused.
    </>
  )
}

const styles = stylex.create({
  card: {
    fontFamily: font.sans,
    paddingTop: '8px',
    paddingBottom: '40px',
    marginBottom: '24px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    scrollMarginTop: '96px'
  },
  name: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    margin: 0,
    marginBottom: '12px',
    fontFamily: font.display,
    fontSize: '24px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  nameBig: { fontSize: '36px', letterSpacing: '-0.03em' },
  nameCode: { fontFamily: font.mono, fontSize: '0.9em', fontWeight: 500 },
  kind: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    color: color.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  },
  doc: { fontSize: '17px', lineHeight: 1.6, color: color.text },
  undocumented: { fontSize: '15px', color: color.text3, fontStyle: 'italic' },
  pre: {
    fontFamily: font.mono,
    fontSize: '13px',
    lineHeight: 1.6,
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    color: color.text,
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '18px',
    paddingRight: '18px',
    overflowX: 'auto',
    whiteSpace: 'pre',
    margin: 0,
    marginBottom: '20px'
  },
  code: { fontFamily: font.mono, fontSize: '13px', color: color.text },
  type: { color: color.accent },
  extends: { fontSize: '15px', lineHeight: 1.6, color: color.text2, margin: 0, marginBottom: '20px' },
  tableWrap: {
    overflowX: 'auto',
    marginBottom: '20px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md
  },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: '14px', lineHeight: 1.5 },
  th: {
    textAlign: 'left',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    backgroundColor: color.well,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    color: color.text3
  },
  td: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    verticalAlign: 'top',
    color: color.text2
  },
  source: { margin: 0, fontFamily: font.mono, fontSize: '11px', letterSpacing: '0.04em', color: color.text3 },
  link: { color: { default: color.text3, ':hover': color.accent }, textDecoration: 'none' }
})
