import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { byId, GLYPH, PLACES, type Place, type Recent, SUGGESTED } from './data.ts'
import { styles } from './styles.ts'

type Props = {
  sel: Place | null
  onSelect: (p: Place) => void
  query: string
  onQuery: (q: string) => void
  /** Live geocoder hits for the query; local catalogue matches lead. */
  results: Place[]
  searching: boolean
  /** The geocoder answered with an error rather than a list. */
  failed: boolean
  recents: Recent[]
  onClear: () => void
  /** Folded, this content is the bottom sheet, which has no collapse control. */
  sheet?: boolean
  onCollapse: () => void
}

export function Sidebar({
  sel,
  onSelect,
  query,
  onQuery,
  results,
  searching,
  failed,
  recents,
  onClear,
  sheet,
  onCollapse
}: Props) {
  const q = query.trim().toLowerCase()
  const local = q ? PLACES.filter((p) => `${p.name} ${p.kind} ${p.address.join(' ')}`.toLowerCase().includes(q)) : []
  const found = [...local, ...results.filter((r) => !local.some((l) => l.name === r.name))]
  const suggestion = byId(SUGGESTED)
  const row = (p: Place, note: string) => (
    <button
      key={p.id}
      type="button"
      onClick={() => onSelect(p)}
      {...stylex.props(styles.row, sel?.id === p.id && styles.rowOn)}
    >
      <span {...stylex.props(styles.badge, styles[p.category])}>
        <Sym name={GLYPH[p.category]} size={12} />
      </span>
      <span {...stylex.props(styles.lines)}>
        <span {...stylex.props(styles.clip)}>{p.name}</span>
        <span {...stylex.props(styles.note, styles.clip)}>{note}</span>
      </span>
    </button>
  )
  return (
    <>
      <div {...stylex.props(styles.top)}>
        <label {...stylex.props(styles.field)}>
          <Sym name="search" size={12} />
          <input
            type="search"
            value={query}
            placeholder="Search Duo Maps"
            aria-label="Search Maps"
            onChange={(e) => onQuery(e.target.value)}
            {...stylex.props(styles.input)}
          />
        </label>
        {!sheet && (
          <button type="button" aria-label="Hide sidebar" onClick={onCollapse} {...stylex.props(styles.ghost)}>
            <Sym name="sidebar" size={15} />
          </button>
        )}
      </div>
      <div {...stylex.props(styles.scroll)}>
        {q ? (
          <>
            {found.map((p) => row(p, p.kind))}
            {searching && <div {...stylex.props(styles.note, styles.searching)}>Searching…</div>}
            {!searching && failed && <div {...stylex.props(styles.empty)}>Search isn’t available right now.</div>}
            {!searching && !failed && !found.length && (
              <div {...stylex.props(styles.empty)}>No results for “{query.trim()}”</div>
            )}
          </>
        ) : (
          <>
            {suggestion && (
              <>
                <div {...stylex.props(styles.section)}>Siri Suggestions</div>
                {row(suggestion, 'Recently viewed')}
              </>
            )}
            {recents.length > 0 && <div {...stylex.props(styles.section)}>Recents</div>}
            {recents.map(({ p, note }) => row(p, note))}
            {recents.length > 0 && (
              <button type="button" onClick={onClear} {...stylex.props(styles.link)}>
                Clear Recents
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
