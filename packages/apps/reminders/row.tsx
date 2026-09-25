// A reminder row and the editor a new one is born in. The row is the iOS
// triad: a tinted circle that fills on completion, the title with its meta
// lines under it, and the flag and (i) on the trailing edge. Tapping the
// title edits inline; tapping (i) opens Details.

import { beep } from '@doan-labs/duo-fixtures'
import { Menu, Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { addDays, overdue, type Reminder, relDay, tagsIn, todayKey, weekendKey } from './data.ts'
import { FlagGlyph } from './glyphs.tsx'
import { type Draft, useEditor, useGo, useLists, useReminders } from './store.ts'
import { styles } from './styles.ts'

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// ---------- the round checkbox ----------

function Circle({ tint, done, toggle }: { tint: string; done: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? 'Mark as not completed' : 'Mark as completed'}
      onClick={(e) => {
        e.stopPropagation()
        toggle()
      }}
      {...stylex.props(styles.chk(tint), done && styles.chkOn(tint), shared.press)}
    >
      {done && (
        <span {...stylex.props(styles.tickIn)}>
          <Sym name="tick" size={12} />
        </span>
      )}
    </button>
  )
}

// ---------- one reminder ----------

export function ReminderRow({ r, tint, last }: { r: Reminder; tint: string; last?: boolean }) {
  const { setDone, put } = useReminders()
  const { detail } = useGo()
  const [leaving, setLeaving] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [openSubs, setOpenSubs] = useState(false)
  const done = r.done
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (t.current) clearTimeout(t.current)
    },
    []
  )

  const toggle = () => {
    if (done) return setDone(r, false)
    setLeaving(true)
    beep([1320, 1760], 0.05, 0.05)
    t.current = setTimeout(() => setDone(r, true), 420)
  }
  const commit = () => {
    if (edit == null) return
    const v = edit.trim()
    if (v && v !== r.t) put({ ...r, t: v })
    setEdit(null)
  }
  const subs = r.subs ?? []
  const openSubsN = subs.filter((s) => !s.done).length
  const tags = tagsIn(r).filter((x) => !r.t.toLowerCase().includes(`#${x}`))

  return (
    <div {...stylex.props(styles.rowsWrap, leaving && styles.rowGone)}>
      <div {...stylex.props(styles.rowClip)}>
        <div {...stylex.props(styles.rrow)}>
          <Circle tint={tint} done={done || leaving} toggle={toggle} />
          <div {...stylex.props(styles.rbody)}>
            <div {...stylex.props(styles.rline)}>
              {!!r.pri && <span {...stylex.props(styles.pri)}>{'!'.repeat(r.pri)}</span>}
              {edit != null ? (
                <input
                  autoFocus
                  value={edit}
                  onChange={(e) => setEdit(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') commit()
                    if (e.key === 'Escape') setEdit(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  {...stylex.props(styles.redit)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => !done && setEdit(r.t)}
                  {...stylex.props(styles.rtitle, done && styles.rdone)}
                >
                  {r.t}
                  {tags.map((x) => (
                    <span key={x} {...stylex.props(styles.tagText)}>
                      {' '}
                      #{x}
                    </span>
                  ))}
                </button>
              )}
              {r.flag && (
                <span {...stylex.props(styles.rflag)}>
                  <FlagGlyph size={13} />
                </span>
              )}
              <button
                type="button"
                aria-label="Reminder details"
                onClick={(e) => {
                  e.stopPropagation()
                  detail(r.id)
                }}
                {...stylex.props(styles.rinfo)}
              >
                <Sym name="info" size={19} />
              </button>
            </div>
            {r.date && (
              <span {...stylex.props(styles.rmeta, overdue(r) && styles.rmetaOver)}>{relDay(r.date, r.time)}</span>
            )}
            {!!r.n && <span {...stylex.props(styles.rmeta)}>{r.n}</span>}
            {!!r.url && (
              <span {...stylex.props(styles.rmeta)}>
                <Sym name="globe" size={12} />
                {r.url}
              </span>
            )}
            {subs.length > 0 && (
              <>
                <button type="button" onClick={() => setOpenSubs(!openSubs)} {...stylex.props(styles.rsubs)}>
                  <Sym name={openSubs ? 'down' : 'forward'} size={10} />
                  {openSubsN} subtask{openSubsN === 1 ? '' : 's'}
                </button>
                {openSubs &&
                  subs.map((s) => (
                    <span key={s.id} {...stylex.props(styles.rsub)}>
                      <button
                        type="button"
                        aria-checked={s.done}
                        role="checkbox"
                        onClick={() =>
                          put({ ...r, subs: subs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })
                        }
                        {...stylex.props(styles.subChk(tint), s.done && styles.chkOn(tint))}
                      >
                        {s.done && <Sym name="tick" size={9} />}
                      </button>
                      <span {...stylex.props(s.done && styles.rdone)}>{s.t}</span>
                    </span>
                  ))}
              </>
            )}
          </div>
          {!last && <span {...stylex.props(styles.rsep)} />}
        </div>
      </div>
    </div>
  )
}

// ---------- the new-reminder editor at a list's tail ----------

export function EditorRow({ tint }: { tint: string }) {
  const { draft, set, close } = useEditor()
  const { lists } = useLists()
  const { add } = useReminders()
  const [menu, setMenu] = useState<'date' | 'pri' | 'list' | null>(null)
  if (!draft) return null
  const patch = (p: Partial<Draft>) => set({ ...draft, ...p })
  const list = lists.find((l) => l.id === draft.list) ?? lists[0]

  const commit = (keep: boolean) => {
    const t = draft.t.trim()
    if (!t) return close()
    add({
      t,
      list: draft.list,
      date: draft.date,
      time: draft.date ? draft.time : undefined,
      flag: draft.flag,
      pri: draft.pri
    })
    set(keep ? { t: '', list: draft.list } : null)
  }

  return (
    <div {...stylex.props(styles.rowsWrap, styles.animIn)}>
      <div {...stylex.props(styles.rowClip)}>
        <div {...stylex.props(styles.rrow)}>
          <Circle tint={tint} done={false} toggle={() => {}} />
          <div {...stylex.props(styles.rbody)}>
            <div {...stylex.props(styles.rline)}>
              <input
                autoFocus
                value={draft.t}
                placeholder="Title"
                onChange={(e) => patch({ t: e.target.value })}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') commit(true)
                  if (e.key === 'Escape') close()
                }}
                {...stylex.props(styles.redit)}
              />
            </div>
            {!!draft.date && (
              <span {...stylex.props(styles.rmeta)}>
                {relDay(draft.date, draft.time)}
                {draft.date && (
                  <input
                    type="time"
                    aria-label="Time"
                    value={draft.time ?? ''}
                    onChange={(e) => patch({ time: e.target.value || undefined })}
                    {...stylex.props(styles.dateField)}
                  />
                )}
              </span>
            )}
          </div>
        </div>
        <div {...stylex.props(styles.editorTools)}>
          <div {...stylex.props(styles.toolWrap)}>
            <button
              type="button"
              aria-expanded={menu === 'date'}
              onClick={() => setMenu(menu === 'date' ? null : 'date')}
              {...stylex.props(styles.toolBtn(!!draft.date))}
            >
              <Sym name="calendarSym" size={13} />
              {draft.date ? relDay(draft.date) : 'Date'}
            </button>
            <Menu
              open={menu === 'date'}
              onClose={() => setMenu(null)}
              xstyle={styles.toolMenu}
              items={[
                { label: 'Today', icon: 'calendarSym', onSelect: () => patch({ date: todayKey() }) },
                { label: 'Tomorrow', icon: 'calendarSym', onSelect: () => patch({ date: addDays(todayKey(), 1) }) },
                { label: 'This Weekend', icon: 'calendarSym', onSelect: () => patch({ date: weekendKey() }) },
                'separator',
                { label: 'Clear Date', icon: 'close', onSelect: () => patch({ date: undefined, time: undefined }) }
              ]}
            />
          </div>
          <input
            type="date"
            aria-label="Pick a date"
            value={draft.date ?? ''}
            onChange={(e) => patch({ date: e.target.value || undefined })}
            {...stylex.props(styles.dateField)}
          />
          <div {...stylex.props(styles.toolWrap)}>
            <button
              type="button"
              aria-expanded={menu === 'pri'}
              onClick={() => setMenu(menu === 'pri' ? null : 'pri')}
              {...stylex.props(styles.toolBtn(!!draft.pri))}
            >
              {draft.pri ? '!'.repeat(draft.pri) : 'Priority'}
            </button>
            <Menu
              open={menu === 'pri'}
              onClose={() => setMenu(null)}
              xstyle={styles.toolMenu}
              items={[
                { label: 'None', checked: !draft.pri, onSelect: () => patch({ pri: undefined }) },
                { label: 'Low !', checked: draft.pri === 1, onSelect: () => patch({ pri: 1 }) },
                { label: 'Medium !!', checked: draft.pri === 2, onSelect: () => patch({ pri: 2 }) },
                { label: 'High !!!', checked: draft.pri === 3, onSelect: () => patch({ pri: 3 }) }
              ]}
            />
          </div>
          <button
            type="button"
            aria-pressed={draft.flag}
            onClick={() => patch({ flag: !draft.flag })}
            {...stylex.props(styles.toolBtn(!!draft.flag), draft.flag && styles.toolFlag)}
          >
            <FlagGlyph size={12} />
          </button>
          <div {...stylex.props(styles.toolWrap)}>
            <button
              type="button"
              aria-expanded={menu === 'list'}
              onClick={() => setMenu(menu === 'list' ? null : 'list')}
              {...stylex.props(styles.toolBtn(true))}
            >
              <Sym name={list?.icon ?? 'list'} size={13} />
              {list?.name ?? 'List'}
            </button>
            <Menu
              open={menu === 'list'}
              onClose={() => setMenu(null)}
              xstyle={styles.toolMenu}
              items={lists.map((l) => ({
                label: l.name,
                checked: l.id === draft.list,
                onSelect: () => patch({ list: l.id })
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
