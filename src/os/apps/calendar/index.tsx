import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'
import { shared } from '../../uikit/styles.ts'
import { styles } from './styles.ts'

// Name and initial, since Sunday and Saturday share a letter and a key must not.
const WEEKDAYS: [string, string][] = [
  ['Sun', 'S'],
  ['Mon', 'M'],
  ['Tue', 'T'],
  ['Wed', 'W'],
  ['Thu', 'T'],
  ['Fri', 'F'],
  ['Sat', 'S']
]

export const Calendar = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const first = new Date(y, m, 1).getDay()
  const n = new Date(y, m + 1, 0).getDate()
  const today = now.getDate()
  // Leading blanks are the non-positive numbers, so every cell has a distinct key.
  const days = Array.from({ length: first + n }, (_, i) => i + 1 - first)
  return (
    <div {...stylex.props(shared.body, styles.root)}>
      <div {...stylex.props(shared.hdr, styles.hdr)}>
        {now.toLocaleDateString('en', { month: 'long' })}
        <span {...stylex.props(shared.hdrSm)}>{y}</span>
      </div>
      <div {...stylex.props(styles.cal)}>
        {WEEKDAYS.map(([k, d]) => (
          <span key={k} {...stylex.props(styles.cell, styles.wd)}>
            {d}
          </span>
        ))}
        {days.map((d) => (
          <span key={d} {...stylex.props(styles.cell, d === today && styles.today)}>
            {d > 0 && d}
          </span>
        ))}
      </div>
      <div {...stylex.props(shared.grp, styles.events)}>
        <div {...stylex.props(shared.row, styles.event)}>
          <div {...stylex.props(styles.tag)} />
          <div>
            <div {...stylex.props(styles.title)}>iPhone Duo keynote</div>
            <div {...stylex.props(shared.sub)}>Apple Park · 10:00</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalendarWidget({ onOpen }: { onOpen: (from: HTMLElement) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const today = new Date()
  return (
    <div ref={el} {...stylex.props(shared.glass, shared.widget, styles.calWidget)} onClick={() => onOpen(el.current!)}>
      <b {...stylex.props(shared.widgetLabel, styles.calDay)}>{today.toLocaleDateString('en', { weekday: 'long' })}</b>
      <div {...stylex.props(styles.calNum)}>{today.getDate()}</div>
      {/* Short enough for one line each: screen.ts bakes the same widget on canvas,
          which does not wrap, and a line that wraps here would not wrap there. */}
      <div {...stylex.props(styles.calEv)}>
        Duo keynote
        <div {...stylex.props(styles.calSub)}>10:00 Apple Park</div>
      </div>
    </div>
  )
}
