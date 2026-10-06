import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Fold } from '../fold'
import { DEVELOPERS, CATALOG as INDEX } from '../generated/catalog'
import { Button, Section } from '../layout'
import { CURVE } from '../motion'
import { Code, PageTop, Pre } from '../page-parts'
import { Anatomy } from '../publish/anatomy'
import { Journey } from '../publish/journey'
import { Readiness } from '../publish/readiness'
import { Starter } from '../publish/starter'
import { blob, CATALOG, SUBMIT } from '../site'
import { color, ease, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/publish')({
  head: () => ({ meta: [{ title: 'Submit your app · Duo' }] }),
  component: Page
})

const COMMUNITY = INDEX.filter((a) => a.lane === 'community')
/** Who already ships here, the most prolific first: the proof under the headline. */
const BUILDERS = [...Map.groupBy(COMMUNITY, (a) => a.developer ?? a.author)]
  .map(([handle, apps]) => ({ handle, count: apps.length, profile: DEVELOPERS[handle] }))
  .sort((a, b) => b.count - a.count)

/** The submission guide, on its own URL because the nav, the footer and the apps page point here. */
function Page() {
  return (
    <Section narrow>
      <PageTop
        eyebrow="Publish"
        title="Put your app in the Duo App Store"
        lead="Build it with the SDK, open a pull request, and once it is merged it installs on every Duo. Six steps, and the tools below fill in most of the paperwork."
      />
      <div {...stylex.props(styles.actions)}>
        <Button href={SUBMIT}>Submit with GitHub</Button>
        <Button to="/get-started" outline>
          Build your first app
        </Button>
      </div>
      <Link to="/apps" {...stylex.props(styles.proof)}>
        <span {...stylex.props(styles.faces)}>
          {BUILDERS.filter((b) => b.profile).map((b) => (
            <img
              key={b.handle}
              src={b.profile!.imageUrl}
              alt=""
              width={64}
              height={64}
              {...stylex.props(styles.face)}
            />
          ))}
        </span>
        <span>
          <strong {...stylex.props(styles.proofStrong)}>{COMMUNITY.length} community apps</strong> from{' '}
          {BUILDERS.length} developers are live already.
        </span>
      </Link>

      <ol {...stylex.props(styles.timeline)}>
        <Step n={1} title="Set up">
          <p {...stylex.props(styles.p)}>
            You need <Code>bun</Code> and a fork of the repository. The SDK, UI kit and CLI are not on npm yet, so you
            build against local archives. This creates a new app, wired up and ready to run:
          </p>
          <Pre lang="sh">{`bun install
bun scripts/package-platform.ts      # SDK, kit and CLI archives, once
bun packages/cli/index.mjs create my-app --packages .cache/platform-packages/artifacts.json
cd my-app && bun install && bun run dev`}</Pre>
          <p {...stylex.props(styles.p)}>
            First time?{' '}
            <Link to="/get-started" {...stylex.props(styles.link)}>
              Get started
            </Link>{' '}
            walks through the same commands with the simulator open beside them.
          </p>
        </Step>

        <Step n={2} title="Name it">
          <p {...stylex.props(styles.p)}>
            Type your app’s name and your GitHub login. You get the folder, the permanent app id, the manifest, and the
            two entries for <Code>community-apps/registry.json</Code>: your developer profile, shown on your tab on{' '}
            <Link to="/apps" {...stylex.props(styles.link)}>
              /apps
            </Link>
            , and the app, mapped to the accounts allowed to maintain it.
          </p>
          <Starter />
        </Step>

        <Step n={3} title="Fill the folder">
          <p {...stylex.props(styles.p)}>
            Put the app in <Code>community-apps/&lt;app-slug&gt;/</Code> in your fork. Click a file to see what it is
            for and who checks it.{' '}
            <a href={blob('community-apps/fold-compass')} {...stylex.props(styles.link)}>
              fold-compass
            </a>{' '}
            is a complete example to copy the shape from.
          </p>
          <Anatomy />
        </Step>

        <Step n={4} title="Check it">
          <p {...stylex.props(styles.p)}>
            Run the same gate CI runs. It builds the release exactly as the catalog will:
          </p>
          <Pre lang="sh">{'bun scripts/check-submissions.ts community-apps/<app-slug>'}</Pre>
          <p {...stylex.props(styles.p)}>The script cannot judge everything. Go through what reviewers will look at:</p>
          <Readiness />
        </Step>

        <Step n={5} title="Open the pull request">
          <p {...stylex.props(styles.p)}>
            Push your branch to your fork, then press <strong>Submit with GitHub</strong>. It opens a pull request
            against <Code>main</Code> with the <Code>app-submission</Code> template filled in: id, version, folder,
            dependencies, network origins, and the checklist you just went through.
          </p>
          <p {...stylex.props(styles.p)}>
            Attach both screenshots, the inner display and the cover. A submission without them cannot be reviewed.
          </p>
          <div {...stylex.props(styles.inline)}>
            <Button href={SUBMIT}>Submit with GitHub</Button>
          </div>
        </Step>

        <Step n={6} title="Go live">
          <p {...stylex.props(styles.p)}>Four stops between the pull request and the Store. Click through them:</p>
          <Journey />
          <p {...stylex.props(styles.p)}>
            To ship an update, bump <Code>version</Code>, add a changelog entry and open a new pull request. To pull an
            app, open an issue: delisting stops new installs, but it never uninstalls the app or deletes anyone’s data.
          </p>
        </Step>
      </ol>

      <div {...stylex.props(styles.alt)}>
        <p {...stylex.props(styles.altEyebrow)}>Prefer to ship it yourself?</p>
        <Fold head={<span {...stylex.props(styles.altHead)}>Host your own catalog</span>}>
          <p {...stylex.props(styles.p)}>
            The curated catalog is optional. Your app’s <Code>bun run build</Code> output in <Code>dist/</Code> is
            already a catalog with one app in it:
          </p>
          <ol {...stylex.props(styles.plain)}>
            <li {...stylex.props(styles.item)}>
              Put <Code>dist/</Code> on any static host that serves CORS headers and a short cache on{' '}
              <Code>index.json</Code>.
            </li>
            <li {...stylex.props(styles.item)}>
              Share the <Code>index.json</Code> URL. Anyone running Duo pastes it into the App Store’s Developer catalog
              field.
            </li>
            <li {...stylex.props(styles.item)}>
              For an update, upload the new release folder first, then the new <Code>index.json</Code>. Never edit a
              published release.
            </li>
          </ol>
          <p {...stylex.props(styles.p)}>
            <Link to="/docs/$" params={{ _splat: 'catalogs' }} {...stylex.props(styles.link)}>
              Catalogs
            </Link>{' '}
            has the format. The curated one lives at <Code>{CATALOG}</Code>.
          </p>
        </Fold>
      </div>
    </Section>
  )
}

