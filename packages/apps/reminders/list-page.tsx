// One destination, drawn the same on the inner pane and pushed on the cover:
// the coloured large title, its sections of reminder rows, the inline editor
// and the "+ New Reminder" bar pinned bottom-left. The header's trailing pair
// is share and the ellipsis menu, like iPadOS draws them.

import { Menu, Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { app } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { destName, destTint, type Group, groupsFor, search, todayKey } from './data.ts'
import { EditorRow, ReminderRow } from './row.tsx'
import {
  type Draft,
  useEditor,
  useGo,
  useListSheet,
  useLists,
  useQuery,
  useReminders,
  useShowDone,
  useSideOff
} from './store.ts'
import { styles } from './styles.ts'

/** The page body: title, sections, rows, the editor at the tail. */
export function DestPage({ dest, wide }: { dest: string; wide: boolean }) {
  const { items } = useReminders()
  const { lists } = useLists()
  const { back } = useGo()
  const [q] = useQuery()
  const [showDone, setShowDone] = useShowDone(dest)
  const { draft, set: setDraft } = useEditor()
  const [, setSheet] = useListSheet()
  const [off, setOff] = useSideOff()
  const [menuOpen, setMenuOpen] = useState(false)
  const tint = destTint(dest, lists)
  const searching = q.trim() !== ''
  const groups: Group[] = searching ? search(items, q) : groupsFor(dest, items, lists, showDone)
  const isList = dest.startsWith('list:')
  const list = lists.find((l) => `list:${l.id}` === dest)
  const canAdd = !searching && (dest === 'today' || dest === 'scheduled' || dest === 'all' || isList)
  const name = searching ? `Results for “${q.trim()}”` : destName(dest, lists)

  const newReminder = () => {
    const base: Draft = { t: '', list: list?.id ?? lists[0]?.id ?? 'reminders', dest }
    if (dest === 'today' || dest === 'scheduled') base.date = todayKey()
    setDraft(base)
  }

  const menuItems = [
    ...(isList ? [{ label: 'Edit List', icon: 'markup' as const, onSelect: () => setSheet(list?.id) }] : []),
    {
      label: showDone ? 'Hide Completed' : 'Show Completed',
      icon: 'eye' as const,
      onSelect: () => setShowDone(!showDone)
    }
  ]

  // The system share sheet cannot reach a backend from here, so the list goes
  // as text: its name over one line per reminder, open items then done.
  const share = () => {
    const open = groups.flatMap((g) => g.items.filter((r) => !r.done).map((r) => `- ${r.t}`))
    const done = groups.flatMap((g) => g.items.filter((r) => r.done).map((r) => `- ${r.t} (done)`))
    const text = [name, '', ...open, ...done].join('\n')
    void (navigator.share?.({ title: name, text }) ?? navigator.clipboard?.writeText(text))
  }

  return (
    <>
      <div {...stylex.props(styles.head)}>
        {wide ? (
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setOff(!off)}
            {...stylex.props(styles.headBtn, shared.press)}
          >
            <Sym name="sidebar" size={19} />
          </button>
        ) : (
          <button type="button" onClick={back} {...stylex.props(styles.headBack, shared.press)}>
            <Sym name="back" size={20} />
            Lists
          </button>
        )}
        <span {...stylex.props(styles.headSide)}>
          <button type="button" aria-label="Share list" onClick={share} {...stylex.props(styles.headBtn, shared.press)}>
            <Sym name="share" size={19} />
          </button>
          <span {...stylex.props(styles.toolWrap)}>
            <button
              type="button"
              aria-label="List options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              {...stylex.props(styles.headBtn, shared.press)}
            >
              <Sym name="more" size={20} />
            </button>
            <Menu open={menuOpen} onClose={() => setMenuOpen(false)} xstyle={styles.headMenu} items={menuItems} />
          </span>
        </span>
      </div>
      <span {...stylex.props(styles.destTitle(searching ? app.fg : tint))}>{name}</span>
      <div {...stylex.props(styles.body)}>
        {groups.map((g) => (
          <div key={g.id} {...stylex.props(styles.sec)}>
            {g.title && <div {...stylex.props(styles.secHead)}>{g.title}</div>}
            {g.items.map((r, i) => (
              <ReminderRow key={r.id} r={r} tint={tint} last={i === g.items.length - 1} />
            ))}
          </div>
        ))}
        {groups.every((g) => !g.items.length) && (
          <div {...stylex.props(shared.ph, styles.empty)}>{searching ? 'No Results' : 'No Reminders'}</div>
        )}
        {draft && draft.dest === dest && <EditorRow tint={tint} />}
      </div>
      {canAdd && draft?.dest !== dest && (
        <div {...stylex.props(styles.newBar)}>
          <button type="button" onClick={newReminder} {...stylex.props(styles.barBtn, shared.press)}>
            <Sym name="plus" size={17} />
            New Reminder
          </button>
        </div>
      )}
    </>
  )
}
