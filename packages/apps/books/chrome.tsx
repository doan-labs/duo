// The floating chrome: a glass sidebar on the wide display and a glass tab
// bar on the cover, plus the search capsule they share. Apple's Books splits
// its sidebar into the app's sections up top and your collections underneath.

import type { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useLib } from './store.ts'
import { styles } from './styles.ts'
import { go, openCard, type Section, setQuery, useUi } from './ui.ts'

const SECTIONS: { key: Section; label: string; glyph: keyof typeof SYM }[] = [
  { key: 'home', label: 'Home', glyph: 'bookOutline' },
  { key: 'library', label: 'Library', glyph: 'library' },
  { key: 'store', label: 'Book Store', glyph: 'cart' },
  { key: 'audio', label: 'Audiobooks', glyph: 'volume' },
  { key: 'search', label: 'Search', glyph: 'search' }
]

const TABS: { key: Section; label: string; glyph: keyof typeof SYM }[] = [
  { key: 'home', label: 'Home', glyph: 'bookOutline' },
  { key: 'library', label: 'Library', glyph: 'library' },
  { key: 'store', label: 'Book Store', glyph: 'cart' },
  { key: 'audio', label: 'Audiobooks', glyph: 'volume' },
  { key: 'search', label: 'Search', glyph: 'search' }
]

export const Field = () => {
  const ui = useUi()
  return (
    <label {...stylex.props(styles.search)}>
      <Sym name="search" size={14} />
      <input
        aria-label="Search books"
        placeholder="Search"
        value={ui.q}
        onChange={(e) => {
          setQuery(e.target.value)
          if (ui.tab !== 'search') go('search')
        }}
        onFocus={() => ui.tab !== 'search' && go('search')}
        {...stylex.props(styles.searchInput)}
      />
      {ui.q ? (
        <button
          type="button"
          aria-label="Clear search"
          {...stylex.props(styles.searchX, shared.press)}
          onClick={() => setQuery('')}
        >
          <Sym name="xmark" size={11} />
        </button>
      ) : null}
    </label>
  )
}

const Row = ({
  label,
  glyph,
  on,
  pick,
  badge
}: {
  label: string
  glyph?: keyof typeof SYM
  on: boolean
  pick: () => void
  badge?: number
}) => (
  <button
    type="button"
    aria-current={on ? 'page' : undefined}
    onClick={pick}
    {...stylex.props(styles.sideRow, on && styles.sideRowOn, shared.select)}
  >
    {glyph && <Sym name={glyph} size={16} />}
    <span {...stylex.props(styles.sideLabel)}>{label}</span>
    {badge !== undefined && badge > 0 ? <span {...stylex.props(styles.sideN)}>{badge}</span> : null}
  </button>
)

const BUILT_INS: { label: string; glyph: keyof typeof SYM; key: `shelf:${string}` }[] = [
  { label: 'Want to Read', glyph: 'heart', key: 'shelf:want' },
  { label: 'Finished', glyph: 'check', key: 'shelf:finished' }
]

export function Sidebar() {
  const ui = useUi()
  const lib = useLib()
  return (
    <nav aria-label="Books sections" {...stylex.props(styles.side)}>
      <Field />
      <div {...stylex.props(styles.sideList)}>
        {SECTIONS.map((s) => (
          <Row key={s.key} label={s.label} glyph={s.glyph} on={ui.tab === s.key} pick={() => go(s.key)} />
        ))}
        <div {...stylex.props(styles.sideCap)}>Collections</div>
        {BUILT_INS.map((c) => (
          <Row
            key={c.key}
            label={c.label}
            glyph={c.glyph}
            on={ui.tab === c.key}
            pick={() => go(c.key)}
            badge={c.key === 'shelf:want' ? lib.want.length : lib.finished.length}
          />
        ))}
        <Row
          label="My Books"
          glyph="folder"
          on={ui.tab === 'shelf:mine'}
          pick={() => go('shelf:mine')}
          badge={lib.owned.length}
        />
        {lib.shelves.map((s) => (
          <Row
            key={s.id}
            label={s.name}
            glyph="folder"
            on={ui.tab === `shelf:${s.id}`}
            pick={() => go(`shelf:${s.id}`)}
            badge={s.ids.length}
          />
        ))}
        <button type="button" {...stylex.props(styles.sideNew, shared.press)} onClick={() => openCard('shelf')}>
          <Sym name="plus" size={13} />
          New Collection
        </button>
      </div>
    </nav>
  )
}

/** The cover's answer to the sidebar. */
export function Tabs() {
  const ui = useUi()
  return (
    <nav aria-label="Books sections" {...stylex.props(styles.tabs)}>
      {TABS.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-current={s.key === ui.tab ? 'page' : undefined}
          onClick={() => go(s.key)}
          {...stylex.props(styles.tab, s.key === ui.tab && styles.tabOn, shared.press)}
        >
          <Sym name={s.glyph} size={20} />
          {s.label}
        </button>
      ))}
    </nav>
  )
}
