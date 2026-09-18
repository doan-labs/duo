import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { type Doc, docs, known } from './docs'
import { Prose, Title } from './layout'
import { type LinkCtx, outline, parse, render } from './markdown'
import { blob } from './site'
import { color, font, radius } from './tokens.stylex'

/** One documentation page: the title, an outline when it is long, the body, then previous and next. */
export function DocBody({ doc }: { doc: Doc }) {
  const ctx: LinkCtx = { from: doc.path, known }
  const blocks = parse(doc.body)
  const body = blocks.filter((b) => !(b.t === 'h' && b.level === 1))
  const toc = outline(blocks)
  // The loader data is a copy after hydration, so match by slug rather than identity.
  const i = docs.findIndex((d) => d.slug === doc.slug)
  const prev = docs[i - 1]
  const next = docs[i + 1]
  return (
    <Prose>
      <p {...stylex.props(styles.group)}>{doc.group}</p>
      <Title>{doc.title}</Title>
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
      <nav aria-label="Pages" {...stylex.props(styles.pager)}>
        {prev ? (
          <Link to="/docs/$" params={{ _splat: prev.slug }} {...stylex.props(styles.pageLink)}>
            <span {...stylex.props(styles.pageLabel)}>Previous</span>
            <span {...stylex.props(styles.pageTitle)}>{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to="/docs/$" params={{ _splat: next.slug }} {...stylex.props(styles.pageLink, styles.pageNext)}>
            <span {...stylex.props(styles.pageLabel)}>Next</span>
            <span {...stylex.props(styles.pageTitle)}>{next.title}</span>
          </Link>
        )}
      </nav>
      <p {...stylex.props(styles.edit)}>
        <a href={blob(doc.path)} {...stylex.props(styles.editLink)}>
          Edit this page on GitHub
        </a>
      </p>
    </Prose>
  )
}

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  group: {
    margin: 0,
    marginBottom: '14px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
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
    marginTop: '28px',
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
  tocLink: { color: color.text2, textDecoration: { default: 'none', ':hover': 'underline' } },
  pager: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr 1fr', [SMALL]: '1fr' },
    gap: '12px',
    marginTop: '64px',
    paddingTop: '28px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  pageLink: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '18px',
    paddingRight: '18px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.md,
    textDecoration: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '0.2s'
  },
  pageNext: { textAlign: 'right' },
  pageLabel: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  pageTitle: { fontFamily: font.sans, fontSize: '16px', fontWeight: 500, color: color.text },
  edit: { marginTop: '28px', marginBottom: 0, fontFamily: font.mono, fontSize: '12px' },
  editLink: { color: { default: color.text3, ':hover': color.accent }, textDecoration: 'none' }
})
