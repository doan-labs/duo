import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { versions } from '../generated/api'
import { kit } from '../kit/data'
import { Prose } from '../layout'
import { Code, PageTop, Pre } from '../page-parts'
import { blob } from '../site'
import { color, font, radius } from '../tokens.stylex'

export const Route = createFileRoute('/kit/docs/')({
  head: () => ({ meta: [{ title: 'UI kit reference · Duo' }] }),
  component: Index
})

// Components first, then hooks; types close the list.
const KIND_ORDER = ['component', 'hook', 'function', 'value', 'class', 'type']
const listed = [...kit].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))

function Index() {
  return (
    <Prose>
      <PageTop
        eyebrow="Reference"
        title="UI kit"
        lead={
          <>
            <Code>@doan-labs/duo-uikit</Code>: the components and tokens every app on the phone is built from. They
            already know about the cover and the inner display, so a screen that reads at 387 points grows into the room
            it gets unfolded.
          </>
        }
      />
      <Pre>{`import {
  Button, Row, Screen, Section, Text, Title, useDisplay
} from '@doan-labs/duo-uikit'

function App() {
  const view = useDisplay()
  return (
    <Screen>
      <Title>Field guide</Title>
      <Section>
        <Row label="Display" detail={view.display} />
        <Row label="Fold" detail={<Text value={view.angle} suffix="°" />} />
        <Row><Button onClick={save}>Continue</Button></Row>
      </Section>
    </Screen>
  )
}`}</Pre>
      <p {...stylex.props(styles.p)}>
        Version <Code>{versions.uikit?.version}</Code>. Apps bundle the kit they compile against, so a new version never
        changes whether a host can run an installed app. Components accept native attributes, <Code>as</Code> for the
        element, <Code>animate</Code> for the CSS-only presets and <Code>xstyle</Code> for compiled StyleX extensions,
        and refuse raw <Code>style</Code> and <Code>className</Code>. The{' '}
        <Link to="/kit" {...stylex.props(styles.link)}>
          showcase
        </Link>{' '}
        runs every component live, and the{' '}
        <a href={blob('examples/developer/main.tsx')} {...stylex.props(styles.link)}>
          Developer gallery
        </a>{' '}
        is an installable app that renders every export at both display widths.
      </p>
      <h2 {...stylex.props(styles.h2)}>Exports</h2>
      <ul {...stylex.props(styles.list)}>
        {listed.map((e) => (
          <li key={e.name}>
            <Link to="/kit/docs/$name" params={{ name: e.name }} {...stylex.props(styles.row)}>
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
        as StyleX variables. Use them and never a literal: the two displays have different densities, the shell tunes
        the palette for both, and that rule is what lets a fix in the kit reach every app.
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
