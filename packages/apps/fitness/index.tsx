// Fitness, end to end: the dark floating-glass chrome of the iPad app - a
// sidebar with the four destinations on the inner display, a tab bar and push
// stack on the cover - over the shared health book, so a workout logged here
// is already on Health's charts.

import type { Os } from '@doan-labs/duo-sdk'
import { Nav, useNav, useWide } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { ActivityPage } from './activity.tsx'
import { AwardsPage } from './awards.tsx'
import { AddWorkoutSheet, GoalsSheet } from './parts.tsx'
import { goRoot, resetDay, useBook, usePath, useTicker } from './store.ts'
import { styles } from './styles.ts'
import { SummaryPage } from './summary.tsx'
import { WorkoutPage, WorkoutsPage } from './workouts.tsx'

const TABS: { id: string; label: string; sym: SymProps['name'] }[] = [
  { id: 'summary', label: 'Summary', sym: 'star' },
  { id: 'activity', label: 'Activity', sym: 'activity' },
  { id: 'workouts', label: 'Workouts', sym: 'walk' },
  { id: 'awards', label: 'Awards', sym: 'starFill' }
]

export function Fitness({ os }: { os: Os }) {
  const [box, wide] = useWide()
  useTicker(os.mirror)
  useBook()
  const path = usePath()
  const sel = path.at(-1)!
  const tab = TABS.some((t) => t.id === path[0]) ? path[0]! : 'summary'
  return (
    <div ref={box} {...stylex.props(styles.split)}>
      {wide && <Sidebar sel={sel} />}
      <div {...stylex.props(styles.pane, wide && styles.paneSide)}>
        {wide ? (
          <div key={sel} {...stylex.props(shared.column, shared.swap, styles.paneWide)}>
            <DestPage dest={sel} wide />
          </div>
        ) : (
          <CoverStack />
        )}
      </div>
      {!wide && <Tabs tab={tab} />}
      <AddWorkoutSheet />
      <GoalsSheet />
    </div>
  )
}

function DestPage({ dest, wide }: { dest: string; wide: boolean }) {
  if (dest === 'activity') return <ActivityPage wide={wide} />
  if (dest === 'workouts') return <WorkoutsPage wide={wide} />
  if (dest === 'awards') return <AwardsPage wide={wide} />
  if (dest.startsWith('w:')) return <WorkoutPage id={dest.slice(2)} wide={wide} />
  return <SummaryPage wide={wide} />
}

/** The cover stack: the tab's root page, then `w:<id>` pushes over it. */
function CoverStack() {
  const path = usePath()
  const root = TABS.some((t) => t.id === path[0]) ? path[0]! : 'summary'
  return (
    <Nav key={root}>
      <DestPage dest={root} wide={false} />
      <SyncPath />
    </Nav>
  )
}

function SyncPath() {
  const path = usePath()
  const { push, pop } = useNav()
  const depth = useRef(1)
  useEffect(() => {
    while (depth.current < path.length) {
      const d = path[depth.current]!
      depth.current++
      push(() => <DestPage dest={d} wide={false} />)
    }
    while (depth.current > Math.max(1, path.length)) {
      depth.current--
      pop()
    }
  }, [path, push, pop])
  return null
}

/** The dark glass sidebar: the four destinations and the app title. */
function Sidebar({ sel }: { sel: string }) {
  return (
    <nav aria-label="Fitness" {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideTitle)}>Fitness</div>
      <div {...stylex.props(styles.sideList)}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={sel === t.id ? 'page' : undefined}
            onClick={() => {
              if (t.id === 'activity') resetDay()
              goRoot(t.id)
            }}
            {...stylex.props(styles.sideRow, sel === t.id && styles.sideRowOn, shared.select)}
          >
            <span {...stylex.props(styles.sideTint)}>
              <Sym name={t.sym} size={15} />
            </span>
            <span {...stylex.props(styles.sideLabel)}>{t.label}</span>
          </button>
        ))}
      </div>
      <div {...stylex.props(styles.sideFoot)}>
        <span {...stylex.props(styles.chip)}>
          <Sym name="heartFill" size={11} />
          Shares Health's book
        </span>
      </div>
    </nav>
  )
}

/** The cover's floating tab bar. */
function Tabs({ tab }: { tab: string }) {
  return (
    <nav aria-label="Fitness tabs" {...stylex.props(styles.tabs)}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => {
            if (t.id === 'activity') resetDay()
            goRoot(t.id)
          }}
          {...stylex.props(styles.tab, t.id === tab && styles.tabOn, shared.press)}
        >
          <Sym name={t.sym} size={18} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
