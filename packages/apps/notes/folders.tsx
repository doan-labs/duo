// The folders rail: iCloud's Notes, user folders and Recently Deleted, then
// the tag strip the documents' #tags build. The cover display draws the same
// list as its root page. Folder rows take a long-press or right-click menu -
// Rename turns the row into its own field, Delete sends its notes to the bin.

import { Menu, type MenuEntry, Title } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import {
  app,
  appAppearance,
  colors,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useState } from 'react'
import type { Folder, Note } from './data.ts'
import { TagGlyph, TrashBadge } from './glyphs.tsx'
import { destOf, useFolders, useGo, useNotes, usePath, useTags } from './store.ts'

const live = (notes: Note[]) => notes.filter((n) => !n.deleted)

export function Sidebar() {
  const path = usePath()
  const { open } = useGo()
  const { notes } = useNotes()
  const { folders, add } = useFolders()
  const tags = useTags()
  const [naming, setNaming] = useState(false)
  const dest = destOf(path)
  const on = (kind: string, id?: string) => dest.kind === kind && dest.id === id
  const create = (name: string) => {
    setNaming(false)
    if (name.trim()) open(`fold:${add(name.trim()).id}`)
  }
  return (
    <div {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideHdr)}>
        <Title as="span" variant="accessory" xstyle={[styles.sideTitle]}>
          Folders
        </Title>
        <span {...stylex.props(styles.gold, styles.sideIcons)}>
          <button
            type="button"
            {...stylex.props(styles.gold, styles.flat, shared.press)}
            onClick={() => setNaming(true)}
            aria-label="New folder"
          >
            <Sym name="newFolder" size={17} />
          </button>
        </span>
      </div>
      <div {...stylex.props(styles.scroll)}>
        <Section name="iCloud" />
        <Row
          name="Notes"
          count={live(notes).filter((n) => !n.folder).length}
          on={on('notes')}
          pick={() => open('notes')}
        />
        {folders.map((f) => (
          <FolderRow
            key={f.id}
            folder={f}
            count={live(notes).filter((n) => n.folder === f.id).length}
            on={on('folder', f.id)}
            pick={() => open(`fold:${f.id}`)}
          />
        ))}
        {naming && <NamingRow onDone={create} onCancel={() => setNaming(false)} />}
        <Row
          name="Recently Deleted"
          icon={<TrashBadge />}
          count={notes.filter((n) => n.deleted).length}
          on={on('deleted')}
          pick={() => open('deleted')}
        />
        {!!tags.length && <Section name="Tags" />}
        {!!tags.length && <TagStrip sel={dest.kind === 'tag' ? dest.id : undefined} />}
      </div>
    </div>
  )
}

/** The cover's root page: the same destinations as big cards' rows. */
export function FoldersPage() {
  const { open } = useGo()
  const { notes } = useNotes()
  const { folders, add } = useFolders()
  const tags = useTags()
  const [naming, setNaming] = useState(false)
  const create = (name: string) => {
    setNaming(false)
    if (name.trim()) open(`fold:${add(name.trim()).id}`)
  }
  return (
    <div {...stylex.props(styles.cover, shared.column)}>
      <Title as="h1" xstyle={[styles.coverHd]} variant="header">
        Folders
        <Title as="span" variant="accessory" xstyle={[styles.gold]}>
          <button
            type="button"
            {...stylex.props(styles.gold, styles.flat, shared.press)}
            onClick={() => setNaming(true)}
            aria-label="New folder"
          >
            <Sym name="newFolder" size={20} />
          </button>
        </Title>
      </Title>
      <div {...stylex.props(styles.coverScroll)}>
        <div {...stylex.props(styles.coverSec)}>iCloud</div>
        <div {...stylex.props(styles.coverGrp)}>
          <CoverRow name="Notes" count={live(notes).filter((n) => !n.folder).length} pick={() => open('notes')} />
          {folders.map((f) => (
            <CoverRow
              key={f.id}
              name={f.name}
              count={live(notes).filter((n) => n.folder === f.id).length}
              pick={() => open(`fold:${f.id}`)}
            />
          ))}
          {naming && <NamingRow onDone={create} onCancel={() => setNaming(false)} plain />}
          <CoverRow
            name="Recently Deleted"
            icon={<TrashBadge />}
            count={notes.filter((n) => n.deleted).length}
            pick={() => open('deleted')}
          />
        </div>
        {!!tags.length && (
          <>
            <div {...stylex.props(styles.coverSec)}>Tags</div>
            <TagStrip />
          </>
        )}
      </div>
    </div>
  )
}

