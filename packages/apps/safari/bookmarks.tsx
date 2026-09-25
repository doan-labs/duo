import { Menu, type MenuEntry } from '@doan-labs/duo-uikit'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState, useSyncExternalStore } from 'react'
import { clearHistory, forgetVisit, host, type Mark, type MarkList, safari, unmark, type Visit } from './store.ts'
import { styles } from './styles.ts'

// The cover closes bookmarks from its rail; the inner display passes onClose.
type Props = {
  onNavigate: (url: string) => void
  onClose?: () => void
  /** "Add Bookmark to…" hands the sheet a page and asks where to save it. */
  pickFor?: { url: string; title: string } | null
  onPick?: (list: MarkList) => void
}
type Section = 'bookmarks' | 'reading-list' | 'history'
type Folder = 'recently-saved' | 'favorites'

const sections: [Section, string, 'bookOutline' | 'eye' | 'clockSym'][] = [
  ['bookmarks', 'Bookmarks', 'bookOutline'],
  ['reading-list', 'Reading List', 'eye'],
  ['history', 'History', 'clockSym']
]

// The three places a page can be saved, in the order iOS lists them.
const destinations: [MarkList, string, 'star' | 'bookmark' | 'eye'][] = [
  ['favorites', 'Favorites', 'star'],
  ['bookmarks', 'Bookmarks', 'bookmark'],
  ['reading', 'Reading List', 'eye']
]

// Calendar midnights, not 24h steps: a daylight-saving day is 23 or 25 hours.
const midnight = (daysBack = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysBack)
  return d.getTime()
}
const dayLabel = (at: number) => {
  if (at >= midnight()) return 'Today'
  if (at >= midnight(1)) return 'Yesterday'
  return new Date(at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

// One rendered row, whatever its store entry is.
type Row = { key: string; title: string; detail: string; icon: SymProps['name']; onGo: () => void; onDel: () => void }
const markRow = (m: Mark, list: MarkList, onNavigate: Props['onNavigate']): Row => ({
  key: `${list}:${m.url}`,
  title: m.title,
  detail: host(m.url),
  icon: list === 'favorites' ? 'star' : list === 'reading' ? 'eye' : 'bookmark',
  onGo: () => onNavigate(m.url),
  onDel: () => unmark(m.url, list)
})
const visitRow = (v: Visit, onNavigate: Props['onNavigate']): Row => ({
  key: `${v.at}:${v.url}`,
  title: v.title,
  detail: host(v.url),
  icon: 'globe',
  onGo: () => onNavigate(v.url),
  onDel: () => forgetVisit(v)
})

const Rows = ({ rows, editing }: { rows: Row[]; editing: boolean }) => (
  <div {...stylex.props(styles.bookmarkGroup)}>
    {rows.map((r) => (
      <div key={r.key} {...stylex.props(styles.bookmarkRowWrap)}>
        {editing && (
          <button
            type="button"
            aria-label={`Remove ${r.title}`}
            {...stylex.props(styles.bookmarkMinus)}
            onClick={r.onDel}
          >
            <Sym name="minus" size={12} />
          </button>
        )}
        <button
          type="button"
          disabled={editing}
          {...stylex.props(styles.bookmarkRow, styles.bookmarkRowIn)}
          onClick={r.onGo}
        >
          <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconLink)}>
            <Sym name={r.icon} size={17} />
          </span>
          <span {...stylex.props(styles.bookmarkLabel)}>
            <span {...stylex.props(styles.bookmarkName)}>{r.title}</span>
            <span {...stylex.props(styles.bookmarkDetail)}>{r.detail}</span>
          </span>
          {!editing && <Sym name="forward" size={15} />}
        </button>
      </div>
    ))}
  </div>
)

const Empty = ({ children }: { children: string }) => <div {...stylex.props(styles.bookmarkEmpty)}>{children}</div>

