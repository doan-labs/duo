// App Store. The real catalog laid out like the App Store: a Today card for the
// featured release, then a carousel per lane whose columns of three rows page
// sideways, a detail page per app and the developer tools at the bottom. Every
// row and button here is what the store checks drive.

import { art } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { PREVIEW_FEATURES } from '@doan-labs/duo-sdk/preview-features.ts'
import type { Store, StoreRow } from '@doan-labs/duo-sdk/store.ts'
import { LargeTitle, Placeholder, Screen, Section, VStack } from '@doan-labs/duo-uikit'
import { Nav, Page, useNav } from '@doan-labs/duo-uikit/nav.tsx'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { styles } from './styles.ts'

/** Where app authors go to publish; opened outside the device, so the shell hands us the opener. */
const SUBMIT_URL = 'https://duo.doan-labs.com/publish'
type Open = Os['open']
type External = (url: string) => void

/** Permission labels come from the runtime; the glyph is ours. */
const PERM_GLYPH: Record<string, Parameters<typeof Sym>[0]['name']> = {
  Location: 'location',
  Photos: 'grid',
  'Read clipboard': 'note',
  'Write clipboard': 'compose'
}
const size = (bytes?: number) =>
  bytes === undefined
    ? '—'
    : bytes < 1e6
      ? `${Math.max(1, Math.round(bytes / 1e3))} KB`
      : `${(bytes / 1e6).toFixed(1)} MB`
const version = (row: StoreRow) => (row.installed ?? row.version)?.split('+')[0] ?? 'Unavailable'
const hasUpdate = (row: StoreRow) =>
  PREVIEW_FEATURES.stageUpdates && !!row.installed && !row.development && !!row.version && row.version !== row.installed
const needsRetry = (row: StoreRow) =>
  !!row.failed && (!row.version || row.version === row.failed || row.version === row.installed)

export function AppStore({ os, openExternal }: { os: Os; openExternal: External }) {
  return os.store ? (
    <Nav>
      <Shelf store={os.store} open={os.open} openExternal={openExternal} />
    </Nav>
  ) : (
    <Placeholder>Store unavailable</Placeholder>
  )
}

/** Rows per column of a carousel, as the App Store pages its lists. */
const PER_PAGE = 3
const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))
/** What a row says under its name: who made it, and what it reaches for. */
const tagline = (row: StoreRow) =>
  row.permissions.length ? `Uses ${row.permissions.join(', ').toLowerCase()}` : 'Sandboxed, no device access'

