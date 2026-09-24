// App Store. The App Store's own shape on the Duo: a sidebar of sections beside
// a scrolling pane on a wide box, a tab bar under it on the cover. Discover
// leads with the release of the day and gives every other one an editorial
// card; the remaining sections are the catalog they name. The app page is
// pushed inside the pane, so the sidebar stays where it is, as it does on a Mac.

import type { Os } from '@doan-labs/duo-sdk'
import { PREVIEW_FEATURES } from '@doan-labs/duo-sdk/preview-features.ts'
import type { Store, StoreRow } from '@doan-labs/duo-sdk/store.ts'
import { LargeTitle, Placeholder, Screen, Section, useWide } from '@doan-labs/duo-uikit'
import { Nav, useNav } from '@doan-labs/duo-uikit/nav.tsx'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AppPage, Head } from './app-page.tsx'
import { Action, type External, Icon, Item, kicker, type Open, size, tagline } from './rows.tsx'
import { styles } from './styles.ts'

/** Where app authors go to publish; opened outside the device, so the shell hands us the opener. */
const SUBMIT_URL = 'https://duo.doan-labs.com/publish'
/** Doan Labs' mark: the repo's own icon, `public/icon.svg`. */
const LOGO = '/icon.svg'
/** Sections the cover cannot offer: its tab bar has no room, so Apps shows every lane there. */
const LANES = new Set(['official', 'community', 'development'])

export function AppStore({ os, openExternal }: { os: Os; openExternal: External }) {
  return os.store ? (
    <Shelf store={os.store} open={os.open} openExternal={openExternal} arg={os.arg} />
  ) : (
    <Placeholder>Store unavailable</Placeholder>
  )
}

type Lane = { key: string; label: string; glyph: SymProps['name']; n?: number }

function Shelf({ store, open, openExternal, arg }: { store: Store; open: Open; openExternal: External; arg?: string }) {
  const state = useSyncExternalStore(store.subscribe, store.snapshot)
  // The box decides, not the display: a split half is as narrow as the cover, and
  // a sidebar in 380 px is a sidebar and no page.
  const [box, wide] = useWide()
  const [section, setSection] = useState('discover')
  const [query, setQuery] = useState('')
  // The `os.arg` deep link is spent once; it lives here because a section change remounts the pane below.
  const linked = useRef(false)
  // `wide` reads false until the box is first measured, and a pushed page keeps the `wide` it was
  // built with, so the link waits for the measurement or the page lands in the narrow layout.
  const [measured, setMeasured] = useState(false)
  useEffect(() => {
    const ro = new ResizeObserver(() => setMeasured(true))
    ro.observe(box.current!)
    return () => ro.disconnect()
  }, [box])
  const q = query.trim().toLowerCase()
  const rows = state.rows.filter((row) => row.name.toLowerCase().includes(q) || row.author.toLowerCase().includes(q))
  const lane = (key: string) => rows.filter((r) => r.lane === key)
  const official = lane('official')
  const community = lane('community')
  const development = lane('development')
  const updates = rows.filter((r) => r.installed && (r.version !== r.installed || r.failed || r.candidate))
  const sections: Lane[] = [
    { key: 'discover', label: 'Discover', glyph: 'star' },
    { key: 'apps', label: 'Apps', glyph: 'collections', n: rows.length },
    { key: 'official', label: 'Official', glyph: 'check', n: official.length },
    { key: 'community', label: 'Community', glyph: 'people', n: community.length },
    ...(development.length
      ? [{ key: 'development', label: 'Previews', glyph: 'iphone', n: development.length } as Lane]
      : []),
    ...(PREVIEW_FEATURES.stageUpdates
      ? [{ key: 'updates', label: 'Updates', glyph: 'saved', n: updates.length } as Lane]
      : []),
    { key: 'develop', label: 'Develop', glyph: 'compose' }
  ]
  const view = q ? 'results' : !wide && LANES.has(section) ? 'apps' : section
  const title = q ? 'Results' : (sections.find((s) => s.key === view)?.label ?? 'Discover')
  return (
    <div ref={box} {...stylex.props(styles.shell, wide && styles.shellWide)}>
      {wide && (
        <Sidebar
          sections={sections}
          section={section}
          onPick={setSection}
          query={query}
          onQuery={setQuery}
          store={store}
          source={state.source}
          developer={state.developer}
        />
      )}
      <div {...stylex.props(styles.pane)}>
        {/* Keyed on the section: picking another one in the sidebar drops the app page that was over it. */}
        <Nav key={view}>
          <Pane
            title={title}
            view={view}
            wide={wide}
            query={query}
            onQuery={setQuery}
            state={state}
            store={store}
            open={open}
            openExternal={openExternal}
            arg={measured ? arg : undefined}
            linked={linked}
            official={official}
            community={community}
            development={development}
            updates={updates}
          />
        </Nav>
      </div>
      {!wide && <Tabs sections={sections.filter((s) => !LANES.has(s.key))} section={view} onPick={setSection} />}
    </div>
  )
}

