// The floating chrome: a glass sidebar on the wide display and a glass tab
// bar on the cover, plus the search capsule both share.
import { art } from '@doan-labs/duo-fixtures'
import type { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

export type Section = { key: string; label: string; glyph: keyof typeof SYM }
export const CHANNELS: Section[] = [
  { key: 'latest', label: 'Latest', glyph: 'bolt' },
  { key: 'rising', label: 'Trending', glyph: 'gauge' },
  { key: 'showdev', label: 'Showcase', glyph: 'star' },
  { key: 'discuss', label: 'Discuss', glyph: 'activity' },
  { key: 'career', label: 'Career', glyph: 'building' }
]
export const TABS: Section[] = [
  { key: 'today', label: 'Today', glyph: 'document' },
  { key: 'latest', label: 'Latest', glyph: 'bolt' },
  { key: 'following', label: 'Following', glyph: 'peopleStack' },
  { key: 'saved', label: 'Saved', glyph: 'bookmark' },
  { key: 'search', label: 'Search', glyph: 'search' }
]

export const Field = ({
  value,
  onChange,
  placeholder = 'Search'
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) => (
  <label {...stylex.props(styles.search)}>
    <Sym name="search" size={14} />
    <input
      aria-label="Search stories"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...stylex.props(styles.searchInput)}
    />
  </label>
)

const Cap = ({ children }: { children: string }) => <div {...stylex.props(styles.sideCap)}>{children}</div>

const Row = ({
  s,
  on,
  pick,
  badge
}: {
  s: { key: string; label: string; glyph?: keyof typeof SYM; mark?: string }
  on: boolean
  pick: (key: string) => void
  badge?: number
}) => (
  <button
    type="button"
    aria-current={on ? 'page' : undefined}
    onClick={() => pick(s.key)}
    {...stylex.props(styles.sideRow, on && styles.sideRowOn, shared.select)}
  >
    {s.mark ? (
      <span {...stylex.props(styles.sideMark, mark(s.mark))}>{s.label[0]}</span>
    ) : (
      <Sym name={s.glyph!} size={16} />
    )}
    <span {...stylex.props(styles.sideLabel)}>{s.label}</span>
    {badge ? <span {...stylex.props(styles.sideN)}>{badge}</span> : null}
  </button>
)
const mark = (seed: string) => styles.bgImg(art(seed))

export function Sidebar({
  tab,
  pick,
  query,
  onQuery,
  topics,
  saved,
  refresh
}: {
  tab: string
  pick: (key: string) => void
  query: string
  onQuery: (q: string) => void
  topics: string[]
  saved: number
  refresh: () => void
}) {
  return (
    <nav aria-label="News sections" {...stylex.props(styles.side)}>
      <Field value={query} onChange={onQuery} />
      <div {...stylex.props(styles.sideList)}>
        <Row s={{ key: 'today', label: 'Today', glyph: 'document' }} on={tab === 'today'} pick={pick} />
        <Cap>Channels</Cap>
        {CHANNELS.map((s) => (
          <Row key={s.key} s={s} on={tab === s.key} pick={pick} />
        ))}
        <Cap>Following</Cap>
        {topics.map((t) => (
          <Row key={t} s={{ key: `topic:${t}`, label: t, mark: t }} on={tab === `topic:${t}`} pick={pick} />
        ))}
        <Row s={{ key: 'following', label: 'All Topics', glyph: 'plus' }} on={tab === 'following'} pick={pick} />
        <Cap>Library</Cap>
        <Row
          s={{ key: 'saved', label: 'Saved Stories', glyph: 'bookmark' }}
          on={tab === 'saved'}
          pick={pick}
          badge={saved}
        />
        <Row s={{ key: 'history', label: 'History', glyph: 'clockSym' }} on={tab === 'history'} pick={pick} />
      </div>
      <div {...stylex.props(styles.sideFoot)}>
        <span {...stylex.props(styles.sideFootText)}>
          <span {...stylex.props(styles.sideFootName)}>DEV Community</span>
          <span {...stylex.props(styles.sideFootSub)}>dev.to</span>
        </span>
        <button
          type="button"
          aria-label="Refresh feeds"
          title="Refresh feeds"
          {...stylex.props(styles.sideFootGo, shared.press)}
          onClick={refresh}
        >
          <Sym name="reload" size={15} />
        </button>
      </div>
    </nav>
  )
}

/** The cover's answer to the sidebar. */
export function Tabs({ tab, pick }: { tab: string; pick: (key: string) => void }) {
  return (
    <nav aria-label="News sections" {...stylex.props(styles.tabs)}>
      {TABS.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-current={s.key === tab ? 'page' : undefined}
          onClick={() => pick(s.key)}
          {...stylex.props(styles.tab, s.key === tab && styles.tabOn, shared.press)}
        >
          <Sym name={s.glyph} size={20} />
          {s.label}
        </button>
      ))}
    </nav>
  )
}
