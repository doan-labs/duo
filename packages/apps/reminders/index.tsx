import { Row, Screen, Section, Title } from '@doan-labs/duo-uikit'
// Reminders. A checklist kept in the app's storage, so it survives a reload and both displays agree on it.

import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { beep } from '@doan-labs/duo-uikit/shared.ts'
import * as stylex from '@stylexjs/stylex'
import { type KeyboardEvent, useState } from 'react'
import { styles } from './styles.ts'

type Task = { t: string; done: boolean }

const DEFAULTS: Task[] = [
  { t: 'Re-render the macro shot at 400 samples', done: false },
  { t: 'Measure the spine radius against the mock', done: false },
  { t: 'Ship the WebGL studio port', done: true },
  { t: 'Ask about the CSS3D panel tone mapping', done: false },
  { t: 'Polish the titanium', done: false }
]

export const Reminders = () => {
  const kv = useKV(os.storage, 'tasks')
  const items: Task[] = kv.value ? JSON.parse(kv.value) : DEFAULTS
  const [draft, setDraft] = useState('')
  const update = (next: Task[]) => kv.set(JSON.stringify(next))
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