/** The section list, the search field and the catalog it is all coming from. */
function Sidebar({
  sections,
  section,
  onPick,
  query,
  onQuery,
  store,
  source,
  developer
}: {
  sections: Lane[]
  section: string
  onPick: (key: string) => void
  query: string
  onQuery: (q: string) => void
  store: Store
  source: string
  developer: boolean
}) {
  return (
    <nav aria-label="Store sections" {...stylex.props(styles.side)}>
      <Field value={query} onChange={onQuery} placeholder="Search" />
      <div {...stylex.props(styles.sideList)}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-current={s.key === section ? 'page' : undefined}
            onClick={() => onPick(s.key)}
            {...stylex.props(styles.sideRow, s.key === section && styles.sideRowOn, shared.select)}
          >
            <Sym name={s.glyph} size={16} />
            <span {...stylex.props(styles.sideLabel)}>{s.label}</span>
            {s.n !== undefined && <span {...stylex.props(styles.sideN)}>{s.n}</span>}
          </button>
        ))}
      </div>
      {/* The catalog everything came from, where a Mac puts the account: Doan Labs, or a developer's host. */}
      <div {...stylex.props(styles.sideFoot, developer && styles.sideFootDev)}>
        {developer ? (
          <span {...stylex.props(styles.sideMark, styles.sideMarkDev)}>
            <Sym name="tabs" size={18} />
          </span>
        ) : (
          <img src={LOGO} alt="" {...stylex.props(styles.sideMark)} />
        )}
        <span {...stylex.props(styles.sideFootText)}>
          <span {...stylex.props(styles.sideFootName)}>{developer ? new URL(source).host : 'Doan Labs'}</span>
          <span {...stylex.props(styles.sideFootSub)}>{developer ? 'Developer catalog' : 'Duo catalog'}</span>
        </span>
        <button
          type="button"
          aria-label="Refresh catalog"
          title={source}
          {...stylex.props(styles.bare, styles.sideFootGo, developer && styles.sideFootDevIc, shared.press)}
          onClick={() => {
            void store.refresh()
          }}
        >
          <Sym name="reload" size={15} />
        </button>
      </div>
    </nav>
  )
}

/** The cover's answer to the sidebar. Lanes drop out: Apps shows all of them there. */
function Tabs({ sections, section, onPick }: { sections: Lane[]; section: string; onPick: (key: string) => void }) {
  return (
    <nav aria-label="Store sections" {...stylex.props(styles.tabs)}>
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-current={s.key === section ? 'page' : undefined}
          onClick={() => onPick(s.key)}
          {...stylex.props(styles.tab, s.key === section && styles.tabOn, shared.press)}
        >
          <Sym name={s.glyph} size={20} />
          {s.label}
        </button>
      ))}
    </nav>
  )
}

const Field = ({
  value,
  onChange,
  placeholder,
  xstyle
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  xstyle?: stylex.StyleXStyles
}) => (
  <label {...stylex.props(styles.search, xstyle)}>
    <Sym name="search" size={14} />
    <input
      aria-label="Search apps"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...stylex.props(styles.searchInput)}
    />
  </label>
)

