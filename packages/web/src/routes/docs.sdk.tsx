import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ApiCard } from '../api-card'
import { api, versions } from '../generated/api'
import { Prose } from '../layout'
import { Code, PageTop, Pre, Reveal } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/docs/sdk')({
  head: () => ({ meta: [{ title: 'SDK · Duo' }] }),
  component: Page
})

// The host-only types the shell's own apps receive are not part of the app-facing SDK.
const sdk = api.filter((e) => e.pkg === '@doan-labs/duo-sdk' && !e.file.endsWith('/legacy.ts'))

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
              <Code>@doan-labs/duo-sdk</Code> is how an app talks to the phone: displays and the fold, storage, commands
              between its views, widgets and links. One client, <Code>os</Code>, and a React hook.
            </>
          }
        />
        <Pre title="app.ts">{`import { os } from '@doan-labs/duo-sdk'
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

import { useKV } from '@doan-labs/duo-sdk/react'
const note = useKV(os.storage, 'note')   // { value, status, set, del }`}</Pre>

        <Reveal>
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
        </Reveal>

        <Reveal>
          <h2 {...stylex.props(styles.h2)}>Reference</h2>
          <p {...stylex.props(styles.p)}>
            Every export of the package, generated from the source and its TSDoc. Version{' '}
            <Code>{versions.sdk?.version}</Code>, protocol 1.
          </p>
          {/* Every card is an anchor already; this is the way back up to them from the middle of the page. */}
          <nav aria-label="Exports" {...stylex.props(styles.jump)}>
            {sdk.map((e) => (
              <a key={e.name} href={`#${e.name}`} {...stylex.props(styles.chip)}>
                {e.name}
              </a>
            ))}
          </nav>
        </Reveal>
        {sdk.map((e) => (
          <ApiCard key={e.name} entry={e} />
        ))}
      </Prose>
    </div>
  )
}

const styles = stylex.create({
  wrap: { maxWidth: '860px' },
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
    willChange: 'transform',
    transitionProperty: 'border-color, transform, box-shadow, outline-color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-2px)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  rowTitle: { fontSize: '17px', fontWeight: 500, color: color.text },
  text: { fontSize: '15px', lineHeight: 1.5, color: color.text2 },
  jump: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px', marginBottom: '44px' },
  chip: {
    fontFamily: font.mono,
    fontSize: '12.5px',
    lineHeight: 1,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '11px',
    paddingRight: '11px',
    borderRadius: radius.pill,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.accent },
    backgroundColor: { default: color.well, ':hover': color.accentSoft },
    color: { default: color.text2, ':hover': color.accent },
    textDecoration: 'none',
    transitionProperty: 'background-color, border-color, color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  }
})
