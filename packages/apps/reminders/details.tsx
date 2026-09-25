// The Details editor, iPad's form sheet and the cover's pushed page around
// the same body: title and notes up top, the remind-me toggles, flag,
// priority, tags, subtasks, and Delete at the foot.

import { Menu, Page, Section, Sheet, Sym, TextField, Toggle } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { LIST_TINT, type Reminder, relDay, todayKey } from './data.ts'
import { FlagGlyph } from './glyphs.tsx'
import { useGo, useLists, useReminders } from './store.ts'
import { styles } from './styles.ts'

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** The details body, identical wherever it is framed. */
export function DetailsForm({ r }: { r: Reminder }) {
  const { put, remove } = useReminders()
  const { lists } = useLists()
  const { back } = useGo()
  const [tagIn, setTagIn] = useState('')
  const [subIn, setSubIn] = useState('')
  const [menu, setMenu] = useState<'pri' | 'list' | null>(null)
  const patch = (p: Partial<Reminder>) => put({ ...r, ...p })
  const list = lists.find((l) => l.id === r.list)
  const subs = r.subs ?? []

  const addTag = () => {
    const t = tagIn.trim().replace(/^#/, '')
    if (!t) return
    patch({ tags: [...(r.tags ?? []), t] })
    setTagIn('')
  }
  const addSub = () => {
    const t = subIn.trim()
    if (!t) return
    patch({ subs: [...subs, { id: uid(), t }] })
    setSubIn('')
  }

  return (
    <div {...stylex.props(styles.detScroll)}>
      <div {...stylex.props(styles.detTop)}>
        <button
          type="button"
          role="checkbox"
          aria-checked={!!r.done}
          aria-label="Mark completed"
          onClick={() => patch({ done: !r.done, doneAt: !r.done ? Date.now() : undefined })}
          {...stylex.props(
            styles.chk(list ? LIST_TINT[list.color] : colors.blue),
            r.done && styles.chkOn(list ? LIST_TINT[list.color] : colors.blue),
            shared.press
          )}
        >
          {!!r.done && (
            <span {...stylex.props(styles.tickIn)}>
              <Sym name="tick" size={12} />
            </span>
          )}
        </button>
        <input
          value={r.t}
          aria-label="Title"
          onChange={(e) => patch({ t: e.target.value })}
          {...stylex.props(styles.detField)}
        />
      </div>

      <Section xstyle={styles.detGroup}>
        <label {...stylex.props(styles.detRow)}>
          <span {...stylex.props(styles.detLabel)}>Notes</span>
          <input
            value={r.n ?? ''}
            placeholder="Notes"
            onChange={(e) => patch({ n: e.target.value || undefined })}
            {...stylex.props(styles.detField, styles.detValue)}
          />
        </label>
        <label {...stylex.props(styles.detRow)}>
          <span {...stylex.props(styles.detLabel)}>URL</span>
          <input
            value={r.url ?? ''}
            placeholder="URL"
            inputMode="url"
            onChange={(e) => patch({ url: e.target.value || undefined })}
            {...stylex.props(styles.detField, styles.detValue)}
          />
        </label>
      </Section>

      <Section xstyle={styles.detGroup}>
        <label {...stylex.props(styles.detRow)}>
          <span {...stylex.props(styles.detIc(colors.red))}>
            <Sym name="calendarSym" size={15} />
          </span>
          <span {...stylex.props(styles.detLabel)}>Date</span>
          {r.date && <span {...stylex.props(styles.detValue)}>{relDay(r.date)}</span>}
          <Toggle
            checked={!!r.date}
            aria-label="Remind me on a day"
            onChange={() => patch({ date: r.date ? undefined : todayKey() })}
          />
        </label>
        {r.date && (
          <label {...stylex.props(styles.detRow)}>
            <span {...stylex.props(styles.detLabel)} />
            <input
              type="date"
              value={r.date}
              aria-label="Pick a date"
              onChange={(e) => patch({ date: e.target.value || todayKey() })}
              {...stylex.props(styles.detField, styles.detValue)}
            />
          </label>
        )}
        <label {...stylex.props(styles.detRow)}>
          <span {...stylex.props(styles.detIc(colors.purple))}>
            <Sym name="clockSym" size={15} />
          </span>
          <span {...stylex.props(styles.detLabel)}>Time</span>
          {r.time && <span {...stylex.props(styles.detValue)}>{r.time}</span>}
          <Toggle
            checked={!!r.time}
            aria-label="Remind me at a time"
            onChange={() => patch({ time: r.time ? undefined : '09:00' })}
          />
        </label>
        {r.time && (
          <label {...stylex.props(styles.detRow)}>
            <span {...stylex.props(styles.detLabel)} />
            <input
              type="time"
              value={r.time}
              aria-label="Pick a time"
              onChange={(e) => patch({ time: e.target.value || undefined })}
              {...stylex.props(styles.detField, styles.detValue)}
            />
          </label>
        )}
      </Section>

      <Section xstyle={styles.detGroup}>
        <label {...stylex.props(styles.detRow)}>
          <span {...stylex.props(styles.detIc(colors.orange))}>
            <FlagGlyph size={14} />
          </span>
          <span {...stylex.props(styles.detLabel)}>Flagged</span>
          <Toggle checked={!!r.flag} aria-label="Flagged" onChange={() => patch({ flag: !r.flag })} />
        </label>
        <span {...stylex.props(styles.toolWrap)}>
          <button
            type="button"
            aria-expanded={menu === 'pri'}
            onClick={() => setMenu(menu === 'pri' ? null : 'pri')}
            {...stylex.props(styles.detRow, shared.select)}
          >
            <span {...stylex.props(styles.detIc(colors.grey))}>
              <Sym name="more" size={15} />
            </span>
            <span {...stylex.props(styles.detLabel)}>Priority</span>
            <span {...stylex.props(styles.detValue)}>{r.pri ? '!'.repeat(r.pri) : 'None'}</span>
            <Sym name="forward" size={13} />
          </button>
          <Menu
            open={menu === 'pri'}
            onClose={() => setMenu(null)}
            xstyle={styles.detMenu}
            items={[
              { label: 'None', checked: !r.pri, onSelect: () => patch({ pri: undefined }) },
              { label: 'Low !', checked: r.pri === 1, onSelect: () => patch({ pri: 1 }) },
              { label: 'Medium !!', checked: r.pri === 2, onSelect: () => patch({ pri: 2 }) },
              { label: 'High !!!', checked: r.pri === 3, onSelect: () => patch({ pri: 3 }) }
            ]}
          />
        </span>
      </Section>

      <Section xstyle={styles.detGroup}>
        <label {...stylex.props(styles.detRow)}>
          <span {...stylex.props(styles.detIc(colors.blue))}>
            <Sym name="bookmark" size={15} />
          </span>
          <span {...stylex.props(styles.detLabel)}>Tags</span>
        </label>
        {(r.tags?.length ?? 0) > 0 && (
          <div {...stylex.props(styles.detTagRow)}>
            {(r.tags ?? []).map((t) => (
              <button
                key={t}
                type="button"
                aria-label={`Remove tag ${t}`}
                onClick={() => patch({ tags: (r.tags ?? []).filter((x) => x !== t) })}
                {...stylex.props(styles.tag)}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
        <div {...stylex.props(styles.detRow)}>
          <input
            value={tagIn}
            placeholder="Add Tag"
            onChange={(e) => setTagIn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            onBlur={addTag}
            {...stylex.props(styles.detField)}
          />
        </div>
      </Section>

      <Section xstyle={styles.detGroup}>
        {subs.map((s) => (
          <label key={s.id} {...stylex.props(styles.detRow)}>
            <input
              type="checkbox"
              checked={!!s.done}
              aria-label="Subtask done"
              onChange={() => patch({ subs: subs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
            />
            <span {...stylex.props(styles.detLabel)}>{s.t}</span>
            <button
              type="button"
              aria-label={`Remove ${s.t}`}
              onClick={() => patch({ subs: subs.filter((x) => x.id !== s.id) })}
              {...stylex.props(styles.clearBtn)}
            >
              <Sym name="minus" size={12} />
            </button>
          </label>
        ))}
        <div {...stylex.props(styles.detRow)}>
          <input
            value={subIn}
            placeholder="Add Subtask"
            onChange={(e) => setSubIn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSub()}
            onBlur={addSub}
            {...stylex.props(styles.detField)}
          />
        </div>
      </Section>

      <Section xstyle={styles.detGroup}>
        <button
          type="button"
          onClick={() => {
            remove(r.id)
            back()
          }}
          {...stylex.props(styles.delRow)}
        >
          Delete Reminder
        </button>
      </Section>
    </div>
  )
}

/** iPad's details form sheet. */
export function DetailsSheet({ open, onClose, r }: { open: boolean; onClose: () => void; r?: Reminder }) {
  return (
    <Sheet open={open} onClose={onClose} xstyle={styles.detSheet}>
      {r && (
        <>
          <div {...stylex.props(styles.detHead)}>
            <span {...stylex.props(styles.detTitle)}>Details</span>
            <button type="button" onClick={onClose} {...stylex.props(styles.detDone, shared.press)}>
              Done
            </button>
          </div>
          <DetailsForm r={r} />
        </>
      )}
    </Sheet>
  )
}

/** The cover's pushed details page. */
export function DetailsPage({ r, back }: { r?: Reminder; back: () => void }) {
  return (
    <Page title="Details" back={back}>
      {r ? <DetailsForm r={r} /> : <div {...stylex.props(shared.ph, styles.empty)}>Not found</div>}
    </Page>
  )
}