/** The inline field a fresh or renamed folder becomes. */
function NamingRow({
  onDone,
  onCancel,
  initial = '',
  plain
}: {
  onDone: (name: string) => void
  onCancel: () => void
  initial?: string
  plain?: boolean
}) {
  return (
    <div {...stylex.props(plain ? styles.coverRow : styles.folder, animations.row)}>
      <Sym name="folder" size={16} />
      <input
        // biome-ignore lint/a11y/noAutofocus: the row exists only to be typed into
        autoFocus
        aria-label="Folder name"
        placeholder="New Folder"
        defaultValue={initial}
        {...stylex.props(styles.input)}
        onBlur={(e) => {
          if (e.currentTarget.value.trim() && e.currentTarget.value !== initial) onDone(e.currentTarget.value)
          else onCancel()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.currentTarget.value.trim() && e.currentTarget.value !== initial) onDone(e.currentTarget.value)
            else onCancel()
          }
          if (e.key === 'Escape') onCancel()
        }}
      />
    </div>
  )
}

function Row({
  name,
  icon,
  count,
  on,
  pick,
  ctx
}: {
  name: string
  icon?: ReactNode
  count: number
  on: boolean
  pick: () => void
  ctx?: () => void
}) {
  return (
    <button
      type="button"
      {...stylex.props(styles.folder, shared.select, animations.row, on && styles.folderOn)}
      onClick={pick}
      onContextMenu={
        ctx &&
        ((e) => {
          e.preventDefault()
          ctx()
        })
      }
    >
      {icon ?? <Sym name="folder" size={16} />}
      <span {...stylex.props(styles.clip)}>{name}</span>
      <span {...stylex.props(styles.count)}>{count}</span>
    </button>
  )
}

/** A user folder row; right-click and long-press pull up Rename and Delete. */
function FolderRow({ folder, count, on, pick }: { folder: Folder; count: number; on: boolean; pick: () => void }) {
  const { rename, remove } = useFolders()
  const { notes, put } = useNotes()
  const [menu, setMenu] = useState(false)
  const [naming, setNaming] = useState(false)
  if (naming) {
    return (
      <NamingRow
        initial={folder.name}
        onDone={(name) => {
          setNaming(false)
          rename(folder, name.trim())
        }}
        onCancel={() => setNaming(false)}
      />
    )
  }
  const items: MenuEntry[] = [
    { label: 'Rename', icon: 'document', onSelect: () => setNaming(true) },
    'separator',
    {
      label: 'Delete Folder',
      icon: 'trashOutline',
      onSelect: () => {
        // Its notes drop into Recently Deleted rather than vanishing.
        for (const n of notes) if (n.folder === folder.id) put({ ...n, deleted: new Date().toISOString() })
        remove(folder)
      }
    }
  ]
  return (
    <span {...stylex.props(styles.rowWrap)}>
      <Row name={folder.name} count={count} on={on} pick={pick} ctx={() => setMenu(true)} />
      <button
        type="button"
        {...stylex.props(styles.rowMenu, shared.press)}
        onClick={() => setMenu(true)}
        aria-label={`${folder.name} actions`}
      >
        <Sym name="ellipsis" size={13} />
      </button>
      <Menu open={menu} onClose={() => setMenu(false)} items={items} size={14} xstyle={[styles.rowMenuPop]} />
    </span>
  )
}

