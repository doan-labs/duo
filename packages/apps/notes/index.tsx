// Apple Notes on the Duo: sidebar, list and editor spread across the inner
// display; a Folders page pushes a list pushes a note on the cover. One path
// cell in os.session drives both, so they never disagree about where you are.

import type { Os } from '@doan-labs/duo-sdk'
import { Menu, type MenuEntry, Push, Title, useWide, VStack } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'react'
import { type Note, SORTS } from './data.ts'
import { NotePane, NoteSheet } from './editor.tsx'
import { FoldersPage, Sidebar } from './folders.tsx'
import { NoteList } from './note-list.tsx'
import {
  type Dest,
  destOf,
  noteOf,
  useFolders,
  useGo,
  useNotes,
  usePath,
  usePurge,
  useSearch,
  useSort,
  useView
} from './store.ts'
import { styles } from './styles.ts'

export function Notes(_: { os: Os }) {
  const [root, wide] = useWide()
  usePurge()
  const path = usePath()
  const { back, note } = useGo()
  const { notes, add, put, remove } = useNotes()
  const { folders } = useFolders()
  const dest = destOf(path)
  const sel = notes.find((n) => n.id === noteOf(path))

  const title =
    dest.kind === 'folder'
      ? (folders.find((f) => f.id === dest.id)?.name ?? 'Notes')
      : dest.kind === 'deleted'
        ? 'Recently Deleted'
        : dest.kind === 'tag'
          ? `#${dest.id}`
          : 'Notes'

  const pick = (n: Note) => note(n.id)
  const compose = () => note(add(dest.kind === 'folder' ? dest.id : undefined).id)
  /** A live note drops into Recently Deleted; a binned one goes for good. */
  const trash = (n: Note) => {
    if (n.deleted) remove(n)
    else put({ ...n, deleted: new Date().toISOString() })
    if (sel?.id === n.id) back()
  }

  return (
    <VStack ref={root}>
      {wide ? (
        <Columns dest={dest} title={title} sel={sel} pick={pick} compose={compose} trash={trash} />
      ) : (
        <Cover
          dest={dest}
          title={title}
          sel={sel}
          pick={pick}
          compose={compose}
          trash={trash}
          back={back}
          deep={path.length > 1}
        />
      )}
    </VStack>
  )
}

/** The ⋯ at the head of a list: sort order and the list/gallery view swap. */
function ListMenu() {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useSort()
  const [view, setView] = useView()
  const items: MenuEntry[] = [
    ...SORTS.map(([s, label]) => ({ label: `Sort by ${label}`, checked: sort === s, onSelect: () => setSort(s) })),
    'separator',
    {
      label: view === 'gallery' ? 'View as List' : 'View as Gallery',
      icon: view === 'gallery' ? 'list' : 'grid',
      onSelect: () => setView(view === 'gallery' ? 'list' : 'gallery')
    }
  ]
  return (
    <span {...stylex.props(styles.menuWrap)}>
      <button
        type="button"
        {...stylex.props(styles.round, shared.press)}
        onClick={() => setOpen(!open)}
        aria-label="List options"
        aria-expanded={open}
      >
        <Sym name="ellipsis" size={15} />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} items={items} size={14} xstyle={[styles.listMenu]} />
    </span>
  )
}

/** The search capsule both displays share; the query is a session cell. */
const Find = () => {
  const [q, setQ] = useSearch()
  return (
    <label {...stylex.props(styles.search)}>
      <Sym name="search" size={13} />
      <input {...stylex.props(styles.searchIn)} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      {!!q && (
        <button type="button" {...stylex.props(styles.searchX)} onClick={() => setQ('')} aria-label="Clear search">
          <Sym name="close" size={11} />
        </button>
      )}
    </label>
  )
}

// ---------- unfolded: folders | list | note ----------

function Columns({
  dest,
  title,
  sel,
  pick,
  compose,
  trash
}: {
  dest: Dest
  title: string
  sel?: Note
  pick: (n: Note) => void
  compose: () => void
  trash: (n: Note) => void
}) {
  const [q] = useSearch()
  const { notes } = useNotes()
  const count = scopedCount(notes, dest)
  return (
    <div {...stylex.props(styles.cols)}>
      <Sidebar />
      <div {...stylex.props(styles.list)}>
        <div {...stylex.props(styles.listHdr)}>
          <div {...stylex.props(styles.listTitle)}>{title}</div>
          <span {...stylex.props(styles.push)}>
            <ListMenu />
          </span>
          <button type="button" {...stylex.props(styles.round, shared.press)} onClick={compose} aria-label="New note">
            <Sym name="compose" size={15} />
          </button>
        </div>
        <div {...stylex.props(styles.searchBox)}>
          <Find />
        </div>
        <div {...stylex.props(styles.scroll)}>
          <NoteList dest={dest} q={q} sel={sel?.id} onPick={pick} />
        </div>
        <div {...stylex.props(styles.listFoot)}>
          {count} {count === 1 ? 'Note' : 'Notes'}
        </div>
      </div>
      <NotePane key={sel?.id ?? 'none'} note={sel} compose={compose} trash={trash} />
    </div>
  )
}

// ---------- folded: Folders > list > note, each pushed over the last ----------

function Cover({
  dest,
  title,
  sel,
  pick,
  compose,
  trash,
  back,
  deep
}: {
  dest: Dest
  title: string
  sel?: Note
  pick: (n: Note) => void
  compose: () => void
  trash: (n: Note) => void
  back: () => void
  deep: boolean
}) {
  const [q] = useSearch()
  // The note page keeps the note it was opened with so it can slide out after
  // the selection clears (a delete sends it away mid-animation).
  const held = useRef<Note | undefined>(sel)
  if (sel) held.current = sel
  return (
    <Push
      open={deep}
      sheet={
        <Push
          open={!!sel}
          sheet={held.current && <NoteSheet note={held.current} back={back} compose={compose} trash={trash} />}
        >
          <div {...stylex.props(shared.column)}>
            <Title xstyle={[styles.coverTitle]}>
              {title}
              <Title as="span" variant="accessory" xstyle={[styles.gold]}>
                <ListMenu />
                <button
                  type="button"
                  {...stylex.props(styles.gold, styles.flat)}
                  onClick={compose}
                  aria-label="New note"
                >
                  <Sym name="compose" size={19} />
                </button>
              </Title>
            </Title>
            <div {...stylex.props(styles.coverFind)}>
              <Find />
            </div>
            <div {...stylex.props(styles.scroll)}>
              <NoteList dest={dest} q={q} sel={sel?.id} onPick={pick} />
            </div>
          </div>
        </Push>
      }
    >
      <FoldersPage />
    </Push>
  )
}

const scopedCount = (notes: Note[], dest: Dest) =>
  notes.filter((n) =>
    dest.kind === 'deleted'
      ? n.deleted
      : dest.kind === 'folder'
        ? !n.deleted && n.folder === dest.id
        : dest.kind === 'tag'
          ? !n.deleted && (n.tags ?? []).includes(dest.id ?? '')
          : !n.deleted && !n.folder
  ).length
