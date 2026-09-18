// The apps, from two build-time sources (src/generated/catalog.ts): the curated catalog
// (published releases with icon, version, permissions and dates) and the shell's own
// home screen (every official app, working in the simulator or still a mockup). The
// home page shows a grid; /apps adds the lane filter, status groups and a list layout.
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { CATALOG, type CatalogApp, SHELL } from '../generated/catalog'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Headline, Lede, Reveal } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

type Lane = CatalogApp['lane']
type Status = 'published' | 'working' | 'mockup'
type Layout = 'grid' | 'list'
type Entry = { key: string; name: string; icon: string; author: string; status: Status; release?: CatalogApp }

const STATUS: Record<Status, { label: string; text: string }> = {
  published: { label: 'Published', text: 'In the catalog. Installs through the Store on any Duo.' },
  working: {
    label: 'Built in',
    text: 'Runs inside the shell. Needs the camera, microphone or embedded pages the app sandbox does not allow.'
  },
  mockup: { label: 'In development', text: 'A static screen with invented data while the real app is built.' }
}
const ORDER: Status[] = ['published', 'working', 'mockup']

const OFFICIAL: Entry[] = [
  ...SHELL.map((s): Entry => {
    const release = CATALOG.find((c) => c.lane === 'official' && c.name === s.name)
    return {
      key: release?.id ?? s.name,
      name: s.name,
      icon: release?.icon ?? s.icon,
      author: release?.author ?? 'Doan Labs',
      status: release ? 'published' : s.mock ? 'mockup' : 'working',
      release
    }
  }),
  ...CATALOG.filter((c) => c.lane === 'official' && !SHELL.some((s) => s.name === c.name)).map(fromRelease)
].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name))
const COMMUNITY: Entry[] = CATALOG.filter((c) => c.lane === 'community').map(fromRelease)
function fromRelease(c: CatalogApp): Entry {
  return { key: c.id, name: c.name, icon: c.icon, author: c.author, status: 'published', release: c }
}

const LANES: { key: Lane; label: string; text: string; apps: Entry[] }[] = [
  {
    key: 'official',
    label: 'Official',
    text: 'Built by Doan Labs. Every app on the simulator’s home screen, from published releases to the mockups still being built.',
    apps: OFFICIAL
  },
  {
    key: 'community',
    label: 'Community',
    text: 'Submitted through pull requests, reviewed, and published to the catalog.',
    apps: COMMUNITY
  }
]
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export function Apps() {
  return (
    <Block labelledBy="apps-title">
      <Cap>07 · The apps</Cap>
      <Headline id="apps-title" lines={['Built for both displays', 'and the fold between them.']} />
      <Lede>
        Official apps ship in the simulator and publish to the Duo catalog; community apps arrive as pull requests.
        Every one is MIT licensed and installs through the Store.
      </Lede>
      <Shelf apps={OFFICIAL.filter((a) => a.status !== 'mockup').slice(0, 6)} layout="grid" />
    </Block>
  )
}

/** The /apps browser: a lane filter, a layout switch, and one section per lane grouped by status. */
export function Browser() {
  const [lane, setLane] = useState<Lane | 'all'>('all')
  const [layout, setLayout] = useState<Layout>('grid')
  const shown = LANES.filter((l) => lane === 'all' || l.key === lane)
  const total = LANES.reduce((n, l) => n + l.apps.length, 0)
  return (
    <>
      <div {...stylex.props(styles.bar)}>
        <fieldset aria-label="Lane" {...stylex.props(styles.segment)}>
          {[{ key: 'all' as const, label: 'All', n: total }, ...LANES.map((l) => ({ ...l, n: l.apps.length }))].map(
            (l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={lane === l.key}
                onClick={() => setLane(l.key)}
                {...stylex.props(styles.seg, lane === l.key && styles.segOn)}
              >
                {l.label}
                <span {...stylex.props(styles.count)}>{l.n}</span>
              </button>
            )
          )}
        </fieldset>
        <fieldset aria-label="Layout" {...stylex.props(styles.segment)}>
          {(['grid', 'list'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-label={l === 'grid' ? 'Grid' : 'List'}
              aria-pressed={layout === l}
              onClick={() => setLayout(l)}
              {...stylex.props(styles.seg, styles.segIcon, layout === l && styles.segOn)}
            >
              <Glyph name={l} />
            </button>
          ))}
        </fieldset>
      </div>
      {shown.map((l) => (
        <section key={l.key} aria-labelledby={`lane-${l.key}`} {...stylex.props(styles.lane)}>
          <h2 id={`lane-${l.key}`} {...stylex.props(styles.laneTitle)}>
            {l.label}
          </h2>
          <p {...stylex.props(styles.laneText)}>{l.text}</p>
          {l.apps.length === 0 ? (
            <p {...stylex.props(styles.empty)}>No {l.label.toLowerCase()} apps are published yet.</p>
          ) : layout === 'list' ? (
            <Shelf apps={l.apps} layout="list" />
          ) : (
            ORDER.filter((s) => l.apps.some((a) => a.status === s)).map((s) => (
              <Group key={s} status={s} apps={l.apps.filter((a) => a.status === s)} />
            ))
          )}
        </section>
      ))}
    </>
  )
}

