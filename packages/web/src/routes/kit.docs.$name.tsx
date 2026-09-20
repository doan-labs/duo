import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { ApiTable, Signature } from '../api-card'
import { known } from '../docs'
import { kit } from '../kit/data'
import { hasDemo, KitPreview } from '../kit-preview'
import { Prose } from '../layout'
import { inline, parse, render } from '../markdown'
import { CURVE } from '../motion'
import { blob } from '../site'
import { color, ease, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/kit/docs/$name')({
  loader: ({ params }) => {
    const e = kit.find((x) => x.name === params.name)
    if (!e) throw notFound()
    return e
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? 'UI kit'} · Duo` }] }),
  component: Page
})

const GROUP: Record<string, string> = {
  component: 'Components',
  hook: 'Hooks',
  function: 'Functions',
  class: 'Classes',
  type: 'Types',
  value: 'Values'
}

function Page() {
  const entry = Route.useLoaderData()
  const still = useReducedMotion()
  const ctx = { from: entry.file, known }
  // The first paragraph is the lead; the rest reads as prose under the preview.
  const [lead = '', ...rest] = entry.doc.split(/\n\s*\n/)
  const siblings = kit.filter((e) => e.kind === entry.kind && e.name !== entry.name)
  const at = siblings.findIndex((e) => e.name > entry.name)
  const related = [...siblings.slice(at < 0 ? siblings.length : at), ...siblings].slice(0, 3)
  return (
    <Prose>
      {/* Keyed by export so moving between two kit pages settles rather than snapping. */}
      <motion.div
        key={entry.name}
        initial={{ opacity: 0, transform: 'translateY(8px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: still ? 0 : 0.34, ease: CURVE }}
      >
        <nav aria-label="Breadcrumb" {...stylex.props(styles.crumbs)}>
          <Link to="/kit/docs" {...stylex.props(styles.crumb)}>
            {GROUP[entry.kind]}
          </Link>
          <span aria-hidden="true">›</span>
          <span {...stylex.props(styles.crumbOn)}>{entry.name}</span>
        </nav>
        <div {...stylex.props(styles.head)}>
          <div>
            <h1 {...stylex.props(styles.title)}>{entry.name}</h1>
            {lead ? (
              <p {...stylex.props(styles.lead)}>{inline(lead.replace(/\n+/g, ' '), ctx)}</p>
            ) : (
              <p {...stylex.props(styles.undocumented)}>No TSDoc on this export yet.</p>
            )}
          </div>
          <a
            href={`${blob(entry.file)}#L${entry.line}`}
            target="_blank"
            rel="noreferrer"
            {...stylex.props(styles.source)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Source
          </a>
        </div>
        {hasDemo(entry.name) ? <KitPreview name={entry.name} /> : <Signature code={entry.signature} />}
        {rest.length > 0 && <div {...stylex.props(styles.doc)}>{render(parse(rest.join('\n\n')), ctx)}</div>}
        <h2 {...stylex.props(styles.h2)}>API reference</h2>
        {entry.members && entry.members.length > 0 ? <ApiTable entry={entry} /> : <Signature code={entry.signature} />}
        {related.length > 0 && (
          <>
            <h2 {...stylex.props(styles.h2)}>Related {GROUP[entry.kind]?.toLowerCase()}</h2>
            <div {...stylex.props(styles.related)}>
              {related.map((e) => (
                <Link key={e.name} to="/kit/docs/$name" params={{ name: e.name }} {...stylex.props(styles.tile)}>
                  <span {...stylex.props(styles.tileName)}>{e.name}</span>
                  <span {...stylex.props(styles.tileDoc)}>
                    <span {...stylex.props(styles.clamp)}>{e.doc.split(/\n\s*\n/)[0]?.replace(/\n+/g, ' ')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </Prose>
  )
}

const styles = stylex.create({
  crumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    fontFamily: font.sans,
    fontSize: '14px',
    color: color.text3
  },
  crumb: {
    color: { default: color.text3, ':hover': color.text },
    textDecoration: 'none',
    borderRadius: '4px',
    transitionProperty: 'color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  },
  crumbOn: { color: color.text, fontWeight: 500 },
  head: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '28px'
  },
  title: {
    margin: 0,
    marginBottom: '8px',
    fontFamily: font.display,
    fontSize: '36px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    color: color.text
  },
  lead: { margin: 0, fontSize: '17px', lineHeight: 1.6, color: color.text2 },
  undocumented: { margin: 0, fontSize: '15px', color: color.text3, fontStyle: 'italic' },
  source: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
    marginTop: '6px',
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radius.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    backgroundColor: { default: color.surface, ':hover': color.well },
    color: color.text,
    textDecoration: 'none',
    transitionProperty: 'background-color, border-color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  doc: { marginTop: '24px', fontSize: '17px', lineHeight: 1.65, color: color.text },
  h2: {
    marginTop: '40px',
    marginBottom: '16px',
    paddingTop: '32px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    fontFamily: font.display,
    fontSize: '17px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: color.text
  },
  related: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', [SMALL]: '1fr' },
    gap: '12px',
    marginBottom: '40px'
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.md,
    backgroundColor: color.surface,
    textDecoration: 'none',
    color: color.text,
    willChange: 'transform',
    transitionProperty: 'border-color, transform, box-shadow, outline-color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-3px)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  tileName: { fontFamily: font.mono, fontSize: '15px', fontWeight: 500, color: color.accent },
  clamp: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' },
  tileDoc: {
    display: 'block',
    padding: '12px',
    borderRadius: radius.sm,
    backgroundColor: color.well,
    fontSize: '14px',
    lineHeight: 1.5,
    color: color.text2
  }
})
