import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { docs, groups } from '../docs'
import { Prose } from '../layout'
import { Code, PageTop } from '../page-parts'
import { Badge } from '../status'
import { color, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/docs/')({
  head: () => ({ meta: [{ title: 'Documentation · Duo' }] }),
  component: Index
})

function Index() {
  return (
    <Prose>
      <PageTop
        eyebrow="Docs · Straight from the repository"
        title="Documentation"
        lead={
          <>
            Rendered from the Markdown in the repository's <Code>docs/</Code> folder on every build; the site keeps no
            copy. Each page carries a badge: a planning document describes intent, a progress record describes what was
            built and how it was verified, and the repository notes describe the code as it is.
          </>
        }
      />
      {groups.map((g) => (
        <section key={g}>
          <h2 {...stylex.props(styles.h2)}>{g}</h2>
          <ul {...stylex.props(styles.list)}>
            {docs
              .filter((d) => d.group === g)
              .map((d) => (
                <li key={d.slug}>
                  <Link to="/docs/$" params={{ _splat: d.slug }} {...stylex.props(styles.row)}>
                    <span {...stylex.props(styles.title)}>{d.title}</span>
                    <Badge status={d.status} />
                    <span {...stylex.props(styles.path)}>{d.path}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Prose>
  )
}

const styles = stylex.create({
  h2: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3,
    marginTop: '36px',
    marginBottom: '10px'
  },
  list: { listStyleType: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.md,
    textDecoration: 'none',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '0.2s'
  },
  title: { fontSize: '17px', fontWeight: 500, color: color.text },
  path: {
    fontFamily: font.mono,
    fontSize: '12px',
    color: color.text3,
    marginLeft: { default: 'auto', [SMALL]: '0' },
    overflowWrap: 'anywhere'
  }
})
