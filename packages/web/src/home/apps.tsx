// The apps, from two build-time sources (src/generated/catalog.ts): the curated catalog
// (published releases with icon, version, permissions and dates) and the shell's own
// home screen (every official app, working in the simulator or still a mockup, dated by
// the commits on its package). The home page shows a grid; /apps is the store front:
// a search field, expandable lanes, and every app opening in a sheet with its facts,
// version notes and a way into the simulator.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { known } from '../docs'
import { CATALOG, type CatalogApp, SHELL } from '../generated/catalog'
import { type Block as MdBlock, parse, render } from '../markdown'
import { Segmented } from '../segmented'
import { color, ease, font, radius } from '../tokens.stylex'
import { Block, Cap, Headline, Lede, Reveal } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

type Lane = CatalogApp['lane']
type Status = 'published' | 'working' | 'mockup'
type Layout = 'grid' | 'list'
type Perm = { name: string; label: string }
type Entry = {
  key: string
  name: string
  icon: string
  author: string
  status: Status
  version?: string
  permissions: Perm[]
  created?: string
  updated?: string
  release?: CatalogApp
  /** The home screen name the simulator opens on `/simulator?app=`; absent for apps the shell does not carry. */
  open?: string
  /** Raw CHANGELOG.md text from the app's source folder, when the repo carries one. */
  changelog?: string | null
}

const STATUS: Record<Status, { label: string; text: string }> = {
  published: { label: 'Published', text: 'In the catalog. Installs through the Store on any Duo.' },
  working: {
    label: 'Available',
    text: 'Ready to use in the simulator.'
  },
  mockup: { label: 'In development', text: 'A static screen with invented data while the real app is built.' }
}
const ORDER: Status[] = ['published', 'working', 'mockup']

/** What the simulator-only apps reach for. Baked into the shell, so nothing sandboxes them:
 *  this is what they actually use, not a grant the runtime enforces. */
const USES: Record<string, Perm[]> = {
  Camera: [{ name: 'camera', label: 'Camera' }],
  Maps: [{ name: 'network', label: 'Network' }],
  Safari: [
    { name: 'network', label: 'Network' },
    { name: 'clipboard-write', label: 'Write clipboard' }
  ],
  'Voice Memos': [{ name: 'microphone', label: 'Microphone' }],
  YouTube: [{ name: 'network', label: 'Network' }]
}

const OFFICIAL: Entry[] = [
  ...SHELL.map((s): Entry => {
    const release = CATALOG.find((c) => c.lane === 'official' && c.name === s.name)
    return {
      key: release?.id ?? s.name,
      name: s.name,
      icon: release?.icon ?? s.icon,
      author: release?.author ?? 'Doan Labs',
      status: release ? 'published' : s.mock ? 'mockup' : 'working',
      version: release?.version,
      permissions: release?.permissions ?? USES[s.name] ?? [],
      created: release?.created ?? s.created,
      updated: release?.updated ?? s.updated,
      release,
      open: s.name,
      changelog: release?.changelog ?? s.changelog
    }
  }),
  ...CATALOG.filter((c) => c.lane === 'official' && !SHELL.some((s) => s.name === c.name)).map(fromRelease)
].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name))
/** Hand-picked: shown first in their lane with a Hot mark. */
const HOT = new Set(['com.mnismt.duo.flappyduo'])
const COMMUNITY: Entry[] = CATALOG.filter((c) => c.lane === 'community')
  .map(fromRelease)
  .sort((a, b) => Number(HOT.has(b.key)) - Number(HOT.has(a.key)))
function fromRelease(c: CatalogApp): Entry {
  return {
    key: c.id,
    name: c.name,
    icon: c.icon,
    author: c.author,
    status: 'published',
    version: c.version,
    permissions: c.permissions,
    created: c.created,
    updated: c.updated,
    release: c,
    changelog: c.changelog
  }
}

