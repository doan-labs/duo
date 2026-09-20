import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Button, Section } from '../layout'
import { CURVE } from '../motion'
import { Code, PageTop, Pre, SectionTop, Table, Td, Th, Tr } from '../page-parts'
import { blob, CATALOG, SUBMIT } from '../site'
import { color, ease, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/publish')({
  head: () => ({ meta: [{ title: 'Submit your app · Duo' }] }),
  component: Page
})

/** The submission guide, on its own URL because the nav, the footer and the apps page point here. */
function Page() {
  return (
    <Section narrow>
      <PageTop
        eyebrow="Publish"
        title="Submit your app to the Duo App Store"
        lead="Contributions are reviewed through GitHub pull requests."
      />
      <div {...stylex.props(styles.actions)}>
        <Button href={SUBMIT}>Submit with GitHub</Button>
        <Button to="/get-started" outline>
          Build your first app
        </Button>
      </div>
      <p {...stylex.props(styles.note)}>
        The button opens GitHub's compare view with the submission template selected - that is what{' '}
        <Code>?template=app-submission.md</Code> in the URL does. Push a branch with your app on it first; the compare
        view cannot create the source for you.
      </p>
      <ol {...stylex.props(styles.timeline)}>
        <Step n={1} title="Prepare your app">
          <p {...stylex.props(styles.p)}>
            You need Bun and a clone of the repository. The SDK, the UI kit and the CLI are not on npm, so a submission
            is built against local archives:
          </p>
          <Pre lang="sh">{`bun install
bun scripts/package-platform.ts          # local SDK, kit and CLI archives, once
bun packages/cli/index.mjs create my-app --packages .cache/platform-packages/artifacts.json
cd my-app && bun install
bun run check                            # import boundaries, strict TypeScript, the 4 MiB cap`}</Pre>
          <p {...stylex.props(styles.p)}>
            New to this?{' '}
            <Link to="/get-started" {...stylex.props(styles.link)}>
              Get started
            </Link>{' '}
            walks the same commands with the simulator running beside them.
          </p>
        </Step>
        <Step n={2} title="Check the requirements">
          <p {...stylex.props(styles.p)}>These are the rules for the first curated launch. All of them are checked.</p>
          <Table>
            <thead>
              <tr>
                <Th>Rule</Th>
                <Th>What it means</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td nowrap>Both displays</Td>
                <Td>Runs on the inner display and on the cover. Cover support is required, not optional.</Td>
              </Tr>
              <Tr>
                <Td nowrap>Public API only</Td>
                <Td>
                  Only exports of <Code>@doan-labs/duo-sdk</Code> and <Code>@doan-labs/duo-uikit</Code>. No shell
                  imports, no imports from another app.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>Complete metadata</Td>
                <Td>
                  A 1024 px <Code>icon.png</Code>, <Code>screenshots/inner.png</Code> and{' '}
                  <Code>screenshots/cover.png</Code>, a <Code>README.md</Code> and a <Code>CHANGELOG.md</Code>.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>Existing limits</Td>
                <Td>
                  The built document stays under the 4 MiB cap <Code>check</Code> enforces.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>Lane</Td>
                <Td>
                  <Code>"lane": "community"</Code> in the manifest.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>No permissions</Td>
                <Td>
                  <Code>permissions</Code> is empty. Apps that need a device permission are not eligible yet.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>Declared network</Td>
                <Td>
                  Every origin the app contacts is listed in <Code>network</Code>. Nothing else is reachable from the
                  sandbox.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>MIT licence</Td>
                <Td>
                  A <Code>LICENSE</Code> file with the MIT text in the app folder.
                </Td>
              </Tr>
            </tbody>
          </Table>
        </Step>
        <Step n={3} title="Add your source">
          <p {...stylex.props(styles.p)}>
            Community apps live as source in the repository. Fork it, clone your fork, and put the app in its own
            kebab-case folder under <Code>community-apps/</Code>:
          </p>
          <Pre>{`community-apps/<app-slug>/`}</Pre>
          <p {...stylex.props(styles.p)}>
            The folder name is for humans. The identity is the reverse-DNS <Code>id</Code> in the manifest, and it never
            changes once published.
          </p>
          <Table>
            <thead>
              <tr>
                <Th>File</Th>
                <Th>What it is</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td nowrap>manifest.json</Td>
                <Td>Identity, version, lane, permissions, declared network origins.</Td>
              </Tr>
              <Tr>
                <Td nowrap>main.tsx</Td>
                <Td>The entry, plus whatever other source files it imports.</Td>
              </Tr>
              <Tr>
                <Td nowrap>package.json</Td>
                <Td>
                  Dependencies. <Code>bun.lock</Code> as well, but only when you add something beyond the platform set:{' '}
                  <Code>@doan-labs/duo-sdk</Code>, <Code>@doan-labs/duo-uikit</Code>, <Code>@stylexjs/stylex</Code>,{' '}
                  <Code>react</Code>, <Code>react-dom</Code>.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>icon.png</Td>
                <Td>1024 px square.</Td>
              </Tr>
              <Tr>
                <Td nowrap>screenshots/</Td>
                <Td>
                  <Code>inner.png</Code> and <Code>cover.png</Code>, both required.
                </Td>
              </Tr>
              <Tr>
                <Td nowrap>README.md</Td>
                <Td>What the app does and how it behaves across the fold.</Td>
              </Tr>
              <Tr>
                <Td nowrap>CHANGELOG.md</Td>
                <Td>One entry per version, newest first.</Td>
              </Tr>
              <Tr>
                <Td nowrap>LICENSE</Td>
                <Td>MIT.</Td>
              </Tr>
            </tbody>
          </Table>
          <p {...stylex.props(styles.p)}>
            <a href={blob('community-apps/fold-compass')} {...stylex.props(styles.link)}>
              community-apps/fold-compass
            </a>{' '}
            is a complete example to copy the shape from.
          </p>
          <p {...stylex.props(styles.p)}>
            Then add your entry to{' '}
            <a href={blob('community-apps/registry.json')} {...stylex.props(styles.link)}>
              community-apps/registry.json
            </a>
            , which maps each app id to its folder and to the GitHub accounts allowed to maintain it. Changing an
            identity, transferring ownership or approving a release needs a review from those accounts. The{' '}
            <Code>author</Code> and <Code>repo</Code> strings in a manifest are labels, not proof of ownership.
          </p>
          <p {...stylex.props(styles.p)}>Run the same check CI runs, before you push:</p>
          <Pre lang="sh">{'bun scripts/check-submissions.ts community-apps/<app-slug>'}</Pre>
        </Step>
        <Step n={4} title="Open your PR">
          <p {...stylex.props(styles.p)}>
            Commit on a branch, push it to your fork, then open the pull request against <Code>main</Code> with the{' '}
            <Code>app-submission</Code> template. The template asks for the app id, the version, the folder, the
            registry entry, any dependency you added and why, the network origins you declared, and a confirmation that
            you ran the check.
          </p>
          <p {...stylex.props(styles.p)}>
            Attach both screenshots to the pull request body: the inner display and the cover. Reviewers read the
            manifest, the diff, the dependencies, the declared origins, and how the app behaves when the phone folds
            while it is open.
          </p>
        </Step>
        <Step n={5} title="After review">
          <p {...stylex.props(styles.p)}>A submission moves through three states, and they are not the same thing:</p>
          <Table>
            <thead>
              <tr>
                <Th>State</Th>
                <Th>What it means</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td nowrap>Checks passed</Td>
                <Td>Eligible for review. Not acceptance.</Td>
              </Tr>
              <Tr>
                <Td nowrap>Merged</Td>
                <Td>Accepted. The source is in the repository.</Td>
              </Tr>
              <Tr>
                <Td nowrap>Published</Td>
                <Td>
                  The publish workflow run succeeded and the release is in the curated catalog at <Code>{CATALOG}</Code>
                  . Only then is the app installable.
                </Td>
              </Tr>
            </tbody>
          </Table>
          <p {...stylex.props(styles.p)}>
            To ship an update, bump <Code>version</Code>, add a changelog entry, and open a new pull request. If a
            publish fails, the reason is in that workflow run. To have an app removed from the catalog, open an issue -
            delisting stops new installs; it does not uninstall the app from anyone's phone and does not delete their
            data.
          </p>
        </Step>
      </ol>
      <SectionTop
        eyebrow="Alternative"
        title="Host your own catalog"
        lead="You do not need the curated catalog to distribute an app. Nothing about this changes later."
      />
      <ol {...stylex.props(styles.plain)}>
        <li {...stylex.props(styles.item)}>
          <Code>bun run build</Code> in your app. <Code>dist/</Code> is a complete catalog with one app in it.
        </li>
        <li {...stylex.props(styles.item)}>
          Put <Code>dist/</Code> on any static host that serves the files with CORS and a short cache on{' '}
          <Code>index.json</Code>.
        </li>
        <li {...stylex.props(styles.item)}>
          Share the URL of <Code>index.json</Code>. Anyone running Duo pastes it into the App Store's Developer catalog
          field.
        </li>
      </ol>
      <p {...stylex.props(styles.p)}>
        Bump the version, upload the new release folder, then the new <Code>index.json</Code>; never edit a published
        release folder.{' '}
        <Link to="/docs/$" params={{ _splat: 'catalogs' }} {...stylex.props(styles.link)}>
          Catalogs
        </Link>{' '}
        has the format and what the store does with it.
      </p>
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
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' },
  note: {
    marginTop: 0,
    marginBottom: '40px',
    fontFamily: font.sans,
    fontSize: '15px',
    lineHeight: 1.6,
    color: color.text2
  },
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
