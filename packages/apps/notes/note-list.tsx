// The list column: a Pinned section over date groups, each row carrying title,
// stamp, a one-line preview and its attachment clip. Right-click or the hover
// ellipsis pulls the row's menu - Pin, Lock, Move to and the bin - and the
// gallery button swaps the rows for cards. Recently Deleted groups by the days
// each note has left.

import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Menu, type MenuEntry } from '@doan-labs/duo-uikit'
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
import { useMemo, useState } from 'react'
import { group, groupDeleted, hasAttachment, type Note, parse, previewOf, recovered, sorted, stamp } from './data.ts'
import { MoveSheet } from './editor.tsx'
import { ClipGlyph } from './glyphs.tsx'
import { type Dest, useFolders, useNotes, useSort, useView } from './store.ts'

/** The notes a destination lists: the bin gets deleted ones, a tag filters by it. */
const scope = (notes: Note[], dest: Dest) => {
  if (dest.kind === 'deleted') return notes.filter((n) => n.deleted)
  if (dest.kind === 'folder') return notes.filter((n) => !n.deleted && n.folder === dest.id)
  if (dest.kind === 'tag') return notes.filter((n) => !n.deleted && (n.tags ?? []).includes(dest.id ?? ''))
  return notes.filter((n) => !n.deleted && !n.folder)
}

export function NoteList({
  dest,
  q = '',
  sel,
  onPick
}: {
  dest: Dest
  q?: string
  sel?: string
  onPick: (n: Note) => void
}) {
  const { notes, hydrating } = useNotes()
  const [sort] = useSort()
  const [view] = useView()
  const shown = sorted(scope(notes, dest), sort)
  if (!shown.length) {
    return (
      <div {...stylex.props(styles.empty)}>
        {hydrating
          ? 'Loading…'
          : q
            ? 'No Results'
            : dest.kind === 'deleted'
              ? 'No Notes in Recently Deleted'
              : 'No Notes'}
      </div>
    )
  }
  if (dest.kind === 'deleted') {
    return (
      <div {...stylex.props(styles.groups)}>
        {groupDeleted(shown).map(({ name, notes }) => (
          <div key={name}>
            <div {...stylex.props(styles.groupHdr)}>{name}</div>
            {notes.map((n) => (
              <NoteRow key={n.id} note={n} q={q} sel={sel} onPick={onPick} />
            ))}
          </div>
        ))}
      </div>
    )
  }
  const pinned = shown.filter((n) => n.pinned)
  const rest = shown.filter((n) => !n.pinned)
  const rows = (list: Note[]) => list.map((n) => <NoteRow key={n.id} note={n} q={q} sel={sel} onPick={onPick} />)
  if (view === 'gallery') {
    return (
      <div {...stylex.props(styles.gallery)}>
        {[...pinned, ...rest].map((n) => (
          <NoteCard key={n.id} note={n} q={q} sel={sel} onPick={onPick} />
        ))}
      </div>
    )
  }
  return (
    <div {...stylex.props(styles.groups)}>
      {!!pinned.length && (
        <div>
          <div {...stylex.props(styles.groupHdr)}>
            <Sym name="pin" size={12} />
            Pinned
          </div>
          {rows(pinned)}
        </div>
      )}
      {group(rest).map(({ name, notes }) => (
        <div key={name}>
          <div {...stylex.props(styles.groupHdr)}>{name}</div>
          {rows(notes)}
        </div>
      ))}
    </div>
  )
}

/** The menu every note row and card answers to, plus the Move-to sheet it can raise. */
function useNoteMenu(note: Note) {
  const { put, remove } = useNotes()
  const { folders, add } = useFolders()
  const [moving, setMoving] = useState(false)
  const items: MenuEntry[] = note.deleted
    ? [
        { label: 'Recover', icon: 'undo', onSelect: () => put(recovered(note, folders)) },
        { label: 'Delete', icon: 'trash', onSelect: () => remove(note) }
      ]
    : [
        {
          label: note.pinned ? 'Unpin' : 'Pin Note',
          icon: 'pin',
          onSelect: () => put({ ...note, pinned: !note.pinned })
        },
        {
          label: note.locked ? 'Remove Lock' : 'Lock Note',
          icon: 'lock',
          onSelect: () => {
            // Reapplying a lock retires this session's unlock pass too.
            if (!note.locked) void os.session.del(`unl:${note.id}`)
            put({ ...note, locked: !note.locked })
          }
        },
        'separator',
        { label: 'Move to…', icon: 'folder', onSelect: () => setMoving(true) },
        'separator',
        {
          label: 'Move to Recently Deleted',
          icon: 'trash',
          onSelect: () => {
            if (note.locked) void os.session.del(`unl:${note.id}`)
            put({ ...note, deleted: new Date().toISOString() })
          }
        }
      ]
  const sheet = (
    <MoveSheet
      open={moving}
      onClose={() => setMoving(false)}
      note={note}
      folders={folders}
      onPick={(f) => {
        put({ ...note, folder: f })
        setMoving(false)
      }}
      onNew={(name) => {
        put({ ...note, folder: add(name).id })
        setMoving(false)
      }}
    />
  )
  return { items, sheet }
}

