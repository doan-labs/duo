import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Prose } from '../layout'
import { Code, PageTop } from '../page-parts'
import { blob } from '../site'
import { Badge, Notice } from '../status'
import { color, font, radius } from '../tokens.stylex'
import { kit } from './kit'

export const Route = createFileRoute('/kit/')({
  head: () => ({ meta: [{ title: 'UI kit · Duo' }] }),
  component: Index
})

function Index() {
  return (
    <Prose>
      <PageTop
        eyebrow="UI kit · Works today"
        title="UI kit"
        badge={<Badge status="works" />}
        lead={
          <>
            <Code>@doan-labs/ipduo-uikit</Code>, the components and tokens apps compile against. Every page here is
            generated from the TSDoc and props type on the export, nothing is hand-written.
          </>
        }
      />
      <Notice status="works">
        These exports exist and are what the shell's own apps use today. The kit is version 0.0.0: the harvest of the
        shell's remaining components (List, NavigationStack, Toolbar and the rest) is a later stage, and until it lands
        the kit has no compatibility promise.
      </Notice>
      <Notice status="unfinished">
        Live demos of each component are not on this page yet. The plan is one demo file that powers both the in-OS
        Developer app and this site; the Developer app does not exist, so neither does the demo. Until then, the
        simulator shows the components in use inside the baked apps.
      </Notice>
      <h2 {...stylex.props(styles.h2)}>Exports</h2>
      <ul {...stylex.props(styles.list)}>
        {kit.map((e) => (
          <li key={e.name}>
            <Link to="/kit/$name" params={{ name: e.name }} {...stylex.props(styles.row)}>
              <span {...stylex.props(styles.name)}>{e.name}</span>
              <span {...stylex.props(styles.kind)}>{e.kind}</span>
              <span {...stylex.props(styles.summary)}>{e.doc.split('\n')[0]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 {...stylex.props(styles.h2)}>Tokens</h2>
      <p {...stylex.props(styles.p)}>
        Colours, type and easing live in{' '}
        <a href={blob('packages/uikit/tokens.stylex.ts')} {...stylex.props(styles.link)}>
          tokens.stylex.ts
        </a>{' '}
        as StyleX variables. Apps use them and never a literal; that rule is what lets a fix in the kit reach every app.
      </p>
      <p {...stylex.props(styles.p)}>
        The harvest plan, the rules every component must meet and the versioning policy:{' '}
        <Link to="/docs/$" params={{ _splat: 'platform/uikit' }} {...stylex.props(styles.link)}>
          UI kit plan
        </Link>
        .
      </p>
    </Prose>
  )
}

const styles = stylex.create({
  p: { fontSize: '17px', lineHeight: 1.6, marginTop: 0, marginBottom: '16px' },
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
  list: { listStyleType: 'none', margin: 0, padding: 0, marginBottom: '16px', display: 'grid', gap: '8px' },
  row: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: '12px',
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
    transitionProperty: 'border-color',
    transitionDuration: '0.2s'
  },
  name: { fontFamily: font.mono, fontSize: '15px', color: color.accent },
  kind: {
    fontFamily: font.mono,
    fontSize: '11px',
    color: color.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  },
  summary: { fontSize: '15px', lineHeight: 1.5, color: color.text2, flexBasis: '100%' },
  link: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: { default: 'none', ':hover': 'underline' }
  }
})