function Pane({
  title,
  view,
  wide,
  query,
  onQuery,
  state,
  store,
  open,
  openExternal,
  arg,
  linked,
  official,
  community,
  development,
  updates
}: {
  title: string
  view: string
  wide: boolean
  query: string
  onQuery: (q: string) => void
  state: ReturnType<Store['snapshot']>
  store: Store
  open: Open
  openExternal: External
  /** `os.arg` from a `?arg=` link: the catalog id whose page opens once its row is in. */
  arg?: string
  /** Held by Shelf: a section change remounts this pane, and the link must not push twice. */
  linked: { current: boolean }
  official: StoreRow[]
  community: StoreRow[]
  development: StoreRow[]
  updates: StoreRow[]
}) {
  const { push } = useNav()
  const show = (row: StoreRow) =>
    push((back) => (
      <AppPage id={row.id} store={store} open={open} openExternal={openExternal} wide={wide} back={back} />
    ))
  // `/apps` names a catalog app the home screen does not carry: the Store opens straight on its page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `show` is rebuilt each render; `linked` is the once-guard.
  useEffect(() => {
    if (linked.current || state.loading || !arg) return
    const row = state.rows.find((r) => r.id === arg)
    if (!row) return
    linked.current = true
    show(row)
  }, [state, arg, linked])
  // The pane's title already announces the section, so the group that opens it
  // drops the hairline and the space a second heading would otherwise cost.
  const groups = (list: [string, string, StoreRow[]][]) =>
    list
      .filter(([, , rows]) => rows.length)
      .map(([heading, blurb, rows], i) => (
        <Group
          key={heading}
          title={heading}
          blurb={blurb}
          rows={rows}
          first={i === 0}
          wide={wide}
          store={store}
          open={open}
          onShow={show}
        />
      ))
  const lanes: [string, string, StoreRow[]][] = [
    ['From Doan Labs', 'Official releases, built for both displays.', official],
    ['Community', 'Submitted as pull requests, reviewed and published.', community],
    ['Local previews', 'From your developer catalog.', development]
  ]
  const found = official.length + community.length + development.length
  let body: ReactNode
  if (state.loading && !state.rows.length)
    body = (
      <div role="status" {...stylex.props(styles.center)}>
        <i {...stylex.props(styles.spinner, animations.spin)} />
        Loading catalog…
      </div>
    )
  else if (view === 'develop')
    body = <Developer store={store} openExternal={openExternal} source={state.source} developer={state.developer} />
  else if (view === 'discover')
    body = <Discover rows={state.rows} wide={wide} store={store} open={open} onShow={show} />
  else if (view === 'updates')
    body = updates.length ? (
      groups([['Updates', 'Staged for the next time the app closes.', updates]])
    ) : (
      <Placeholder xstyle={styles.center}>No updates found.</Placeholder>
    )
  else if (view === 'official') body = groups([lanes[0]!])
  else if (view === 'community')
    body = community.length ? (
      groups([lanes[1]!])
    ) : (
      <Placeholder xstyle={styles.center}>No community apps yet.</Placeholder>
    )
  else if (view === 'development') body = groups([lanes[2]!])
  else body = found ? groups(lanes) : <Placeholder xstyle={styles.center}>No apps found.</Placeholder>
  return (
    <Screen xstyle={[styles.paneRoot, wide ? styles.paneSide : styles.paneScroll]}>
      <div {...stylex.props(styles.top)}>
        <LargeTitle as="h1" xstyle={styles.title}>
          {title}
        </LargeTitle>
        {!wide && (
          <Field value={query} onChange={onQuery} placeholder="Apps, games and more" xstyle={styles.searchTop} />
        )}
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
      {body}
    </Screen>
  )
}

