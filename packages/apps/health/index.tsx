// Health, end to end: the floating glass sidebar and Browse catalog of iPadOS
// unfolded, a cover that pushes the same pages over a floating tab bar. One
// `path` cell is the navigation for both, so folding keeps the page, and one
// book in fixtures holds the data Fitness shares.

import { day, todayKey } from '@doan-labs/duo-fixtures/health.ts'
import type { Os } from '@doan-labs/duo-sdk'
import { Nav, Row, Section, useNav, useWide } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { ActivityPage, MetricPage } from './metric.tsx'
import { CATS, METRICS, metric, valOf } from './metrics.ts'
import { AddDataSheet, AddWorkoutSheet, Avatar, Find, Mark } from './parts.tsx'
import { ProfilePage } from './profile.tsx'
import { SharingPage } from './sharing.tsx'
import { SleepPage } from './sleep.tsx'
import { goBack, goRoot, goTo, goToPath, useBook, usePath, useTicker } from './store.ts'
import { styles } from './styles.ts'
import { SummaryPage } from './summary.tsx'
import { WorkoutsPage } from './workouts.tsx'

const TABS: { id: string; label: string; sym: SymProps['name'] }[] = [
  { id: 'summary', label: 'Summary', sym: 'list' },
  { id: 'sharing', label: 'Sharing', sym: 'people' },
  { id: 'browse', label: 'Browse', sym: 'grid' }
]

export function Health({ os }: { os: Os }) {
  const [box, wide] = useWide()
  useTicker(os.mirror)
  // The subscription lives at the root: any write re-renders both displays' copies.
  useBook()
  const path = usePath()
  const [query, setQuery] = useState('')
  const sel = path.at(-1)!
  const tab = TABS.some((t) => t.id === path[0]) ? path[0]! : 'summary'
  return (
    <div ref={box} {...stylex.props(styles.split)}>
      {wide && <Sidebar query={query} onQuery={setQuery} sel={sel} />}
      <div {...stylex.props(styles.pane, wide && styles.paneSide)}>
        {wide ? (
          // Keyed on the destination: picking another swaps the pane with a fade.
          <div key={sel} {...stylex.props(shared.column, shared.swap, styles.paneRoot)}>
            <DestPage dest={sel} os={os} wide />
          </div>
        ) : (
          <CoverStack os={os} />
        )}
      </div>
      {!wide && <Tabs tab={tab} />}
      <AddDataSheet />
      <AddWorkoutSheet />
    </div>
  )
}

/** The destination dispatcher: one page per id, the same list the sidebar names. */
function DestPage({ dest, os, wide }: { dest: string; os: Os; wide: boolean }) {
  if (dest === 'summary') return <SummaryPage wide={wide} />
  if (dest === 'browse') return <BrowsePage />
  if (dest === 'sharing') return <SharingPage os={os} wide={wide} />
  if (dest === 'profile') return <ProfilePage wide={wide} />
  if (dest === 'cat:workouts') return <WorkoutsPage wide={wide} />
  if (dest.startsWith('cat:')) {
    const cat = CATS.find((c) => c.id === dest.slice(4))
    if (cat) return <CategoryPage cat={cat} wide={wide} />
  }
  if (dest.startsWith('m:')) {
    const m = metric(dest.slice(2))
    if (!m) return null
    if (m.kind === 'sleep') return <SleepPage wide={wide} />
    if (m.kind === 'rings') return <ActivityPage os={os} wide={wide} />
    return <MetricPage m={m} wide={wide} />
  }
  return <SummaryPage wide={wide} />
}

/** The cover stack: the root tab page, then each deeper destination slid over it. */
function CoverStack({ os }: { os: Os }) {
  const path = usePath()
  const root = TABS.some((t) => t.id === path[0]) ? path[0]! : 'summary'
  return (
    // Keyed on the tab: switching tabs drops whatever the last one pushed.
    <Nav key={root}>
      <DestPage dest={root} os={os} wide={false} />
      <SyncPath os={os} />
    </Nav>
  )
}

/** Applies the path cell to the Nav stack: a `goTo` anywhere pushes both displays. */
function SyncPath({ os }: { os: Os }) {
  const path = usePath()
  const { push, pop } = useNav()
  const depth = useRef(1)
  useEffect(() => {
    while (depth.current < path.length) {
      const d = path[depth.current]!
      depth.current++
      push(() => <DestPage dest={d} os={os} wide={false} />)
    }
    while (depth.current > Math.max(1, path.length)) {
      depth.current--
      pop()
    }
  }, [path, push, pop, os])
  return null
}