export const Bookmarks = ({ onNavigate, onClose, pickFor, onPick }: Props) => {
  const book = useSyncExternalStore(safari.subscribe, safari.get)
  const [section, setSection] = useState<Section>('bookmarks')
  const [folder, setFolder] = useState<Folder | null>(null)
  const [editing, setEditing] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  // Recently Saved is everything bookmarked anywhere, newest first.
  const saved = [
    ...book.favorites.map((m) => ({ m, list: 'favorites' as const })),
    ...book.bookmarks.map((m) => ({ m, list: 'bookmarks' as const }))
  ].sort((a, b) => b.m.added - a.m.added)

  // Consecutive visits on one day share a section header.
  const days: [string, Visit[]][] = []
  for (const v of book.history) {
    const label = dayLabel(v.at)
    const top = days.at(-1)
    if (top?.[0] === label) top[1].push(v)
    else days.push([label, [v]])
  }

  const showBack = folder !== null
  const showRoot = section === 'bookmarks' && folder === null
  const title = pickFor ? 'Add Bookmark' : folder === 'favorites' ? 'Favorites' : 'Recently Saved'
  const inHistory = section === 'history' && !folder
  const rows =
    pickFor !== null
      ? 0
      : folder === 'recently-saved'
        ? saved.length
        : folder === 'favorites'
          ? book.favorites.length
          : inHistory
            ? book.history.length
            : section === 'reading-list'
              ? book.reading.length
              : book.bookmarks.length
  // Done must stay reachable while editing, or deleting the last row strands
  // the mode with no way out and a later row arrives disabled.
  const canEdit = !pickFor && (editing || rows > 0)

  const selectSection = (next: Section) => {
    setSection(next)
    setFolder(null)
    setEditing(false)
  }
  const openFolder = (next: Folder) => {
    setFolder(next)
    setEditing(false)
  }
  const back = () => {
    setFolder(null)
    setEditing(false)
  }
  const clearMenu: MenuEntry[] = [
    { label: 'the last hour', onSelect: () => clearHistory(Date.now() - 3_600_000) },
    { label: 'today', onSelect: () => clearHistory(midnight()) },
    { label: 'today and yesterday', onSelect: () => clearHistory(midnight(1)) },
    { label: 'all time', onSelect: () => clearHistory(0) }
  ]

  return (
    <div {...stylex.props(styles.bookmarks)}>
      <div {...stylex.props(styles.bookmarkHeader)}>
        {showBack && !pickFor && (
          <button
            type="button"
            {...stylex.props(styles.bookmarkHeaderBack)}
            aria-label="Back to bookmarks"
            onClick={back}
          >
            <Sym name="back" size={18} />
          </button>
        )}
        <button
          type="button"
          {...stylex.props(styles.bookmarkHeaderButton)}
          onClick={() => !showBack && !pickFor && openFolder('recently-saved')}
        >
          <span>{title}</span>
          {!showBack && !pickFor && <Sym name="forward" size={15} />}
        </button>
        {onClose && (
          <button type="button" {...stylex.props(styles.bookmarkClose)} aria-label="Close bookmarks" onClick={onClose}>
            <Sym name="close" size={13} />
          </button>
        )}
      </div>
      {!pickFor && (
        <div {...stylex.props(styles.bookmarkSegments)} role="tablist" aria-label="Bookmarks sections">
          {sections.map(([id, label, icon]) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={section === id}
              aria-label={label}
              {...stylex.props(styles.bookmarkSegment, section === id && styles.bookmarkSegmentOn)}
              onClick={() => selectSection(id)}
            >
              <Sym name={icon} size={21} />
            </button>
          ))}
        </div>
      )}
      <div {...stylex.props(styles.bookmarkBody)}>
        {pickFor ? (
          <>
            <div {...stylex.props(styles.bookmarkGroup)}>
              <div {...stylex.props(styles.bookmarkRow)}>
                <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconLink)}>
                  <Sym name="globe" size={17} />
                </span>
                <span {...stylex.props(styles.bookmarkLabel)}>
                  <span {...stylex.props(styles.bookmarkName)}>{pickFor.title}</span>
                  <span {...stylex.props(styles.bookmarkDetail)}>{host(pickFor.url)}</span>
                </span>
              </div>
            </div>
            <div {...stylex.props(styles.bookmarkSection)}>Add to</div>
            <div {...stylex.props(styles.bookmarkGroup)}>
              {destinations.map(([list, name, icon]) => (
                <button type="button" key={list} {...stylex.props(styles.bookmarkRow)} onClick={() => onPick?.(list)}>
                  <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconFolder)}>
                    <Sym name={icon} size={17} />
                  </span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </>
        ) : showRoot ? (
          <>
            <div {...stylex.props(styles.bookmarkSection)}>Folders</div>
            <div {...stylex.props(styles.bookmarkGroup)}>
              <button type="button" {...stylex.props(styles.bookmarkRow)} onClick={() => openFolder('favorites')}>
                <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconStar)}>
                  <Sym name="star" size={17} />
                </span>
                <span>Favorites</span>
                <span {...stylex.props(styles.bookmarkCount)}>{book.favorites.length}</span>
                <Sym name="forward" size={15} />
              </button>
            </div>
            <div {...stylex.props(styles.bookmarkSection)}>Bookmarks</div>
            {book.bookmarks.length ? (
              <Rows rows={book.bookmarks.map((m) => markRow(m, 'bookmarks', onNavigate))} editing={editing} />
            ) : (
              <Empty>No bookmarks</Empty>
            )}
          </>
        ) : folder === 'favorites' ? (
          <>
            <div {...stylex.props(styles.bookmarkSection)}>Favorites</div>
            {book.favorites.length ? (
              <Rows rows={book.favorites.map((m) => markRow(m, 'favorites', onNavigate))} editing={editing} />
            ) : (
              <Empty>No favorites</Empty>
            )}
          </>
        ) : folder === 'recently-saved' ? (
          <>
            <div {...stylex.props(styles.bookmarkSection)}>Recently Saved</div>
            {saved.length ? (
              <Rows rows={saved.map(({ m, list }) => markRow(m, list, onNavigate))} editing={editing} />
            ) : (
              <Empty>Nothing saved yet</Empty>
            )}
          </>
        ) : inHistory ? (
          days.length ? (
            days.map(([label, visits]) => (
              <div key={label}>
                <div {...stylex.props(styles.bookmarkSection)}>{label}</div>
                <Rows rows={visits.map((v) => visitRow(v, onNavigate))} editing={editing} />
              </div>
            ))
          ) : (
            <Empty>No history</Empty>
          )
        ) : (
          <>
            <div {...stylex.props(styles.bookmarkSection)}>Reading List</div>
            {book.reading.length ? (
              <Rows rows={book.reading.map((m) => markRow(m, 'reading', onNavigate))} editing={editing} />
            ) : (
              <Empty>Nothing saved to read later</Empty>
            )}
          </>
        )}
      </div>
      {canEdit && (
        <div {...stylex.props(styles.bookmarkFoot)}>
          {inHistory ? (
            <button
              type="button"
              {...stylex.props(styles.bookmarkFootBtn)}
              aria-expanded={clearOpen}
              onClick={() => setClearOpen((o) => !o)}
            >
              Clear
            </button>
          ) : (
            <span />
          )}
          <button type="button" {...stylex.props(styles.bookmarkFootBtn)} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      )}
      <Menu
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        size={18}
        xstyle={styles.bookmarkMenu}
        itemStyle={styles.moreItem}
        items={clearMenu}
      />
    </div>
  )
}
