// One app, laid out the way the App Store lays one out: the icon and the
// capsule over a row of facts, then the description beside the developer's
// links, an App Privacy card, and more from the same lane. Restore and Remove
// stay at the bottom, where the destructive actions live.

import type { Store } from '@doan-labs/duo-sdk/store.ts'
import { Placeholder, Section } from '@doan-labs/duo-uikit'
import { Page, useNav } from '@doan-labs/duo-uikit/nav.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useSyncExternalStore } from 'react'
import { Action, type External, Icon, Item, Notices, type Open, PERM_GLYPH, size, tagline, version } from './rows.tsx'
import { styles } from './styles.ts'

type PageArgs = {
  id: string
  store: Store
  open: Open
  openExternal: External
  wide?: boolean
  back: () => void
}

/** The pane runs under the sidebar, so a pushed page pads itself clear of it, as the root's scroller does. */
export function AppPage(props: PageArgs) {
  return (
    <div {...stylex.props(styles.pushed, props.wide && styles.paneSide)}>
      <Body {...props} />
    </div>
  )
}

function Body({ id, store, open, openExternal, wide, back }: PageArgs) {
  const state = useSyncExternalStore(store.subscribe, store.snapshot)
  const { push } = useNav()
  const row = state.rows.find((r) => r.id === id)
  if (!row)
    return (
      <Page title="App" back={back}>
        <Placeholder>This app is no longer listed.</Placeholder>
      </Page>
    )
  const repo = row.repo
  const share = repo && (
    <button
      type="button"
      aria-label="View source"
      {...stylex.props(styles.bare, styles.share, shared.press)}
      onClick={() => openExternal(repo)}
    >
      <Sym name="share" size={15} />
    </button>
  )
  const facts: [string, ReactNode, string?][] = [
    [
      'Version',
      version(row),
      row.installed && row.version !== row.installed ? `${row.version?.split('+')[0]} available` : 'Current'
    ],
    ['Size', size(row.bytes), 'Download'],
    ['Lane', row.lane === 'official' ? 'Official' : row.lane === 'community' ? 'Community' : 'Preview', row.author],
    ['Licence', 'MIT', 'Open source'],
    [
      'Access',
      row.permissions.length ? String(row.permissions.length) : <Sym key="lock" name="lock" size={16} />,
      row.permissions.length ? 'permissions' : 'Sandboxed'
    ]
  ]
  const notes = Notices(row)
  const also = state.rows.filter((r) => r.id !== row.id && r.lane === row.lane).slice(0, 4)
  return (
    <Page title={share ?? <span />} back={back}>
      <div data-store-app={row.id}>
        <div {...stylex.props(styles.pHead)}>
          <Icon row={row} xstyle={styles.pIcon} />
          <div {...stylex.props(styles.pInfo)}>
            <h1 {...stylex.props(styles.pName)}>{row.name}</h1>
            <div {...stylex.props(styles.pAuthor)}>{row.author}</div>
            <div {...stylex.props(styles.pActions)}>
              <Action row={row} store={store} open={open} />
            </div>
          </div>
        </div>
        {notes && <div {...stylex.props(styles.para, styles.stack)}>{notes}</div>}
        <div {...stylex.props(styles.facts)}>
          {facts.map(([k, v, s]) => (
            <div key={k} {...stylex.props(styles.fact)}>
              <span {...stylex.props(styles.factK)}>{k}</span>
              <span {...stylex.props(styles.factV)}>{v}</span>
              {s && <span {...stylex.props(styles.factS)}>{s}</span>}
            </div>
          ))}
        </div>
        {/* The compatibility line the Store can actually answer: one device, two displays. */}
        <div {...stylex.props(styles.compat)}>
          <Sym name="iphone" size={15} />
          iPhone Duo, inner and cover displays
          {!row.compatible && <span {...stylex.props(styles.alert)}>Needs a newer Duo</span>}
        </div>
        <div {...stylex.props(styles.about)}>
          <p {...stylex.props(styles.blurb)}>
            {tagline(row)}. Open source, MIT licensed.
            {row.development && ' Installed from your developer catalog.'}
          </p>
          <div {...stylex.props(styles.links)}>
            <span {...stylex.props(styles.linkName)}>{row.author}</span>
            {repo && (
              <button type="button" {...stylex.props(styles.bare, styles.linkRow)} onClick={() => openExternal(repo)}>
                Source
                <Sym name="info" size={16} />
              </button>
            )}
          </div>
        </div>
        {row.note && (
          <>
            <Head title="What's New" />
            <p {...stylex.props(styles.para)}>{row.note}</p>
          </>
        )}
        <Head title="App Privacy" />
        <div {...stylex.props(styles.privacy)}>
          <span {...stylex.props(styles.privacyGlyph)}>
            <Sym name="privacy" size={26} />
          </span>
          <div {...stylex.props(styles.privacyTitle)}>
            {row.permissions.length ? 'Device Access' : 'No Device Access'}
          </div>
          <p {...stylex.props(styles.privacyBody)}>
            {row.permissions.length
              ? 'This app asked for the following. Nothing leaves the device with it.'
              : 'This app runs in its own sandbox: no camera, microphone or embedded pages. Storage stays on this device.'}
          </p>
          {row.permissions.length > 0 && (
            <div {...stylex.props(styles.privacyGrid)}>
              {row.permissions.map((p) => (
                <span key={p} {...stylex.props(styles.privacyItem)}>
                  <Sym name={PERM_GLYPH[p] ?? 'lock'} size={15} />
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        {also.length > 0 && (
          <>
            <Head title="You Might Also Like" />
            <div {...stylex.props(styles.grid, styles.gridWide)}>
              {also.map((other) => (
                <Item
                  key={other.id}
                  row={other}
                  store={store}
                  open={open}
                  onShow={() =>
                    push((pop) => (
                      <AppPage
                        id={other.id}
                        store={store}
                        open={open}
                        openExternal={openExternal}
                        wide={wide}
                        back={pop}
                      />
                    ))
                  }
                />
              ))}
            </div>
          </>
        )}
        {row.installed && (row.recovery || !row.preinstalled) && (
          <Section xstyle={styles.card2}>
            {row.recovery && (
              <button
                type="button"
                {...stylex.props(shared.row, styles.link, styles.linkBlue)}
                onClick={() => {
                  void store.restore(row.id)
                }}
              >
                <Sym name="undo" size={16} />
                Restore previous version
              </button>
            )}
            {/* A preinstalled app reinstalls itself at the next start; removing it would undo itself. */}
            {!row.preinstalled && (
              <button
                type="button"
                {...stylex.props(shared.row, styles.remove)}
                onClick={() => {
                  void store.remove(row.id)
                  back()
                }}
              >
                <Sym name="trash" size={16} />
                Remove App
              </button>
            )}
          </Section>
        )}
        <p {...stylex.props(styles.footnote)}>
          {row.development
            ? "Local preview. Remove App clears this preview's private data."
            : 'Installed releases are checked against the catalog hash, which verifies the bytes and not the publisher.'}
          {row.recovery && ' Restore keeps newer edits aside; those edits may be missing in the previous version.'}
        </p>
        {/* The cover's tab bar floats over this page, so the last line scrolls clear of it. */}
        {!wide && <div {...stylex.props(styles.paneScroll)} />}
      </div>
    </Page>
  )
}

/** A section heading with the App Store's hairline above it. */
export const Head = ({
  title,
  blurb,
  action,
  first
}: {
  title: string
  blurb?: string
  action?: ReactNode
  first?: boolean
}) => (
  <div {...stylex.props(styles.head, first && styles.headFirst)}>
    <div {...stylex.props(styles.headText)}>
      <h2 {...stylex.props(styles.headTitle)}>{title}</h2>
      {blurb && <div {...stylex.props(styles.headBlurb)}>{blurb}</div>}
    </div>
    {action}
  </div>
)
