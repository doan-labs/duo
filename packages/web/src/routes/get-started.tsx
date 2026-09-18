import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Section } from '../layout'
import { Code, PageTop, Pre, SectionTop } from '../page-parts'
import { Simulator } from '../simulator'
import { blob, REPO } from '../site'
import { Notice } from '../status'
import { color, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/get-started')({
  head: () => ({ meta: [{ title: 'Get started · Duo' }] }),
  component: Page
})

function Page() {
  return (
    <>
      <Section narrow>
        <PageTop
          eyebrow="Get started · Works today"
          title="Five minutes to a folding phone on your desk"
          lead="The simulator running on your machine with an app of yours on its home screen. Today that app is a baked one inside the repository; the SDK path is below, labelled for what it is."
        />
        <Notice status="works">
          Everything in this first part is how the repository works right now. The commands are the ones in its README
          and are run by its own checks.
        </Notice>
        <ol {...stylex.props(styles.timeline)}>
          <Step n={1} title="Run the shell">
            <Pre>{`git clone ${REPO}.git && cd iphoneduo
bun install
pip install usd-core && python3 scripts/prepare-model.py   # fetches Apple's model into public/model, once
bun run dev                                                # http://localhost:3000`}</Pre>
            <p {...stylex.props(styles.p)}>
              Bun is the runtime, bundler and dev server. The model is not redistributable, so every clone fetches it
              once.
            </p>
          </Step>
          <Step n={2} title="Put the device in a known pose">
            <p {...stylex.props(styles.p)}>
              Open <Code>http://localhost:3000/?app=Notes&deg=0</Code> for Notes on the cover, or{' '}
              <Code>?app=Notes&deg=180</Code> for Notes unfolded. The hinge slider on the right folds it live and hands
              the app from one display to the other.
            </p>
            <Simulator deg={0} app="Notes" />
          </Step>
          <Step n={3} title="Add an app the way the shell's own apps are added">
            <p {...stylex.props(styles.p)}>
              Each baked app is a workspace under <Code>packages/apps/</Code> that exports a React component taking{' '}
              <Code>{'{ os }'}</Code>, registered in the shell's app list. The walkthrough is in the repository's
              working notes:{' '}
              <Link to="/docs/$" params={{ _splat: 'working' }} {...stylex.props(styles.link)}>
                working.md
              </Link>
              , and the registry is{' '}
              <a href={blob('packages/shell/apps.ts')} {...stylex.props(styles.link)}>
                packages/shell/apps.ts
              </a>
              . Style with StyleX and the kit's tokens; the shell's conventions are in{' '}
              <a href={blob('AGENTS.md')} {...stylex.props(styles.link)}>
                AGENTS.md
              </a>
              .
            </p>
          </Step>
        </ol>
      </Section>

      <Section alt narrow>
        <SectionTop eyebrow="Not built yet" title="The SDK path" />
        <Notice status="unfinished">
          None of this exists yet. The CLI package is an empty scaffold, the shell does not read <Code>?dev=</Code>, and
          the SDK exports only transitional types. This is the accepted plan from the stage 2 contract, shown so you
          know what is coming, not something to type today.
        </Notice>
        <ol {...stylex.props(styles.timeline)}>
          <Step n={1} title="Create">
            <p {...stylex.props(styles.p)}>
              <Code>npx @doan-labs/ipduo create my-app</Code> writes a manifest, an icon placeholder and an entry with a
              list inside a navigation stack.
            </p>
          </Step>
          <Step n={2} title="Build and serve">
            <p {...stylex.props(styles.p)}>
              <Code>npx @doan-labs/ipduo dev</Code> builds a single self-contained <Code>app.html</Code> with the same
              builder CI uses and serves it locally.
            </p>
          </Step>
          <Step n={3} title="Open it in the simulator">
            <p {...stylex.props(styles.p)}>
              Opening the hosted simulator with <Code>?dev=http://localhost:5173</Code> puts your app on the inner home
              screen with a DEV badge, in the same sandbox an installed app gets.
            </p>
          </Step>
        </ol>
        <p {...stylex.props(styles.p)}>
          The contract behind it, with the manifest fields, the bridge handshake and the acceptance checks:{' '}
          <Link to="/docs/$" params={{ _splat: 'platform/progress/contract' }} {...stylex.props(styles.link)}>
            Stage 2 runtime contract
          </Link>{' '}
          and the shorter{' '}
          <Link to="/docs/$" params={{ _splat: 'platform/dev' }} {...stylex.props(styles.link)}>
            Developing an app
          </Link>
          .
        </p>
      </Section>
    </>
  )
}

/** One step on the vertical timeline: a mono number sitting on the rule, then the body. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li {...stylex.props(styles.step)}>
      <span {...stylex.props(styles.n)} aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
      <h3 {...stylex.props(styles.stepTitle)}>{title}</h3>
      {children}
    </li>
  )
}

const styles = stylex.create({
  timeline: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '40px',
    marginBottom: '8px',
    padding: 0,
    paddingLeft: '15px'
  },
  step: {
    position: 'relative',
    paddingLeft: { default: '40px', [SMALL]: '28px' },
    paddingBottom: '36px',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderLeftColor: color.border
  },
  n: {
    position: 'absolute',
    left: '-16px',
    top: '-2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.04em',
    color: color.accent
  },
  stepTitle: {
    margin: 0,
    marginBottom: '12px',
    fontFamily: font.display,
    fontSize: { default: '24px', [SMALL]: '21px' },
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    color: color.text
  },
  p: {
    fontFamily: font.sans,
    fontSize: '17px',
    lineHeight: 1.6,
    color: color.text,
    marginTop: 0,
    marginBottom: '16px'
  },
  link: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: { default: 'none', ':hover': 'underline' }
  }
})