function NoteRow({ note: n, q, sel, onPick }: { note: Note; q: string; sel?: string; onPick: (n: Note) => void }) {
  const kv = useKV(os.storage, `note:${n.id}`)
  const doc = useMemo(() => parse(kv.value ?? undefined), [kv.value])
  const [menu, setMenu] = useState(false)
  const { items, sheet } = useNoteMenu(n)
  const title = n.title || 'New Note'
  const preview = n.locked ? 'Locked' : previewOf(doc) || 'No additional text'
  if (
    q &&
    !n.locked &&
    !preview.toLowerCase().includes(q.toLowerCase()) &&
    !title.toLowerCase().includes(q.toLowerCase())
  )
    return null
  if (q && n.locked && !title.toLowerCase().includes(q.toLowerCase())) return null
  return (
    <span {...stylex.props(styles.rowWrap)}>
      <button
        type="button"
        {...stylex.props(styles.li, shared.select, animations.row, n.id === sel && styles.liOn)}
        onClick={() => onPick(n)}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenu(true)
        }}
      >
        <span {...stylex.props(styles.liTx)}>
          <b {...stylex.props(styles.liTitle)}>
            {n.locked && (
              <i {...stylex.props(styles.lockIc)}>
                <Sym name="lock" size={11} />
              </i>
            )}
            {title}
          </b>
          <span {...stylex.props(styles.liSub)}>
            <span {...stylex.props(styles.when)}>{stamp(n)}</span>
            <span {...stylex.props(styles.clip)}>{preview}</span>
            {hasAttachment(doc) && <ClipGlyph size={10} />}
          </span>
        </span>
      </button>
      <button
        type="button"
        {...stylex.props(styles.rowMenu, shared.press)}
        onClick={(e) => {
          e.stopPropagation()
          setMenu(true)
        }}
        aria-label={`${title} actions`}
      >
        <Sym name="ellipsis" size={13} />
      </button>
      <Menu open={menu} onClose={() => setMenu(false)} items={items} size={14} xstyle={[styles.rowMenuPop]} />
      {sheet}
    </span>
  )
}

/** A gallery card: bigger preview block, footer stamp and badges. */
function NoteCard({ note: n, q, sel, onPick }: { note: Note; q: string; sel?: string; onPick: (n: Note) => void }) {
  const kv = useKV(os.storage, `note:${n.id}`)
  const doc = useMemo(() => parse(kv.value ?? undefined), [kv.value])
  const [menu, setMenu] = useState(false)
  const { items, sheet } = useNoteMenu(n)
  const title = n.title || 'New Note'
  if (q && !previewOf(doc).toLowerCase().includes(q.toLowerCase()) && !title.toLowerCase().includes(q.toLowerCase()))
    return null
  return (
    <span {...stylex.props(styles.cardWrap)}>
      <button
        type="button"
        {...stylex.props(styles.card, shared.select, animations.row, n.id === sel && styles.cardOn)}
        onClick={() => onPick(n)}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenu(true)
        }}
      >
        <b {...stylex.props(styles.cardTitle)}>
          {n.locked && (
            <i {...stylex.props(styles.lockIc)}>
              <Sym name="lock" size={11} />
            </i>
          )}
          {title}
        </b>
        <span {...stylex.props(styles.cardBody)}>{n.locked ? 'Locked' : previewOf(doc)}</span>
        <span {...stylex.props(styles.cardFoot)}>
          {stamp(n)}
          {n.pinned && <Sym name="pin" size={10} />}
          {hasAttachment(doc) && <ClipGlyph size={10} />}
        </span>
      </button>
      <Menu open={menu} onClose={() => setMenu(false)} items={items} size={14} xstyle={[styles.rowMenuPop]} />
      {sheet}
    </span>
  )
}

const styles = stylex.create({
  clip: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flexGrow: 1 },
  groups: { paddingInline: 10 },
  empty: { textAlign: 'center', paddingTop: 40, color: colors.grey },
  rowWrap: { position: 'relative', display: 'block' },
  groupHdr: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    fontWeight: weight.bold,
    paddingTop: 8,
    paddingBottom: 8,
    paddingInline: 2
  },
  li: {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    paddingBlock: 8,
    paddingInline: 8,
    borderRadius: radius.md,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.notesHairline
  },
  liOn: { backgroundColor: appAppearance.notesYellow, color: colors.black, borderBottomColor: 'transparent' },
  liTx: { minWidth: 0, flexGrow: 1 },
  liTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    overflow: 'hidden'
  },
  liSub: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.72,
    marginTop: 1
  },
  when: { flexShrink: 0 },
  lockIc: { display: 'flex' },
  rowMenu: {
    position: 'absolute',
    right: 8,
    top: 8,
    display: 'flex',
    color: colors.grey,
    opacity: { default: 0.4, ':hover': 1 }
  },
  rowMenuPop: { position: 'absolute', right: 8, top: 30, width: 190, zIndex: 5 },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    padding: 10
  },
  cardWrap: { position: 'relative', display: 'block' },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minHeight: 84,
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: radius.md,
    backgroundColor: app.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    textAlign: 'left',
    cursor: 'pointer',
    overflow: 'hidden'
  },
  cardOn: { borderColor: appAppearance.notesYellow, backgroundColor: app.fill3 },
  cardTitle: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  cardBody: {
    flexGrow: 1,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label2,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflowWrap: 'anywhere'
  },
  cardFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: colors.grey
  }
})
