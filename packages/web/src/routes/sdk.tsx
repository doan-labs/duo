import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ApiCard } from '../api-card'
import { api, versions } from '../generated/api'
import { Prose } from '../layout'
import { Code, PageTop, Pre } from '../page-parts'
import { color, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/sdk')({
  head: () => ({ meta: [{ title: 'SDK · Duo' }] }),
  component: Page
})

// The host-only types the shell's own apps receive are not part of the app-facing SDK.
const sdk = api.filter((e) => e.pkg === '@doan-labs/ipduo-sdk' && !e.file.endsWith('/legacy.ts'))

const GUIDES = [
  ['Lifecycle', 'Connect, render, ready. Requests, errors and limits.', 'lifecycle'],
  ['Displays and the fold', 'The view, two running copies, one owner, commands and widgets.', 'displays'],
  ['Storage', 'Two revisioned key-value spaces and the React hook over them.', 'storage'],
  ['Permissions', 'The permission table, network origins and what the sandbox denies.', 'permissions'],
  ['Manifest', 'Every field, and what a built release adds.', 'manifest']
] as const

function Page() {
  return (
    <div {...stylex.props(styles.wrap)}>
      <Prose>
        <PageTop
          eyebrow="Reference"
          title="SDK"
          lead={
            <>
              <Code>@doan-labs/ipduo-sdk</Code> is how an app talks to the phone: displays and the fold, storage,
              commands between its views, widgets and links. One client, <Code>os</Code>, and a React hook.
            </>
          }
        />
        <Pre title="app.ts">{`import { os } from '@doan-labs/ipduo-sdk'
await os.connect()                       // handshake with the shell, before rendering
os.ready()                               // first frame painted

os.view                                  // display, placement, width, height, angle…
os.onView((view) => ...)                 // the fold, live

await os.storage.set('lastTab', 'today') // durable when this resolves
const snap = await os.storage.snapshot() // { rev, entries }, then
os.storage.watch(snap.rev, (c) => ...)   // every change after it, in order

os.owner                                 // { epoch } in the view that runs effects
os.commands.send('refresh', '')          // resolves when the owner acknowledged
os.widget.set('small', { lines })        // owner only
os.open('labs.doan.ipduo.maps', 'q=1')

import { useKV } from '@doan-labs/ipduo-sdk/react'
const note = useKV(os.storage, 'note')   // { value, status, set, del }`}</Pre>

        <h2 {...stylex.props(styles.h2)}>Guides</h2>
        <ul {...stylex.props(styles.list)}>
          {GUIDES.map(([title, text, slug]) => (
            <li key={slug}>
              <Link to="/docs/$" params={{ _splat: slug }} {...stylex.props(styles.row)}>
                <span {...stylex.props(styles.rowTitle)}>{title}</span>
                <span {...stylex.props(styles.text)}>{text}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 {...stylex.props(styles.h2)}>Reference</h2>
        <p {...stylex.props(styles.p)}>
          Every export of the package, generated from the source and its TSDoc. Version{' '}
          <Code>{versions.sdk?.version}</Code>, protocol 1.
        </p>
        {sdk.map((e) => (
          <ApiCard key={e.name} entry={e} />
        ))}
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
  p: { fontSize: '17px', lineHeight: 1.6, marginTop: 0, marginBottom: '24px' },
  h2: {
    fontFamily: font.display,
    fontSize: { default: '28px', [SMALL]: '24px' },
    lineHeight: 1.15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    marginTop: '48px',
    marginBottom: '16px',
    color: color.text
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
  text: { fontSize: '15px', lineHeight: 1.5, color: color.text2 }
})
