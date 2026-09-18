import * as stylex from '@stylexjs/stylex'
import type { ApiEntry } from './api-types'
import { known } from './docs'
import { inline, parse, render } from './markdown'
import { blob } from './site'
import { color, font, radius } from './tokens.stylex'

const KIND: Record<ApiEntry['kind'], string> = {
  component: 'Component',
  hook: 'Hook',
  function: 'Function',
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
        <code>{entry.signature}</code>
      </pre>
      {entry.members && entry.members.length > 0 && (
        <div {...stylex.props(styles.tableWrap)}>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th {...stylex.props(styles.th)}>{entry.kind === 'component' ? 'Prop' : 'Member'}</th>
                <th {...stylex.props(styles.th)}>Type</th>
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
                    <code {...stylex.props(styles.code)}>{m.type}</code>
                  </td>
                  <td {...stylex.props(styles.td)}>{m.doc ? inline(m.doc.replace(/\n+/g, ' '), ctx) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p {...stylex.props(styles.source)}>
        <a href={`${blob(entry.file)}#L${entry.line}`} {...stylex.props(styles.link)}>
          {entry.file}:{entry.line}
        </a>
      </p>
    </section>
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
