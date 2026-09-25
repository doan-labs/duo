// Library and every collection below it: the cover grid with progress lines,
// a sort menu, and the read/want badges a real shelf carries.

import { Menu } from '@doan-labs/duo-uikit/menu.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Cover } from './cover.tsx'
import { type Book, byId } from './data.ts'
import { useLib } from './store.ts'
import { styles } from './styles.ts'
import { go, openBook } from './ui.ts'

type SortKey = 'recent' | 'title' | 'author'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' }
]

const useShelf = (key: string): { title: string; books: Book[] } => {
  const lib = useLib()
  if (key === 'shelf:want') return { title: 'Want to Read', books: lib.want.map(byId) }
  if (key === 'shelf:finished') return { title: 'Finished', books: lib.finished.map(byId) }
  const custom = lib.shelves.find((s) => `shelf:${s.id}` === key)
  if (custom) return { title: custom.name, books: custom.ids.map(byId) }
  return { title: key === 'shelf:mine' ? 'My Books' : 'Library', books: lib.owned.map(byId) }
}

const Badge = ({ id }: { id: string }) => {
  const lib = useLib()
  if (lib.finished.includes(id))
    return (
      <span {...stylex.props(styles.badge)}>
        <Sym name="check" size={9} />
      </span>
    )
  if (lib.want.includes(id))
    return (
      <span {...stylex.props(styles.badge)}>
        <Sym name="heartFill" size={9} />
      </span>
    )
  return null
}

const sortBooks = (books: Book[], k: SortKey, recent: string[]) => {
  const s = [...books]
  if (k === 'title') s.sort((a, b) => a.title.localeCompare(b.title))
  else if (k === 'author') s.sort((a, b) => a.author.localeCompare(b.author))
  else
    s.sort(
      (a, b) =>
        (recent.indexOf(a.id) === -1 ? Infinity : recent.indexOf(a.id)) -
        (recent.indexOf(b.id) === -1 ? Infinity : recent.indexOf(b.id))
    )
  return s
}

export function Library({ shelf }: { shelf?: string }) {
  const lib = useLib()
  const { title, books } = useShelf(shelf ?? 'library')
  const [sort, setSort] = useState<SortKey>('recent')
  const [menu, setMenu] = useState(false)
  const recent = Object.entries(lib.progress)
    .sort((a, b) => b[1].t - a[1].t)
    .map(([id]) => id)
  const shown = sortBooks(books, sort, recent)
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.headTitle)}>{title}</h1>
        <div {...stylex.props(styles.headAct)}>
          <button
            type="button"
            aria-label="Sort"
            aria-expanded={menu}
            {...stylex.props(styles.headBtn, shared.press)}
            onClick={() => setMenu((m) => !m)}
          >
            <Sym name="ellipsis" size={17} />
          </button>
          <Menu
            open={menu}
            onClose={() => setMenu(false)}
            xstyle={[styles.sortMenu]}
            items={SORTS.map((s) => ({
              label: `Sort by ${s.label}`,
              checked: sort === s.key,
              onSelect: () => setSort(s.key)
            }))}
          />
        </div>
      </div>
      {shown.length ? (
        <div {...stylex.props(styles.grid)}>
          {shown.map((b) => (
            <button
              key={b.id}
              type="button"
              {...stylex.props(styles.cell, shared.press)}
              onClick={() => openBook(b.id)}
            >
              <span {...stylex.props(styles.cellCov)}>
                <Cover b={b} size="l" />
                <Badge id={b.id} />
              </span>
              <span {...stylex.props(styles.cellTitle)}>{b.title}</span>
              <span {...stylex.props(styles.cellAuthor)}>{b.author}</span>
              {(lib.progress[b.id]?.frac ?? 0) > 0 && (
                <span {...stylex.props(styles.cellMeta)}>
                  {lib.finished.includes(b.id) ? 'Finished' : `${Math.round((lib.progress[b.id]?.frac ?? 0) * 100)}%`}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div {...stylex.props(styles.empty)}>
          <p {...stylex.props(styles.emptyTitle)}>Nothing here yet</p>
          <p {...stylex.props(styles.emptySub)}>Add books from the Book Store, or mark some Want to Read.</p>
          <button type="button" {...stylex.props(styles.get, shared.press)} onClick={() => go('store')}>
            Book Store
          </button>
        </div>
      )}
    </>
  )
}
