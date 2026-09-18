import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { byId, GLYPH, PLACES, type Place, SUGGESTED } from './data.ts'
import { styles } from './styles.ts'

type Props = {
  sel: Place | null
  onSelect: (p: Place) => void
  query: string
  onQuery: (q: string) => void
  recents: [string, string][]
  onClear: () => void
  /** Folded, this content is the bottom sheet, which has no collapse control. */
  sheet?: boolean
  onCollapse: () => void
}

export function Sidebar({ sel, onSelect, query, onQuery, recents, onClear, sheet, onCollapse }: Props) {
  const q = query.trim().toLowerCase()
  const found = q ? PLACES.filter((p) => `${p.name} ${p.kind} ${p.address.join(' ')}`.toLowerCase().includes(q)) : []
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
            placeholder="Duo Maps"
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
          found.length ? (
            found.map((p) => row(p, p.kind))
          ) : (
            <div {...stylex.props(styles.empty)}>No results for “{query.trim()}”</div>
          )
        ) : (
          <>
            {suggestion && (
              <>
                <div {...stylex.props(styles.section)}>Siri Suggestions</div>
                {row(suggestion, 'Recently viewed')}
              </>
            )}
            <div {...stylex.props(styles.section)}>Recents</div>
            {recents.map(([id, note]) => {
              const p = byId(id)
              return p ? row(p, note) : null
            })}
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
