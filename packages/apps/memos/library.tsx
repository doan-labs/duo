// The root page: folders and Recently Deleted up top, the searchable,
// sortable list under them, multi-select behind Edit. The record deck is not
// here - index.tsx pins it so it stays up whichever page is pushed.

import {
  Button,
  LargeTitle,
  List,
  Menu,
  type MenuEntry,
  Placeholder,
  Row,
  Section,
  Sheet,
  Sym,
  TextField,
  useNav
} from '@doan-labs/duo-uikit'
import { app, appAppearance, colors, radius, space, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Deleted } from './deleted.tsx'
import { Detail } from './detail.tsx'
import { addDemo } from './engine.ts'
import { FolderPage } from './folder.tsx'
import { MemoRow, SelectionBar } from './list.tsx'
import { folderOps, type Memo, memoOps, type Sort, useMemos } from './store.ts'

const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'title', label: 'Title' },
  { key: 'longest', label: 'Longest' }
]

export function Library() {
  const { memos, folders, visible, query, setQuery, sort, setSort, editing, setEditing, selection, setSelection } =
    useMemos()
  const nav = useNav()
  const [menu, setMenu] = useState(false)
  const [newFolder, setNewFolder] = useState(false)

  const deleted = memos.filter((m) => m.deletedAt)
  const toggle = (id: string) => {
    const next = new Set(selection)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }
  const open = (memo: Memo) => nav.push((back) => <Detail memo={memo} back={back} />)

  const menuItems: MenuEntry[] = [
    ...SORTS.map((s) => ({
      label: s.label,
      checked: sort === s.key,
      onSelect: () => setSort(s.key)
    })),
    'separator',
    { label: 'New Folder…', icon: 'newFolder', onSelect: () => setNewFolder(true) },
    'separator',
    { label: 'Add Demo Recording', icon: 'plus', onSelect: () => void addDemo() },
    'separator',
    {
      label: editing ? 'Done' : 'Select Recordings',
      icon: 'list',
      onSelect: () => {
        setEditing(!editing)
        setSelection(new Set())
      }
    }
  ]

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.head)}>
        <LargeTitle>Voice Memos</LargeTitle>
        <button
          type="button"
          aria-expanded={menu}
          aria-label="More"
          {...stylex.props(styles.more)}
          onClick={() => setMenu(true)}
        >
          <Sym name="ellipsis" size={18} />
        </button>
        <Menu open={menu} onClose={() => setMenu(false)} items={menuItems} xstyle={[styles.menu]} />
      </div>
      <TextField
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        aria-label="Search recordings"
        xstyle={[styles.search]}
      />
      <div {...stylex.props(styles.body)}>
        {folders.length + (deleted.length ? 1 : 0) > 0 && (
          <Section xstyle={[styles.section]}>
            <List>
              {folders.map((f) => (
                <Row
                  key={f.id}
                  as="button"
                  xstyle={[styles.row]}
                  label={f.name}
                  icon={
                    <span {...stylex.props(styles.folderIc)}>
                      <Sym name="folder" size={16} />
                    </span>
                  }
                  detail={String(memos.filter((m) => !m.deletedAt && m.folder === f.id).length)}
                  chevron
                  onClick={() => nav.push((back) => <FolderPage folder={f} back={back} />)}
                />
              ))}
              {deleted.length > 0 && (
                <Row
                  as="button"
                  xstyle={[styles.row]}
                  label="Recently Deleted"
                  icon={
                    <span {...stylex.props(styles.trashIc)}>
                      <Sym name="trash" size={16} />
                    </span>
                  }
                  detail={String(deleted.length)}
                  chevron
                  onClick={() => nav.push((back) => <Deleted back={back} />)}
                />
              )}
            </List>
          </Section>
        )}
        <div {...stylex.props(styles.h2)}>All Recordings</div>
        {visible.length === 0 ? (
          <Placeholder xstyle={[styles.empty]}>
            {query
              ? `No results for "${query}"`
              : 'No recordings yet. Tap the record button to start, or add a demo from the menu.'}
          </Placeholder>
        ) : (
          <Section xstyle={[styles.section]}>
            <List>
              {visible.map((m) => (
                <MemoRow
                  key={m.id}
                  memo={m}
                  editing={editing}
                  selected={selection.has(m.id)}
                  onOpen={() => open(m)}
                  onToggle={() => toggle(m.id)}
                />
              ))}
            </List>
          </Section>
        )}
      </div>
      {editing && (
        <SelectionBar
          count={selection.size}
          actions={[
            {
              label: 'Favorite',
              onSelect: () => {
                for (const id of selection) memoOps.toggleFav(id)
              }
            },
            {
              label: 'Delete',
              danger: true,
              onSelect: () => {
                memoOps.trash(selection)
                setSelection(new Set())
                setEditing(false)
              }
            }
          ]}
        />
      )}
      {newFolder && <NewFolderSheet onClose={() => setNewFolder(false)} />}
    </div>
  )
}

function NewFolderSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const save = () => {
    folderOps.add(name)
    onClose()
  }
  return (
    <Sheet open onClose={onClose}>
      <div {...stylex.props(styles.sheet)}>
        <div {...stylex.props(styles.sheetTitle)}>New Folder</div>
        <TextField
          autoFocus
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
        />
        <div {...stylex.props(styles.sheetRow)}>
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="plain" onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

const styles = stylex.create({
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: space.lg,
    paddingTop: space.sm
  },
  more: {
    borderWidth: 0,
    backgroundColor: appAppearance.memosFill,
    color: app.link,
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center'
  },
  menu: { position: 'absolute', top: 40, right: space.lg },
  search: { marginInline: space.lg, marginTop: space.xs },
  body: { flexGrow: 1, overflowY: 'auto', paddingBottom: 120 },
  section: { paddingInline: space.lg, paddingTop: space.sm },
  row: { backgroundColor: appAppearance.memosFill, borderBottomColor: app.separator, width: '100%' },
  folderIc: { color: colors.yellowDark, display: 'inline-flex' },
  trashIc: { color: app.label2, display: 'inline-flex' },
  h2: {
    paddingInline: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xxs,
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    color: app.fg
  },
  empty: { padding: space.xl, color: app.label2 },
  sheet: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: { fontSize: typeScale.headline, fontWeight: weight.semibold },
  sheetRow: { display: 'flex', justifyContent: 'flex-end', gap: space.sm }
})
