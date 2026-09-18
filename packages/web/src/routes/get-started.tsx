import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Section } from '../layout'
import { Code, PageTop, Pre } from '../page-parts'
import { Simulator } from '../simulator'
import { blob, REPO } from '../site'
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
    <Section narrow>
      <PageTop
        eyebrow="Get started"
        title="Ten minutes to your app on a folding phone"
        lead="The simulator on your machine, a new app on its home screen, then installed from a catalog like any other. You need Bun and Python 3."
      />
      <ol {...stylex.props(styles.timeline)}>
        <Step n={1} title="Run the simulator">
          <Pre>{`git clone ${REPO}.git && cd duo
bun install
pip install usd-core && python3 scripts/prepare-model.py   # Apple's model, once
bun run dev                                                # http://localhost:3000`}</Pre>
          <p {...stylex.props(styles.p)}>
            Open <Code>?deg=0</Code> for the cover or <Code>?deg=180</Code> for the phone flat open. The slider on the
            right folds it live and hands the running app from one display to the other.
          </p>
          <Simulator deg={0} app="Notes" />
        </Step>
        <Step n={2} title="Create an app">
          <Pre>{`bun scripts/package-platform.ts          # local SDK, kit and CLI archives, once
bun packages/cli/index.mjs create my-app --packages .cache/platform-packages/artifacts.json
cd my-app && bun install`}</Pre>
          <p {...stylex.props(styles.p)}>
            A manifest, an entry with a navigation stack, an icon and a changelog. The folder can live anywhere. The
            name is kebab-case and at most twelve characters, so it fits on the cover.
          </p>
        </Step>
        <Step n={3} title="Run it on the phone">
          <Pre>{`bun run check   # import boundaries, strict TypeScript, the 4 MiB cap
bun run dev     # builds, watches, prints the link`}</Pre>
          <p {...stylex.props(styles.p)}>
            Open the printed <Code>?dev=</Code> link. Your app is on the inner home screen with a DEV badge, in the same
            sandbox an installed app gets. Edit <Code>main.tsx</Code>, save, reload the simulator.
          </p>
        </Step>
        <Step n={4} title="Install it">
          <Pre>{`bun run build                                        # dist/: index.json plus the release
bun packages/cli/index.mjs serve dist --port 5173    # from the repository root`}</Pre>
          <p {...stylex.props(styles.p)}>
            In App Store, paste <Code>http://localhost:5173/index.json</Code> into the Developer catalog field, then Get
            and Open. Verified, hashed, stored in the shell's own database, launched from there.
          </p>
        </Step>
      </ol>
      <div {...stylex.props(styles.next)}>
        <Next to="/docs/$" params={{ _splat: 'your-first-app' }} title="Your first app">
          What the generated project does, line by line.
        </Next>
        <Next to="/docs/$" params={{ _splat: 'displays' }} title="Displays and the fold">
          Two displays, one app, one owner.
        </Next>
        <Next to="/sdk" title="SDK reference">
          Every export, generated from the source.
        </Next>
        <Next href={blob('examples/fold-compass/main.tsx')} title="Fold Compass">
          A complete independent app in a hundred lines.
        </Next>
      </div>
    </Section>
  )
}

/** One step on the vertical timeline: a mono number sitting on the rule, then the body. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li {...stylex.props(styles.step)}>
      <span {...stylex.props(styles.n)} aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
      <h2 {...stylex.props(styles.stepTitle)}>{title}</h2>
      {children}
    </li>
  )
}

function Next({
  to,
  params,
  href,
  title,
  children
}: {
  to?: string
  params?: Record<string, string>
  href?: string
  title: string
  children: React.ReactNode
}) {
  const body = (
    <>
      <span {...stylex.props(styles.nextTitle)}>{title}</span>
      <span {...stylex.props(styles.nextText)}>{children}</span>
    </>
  )
  const s = stylex.props(styles.nextCard)
  return to ? (
    <Link to={to} params={params} {...s}>
      {body}
    </Link>
  ) : (
    <a href={href} {...s}>
      {body}
    </a>
  )
}

const styles = stylex.create({
  timeline: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '8px',
    marginBottom: '8px',
    padding: 0,
    paddingLeft: '15px'
  },
  step: {
    position: 'relative',
    paddingLeft: { default: '40px', [SMALL]: '28px' },
    paddingBottom: '40px',
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
  next: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr 1fr', [SMALL]: '1fr' },
    gap: '12px',
    marginTop: '24px'
  },
  nextCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingTop: '18px',
    paddingBottom: '18px',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.md,
    textDecoration: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '0.2s'
  },
  nextTitle: { fontFamily: font.sans, fontSize: '16px', fontWeight: 500, color: color.text },
  nextText: { fontFamily: font.sans, fontSize: '14px', lineHeight: 1.5, color: color.text2 }
})