function Shelf({ store, open, openExternal }: { store: Store; open: Open; openExternal: External }) {
  const state = useSyncExternalStore(store.subscribe, store.snapshot)
  const { push } = useNav()
  // The box decides, not the display: a split half is as narrow as the cover. Wide
  // gets two carousel pages side by side and a hero with room for its icon.
  const head = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(head.current!)
    return () => ro.disconnect()
  }, [])
  const [tab, setTab] = useState('Apps')
  const [lane, setLane] = useState('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = state.rows.filter(
    (row) =>
      (row.name.toLowerCase().includes(q) || row.author.toLowerCase().includes(q)) &&
      (tab !== 'Updates' || (row.installed && (row.version !== row.installed || row.failed || row.candidate)))
  )
  const official = rows.filter((r) => r.lane === 'official')
  const community = rows.filter((r) => r.lane === 'community')
  const development = rows.filter((r) => r.lane === 'development')
  // One featured app a day, rotating through the compatible official releases.
  const day = Math.floor(Date.now() / 864e5)
  const pool = state.rows.filter((r) => r.lane === 'official' && r.compatible)
  const featured =
    !q && tab === 'Apps' && (lane === 'all' || lane === 'official') && pool.length ? pool[day % pool.length] : undefined
  const lanes = [
    { key: 'all', label: 'All', n: rows.length },
    { key: 'official', label: 'Official', n: official.length },
    { key: 'community', label: 'Community', n: community.length },
    ...(development.length ? [{ key: 'development', label: 'Local previews', n: development.length }] : [])
  ]
  const show = (row: StoreRow) =>
    push((back) => <Detail id={row.id} store={store} open={open} openExternal={openExternal} back={back} />)
  const tabs = PREVIEW_FEATURES.stageUpdates ? ['Apps', 'Updates'] : ['Apps']
  const group = (key: string, title: string, blurb: string, list: StoreRow[]) =>
    (lane === 'all' || lane === key) && (
      <Group title={title} blurb={blurb} rows={list} wide={wide} store={store} open={open} onShow={show} />
    )
  return (
    <VStack>
      <div ref={head} {...stylex.props(styles.top)}>
        <LargeTitle as="h1" xstyle={styles.title}>
          App Store
        </LargeTitle>
        <label {...stylex.props(styles.search)}>
          <Sym name="search" size={15} />
          <input
            aria-label="Search apps"
            placeholder="Apps, games and more"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            {...stylex.props(styles.searchInput)}
          />
        </label>
        <button
          type="button"
          aria-label="Refresh catalog"
          title={state.source}
          {...stylex.props(styles.iconBtn, state.developer && styles.iconBtnDev, shared.press)}
          onClick={() => {
            void store.refresh()
          }}
        >
          <Sym name="reload" size={15} />
        </button>
      </div>
      <Screen>
        <div {...stylex.props(styles.filters)}>
          {tabs.length > 1 && (
            <nav aria-label="Store sections" {...stylex.props(styles.seg)}>
              {tabs.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={name === tab}
                  onClick={() => setTab(name)}
                  {...stylex.props(styles.segBtn, name === tab && styles.segOn)}
                >
                  {name}
                </button>
              ))}
            </nav>
          )}
          <nav aria-label="Lane" {...stylex.props(styles.chips)}>
            {lanes.map((l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={lane === l.key}
                onClick={() => setLane(l.key)}
                {...stylex.props(styles.chip, lane === l.key && styles.chipOn, shared.press)}
              >
                {l.label}
                <span {...stylex.props(styles.chipN)}>{l.n}</span>
              </button>
            ))}
          </nav>
        </div>
        {state.error && (
          <div role="status" {...stylex.props(styles.banner)}>
            <Sym name="antenna" size={14} />
            Catalog offline. Showing the last available releases.
          </div>
        )}
        {state.developer && (
          <div role="status" {...stylex.props(styles.banner, styles.bannerDev)}>
            <Sym name="tabs" size={14} />
            Developer catalog: {new URL(state.source).host}
          </div>
        )}
        {state.loading && !state.rows.length ? (
          <div role="status" {...stylex.props(styles.center)}>
            <i {...stylex.props(styles.spinner, animations.spin)} />
            Loading catalog…
          </div>
        ) : (
          <>
            {featured && (
              <Featured row={featured} wide={wide} store={store} open={open} onShow={() => show(featured)} />
            )}
            {group('official', 'From Doan Labs', 'Official releases, built for both displays.', official)}
            {group('community', 'Community', 'Submitted as pull requests, reviewed and published.', community)}
            {group('development', 'Local previews', 'From your developer catalog.', development)}
            {!rows.length && (
              <Placeholder xstyle={[styles.center]}>No {tab === 'Updates' ? 'updates' : 'apps'} found.</Placeholder>
            )}
          </>
        )}
        <Developer store={store} openExternal={openExternal} source={state.source} developer={state.developer} />
      </Screen>
    </VStack>
  )
}