type LaneInfo = { key: Lane; label: string; text: string; apps: Entry[] }
const LANES: LaneInfo[] = [
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

/** Changelogs name no files, so their links resolve against the repository root. */
const LOG_CTX = { from: 'CHANGELOG.md', known }
const VERSION = /^\d+\.\d+\.\d+/
/** CHANGELOG.md, cut at its version headings into one block list per release. */
function versionsOf(src: string): { version: string; blocks: MdBlock[] }[] {
  const out: { version: string; blocks: MdBlock[] }[] = []
  for (const b of parse(src)) {
    if (b.t === 'h' && VERSION.test(b.text)) out.push({ version: b.text.match(VERSION)![0], blocks: [] })
    else out.at(-1)?.blocks.push(b)
  }
  return out
}

export function Apps() {
  return (
    <Block labelledBy="apps-title">
      <Cap>06 · The apps</Cap>
      <Headline id="apps-title" lines={['Built for both displays', 'and the fold between them.']} />
      <Lede>
        Official apps ship in the simulator and publish to the Duo catalog; community apps arrive as pull requests.
        Every one is MIT licensed and installs through the Store.
      </Lede>
      <Shelf apps={OFFICIAL.filter((a) => a.status !== 'mockup').slice(0, 6)} layout="grid" />
    </Block>
  )
}

/** The /apps store front: a search field, a lane filter, a layout switch, and one expandable section per lane. */
export function Browser() {
  const [lane, setLane] = useState<Lane | 'all'>('all')
  const [layout, setLayout] = useState<Layout>('grid')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const lanes = LANES.map((l) => ({
    ...l,
    apps: l.apps.filter(
      (a) =>
        !q || a.name.toLowerCase().includes(q) || a.author.toLowerCase().includes(q) || (a.version ?? '').includes(q)
    )
  }))
  const shown = lanes.filter((l) => lane === 'all' || l.key === lane)
  const total = LANES.reduce((n, l) => n + l.apps.length, 0)
  const found = shown.reduce((n, l) => n + l.apps.length, 0)
  return (
    <>
      <div {...stylex.props(styles.bar)}>
        <div {...stylex.props(styles.search)}>
          <Glyph name="search" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps"
            aria-label="Search apps"
            {...stylex.props(styles.field)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              {...stylex.props(styles.clear)}
            >
              <Glyph name="x" />
            </button>
          )}
        </div>
        <div {...stylex.props(styles.controls)}>
          <Segmented
            id="apps-lane"
            label="Lane"
            value={lane}
            onChange={(l) => setLane(l)}
            options={[
              { value: 'all' as const, label: 'All', count: total },
              ...LANES.map((l) => ({ value: l.key, label: l.label, count: l.apps.length }))
            ]}
          />
          <Segmented
            id="apps-layout"
            label="Layout"
            value={layout}
            onChange={(l) => setLayout(l)}
            options={[
              { value: 'grid' as const, label: 'Grid', icon: <Glyph name="grid" /> },
              { value: 'list' as const, label: 'List', icon: <Glyph name="list" /> }
            ]}
          />
        </div>
      </div>
      {q ? (
        <section aria-label="Search results" {...stylex.props(styles.results)}>
          <p {...stylex.props(styles.resultMeta)}>
            {found} {found === 1 ? 'result' : 'results'} for “{query.trim()}”
          </p>
          {found === 0 ? (
            <p {...stylex.props(styles.empty)}>No app matches that name. Try the developer, or a version.</p>
          ) : (
            <Shelf apps={shown.flatMap((l) => l.apps)} layout={layout} />
          )}
        </section>
      ) : (
        shown.map((l) => <LaneSection key={l.key} lane={l} layout={layout} />)
      )}
    </>
  )
}

/** One lane, folded away only when the visitor folds it. The description stays in the summary, visible either way. */
function LaneSection({ lane, layout }: { lane: LaneInfo; layout: Layout }) {
  const [open, setOpen] = useState(true)
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} {...stylex.props(styles.lane)}>
      <summary {...stylex.props(styles.laneTitle)}>
        <span {...stylex.props(styles.chevron, open && styles.chevronOpen)}>
          <Glyph name="chevron" />
        </span>
        <h2 {...stylex.props(styles.laneLabel)}>{lane.label}</h2>
        <span {...stylex.props(styles.count)}>{lane.apps.length}</span>
        <span {...stylex.props(styles.laneText)}>{lane.text}</span>
      </summary>
      {lane.apps.length === 0 ? (
        <p {...stylex.props(styles.empty)}>No {lane.label.toLowerCase()} apps are published yet.</p>
      ) : layout === 'list' ? (
        <Shelf apps={lane.apps} layout="list" />
      ) : (
        <>
          <Shelf apps={lane.apps.filter((a) => a.status !== 'mockup')} layout="grid" />
          {lane.apps.some((a) => a.status === 'mockup') && (
            <Group status="mockup" apps={lane.apps.filter((a) => a.status === 'mockup')} />
          )}
        </>
      )}
    </details>
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

