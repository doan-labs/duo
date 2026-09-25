// The cover's root: the same tiles, My Lists and tags the sidebar shows, in
// iOS's grouped style with an ellipsis menu for "Edit Lists" at the top right
// and "+ Add List" pinned at the bottom left.

import { Menu, Section, Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { search } from './data.ts'
import { Find, MyLists, TagCloud, Tiles } from './parts.tsx'
import { ReminderRow } from './row.tsx'
import { useEditLists, useGo, useListSheet, useQuery, useReminders } from './store.ts'
import { styles } from './styles.ts'

export function ListsPage() {
  const { open } = useGo()
  const [q] = useQuery()
  const [editing, setEditing] = useEditLists()
  const [, setSheet] = useListSheet()
  const [menuOpen, setMenuOpen] = useState(false)
  const searching = q.trim() !== ''
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.headSide)}>
          <span {...stylex.props(styles.toolWrap)}>
            <button
              type="button"
              aria-label="More options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              {...stylex.props(styles.headBtn, shared.press)}
            >
              <Sym name="more" size={20} />
            </button>
            <Menu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              xstyle={styles.headMenu}
              items={[
                { label: editing ? 'Done' : 'Edit Lists', icon: 'checklist', onSelect: () => setEditing(!editing) }
              ]}
            />
          </span>
        </span>
      </div>
      <div {...stylex.props(styles.listsBody)}>
        <Find />
        {searching ? (
          <SearchResults q={q} />
        ) : (
          <>
            <Tiles pick={open} />
            <div {...stylex.props(styles.sideSec)}>My Lists</div>
            <Section xstyle={styles.listCard}>
              <MyLists />
            </Section>
            <TagCloud />
          </>
        )}
      </div>
      {!searching && (
        <div {...stylex.props(styles.newBar)}>
          <button type="button" onClick={() => setSheet('new')} {...stylex.props(styles.barBtn, shared.press)}>
            <Sym name="plus" size={17} />
            Add List
          </button>
        </div>
      )}
    </>
  )
}

/** Cover: the search box replaces the whole page with its results. */
function SearchResults({ q }: { q: string }) {
  const { items } = useReminders()
  const rows = search(items, q).flatMap((g) => g.items)
  return (
    <div {...stylex.props(styles.sec)}>
      {rows.map((r, i) => (
        <ReminderRow key={r.id} r={r} tint={colors.blue} last={i === rows.length - 1} />
      ))}
      {!rows.length && <div {...stylex.props(shared.ph, styles.empty)}>No Results</div>}
    </div>
  )
}