/** The Today card: the app's own icon, blurred, is the artwork; the icon itself floats over it. */
function Featured({
  row,
  wide,
  store,
  open,
  onShow
}: {
  row: StoreRow
  wide: boolean
  store: Store
  open: Open
  onShow: () => void
}) {
  return (
    <div {...stylex.props(styles.hero, styles.heroArt(art(row.name, 46)), shared.select)}>
      {row.icon && <img src={row.icon} alt="" aria-hidden="true" {...stylex.props(styles.heroBlur)} />}
      <div {...stylex.props(styles.heroShade)} />
      <button type="button" onClick={onShow} {...stylex.props(styles.bare, styles.heroTop, wide && styles.heroTopWide)}>
        <div {...stylex.props(styles.heroText)}>
          <div {...stylex.props(styles.kicker)}>{row.installed ? 'On your Duo' : 'Featured today'}</div>
          <div {...stylex.props(styles.heroName)}>{row.name}</div>
          <div {...stylex.props(styles.heroBlurb)}>
            {tagline(row)}. Open source, MIT licensed{row.note ? `. ${row.note}` : '.'}
          </div>
        </div>
        {wide && <Icon row={row} xstyle={styles.heroBig} />}
      </button>
      <div {...stylex.props(styles.heroBar)}>
        <Icon row={row} xstyle={styles.heroIcon} />
        <div {...stylex.props(styles.heroInfo)}>
          <div {...stylex.props(styles.heroTitle)}>{row.name}</div>
          <div {...stylex.props(styles.heroSub)}>
            {row.author} · {size(row.bytes)}
          </div>
        </div>
        <Action row={row} store={store} open={open} light />
      </div>
    </div>
  )
}