/** The horizontal #tag rail under the iCloud section. */
function TagStrip({ sel }: { sel?: string }) {
  const tags = useTags()
  const { open } = useGo()
  return (
    <div {...stylex.props(styles.tags)}>
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          {...stylex.props(styles.tag, shared.select, sel === t && styles.tagOn)}
          onClick={() => open(`tag:${t}`)}
        >
          <TagGlyph size={12} />
          <span {...stylex.props(styles.tagTx)}>{t}</span>
        </button>
      ))}
    </div>
  )
}

function CoverRow({ name, icon, count, pick }: { name: string; icon?: ReactNode; count: number; pick: () => void }) {
  return (
    <button type="button" {...stylex.props(styles.coverRow, shared.select, animations.row)} onClick={pick}>
      <span {...stylex.props(styles.coverIc)}>{icon ?? <Sym name="folder" size={17} />}</span>
      <span {...stylex.props(styles.coverName)}>{name}</span>
      <span {...stylex.props(styles.count)}>{count}</span>
      <i {...stylex.props(styles.chev)}>
        <Sym name="forward" size={13} />
      </i>
    </button>
  )
}

const Section = ({ name }: { name: string }) => (
  <div {...stylex.props(styles.section)}>
    {name}
    <i {...stylex.props(styles.chev, styles.gold)}>
      <Sym name="up" size={13} />
    </i>
  </div>
)

const styles = stylex.create({
  gold: { color: colors.yellow, opacity: 1 },
  flat: { display: 'flex', padding: 0 },
  side: {
    width: 198,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.surface,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  sideHdr: {
    display: 'flex',
    alignItems: 'center',
    height: 40,
    paddingInline: 16,
    flexShrink: 0
  },
  sideTitle: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.label2
  },
  sideIcons: { display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' },
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 22 },
  rowWrap: { position: 'relative', display: 'block' },
  rowMenu: {
    position: 'absolute',
    right: 14,
    top: '50%',
    translate: '0 -50%',
    display: 'flex',
    color: colors.grey,
    opacity: { default: 0.55, ':hover': 1 }
  },
  rowMenuPop: { position: 'absolute', right: 10, top: 26, width: 168, zIndex: 4 },
  folder: {
    width: 'calc(100% - 16px)',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    marginInline: 8,
    paddingBlock: 7,
    paddingInline: 8,
    borderRadius: radius.md,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: colors.yellow,
    cursor: 'pointer',
    textAlign: 'left'
  },
  // The glyph is the only yellow part of a row; the label stays white.
  clip: { color: colors.white, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  input: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  folderOn: { backgroundColor: app.fill2 },
  count: {
    marginLeft: 'auto',
    paddingLeft: 8,
    color: colors.grey,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    paddingInline: 16,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  chev: { display: 'flex', marginLeft: 'auto', transform: 'rotate(180deg)' },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    paddingInline: 12,
    paddingTop: 4
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    paddingBlock: 5,
    paddingInline: 10,
    borderRadius: radius.pill,
    backgroundColor: app.fill2,
    color: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    cursor: 'pointer'
  },
  tagOn: { backgroundColor: appAppearance.notesYellow, color: colors.black },
  tagTx: { fontWeight: weight.medium },
  // ---------- cover ----------
  cover: { flexGrow: 1, minHeight: 0 },
  coverHd: { fontWeight: weight.bold },
  coverScroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 24 },
  coverSec: {
    paddingTop: 14,
    paddingBottom: 5,
    paddingInline: 18,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  coverGrp: {
    marginInline: 14,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    overflow: 'hidden'
  },
  coverRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingBlock: 9,
    paddingInline: 12,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    color: colors.yellow,
    textAlign: 'left',
    cursor: 'pointer'
  },
  coverIc: { display: 'flex', color: colors.yellow },
  coverName: {
    flexGrow: 1,
    minWidth: 0,
    color: colors.white,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  }
})
