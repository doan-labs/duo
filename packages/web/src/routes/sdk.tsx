import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ApiCard } from '../api-card'
import { api } from '../generated/api'
import { Prose } from '../layout'
import { Code, PageTop, Pre } from '../page-parts'
import { Badge, Notice } from '../status'
import { color, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/sdk')({
  head: () => ({ meta: [{ title: 'SDK · Duo' }] }),
  component: Page
})

const sdk = api.filter((e) => e.pkg === '@doan-labs/ipduo-sdk')

const CONTRACT = [
  [
    'Manifest and compatibility',
    'What identifies an app, what a release is, how a host decides it can run one.',
    '1-manifest-and-compatibility'
  ],
  [
    'Sandbox and bridge',
    'The iframe, the nonce handshake, request and event shapes, errors, limits and teardown.',
    '2-sandbox-and-bridge'
  ],
  [
    'App session and displays',
    'What survives a fold, how two views of one app share state, who owns timers and network.',
    '3-app-session-and-displays'
  ],
  [
    'Storage and release lifecycle',
    'Per-app data, offline bundles, install integrity, updates, recovery and uninstall.',
    '4-storage-and-release-lifecycle'
  ],
  ['Permissions', 'Browser features and host services declared in the manifest; review is the grant.', '6-permissions']
] as const

function Page() {
  return (
    <div {...stylex.props(styles.wrap)}>
      <Prose>
        <PageTop
          eyebrow="SDK · Two things, one name"
          title="SDK"
          lead={
            <>
              <Code>@doan-labs/ipduo-sdk</Code> owns the host API, the bridge protocol and the manifest contract for
              every downloadable app. Two things share the name today, and the badges keep them apart.
            </>
          }
        />

        <h2 {...stylex.props(styles.h2)}>
          What the package exports now <Badge status="legacy" />
        </h2>
        <Notice status="legacy">
          Version 0.0.0 exports the host types baked apps receive as a React prop. They are not the sandbox bridge and
          no downloadable app will ever see them. Generated from the source's TSDoc.
        </Notice>
        {sdk.map((e) => (
          <ApiCard key={e.name} entry={e} />
        ))}

        <h2 {...stylex.props(styles.h2)}>
          The runtime contract <Badge status="proposed" />
        </h2>
        <Notice status="proposed">
          Revision 2 of the stage 2 contract is the accepted design and is being implemented now. Names, shapes and
          limits below can still move while the acceptance checks run; the document is the source, this page only points
          into it.
        </Notice>
        <ul {...stylex.props(styles.list)}>
          {CONTRACT.map(([title, text, hash]) => (
            <li key={hash}>
              <Link
                to="/docs/$"
                params={{ _splat: 'platform/progress/contract' }}
                hash={hash}
                {...stylex.props(styles.row)}
              >
                <span {...stylex.props(styles.rowTitle)}>{title}</span>
                <span {...stylex.props(styles.text)}>{text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h3 {...stylex.props(styles.h3)}>The shape of an app, as proposed</h3>
        <Pre>{`import { os } from '@doan-labs/ipduo-sdk'          // proposed, not published
await os.connect()                                   // hello(nonce) → welcome → ack, before rendering
os.ready()                                           // first frame painted; the kit's <Screen> calls it
const { rev } = await os.storage.set('lastTab', 'today')   // durable when the ack arrives
os.view                                              // { display, placement, width, height, visible, active, focused, angle }
os.owner                                             // { epoch } while this view is the designated owner, else null`}</Pre>
        <p {...stylex.props(styles.p)}>
          Shorter reads on the same subject:{' '}
          <Link to="/docs/$" params={{ _splat: 'platform/manifest' }} {...stylex.props(styles.link)}>
            Manifest
          </Link>
          ,{' '}
          <Link to="/docs/$" params={{ _splat: 'platform/runtime' }} {...stylex.props(styles.link)}>
            Runtime
          </Link>
          ,{' '}
          <Link to="/docs/$" params={{ _splat: 'platform/security' }} {...stylex.props(styles.link)}>
            Security
          </Link>
          .
        </p>
      </Prose>
    </div>
  )
}

const styles = stylex.create({
  wrap: {
    maxWidth: '980px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: { default: '56px', [SMALL]: '40px' },
    paddingBottom: '96px',
    paddingLeft: '22px',
    paddingRight: '22px'
  },
  p: { fontSize: '17px', lineHeight: 1.6, marginTop: 0, marginBottom: '16px' },
  h2: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    fontFamily: font.display,
    fontSize: { default: '28px', [SMALL]: '24px' },
    lineHeight: 1.15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    marginTop: '48px',
    marginBottom: '8px',
    color: color.text
  },
  h3: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3,
    marginTop: '32px',
    marginBottom: '10px'
  },
  list: { listStyleType: 'none', margin: 0, padding: 0, marginBottom: '16px', display: 'grid', gap: '8px' },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
  rowTitle: { fontSize: '17px', fontWeight: 500, color: color.text },
  text: { fontSize: '15px', lineHeight: 1.5, color: color.text2 },
  link: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: { default: 'none', ':hover': 'underline' }
  }
})
