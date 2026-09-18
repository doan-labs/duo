// The published apps, from the curated catalog (src/generated/catalog.ts, written from
// public/catalog/index.json at build time): release icon, newest version, permissions
// with their glyphs, and the first and latest release dates. The home page shows the
// grid; /apps adds the lane filter and the grid/list switch.
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { CATALOG } from '../generated/catalog'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Headline, Lede, Reveal } from './parts'

const SMALL = '@media (max-width: 734px)'

type App = (typeof CATALOG)[number]
type Lane = App['lane']
type Layout = 'grid' | 'list'
const LANES: { key: Lane; label: string; text: string }[] = [
  { key: 'official', label: 'Official', text: 'Built and signed off by Doan Labs. Ship with the simulator.' },
  {
    key: 'community',
    label: 'Community',
    text: 'Submitted through pull requests, reviewed, and published to the catalog.'
  }
]
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export function Apps({ all = false }: { all?: boolean }) {
  return (
    <Block labelledBy="apps-title">
      <Cap>07 · In the catalog</Cap>
      <Headline id="apps-title" lines={['Built for both displays', 'and the fold between them.']} />
      <Lede>
        Every app here is published in the Duo catalog and installs through the Store. Each one is a pull request in the
        repository, MIT licensed, and built for both displays.
      </Lede>
      <Shelf apps={all ? CATALOG : CATALOG.slice(0, 4)} layout="grid" />
    </Block>
  )
}

/** The /apps browser: a lane filter, a layout switch, and one section per lane. */
export function Browser() {
  const [lane, setLane] = useState<Lane | 'all'>('all')
  const [layout, setLayout] = useState<Layout>('grid')
  const shown = LANES.filter((l) => lane === 'all' || l.key === lane)
  return (
    <>
      <div {...stylex.props(styles.bar)}>
        <fieldset aria-label="Lane" {...stylex.props(styles.segment)}>
          {[{ key: 'all' as const, label: 'All' }, ...LANES].map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={lane === l.key}
              onClick={() => setLane(l.key)}
              {...stylex.props(styles.seg, lane === l.key && styles.segOn)}
            >
              {l.label}
              <span {...stylex.props(styles.count)}>
                {l.key === 'all' ? CATALOG.length : CATALOG.filter((a) => a.lane === l.key).length}
              </span>
            </button>
          ))}
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
      {shown.map((l) => {
        const apps = CATALOG.filter((a) => a.lane === l.key)
        return (
          <section key={l.key} aria-labelledby={`lane-${l.key}`} {...stylex.props(styles.lane)}>
            <h2 id={`lane-${l.key}`} {...stylex.props(styles.laneTitle)}>
              {l.label}
            </h2>
            <p {...stylex.props(styles.laneText)}>{l.text}</p>
            {apps.length === 0 ? (
              <p {...stylex.props(styles.empty)}>No {l.label.toLowerCase()} apps are published yet.</p>
            ) : (
              <Shelf apps={apps} layout={layout} />
            )}
          </section>
        )
      })}
    </>
  )
}

export function Shelf({ apps, layout }: { apps: readonly App[]; layout: Layout }) {
  if (layout === 'list')
    return (
      <table {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th {...stylex.props(styles.th)}>App</th>
            <th {...stylex.props(styles.th)}>Version</th>
            <th {...stylex.props(styles.th)}>Permissions</th>
            <th {...stylex.props(styles.th)}>Created</th>
            <th {...stylex.props(styles.th)}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id}>
              <td {...stylex.props(styles.td)}>
                <div {...stylex.props(styles.rowApp)}>
                  <img src={a.icon} alt="" width={1024} height={1024} {...stylex.props(styles.iconSm)} />
                  <div>
                    <a href={a.repo} {...stylex.props(styles.rowName)}>
                      {a.name}
                    </a>
                    <div {...stylex.props(styles.meta)}>{a.author}</div>
                  </div>
                </div>
              </td>
              <td {...stylex.props(styles.td, styles.mono)}>{a.version}</td>
              <td {...stylex.props(styles.td)}>
                <Permissions app={a} />
              </td>
              <td {...stylex.props(styles.td, styles.mono)}>{date(a.created)}</td>
              <td {...stylex.props(styles.td, styles.mono)}>{date(a.updated)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  return (
    <ul {...stylex.props(styles.grid)}>
      {apps.map((a, i) => (
        <li key={a.id} {...stylex.props(styles.item)}>
          <Reveal delay={(i % 2) * 0.08}>
            <article {...stylex.props(styles.card)}>
              <img src={a.icon} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
              <div {...stylex.props(styles.body)}>
                <h3 {...stylex.props(styles.name)}>
                  <a href={a.repo} {...stylex.props(styles.link)}>
                    {a.name}
                  </a>
                </h3>
                <p {...stylex.props(styles.meta)}>
                  {a.author} · v{a.version}
                  {a.releases > 1 && ` · ${a.releases} releases`}
                </p>
                <Permissions app={a} />
                <p {...stylex.props(styles.dates)}>
                  <span>Created {date(a.created)}</span>
                  <span>Updated {date(a.updated)}</span>
                </p>
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}

function Permissions({ app }: { app: App }) {
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

/** 14 px line glyphs: the permission set from packages/sdk/permissions.ts plus the layout switch. */
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
  grid: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5V7H9zM2.5 9H7v4.5H2.5zM9 9h4.5v4.5H9z',
  list: 'M5 3.5h8.5M5 8h8.5M5 12.5h8.5M2.5 3.5h.01M2.5 8h.01M2.5 12.5h.01'
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
  lane: { marginTop: '48px' },
  laneTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  laneText: { marginTop: '6px', marginBottom: 0, fontSize: '16px', color: color.text2 },
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
    marginTop: '24px',
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [SMALL]: 'minmax(0, 1fr)' },
    gap: '20px'
  },
  item: { display: 'block' },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    padding: '22px',
    borderRadius: '22px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border
  },
  icon: { width: '72px', height: '72px', flexShrink: 0, borderRadius: '16px' },
  iconSm: { width: '40px', height: '40px', flexShrink: 0, borderRadius: '9px' },
  body: { minWidth: 0, flexGrow: 1 },
  name: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '22px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    color: color.text
  },
  link: { color: color.text, textDecorationLine: 'none' },
  meta: { marginTop: '4px', marginBottom: 0, fontSize: '15px', lineHeight: 1.5, color: color.text2 },
  dates: {
    marginTop: '14px',
    marginBottom: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    fontFamily: font.mono,
    fontSize: '12px',
    color: color.text3
  },
  chips: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '12px',
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
    color: color.text
  },
  chipNone: { color: color.text3 },
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
    paddingTop: '14px',
    paddingBottom: '14px',
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