/** A shelf of apps; each card or row opens the app's sheet, which this shelf owns. */
export function Shelf({ apps, layout }: { apps: readonly Entry[]; layout: Layout }) {
  const [app, setApp] = useState<Entry | null>(null)
  return (
    <>
      {layout === 'list' ? <List apps={apps} onOpen={setApp} /> : <Grid apps={apps} onOpen={setApp} />}
      {app && <Sheet entry={app} onClose={() => setApp(null)} />}
    </>
  )
}

function Grid({ apps, onOpen }: { apps: readonly Entry[]; onOpen: (app: Entry) => void }) {
  return (
    <ul {...stylex.props(styles.grid)}>
      {apps.map((a, i) => (
        <li key={a.key} {...stylex.props(styles.item)}>
          <Reveal delay={(i % 3) * 0.06}>
            <button type="button" onClick={() => onOpen(a)} aria-haspopup="dialog" {...stylex.props(styles.card)}>
              <img src={a.icon} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
              <span {...stylex.props(styles.cardBody)}>
                <span {...stylex.props(styles.name)}>
                  {a.name}
                  {HOT.has(a.key) && <span {...stylex.props(styles.hot)}>Hot</span>}
                </span>
                <span {...stylex.props(styles.meta)}>
                  {a.author}
                  {a.version && ` · v${a.version}`}
                  {a.release && a.release.releases > 1 && ` · ${a.release.releases} releases`}
                  {a.status === 'mockup' && ` · ${STATUS[a.status].label.toLowerCase()}`}
                </span>
                <StatusChip status={a.status} />
              </span>
            </button>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}

function List({ apps, onOpen }: { apps: readonly Entry[]; onOpen: (app: Entry) => void }) {
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
          <tr key={a.key} {...stylex.props(styles.tr)}>
            <td {...stylex.props(styles.td)}>
              <button type="button" onClick={() => onOpen(a)} aria-haspopup="dialog" {...stylex.props(styles.rowApp)}>
                <img src={a.icon} alt="" width={1024} height={1024} {...stylex.props(styles.iconSm)} />
                <span>
                  <span {...stylex.props(styles.rowName)}>
                    {a.name}
                    {HOT.has(a.key) && <span {...stylex.props(styles.hot)}>Hot</span>}
                  </span>
                  <span {...stylex.props(styles.rowMeta)}>{a.author}</span>
                </span>
              </button>
            </td>
            <td {...stylex.props(styles.td)}>
              <StatusChip status={a.status} />
            </td>
            <td {...stylex.props(styles.td, styles.mono)}>{a.version ?? '-'}</td>
            <td {...stylex.props(styles.td)}>
              <Permissions perms={a.permissions} />
            </td>
            <td {...stylex.props(styles.td, styles.mono)}>{a.created ? date(a.created) : '-'}</td>
            <td {...stylex.props(styles.td, styles.mono)}>{a.updated ? date(a.updated) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** One app as a sheet, laid out the way the App Store lays one out: the icon and the
 *  Open capsule over a row of facts, the version-by-version notes out of its own
 *  CHANGELOG.md, the privacy card, and the source link at the bottom.
 *  A native dialog: Escape closes it, the backdrop is a click away, and the
 *  browser owns the scroll lock and the focus return. */
function Sheet({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    d.showModal()
    const root = document.documentElement.style
    const overflow = root.overflow
    root.overflow = 'hidden'
    d.addEventListener('close', onClose)
    return () => {
      root.overflow = overflow
      d.removeEventListener('close', onClose)
    }
  }, [onClose])
  const backdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    const d = ref.current
    if (!d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close()
  }
  // Every entry is either on the home screen or a catalog release.
  const search = entry.open ? { app: entry.open } : { app: 'App Store', arg: entry.release?.id }
  const log = entry.changelog ? versionsOf(entry.changelog) : []
  const facts: [string, string, string?][] = [
    [
      'Version',
      entry.version ? `v${entry.version}` : STATUS[entry.status].label,
      entry.release ? `${entry.release.releases} release${entry.release.releases === 1 ? '' : 's'}` : undefined
    ],
    ['Lane', entry.release ? (entry.release.lane === 'official' ? 'Official' : 'Community') : 'Official', entry.author],
    ['Licence', 'MIT', 'Open source'],
    [
      'Access',
      entry.permissions.length ? String(entry.permissions.length) : 'None',
      entry.permissions.length ? 'permissions' : 'Sandboxed'
    ],
    ['Updated', entry.updated ? date(entry.updated) : '-', entry.created ? `Created ${date(entry.created)}` : undefined]
  ]
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a native dialog already closes on Escape; this handler only measures whether the click landed on the backdrop.
    <dialog ref={ref} aria-labelledby="app-sheet-name" onClick={backdrop} {...stylex.props(styles.dialog)}>
      <div {...stylex.props(styles.sheet)}>
        <button type="button" aria-label="Close" onClick={() => ref.current?.close()} {...stylex.props(styles.close)}>
          <Glyph name="x" />
        </button>
        <div {...stylex.props(styles.sheetHead)}>
          <img src={entry.icon} alt="" width={1024} height={1024} {...stylex.props(styles.sheetIcon)} />
          <span {...stylex.props(styles.sheetInfo)}>
            <span id="app-sheet-name" {...stylex.props(styles.sheetName)}>
              {entry.name}
              {HOT.has(entry.key) && <span {...stylex.props(styles.hot)}>Hot</span>}
            </span>
            <span {...stylex.props(styles.sheetMeta)}>
              {entry.author} · <StatusChip status={entry.status} />
            </span>
          </span>
          <Link to="/simulator" search={search} {...stylex.props(styles.open)}>
            {entry.open ? 'Open' : 'Open in Store'}
          </Link>
        </div>
        <ul {...stylex.props(styles.facts)}>
          {facts.map(([k, v, s]) => (
            <li key={k} {...stylex.props(styles.fact)}>
              <span {...stylex.props(styles.factK)}>{k}</span>
              <span {...stylex.props(styles.factV)}>{v}</span>
              {s && <span {...stylex.props(styles.factS)}>{s}</span>}
            </li>
          ))}
        </ul>
        {log.length > 0 && (
          <section aria-label="Version history" {...stylex.props(styles.logs)}>
            <h4 {...stylex.props(styles.sheetTitle)}>Version history</h4>
            {log.map((v, i) => (
              <div key={v.version} {...stylex.props(styles.release)}>
                <p {...stylex.props(styles.releaseHead)}>
                  <span {...stylex.props(styles.releaseVersion)}>{v.version}</span>
                  {i === 0 && <span {...stylex.props(styles.latest)}>Latest</span>}
                </p>
                {render(v.blocks, LOG_CTX)}
              </div>
            ))}
          </section>
        )}
        <h4 {...stylex.props(styles.sheetTitle)}>App privacy</h4>
        <div {...stylex.props(styles.privacy)}>
          <span {...stylex.props(styles.privacyGlyph)}>
            <Glyph name="lock" />
          </span>
          <p {...stylex.props(styles.privacyText)}>
            <strong {...stylex.props(styles.privacyTitle)}>
              {entry.permissions.length ? 'Device access' : 'No device access'}
            </strong>
            {entry.permissions.length
              ? 'This app asks for the following. Nothing leaves the device with it.'
              : 'This app runs in its own sandbox: no camera, microphone or embedded pages. Storage stays on this device.'}
          </p>
          <Permissions perms={entry.permissions} />
        </div>
        <p {...stylex.props(styles.sheetFoot)}>
          {entry.release && (
            <>
              <a href={entry.release.repo} {...stylex.props(styles.metaLink)}>
                Source
              </a>
              {' · '}
              <span {...stylex.props(styles.mono)}>{entry.release.id}</span>
            </>
          )}
        </p>
      </div>
    </dialog>
  )
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span {...stylex.props(styles.chip, styles[status])}>
      <Glyph name={status} />
      {STATUS[status].label}
    </span>
  )
}

function Permissions({ perms }: { perms: readonly Perm[] }) {
  return (
    <ul {...stylex.props(styles.chips)} aria-label="Permissions">
      {perms.length === 0 ? (
        <li {...stylex.props(styles.chip, styles.chipNone)}>
          <Glyph name="none" />
          No permissions
        </li>
      ) : (
        perms.map((p) => (
          <li key={p.name} {...stylex.props(styles.chip)} title={p.name}>
            <Glyph name={p.name} />
            {p.label}
          </li>
        ))
      )}
    </ul>
  )
}

/** 14 px line glyphs: the permission set from packages/sdk/permissions.ts, the statuses and the store's controls. */
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
  camera:
    'M2.5 5.8a1 1 0 0 1 1-1h1.6l1-1.6h3.8l1 1.6h1.6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1zM8 11.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  microphone:
    'M8 2.2a1.8 1.8 0 0 1 1.8 1.8v3.6a1.8 1.8 0 0 1-3.6 0V4A1.8 1.8 0 0 1 8 2.2zM4.2 7.6a3.8 3.8 0 0 0 7.6 0M8 11.4v2.2M6 13.6h4',
  network:
    'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM2.3 8h11.4M8 2c1.5 1.7 2.3 3.7 2.3 6S9.5 12.3 8 14C6.5 12.3 5.7 10.3 5.7 8S6.5 3.7 8 2z',
  none: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM3.8 3.8l8.4 8.4',
  published: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5.2 8.2l1.9 1.9 3.7-3.9',
  working: 'M3 4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 13.5h4M8 11.5v2',
  mockup: 'M3.5 3.5h9v9h-9zM3.5 6.5h9M6.5 6.5v6',
  lock: 'M4 7.2h8V13H4zM5.7 7.2V5.4a2.3 2.3 0 0 1 4.6 0v1.8',
  search: 'M7 12.3A5.3 5.3 0 1 0 7 1.7a5.3 5.3 0 0 0 0 10.6zM11.2 11.2L15 15',
  x: 'M4 4l8 8M12 4l-8 8',
  grid: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5V7H9zM2.5 9H7v4.5H2.5zM9 9h4.5v4.5H9z',
  list: 'M5 3.5h8.5M5 8h8.5M5 12.5h8.5M2.5 3.5h.01M2.5 8h.01M2.5 12.5h.01',
  chevron: 'M6 4l4 4-4 4'
}

const sheetIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(16px) scale(0.97)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

const styles = stylex.create({
  bar: {
    marginTop: '48px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px'
  },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexGrow: 1,
    minWidth: '220px',
    height: '38px',
    paddingLeft: '14px',
    paddingRight: '8px',
    borderRadius: radius.pill,
    backgroundColor: color.well,
    color: color.text3,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: 'transparent', ':focus-within': color.borderStrong }
  },
  field: {
    flexGrow: 1,
    minWidth: 0,
    height: '100%',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: color.text,
    fontFamily: font.sans,
    fontSize: '15px',
    outlineStyle: 'none',
    '::placeholder': { color: color.text3 },
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  clear: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': color.grayBg },
    color: color.text3,
    cursor: 'pointer'
  },
  controls: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  results: { marginTop: '32px' },
  resultMeta: { margin: 0, fontFamily: font.mono, fontSize: '13px', color: color.text3 },
  count: { fontFamily: font.mono, fontSize: '12px', color: color.text3 },
  lane: { marginTop: '56px' },
  laneTitle: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '10px',
    cursor: 'pointer',
    listStyleType: 'none',
    '::-webkit-details-marker': { display: 'none' }
  },
  laneLabel: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  laneText: { flexBasis: '100%', marginTop: '2px', maxWidth: '64ch', fontSize: '16px', color: color.text2 },
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
    alignSelf: 'center',
    color: color.text3,
    transitionProperty: 'transform',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
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
    width: '100%',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '18px',
    borderRadius: '20px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    backgroundColor: color.surface,
    minHeight: '100%',
    fontFamily: font.sans,
    textAlign: 'left',
    color: color.text,
    cursor: 'pointer',
    // The card lifts under the pointer rather than only changing colour on contact.
    transform: { default: 'translateY(0)', ':hover': 'translateY(-2px)' },
    transitionProperty: 'transform, border-color, outline-color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  cardBody: { display: 'flex', minWidth: 0, flexGrow: 1, flexDirection: 'column', alignItems: 'flex-start' },
  icon: { width: '56px', height: '56px', flexShrink: 0, borderRadius: '13px' },
  iconSm: { width: '36px', height: '36px', flexShrink: 0, borderRadius: '8px' },
  name: {
    fontFamily: font.display,
    fontSize: '19px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    color: color.text
  },
  hot: {
    marginLeft: '8px',
    verticalAlign: 'middle',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '7px',
    paddingRight: '7px',
    borderRadius: '999px',
    backgroundColor: color.redBg,
    color: color.red,
    fontFamily: font.sans,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  meta: { marginTop: '3px', fontSize: '14px', lineHeight: 1.5, color: color.text2 },
  metaLink: { color: 'inherit', textDecorationLine: 'underline', textUnderlineOffset: '3px' },
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
    marginTop: '8px',
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
  tr: {
    backgroundColor: { default: 'transparent', ':hover': color.well },
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
    transitionTimingFunction: ease.out
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
  rowApp: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontFamily: font.sans,
    textAlign: 'left',
    color: color.text,
    cursor: 'pointer',
    borderRadius: radius.sm,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  rowName: { display: 'block', color: color.text, fontWeight: 600, fontSize: '15px' },
  rowMeta: { display: 'block', marginTop: '2px', fontSize: '13px', color: color.text3 },
  // The sheet: a native dialog, so the browser owns the top layer, the scroll
  // lock, the Escape key and the focus return. The backdrop click is handled
  // with a rect check in the component.
  dialog: {
    margin: 'auto',
    width: 'min(680px, calc(100vw - 40px))',
    maxHeight: 'calc(100dvh - 80px)',
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    color: color.text,
    boxShadow: color.shadow,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    animationName: sheetIn,
    animationDuration: '0.32s',
    animationTimingFunction: ease.out,
    '::backdrop': {
      backgroundColor: color.scrim,
      animationName: fadeIn,
      animationDuration: '0.25s',
      animationTimingFunction: ease.out
    }
  },
  sheet: {
    position: 'relative',
    paddingTop: '28px',
    paddingBottom: '28px',
    paddingLeft: { default: '32px', [SMALL]: '20px' },
    paddingRight: { default: '32px', [SMALL]: '20px' },
    fontFamily: font.sans
  },
  close: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: color.well, ':hover': color.grayBg },
    color: color.text2,
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px',
    transitionProperty: 'background-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out
  },
  sheetHead: { display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' },
  sheetIcon: { width: '88px', height: '88px', flexShrink: 0, borderRadius: '20px' },
  sheetInfo: { display: 'flex', minWidth: 0, flexGrow: 1, flexDirection: 'column', alignItems: 'flex-start' },
  sheetName: {
    fontFamily: font.display,
    fontSize: { default: '28px', [SMALL]: '24px' },
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    color: color.text
  },
  sheetMeta: { marginTop: '4px', fontSize: '15px', color: color.text2 },
  open: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '40px',
    paddingLeft: '26px',
    paddingRight: '26px',
    borderRadius: radius.pill,
    backgroundColor: { default: color.accent, ':hover': color.accentHover },
    color: color.onAccent,
    fontFamily: font.sans,
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px',
    transitionProperty: 'background-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out
  },
  facts: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '24px',
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(5, minmax(0, 1fr))', [SMALL]: 'repeat(2, minmax(0, 1fr))' },
    gap: '16px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    paddingTop: '18px'
  },
  fact: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  factK: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  factV: { fontSize: '15px', fontWeight: 600, color: color.text },
  factS: { fontSize: '12px', color: color.text3 },
  sheetTitle: {
    margin: 0,
    marginTop: '32px',
    fontFamily: font.display,
    fontSize: '19px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  logs: { marginTop: '4px' },
  release: {
    marginTop: '18px',
    paddingTop: '14px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  releaseHead: { margin: 0, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' },
  releaseVersion: { fontFamily: font.mono, fontSize: '13px', fontWeight: 600, color: color.text },
  latest: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '7px',
    paddingRight: '7px',
    borderRadius: '999px',
    backgroundColor: color.accentSoft,
    color: color.accent,
    fontFamily: font.sans,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  privacy: {
    marginTop: '16px',
    padding: '18px',
    borderRadius: radius.md,
    backgroundColor: color.well,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    flexWrap: 'wrap'
  },
  privacyGlyph: { display: 'inline-flex', color: color.text2 },
  privacyText: { margin: 0, flexGrow: 1, minWidth: '220px', fontSize: '14px', lineHeight: 1.5, color: color.text2 },
  privacyTitle: { display: 'block', fontSize: '15px', fontWeight: 600, color: color.text },
  sheetFoot: { marginTop: '24px', marginBottom: 0, fontSize: '13px', color: color.text3 }
})
