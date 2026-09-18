import { Row, Screen, Section, Title } from '@doan-labs/ipduo-uikit'
// Reminders. A checklist kept in localStorage, so it survives a reload.

import { beep } from '@doan-labs/ipduo-uikit/shared.ts'
import * as stylex from '@stylexjs/stylex'
import { type KeyboardEvent, useState } from 'react'
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
    <Screen>
      <Title xstyle={[styles.blue]}>
        Reminders
        <Title as="span" variant="accessory">
          {items.filter((i) => !i.done).length} open
        </Title>
      </Title>
      <Section xstyle={[styles.white]}>
        {items.map((task, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tasks are only ever appended, never reordered or removed
          <Row key={i} onClick={() => flip(i)}>
            <span {...stylex.props(styles.chk, task.done && styles.chkOn)} />
            <span {...stylex.props(styles.label, task.done && styles.done)}>{task.t}</span>
          </Row>
        ))}
        <Row>
          <span {...stylex.props(styles.chk, styles.dim)} />
          <input
            {...stylex.props(styles.input)}
            placeholder="New Reminder"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={add}
          />
        </Row>
      </Section>
    </Screen>
  )
}
