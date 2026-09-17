// Reminders. A checklist kept in localStorage, so it survives a reload.
import * as stylex from '@stylexjs/stylex'
import { type KeyboardEvent, useState } from 'react'
import { shared } from '../../uikit/styles.ts'
import { beep } from '../shared.ts'
import { styles } from './styles.ts'

type Task = { t: string; done: boolean }

const KEY = 'duo.reminders'
const DEFAULTS: Task[] = [
  { t: 'Re-render the macro shot at 400 samples', done: false },
  { t: 'Measure the spine radius against the mock', done: false },
  { t: 'Ship the WebGL studio port', done: true },
  { t: 'Ask about the CSS3D panel tone mapping', done: false },
  { t: 'Polish the titanium', done: false }
]
const load = (): Task[] => JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? DEFAULTS
const save = (items: Task[]) => localStorage.setItem(KEY, JSON.stringify(items))

export const Reminders = () => {
  const [items, setItems] = useState(load)
  const [draft, setDraft] = useState('')
  const update = (next: Task[]) => {
    setItems(next)
    save(next)
  }
  const flip = (i: number) => {
    const next = items.map((task, j) => (j === i ? { ...task, done: !task.done } : task))
    update(next)
    if (next[i]!.done) beep([1320, 1760], 0.05, 0.05)
  }
  const add = (e: KeyboardEvent<HTMLInputElement>) => {
    const t = draft.trim()
    if (e.key !== 'Enter' || !t) return
    update([...items, { t, done: false }])
    setDraft('')
  }
  return (
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(shared.hdr, styles.blue)}>
        Reminders
        <span {...stylex.props(shared.hdrSm)}>{items.filter((i) => !i.done).length} open</span>
      </div>
      <div {...stylex.props(shared.grp, styles.white)}>
        {items.map((task, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tasks are only ever appended, never reordered or removed
          <div key={i} {...stylex.props(shared.row)} onClick={() => flip(i)}>
            <span {...stylex.props(styles.chk, task.done && styles.chkOn)} />
            <span {...stylex.props(styles.label, task.done && styles.done)}>{task.t}</span>
          </div>
        ))}
        <div {...stylex.props(shared.row)}>
          <span {...stylex.props(styles.chk, styles.dim)} />
          <input
            {...stylex.props(styles.input)}
            placeholder="New Reminder"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={add}
          />
        </div>
      </div>
    </div>
  )
}