/** One status group, folded away unless it is the published one. */
function Group({ status, apps }: { status: Status; apps: Entry[] }) {
  const [open, setOpen] = useState(status === 'published')
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} {...stylex.props(styles.group)}>
      <summary {...stylex.props(styles.groupTitle)}>
        <span {...stylex.props(styles.chevron, open && styles.chevronOpen)}>
          <Glyph name="chevron" />
        </span>
        <StatusChip status={status} />
        <span {...stylex.props(styles.groupText)}>{STATUS[status].text}</span>
        <span {...stylex.props(styles.count)}>{apps.length}</span>
      </summary>
      <Shelf apps={apps} layout="grid" />
    </details>
  )
}

export function Shelf({ apps, layout }: { apps: readonly Entry[]; layout: Layout }) {
  if (layout === 'list')
    return (
      <table {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th {...stylex.props(styles.th)}>App</th>
            <th {...stylex.props(styles.th)}>Status</th>
            <th {...stylex.props(styles.th)}>Version</th>
            <th {...stylex.props(styles.th)}>Permissions</th>
            <th {...stylex.props(styles.th)}>Created</th>
            <th {...stylex.props(styles.th)}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.key}>
              <td {...stylex.props(styles.td)}>
                <div {...stylex.props(styles.rowApp)}>
                  <img src={a.icon} alt="" width={1024} height={1024} {...stylex.props(styles.iconSm)} />
                  <div>
                    <Name entry={a} row />
                    <div {...stylex.props(styles.meta)}>{a.author}</div>
                  </div>
                </div>
              </td>
              <td {...stylex.props(styles.td)}>
                <StatusChip status={a.status} />
              </td>
              <td {...stylex.props(styles.td, styles.mono)}>{a.release?.version ?? '-'}</td>
              <td {...stylex.props(styles.td)}>{a.release ? <Permissions app={a.release} /> : <Dash />}</td>
              <td {...stylex.props(styles.td, styles.mono)}>{a.release ? date(a.release.created) : '-'}</td>
              <td {...stylex.props(styles.td, styles.mono)}>{a.release ? date(a.release.updated) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  return (
    <ul {...stylex.props(styles.grid)}>
      {apps.map((a, i) => (
        <li key={a.key} {...stylex.props(styles.item)}>
          <Reveal delay={(i % 3) * 0.06}>
            <article {...stylex.props(styles.card)}>
              <img src={a.icon} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
              <div {...stylex.props(styles.body)}>
                <h4 {...stylex.props(styles.name)}>
                  <Name entry={a} />
                </h4>
                <p {...stylex.props(styles.meta)}>
                  {a.author}
                  {a.release && ` · v${a.release.version}`}
                  {a.release && a.release.releases > 1 && ` · ${a.release.releases} releases`}
                  {!a.release && ` · ${STATUS[a.status].label.toLowerCase()}`}
                </p>
                {a.release && (
                  <>
                    <Permissions app={a.release} />
                    <p {...stylex.props(styles.dates)}>
                      <span>Created {date(a.release.created)}</span>
                      <span>Updated {date(a.release.updated)}</span>
                    </p>
                  </>
                )}
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}

function Name({ entry, row = false }: { entry: Entry; row?: boolean }) {
  const style = row ? styles.rowName : styles.link
  return entry.release ? (
    <a href={entry.release.repo} {...stylex.props(style)}>
      {entry.name}
    </a>
  ) : (
    <span {...stylex.props(style)}>{entry.name}</span>
  )
}

const Dash = () => <span {...stylex.props(styles.mono)}>-</span>

function StatusChip({ status }: { status: Status }) {
  return (
    <span {...stylex.props(styles.chip, styles[status])}>
      <Glyph name={status} />
      {STATUS[status].label}
    </span>
  )
}

function Permissions({ app }: { app: CatalogApp }) {
  return (
    <ul {...stylex.props(styles.chips)} aria-label="Permissions">
      {app.permissions.length === 0 ? (
        <li {...stylex.props(styles.chip, styles.chipNone)}>
          <Glyph name="none" />
          No permissions
        </li>
      ) : (
        app.permissions.map((p) => (
          <li key={p.name} {...stylex.props(styles.chip)} title={p.name}>
            <Glyph name={p.name} />
            {p.label}
          </li>
        ))
      )}
    </ul>
  )
}

/** 14 px line glyphs: the permission set from packages/sdk/permissions.ts, the statuses and the layout switch. */
function Glyph({ name }: { name: string }) {
  const d = GLYPHS[name] ?? GLYPHS.none!
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.glyph)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
const GLYPHS: Record<string, string> = {
  geolocation:
    'M8 14.5s-4.5-4.2-4.5-8A4.5 4.5 0 0 1 12.5 6.5c0 3.8-4.5 8-4.5 8zM8 8.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z',
  'clipboard-read':
    'M5.5 3H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-1.5M5.5 2h5v2h-5zM5.5 8h5M5.5 10.5h3',
  'clipboard-write':
    'M5.5 3H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-1.5M5.5 2h5v2h-5zM6 11l4.5-4.5 1 1L7 12H6z',
  photos:
    'M2.5 4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1zM3 11l3-3 2 2 2-2 3 3M10.5 6.5a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4z',
  none: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM3.8 3.8l8.4 8.4',
  published: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5.2 8.2l1.9 1.9 3.7-3.9',
  working: 'M3 4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 13.5h4M8 11.5v2',
  mockup: 'M3.5 3.5h9v9h-9zM3.5 6.5h9M6.5 6.5v6',
  grid: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5V7H9zM2.5 9H7v4.5H2.5zM9 9h4.5v4.5H9z',
  list: 'M5 3.5h8.5M5 8h8.5M5 12.5h8.5M2.5 3.5h.01M2.5 8h.01M2.5 12.5h.01',
  chevron: 'M6 4l4 4-4 4'
}

const styles = stylex.create({
  bar: {
    marginTop: '48px',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  segment: {
    display: 'inline-flex',
    margin: 0,
    borderWidth: 0,
    padding: '3px',
    gap: '2px',
    borderRadius: '999px',
    backgroundColor: color.well
  },
  seg: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '14px',
    paddingRight: '12px',
    borderRadius: '999px',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: color.text2,
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  segIcon: { paddingLeft: '10px', paddingRight: '10px' },
  segOn: { backgroundColor: color.surface, color: color.text, boxShadow: '0 1px 2px rgba(20,20,19,0.08)' },
  count: { fontFamily: font.mono, fontSize: '12px', color: color.text3 },
  lane: { marginTop: '56px' },
  laneTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  laneText: { marginTop: '6px', marginBottom: 0, maxWidth: '64ch', fontSize: '16px', color: color.text2 },
  group: { marginTop: '32px' },
  groupTitle: {
    margin: 0,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 400,
    cursor: 'pointer',
    listStyleType: 'none',
    '::-webkit-details-marker': { display: 'none' }
  },
  chevron: {
    display: 'inline-flex',
    color: color.text3,
    transitionProperty: 'transform',
    transitionDuration: '0.15s'
  },
  chevronOpen: { transform: 'rotate(90deg)' },
  groupText: { color: color.text2 },
  empty: {
    marginTop: '20px',
    marginBottom: 0,
    padding: '24px',
    borderRadius: '16px',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: color.border,
    fontSize: '15px',
    color: color.text3
  },
  grid: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '16px',
    padding: 0,
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      [MID]: 'repeat(2, minmax(0, 1fr))',
      [SMALL]: 'minmax(0, 1fr)'
    },
    gap: '16px'
  },
  item: { display: 'block' },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '18px',
    borderRadius: '20px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    minHeight: '100%'
  },
  icon: { width: '56px', height: '56px', flexShrink: 0, borderRadius: '13px' },
  iconSm: { width: '36px', height: '36px', flexShrink: 0, borderRadius: '8px' },
  body: { minWidth: 0, flexGrow: 1 },
  name: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '19px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    color: color.text
  },
  link: { color: color.text, textDecorationLine: 'none' },
  meta: { marginTop: '3px', marginBottom: 0, fontSize: '14px', lineHeight: 1.5, color: color.text2 },
  dates: {
    marginTop: '12px',
    marginBottom: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    fontFamily: font.mono,
    fontSize: '12px',
    color: color.text3
  },
  chips: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '10px',
    padding: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: font.sans,
    fontSize: '13px',
    lineHeight: 1,
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '9px',
    paddingRight: '11px',
    borderRadius: '999px',
    backgroundColor: color.well,
    color: color.text,
    whiteSpace: 'nowrap'
  },
  chipNone: { color: color.text3 },
  published: { color: color.green },
  working: { color: color.text },
  mockup: { color: color.orange },
  glyph: { flexShrink: 0 },
  table: { width: '100%', marginTop: '20px', borderCollapse: 'collapse', fontSize: '15px' },
  th: {
    textAlign: 'left',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '12px',
    paddingRight: '12px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: color.text3,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  td: {
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '12px',
    paddingRight: '12px',
    verticalAlign: 'middle',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    color: color.text
  },
  mono: { fontFamily: font.mono, fontSize: '13px', color: color.text2, whiteSpace: 'nowrap' },
  rowApp: { display: 'flex', alignItems: 'center', gap: '12px' },
  rowName: { color: color.text, fontWeight: 600, textDecorationLine: 'none' }
})