/** One featured release a day, rotating through the compatible official ones, then a card each for the rest. */
function Discover({
  rows,
  wide,
  store,
  open,
  onShow
}: {
  rows: StoreRow[]
  wide: boolean
  store: Store
  open: Open
  onShow: (row: StoreRow) => void
}) {
  const day = Math.floor(Date.now() / 864e5)
  const pool = rows.filter((r) => r.lane === 'official' && r.compatible)
  const lead = pool.length ? pool[day % pool.length] : rows[0]
  if (!lead) return <Placeholder xstyle={styles.center}>Nothing to discover yet.</Placeholder>
  return (
    <>
      <div aria-hidden="true" {...stylex.props(styles.wash)}>
        <Icon row={lead} xstyle={styles.washArt} />
      </div>
      <div {...stylex.props(styles.cards, wide && styles.cardsWide)}>
        {[lead, ...rows.filter((row) => row !== lead)].map((row) => (
          <Card
            key={row.id}
            row={row}
            lead={row === lead}
            wide={wide}
            store={store}
            open={open}
            onShow={() => onShow(row)}
          />
        ))}
      </div>
    </>
  )
}

/**
 * A Today card. The lead sits on a plain surface with its icon beside the copy;
 * the rest use their own icon, blown up and blurred, as the artwork, so every
 * card brings its palette and none has to be drawn or shipped.
 */
function Card({
  row,
  lead,
  wide,
  store,
  open,
  onShow
}: {
  row: StoreRow
  lead: boolean
  wide: boolean
  store: Store
  open: Open
  onShow: () => void
}) {
  return (
    <div data-store-app={row.id} {...stylex.props(styles.card, lead && styles.cardLead, shared.select)}>
      {!lead && row.icon && <img src={row.icon} alt="" aria-hidden="true" {...stylex.props(styles.cardBlur)} />}
      {!lead && <div {...stylex.props(styles.cardShade)} />}
      <button type="button" onClick={onShow} {...stylex.props(styles.bare, styles.cardTop, lead && styles.cardTopLead)}>
        <span {...stylex.props(styles.cardText)}>
          <span {...stylex.props(styles.kicker)}>{kicker(row, lead)}</span>
          <span {...stylex.props(styles.cardName, lead ? styles.cardNameLead : styles.cardNameArt)}>{row.name}</span>
          <span {...stylex.props(styles.cardBlurb)}>
            {tagline(row)}
            {lead && '. Open source, MIT licensed.'}
          </span>
        </span>
        {lead && <Icon row={row} xstyle={[styles.cardBig, !wide && styles.cardBigSm]} />}
      </button>
      <div {...stylex.props(styles.cardBar, lead ? styles.cardBarLead : styles.cardBarArt)}>
        <Icon row={row} xstyle={styles.cardIcon} />
        <div {...stylex.props(styles.cardInfo)}>
          <div {...stylex.props(styles.cardTitle)}>{row.name}</div>
          <div {...stylex.props(styles.cardSub)}>
            {row.author} · {size(row.bytes)}
          </div>
        </div>
        <Action row={row} store={store} open={open} light={!lead} />
      </div>
    </div>
  )
}

/** A lane: heading, then its rows, two columns across in a wide box. */
function Group({
  title,
  blurb,
  rows,
  first,
  wide,
  store,
  open,
  onShow
}: {
  title: string
  blurb: string
  rows: StoreRow[]
  first?: boolean
  wide: boolean
  store: Store
  open: Open
  onShow: (row: StoreRow) => void
}) {
  if (!rows.length) return null
  return (
    <section aria-label={title} {...stylex.props(styles.group)}>
      <Head
        title={title}
        blurb={blurb}
        first={first}
        action={
          <span {...stylex.props(styles.headCount)}>
            {rows.length} {rows.length === 1 ? 'app' : 'apps'}
          </span>
        }
      />
      <div {...stylex.props(styles.grid, wide && styles.gridWide)}>
        {rows.map((row) => (
          <Item key={row.id} row={row} store={store} open={open} onShow={() => onShow(row)} />
        ))}
      </div>
    </section>
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
      {/* The pane's own title already says Develop; a heading under it would only repeat itself. */}
      <p {...stylex.props(styles.lede)}>Load a catalog you are building, or publish one to the Duo catalog.</p>
      <Section aria-labelledby="for-developers" xstyle={styles.card2}>
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
          <div {...stylex.props(styles.formActions)}>
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
