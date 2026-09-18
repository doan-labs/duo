import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { docs, groups } from '../docs'
import { Prose } from '../layout'
import { PageTop } from '../page-parts'
import { color, font, radius } from '../tokens.stylex'

export const Route = createFileRoute('/docs/')({
  head: () => ({ meta: [{ title: 'Documentation · Duo' }] }),
  component: Index
})

function Index() {
  return (
    <Prose>
      <PageTop
        eyebrow="Documentation"
        title="Build for a phone that folds"
        lead="Everything from the first command to a catalog people can install from. Start at the top; the reference for every export is on the SDK and UI kit pages."
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
                    <span {...stylex.props(styles.summary)}>{d.summary}</span>
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
    flexDirection: 'column',
    gap: '4px',
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
  title: { fontSize: '17px', fontWeight: 500, color: color.text },
  summary: {
    fontSize: '15px',
    lineHeight: 1.5,
    color: color.text2,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  }
})