/** The floating glass sidebar: search, Summary and Sharing, then the Browse categories. */
function Sidebar({ query, onQuery, sel }: { query: string; onQuery: (q: string) => void; sel: string }) {
  const book = useBook()
  const q = query.trim().toLowerCase()
  const found = q ? METRICS.filter((m) => m.name.toLowerCase().includes(q)) : []
  const catOf = (id: string) => CATS.find((c) => c.metrics.some((m) => m.id === id))?.id ?? 'activity'
  return (
    <nav aria-label="Health" {...stylex.props(styles.side)}>
      <Find query={query} onQuery={onQuery} />
      <div {...stylex.props(styles.sideList)}>
        {q ? (
          found.map((m) => (
            <SideRow
              key={m.id}
              sym={m.sym}
              label={m.name}
              on={sel === `m:${m.id}`}
              pick={() => goToPath(['browse', `cat:${catOf(m.id)}`, `m:${m.id}`])}
            />
          ))
        ) : (
          <>
            <SideRow sym="list" label="Summary" on={sel === 'summary'} pick={() => goRoot('summary')} />
            <SideRow sym="people" label="Sharing" on={sel === 'sharing'} pick={() => goRoot('sharing')} />
            <div {...stylex.props(styles.sideSec)}>Browse</div>
            {CATS.map((c) => (
              <SideRow
                key={c.id}
                sym={c.sym}
                tint={c.tint}
                label={c.name}
                on={sel === `cat:${c.id}` || (sel.startsWith('m:') && catOf(sel.slice(2)) === c.id)}
                pick={() => goToPath(['browse', `cat:${c.id}`])}
              />
            ))}
          </>
        )}
        {q && found.length === 0 && <p {...stylex.props(shared.sub, styles.empty)}>No results for “{query.trim()}”.</p>}
      </div>
      <button type="button" onClick={() => goRoot('profile')} {...stylex.props(styles.sideFoot, shared.select)}>
        <Avatar name={book.profile.name} />
        <span>
          <div {...stylex.props(styles.sideFootName)}>{book.profile.name}</div>
          <div {...stylex.props(styles.sideFootSub)}>Health Details</div>
        </span>
        <span {...stylex.props(styles.chev)}>
          <Sym name="forward" size={13} />
        </span>
      </button>
    </nav>
  )
}

function SideRow({
  sym,
  tint,
  label,
  on,
  pick
}: {
  sym: SymProps['name']
  tint?: string
  label: string
  on: boolean
  pick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={on || undefined}
      onClick={pick}
      {...stylex.props(styles.sideRow, on && styles.sideRowOn, shared.select)}
    >
      <span {...stylex.props(styles.sideTint, tint ? styles.capTint(tint) : undefined)}>
        <Sym name={sym} size={15} />
      </span>
      <span {...stylex.props(styles.sideLabel)}>{label}</span>
    </button>
  )
}

/** The cover's floating tab bar. */
function Tabs({ tab }: { tab: string }) {
  return (
    <nav aria-label="Health tabs" {...stylex.props(styles.tabs)}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => goRoot(t.id)}
          {...stylex.props(styles.tab, t.id === tab && styles.tabOn, shared.press)}
        >
          <Sym name={t.sym} size={18} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}

/** The category list: iPhone's Browse tab, and the pane a sidebar-less cover opens. */
function BrowsePage() {
  const today = day(todayKey())
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const found = q ? METRICS.filter((m) => m.name.toLowerCase().includes(q)) : []
  const catOf = (id: string) => CATS.find((c) => c.metrics.some((m) => m.id === id))
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Browse</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.segRow, styles.date)}>
          <div {...stylex.props(styles.sideFind, styles.grow)}>
            <Sym name="search" size={14} />
            <input
              type="search"
              value={query}
              placeholder="Search metrics"
              aria-label="Search metrics"
              onChange={(e) => setQuery(e.target.value)}
              {...stylex.props(styles.sideField)}
            />
          </div>
        </div>
        {q ? (
          <Section>
            {found.map((m) => (
              <Row
                key={m.id}
                as="button"
                onClick={() => goToPath(['browse', `cat:${catOf(m.id)?.id ?? 'activity'}`, `m:${m.id}`])}
                icon={<Mark sym={m.sym} tint={m.tint} />}
                label={m.name}
                detail={m.pick ? valOf(m, m.pick(today)) : undefined}
                chevron
                xstyle={styles.linkRow}
              />
            ))}
            {found.length === 0 && <Row label={`No metrics match “${query.trim()}”`} />}
          </Section>
        ) : (
          <Section>
            {CATS.map((c) => (
              <Row
                key={c.id}
                as="button"
                onClick={() => goTo(`cat:${c.id}`)}
                icon={<Mark sym={c.sym} tint={c.tint} />}
                label={c.name}
                chevron
                xstyle={styles.linkRow}
              />
            ))}
          </Section>
        )}
      </div>
    </>
  )
}

/** A category's metric rows, each with today's value and a chevron. */
function CategoryPage({ cat, wide }: { cat: (typeof CATS)[number]; wide: boolean }) {
  const today = day(todayKey())
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(styles.cap, styles.capTint(cat.tint))}>
          <Sym name={cat.sym} size={18} />
          {cat.name}
        </span>
      </div>
      <div {...stylex.props(styles.body)}>
        <Section>
          {cat.metrics.map((m) => (
            <Row
              key={m.id}
              as="button"
              onClick={() => goTo(`m:${m.id}`)}
              icon={<Mark sym={m.sym} tint={m.tint} />}
              label={m.name}
              detail={m.pick ? valOf(m, m.pick(today)) : undefined}
              chevron
              xstyle={styles.linkRow}
            />
          ))}
        </Section>
      </div>
    </>
  )
}

function BackBtn() {
  return (
    <button type="button" aria-label="Back" onClick={goBack} {...stylex.props(shared.bk, shared.press)}>
      <Sym name="back" size={20} />
    </button>
  )
}