/** A lane: heading, then columns of three rows that page sideways, as the App Store lists do. */
function Group({
  title,
  blurb,
  rows,
  wide,
  store,
  open,
  onShow
}: {
  title: string
  blurb: string
  rows: StoreRow[]
  wide: boolean
  store: Store
  open: Open
  onShow: (row: StoreRow) => void
}) {
  if (!rows.length) return null
  return (
    <section aria-label={title} {...stylex.props(styles.group)}>
      <div {...stylex.props(styles.h)}>
        <div>
          <div {...stylex.props(styles.hTitle)}>{title}</div>
          <div {...stylex.props(styles.hBlurb)}>{blurb}</div>
        </div>
        <span {...stylex.props(styles.hCount)}>
          {rows.length} {rows.length === 1 ? 'app' : 'apps'}
        </span>
      </div>
      <div {...stylex.props(styles.rail)}>
        {chunk(rows, PER_PAGE).map((page, i) => (
          <div key={page[0]!.id} {...stylex.props(styles.page, wide && styles.pageWide, i === 0 && styles.pageFirst)}>
            {page.map((row) => (
              <Item key={row.id} row={row} store={store} open={open} onShow={() => onShow(row)} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function Item({ row, store, open, onShow }: { row: StoreRow; store: Store; open: Open; onShow: () => void }) {
  const notes = Notices(row, store)
  return (
    <div data-store-app={row.id} {...stylex.props(styles.item)}>
      <div {...stylex.props(styles.itemRow)}>
        <button
          type="button"
          onClick={onShow}
          aria-label={`${row.name} details`}
          {...stylex.props(styles.bare, shared.press)}
        >
          <Icon row={row} />
        </button>
        <button type="button" onClick={onShow} {...stylex.props(styles.info, styles.bare)}>
          <span {...stylex.props(styles.name)}>{row.name}</span>
          <span {...stylex.props(styles.sub)}>
            {row.author} · {version(row)}
          </span>
          <span {...stylex.props(styles.perms)}>
            {row.development ? (
              <span {...stylex.props(styles.tag, styles.tagDev)}>DEV</span>
            ) : (
              row.lane === 'community' && <span {...stylex.props(styles.tag)}>Community</span>
            )}
            {row.permissions.map((p) => (
              <span key={p} title={p} {...stylex.props(styles.tag)}>
                <Sym name={PERM_GLYPH[p] ?? 'lock'} size={10} />
                {p}
              </span>
            ))}
            {!row.permissions.length && !row.development && (
              <span {...stylex.props(styles.tag)}>
                <Sym name="lock" size={10} />
                Sandboxed
              </span>
            )}
          </span>
        </button>
        <Action row={row} store={store} open={open} />
      </div>
      {notes && <div {...stylex.props(styles.itemTail)}>{notes}</div>}
    </div>
  )
}

/** Error, staged update and recovery notices; the checks look for these buttons next to the row. */
function Notices(row: StoreRow, store: Store): ReactNode {
  const parts: ReactNode[] = []
  if (row.error)
    parts.push(
      <span key="e" role="alert" {...stylex.props(styles.alert)}>
        {row.error}
      </span>
    )
  if (row.candidate && !row.development)
    parts.push(
      <span key="c" {...stylex.props(styles.note)}>
        Updates when {row.name} closes
      </span>
    )
  if (row.recovery)
    parts.push(
      <button
        key="r"
        type="button"
        {...stylex.props(styles.plain)}
        onClick={() => {
          void store.restore(row.id)
        }}
      >
        Restore previous version
      </button>
    )
  return parts.length ? parts : null
}

/** GET, OPEN, UPDATE, Retry update, a download ring or a reload prompt, whatever the row is in. */
function Action({ row, store, open, light }: { row: StoreRow; store: Store; open: Open; light?: boolean }) {
  const pill = (label: string, onClick: () => void, filled = false) => (
    <button
      type="button"
      onClick={onClick}
      {...stylex.props(styles.pill, filled && styles.pillFilled, light && !filled && styles.pillLight)}
    >
      {label}
    </button>
  )
  if (!row.compatible)
    return (
      <div {...stylex.props(styles.action)}>
        {pill('Reload platform', () => location.reload())}
        <span {...stylex.props(styles.pct)}>Needs a newer Duo</span>
      </div>
    )
  if (row.progress !== undefined)
    return (
      <div {...stylex.props(styles.action)}>
        <div
          role="progressbar"
          aria-label={`Downloading ${row.name}`}
          aria-valuenow={Math.round(row.progress * 100)}
          {...stylex.props(styles.ring(row.progress))}
        >
          <i {...stylex.props(styles.ringHole)} />
          <i {...stylex.props(styles.ringStop)} />
        </div>
        <span {...stylex.props(styles.pct)}>{Math.round(row.progress * 100)}%</span>
      </div>
    )
  if (!row.installed)
    return (
      <div {...stylex.props(styles.action)}>
        {pill('GET', () => {
          void store.install(row.id)
        })}
        <span {...stylex.props(styles.pct)}>{size(row.bytes)}</span>
      </div>
    )
  if (PREVIEW_FEATURES.stageUpdates && !row.development && needsRetry(row))
    return (
      <div {...stylex.props(styles.action)}>
        {pill('Retry update', () => {
          void store.retry(row.id)
        })}
      </div>
    )
  if (hasUpdate(row) && !row.candidate)
    return (
      <div {...stylex.props(styles.action)}>
        {pill(
          'UPDATE',
          () => {
            void store.install(row.id)
          },
          true
        )}
        <span {...stylex.props(styles.pct)}>{row.version?.split('+')[0]}</span>
      </div>
    )
  return <div {...stylex.props(styles.action)}>{pill('OPEN', () => open(row.id))}</div>
}

function Icon({ row, xstyle }: { row: StoreRow; xstyle?: stylex.StyleXStyles }) {
  return row.icon ? (
    <img src={row.icon} alt="" {...stylex.props(styles.icon, xstyle)} />
  ) : (
    <span aria-hidden="true" {...stylex.props(styles.icon, styles.iconArt(art(row.name)), xstyle)}>
      {row.name[0]}
    </span>
  )
}

function Detail({
  id,
  store,
  open,
  openExternal,
  back
}: {
  id: string
  store: Store
  open: Open
  openExternal: External
  back: () => void
}) {
  const state = useSyncExternalStore(store.subscribe, store.snapshot)
  const row = state.rows.find((r) => r.id === id)
  if (!row)
    return (
      <Page title="App" back={back}>
        <Placeholder>This app is no longer listed.</Placeholder>
      </Page>
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
  const notes = Notices(row, store)
  return (
    <Page title={row.name} back={back}>
      <div data-store-app={row.id}>
        <div {...stylex.props(styles.dHead)}>
          <Icon row={row} xstyle={styles.dIcon} />
          <div {...stylex.props(styles.dInfo)}>
            <div {...stylex.props(styles.dName)}>{row.name}</div>
            <div {...stylex.props(styles.dAuthor)}>{row.author}</div>
            <div {...stylex.props(styles.dActions)}>
              <Action row={row} store={store} open={open} />
              {row.repo && (
                <button
                  type="button"
                  aria-label="View source"
                  {...stylex.props(styles.iconBtn, shared.press)}
                  onClick={() => openExternal(row.repo!)}
                >
                  <Sym name="share" size={15} />
                </button>
              )}
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
        {row.note && (
          <>
            <div {...stylex.props(styles.h, styles.hTitle)}>What’s new</div>
            <p {...stylex.props(styles.para)}>{row.note}</p>
          </>
        )}
        <div {...stylex.props(styles.h, styles.hTitle)}>Privacy</div>
        <Section>
          {row.permissions.length ? (
            row.permissions.map((p) => (
              <div key={p} {...stylex.props(shared.row)}>
                <span {...stylex.props(styles.permGlyph)}>
                  <Sym name={PERM_GLYPH[p] ?? 'lock'} size={16} />
                </span>
                <span {...stylex.props(styles.permText)}>{p}</span>
              </div>
            ))
          ) : (
            <div {...stylex.props(shared.row)}>
              <span {...stylex.props(styles.permGlyph)}>
                <Sym name="lock" size={16} />
              </span>
              <span {...stylex.props(styles.permText)}>No device access</span>
            </div>
          )}
        </Section>
        <p {...stylex.props(styles.footnote)}>
          {row.development
            ? 'Local preview. Remove App clears this preview’s private data.'
            : 'Runs in its own sandbox: no camera, microphone or embedded pages. Storage stays on this device.'}
          {row.recovery && ' Restore keeps newer edits aside; those edits may be missing in the previous version.'}
        </p>
        {row.installed && (
          <Section>
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
          </Section>
        )}
      </div>
    </Page>
  )
}

function Developer({
  store,
  openExternal,
  source,
  developer
}: {
  store: Store
  openExternal: External
  source: string
  developer: boolean
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  return (
    <>
      <div {...stylex.props(styles.h, styles.hTitle)}>For developers</div>
      <Section aria-labelledby="for-developers" xstyle={styles.card}>
        <button
          type="button"
          data-store-submit
          {...stylex.props(shared.row, styles.link)}
          onClick={() => openExternal(SUBMIT_URL)}
        >
          <span {...stylex.props(styles.permGlyph, styles.glyphGreen)}>
            <Sym name="plus" size={16} />
          </span>
          <span id="for-developers" {...stylex.props(styles.permText)}>
            Submit your app
          </span>
          <span {...stylex.props(shared.rowR)}>›</span>
        </button>
        <form
          {...stylex.props(shared.row, styles.form)}
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            void store.loadCatalog(url).catch((e) => setError(String(e.message)))
          }}
        >
          <span {...stylex.props(styles.permText)}>Developer catalog</span>
          <label {...stylex.props(styles.field)}>
            <Sym name="tabs" size={14} />
            <input
              aria-label="Developer catalog URL"
              type="url"
              placeholder="http://localhost:5173/index.json"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              {...stylex.props(styles.searchInput)}
            />
          </label>
          <div {...stylex.props(styles.dActions, styles.noTop)}>
            <button type="submit" {...stylex.props(styles.pill, styles.pillFilled)}>
              Load catalog
            </button>
            {developer && (
              <button
                type="button"
                {...stylex.props(styles.pill)}
                onClick={() => {
                  void store.resetCatalog()
                }}
              >
                Back to Duo catalog
              </button>
            )}
          </div>
          {error && (
            <span role="alert" {...stylex.props(styles.alert)}>
              {error}
            </span>
          )}
        </form>
      </Section>
      <p {...stylex.props(styles.footnote)}>
        Catalog: {source}. Install a separately built app. Catalog hashes check downloads; they do not verify the
        publisher.
      </p>
    </>
  )
}
