import * as stylex from '@stylexjs/stylex'
import { type Doc, known } from './docs'
import { Prose, Title } from './layout'
import { type LinkCtx, outline, parse, render } from './markdown'
import { blob } from './site'
import { Badge, Notice } from './status'
import { color, font, radius } from './tokens.stylex'

/** One repository document as a page: status notice, the rendered body, an outline when it is long, a source link. */
export function DocBody({ doc, hideTitle = false }: { doc: Doc; hideTitle?: boolean }) {
  const ctx: LinkCtx = { from: doc.path, known }
  const blocks = parse(doc.body)
  const body = blocks.filter(
    (b, i) => !(i === blocks.indexOf(blocks.find((x) => x.t === 'h' && x.level === 1)!) && b.t === 'h')
  )
  const toc = outline(blocks)
  return (
    <Prose>
      {!hideTitle && <Title badge={<Badge status={doc.status} />}>{doc.title}</Title>}
      <Notice status={doc.status}>
        {doc.note}{' '}
        <a href={blob(doc.path)} {...stylex.props(styles.src)}>
          Source: {doc.path}
        </a>
      </Notice>
      {toc.length > 5 && (
        <nav aria-label="On this page" {...stylex.props(styles.toc)}>
          <h2 {...stylex.props(styles.tocTitle)}>On this page</h2>
          <ul {...stylex.props(styles.tocList)}>
            {toc.map((h) => (
              <li key={h.id} {...stylex.props(styles.tocItem, h.level === 3 && styles.tocSub)}>
                <a href={`#${h.id}`} {...stylex.props(styles.tocLink)}>
                  {h.text.replace(/[`*]/g, '')}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {render(body, ctx)}
    </Prose>
  )
}

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  src: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: { default: 'none', ':hover': 'underline' }
  },
  toc: {
    backgroundColor: color.well,
    borderRadius: radius.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    paddingTop: '20px',
    paddingBottom: '20px',
    paddingLeft: '22px',
    paddingRight: '22px',
    marginBottom: '40px',
    fontFamily: font.sans
  },
  tocTitle: {
    margin: 0,
    marginBottom: '12px',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: color.text3
  },
  tocList: { listStyleType: 'none', margin: 0, padding: 0, columnCount: { default: 2, [SMALL]: 1 }, columnGap: '28px' },
  tocItem: { fontSize: '14px', lineHeight: 1.45, paddingTop: '4px', paddingBottom: '4px', breakInside: 'avoid' },
  tocSub: { paddingLeft: '16px', color: color.text3 },
  tocLink: { color: color.text2, textDecoration: { default: 'none', ':hover': 'underline' } }
})