/** One step on the vertical timeline: a mono number sitting on the rule, then the body. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const still = useReducedMotion()
  return (
    // One step behind the next, so the timeline reads as a sequence. On mount
    // rather than on scroll, for the reason spelled out on `Reveal`.
    <motion.li
      {...stylex.props(styles.step)}
      initial={{ opacity: 0, transform: 'translateY(16px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={still ? { duration: 0 } : { duration: 0.5, delay: (n - 1) * 0.06, ease: CURVE }}
    >
      <span {...stylex.props(styles.n)} aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
      <h2 {...stylex.props(styles.stepTitle)}>{title}</h2>
      {children}
    </motion.li>
  )
}

const styles = stylex.create({
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '22px' },
  proof: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '48px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '6px',
    paddingRight: '16px',
    borderRadius: radius.pill,
    backgroundColor: { default: color.well, ':hover': color.grayBg },
    fontFamily: font.sans,
    fontSize: '14px',
    color: color.text2,
    textDecorationLine: 'none',
    transitionProperty: 'background-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  faces: { display: 'inline-flex' },
  face: {
    width: '26px',
    height: '26px',
    borderRadius: radius.pill,
    marginLeft: '-8px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: color.well,
    ':first-child': { marginLeft: 0 }
  },
  proofStrong: { fontWeight: 600, color: color.text },
  timeline: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '8px',
    marginBottom: '48px',
    padding: 0,
    paddingLeft: '15px'
  },
  step: {
    position: 'relative',
    paddingLeft: { default: '40px', [SMALL]: '28px' },
    paddingBottom: '48px',
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
  inline: { marginTop: '4px' },
  alt: { marginTop: '8px' },
  altEyebrow: {
    marginTop: 0,
    marginBottom: '10px',
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  altHead: { fontFamily: font.display, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em' },
  plain: {
    margin: 0,
    marginBottom: '16px',
    paddingLeft: '20px',
    fontFamily: font.sans,
    fontSize: '17px',
    lineHeight: 1.6,
    color: color.text
  },
  item: { marginBottom: '8px' },
  link: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px',
    borderRadius: '4px',
    transitionProperty: 'color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  }
})
