// Reminders. A checklist kept in localStorage, so it survives a reload.
import * as stylex from '@stylexjs/stylex'
import { type KeyboardEvent, useState } from 'react'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { beep } from './shared.ts'

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

const styles = stylex.create({
  blue: { color: colors.blueDark },
  white: { backgroundColor: colors.white },
  chk: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    borderWidth: 1.7,
    borderStyle: 'solid',
    borderColor: colors.grey3,
    flexShrink: 0,
    position: 'relative',
    cursor: 'pointer',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '.2s',
    '::after': {
      content: '""',
      position: 'absolute',
      left: 7,
      top: 3.5,
      width: 5,
      height: 10,
      borderTopWidth: 0,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderLeftWidth: 0,
      borderStyle: 'solid',
      borderColor: colors.white,
      transform: 'rotate(45deg) scale(0)',
      transitionProperty: 'transform',
      transitionDuration: '.24s',
      transitionTimingFunction: 'cubic-bezier(.2,1.5,.4,1)'
    }
  },
  chkOn: {
    borderColor: colors.blueDark,
    backgroundColor: colors.blueDark,
    '::after': { transform: 'rotate(45deg) scale(1)' }
  },
  dim: { opacity: 0.45 },
  label: { fontSize: 16, transitionProperty: 'opacity', transitionDuration: '.25s' },
  done: { opacity: 0.38, textDecorationLine: 'line-through' },
  input: {
    flexGrow: 1,
    flexBasis: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    fontSize: 16
  }
})
