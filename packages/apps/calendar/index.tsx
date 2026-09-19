import { Sym, WidgetLabel } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const VIEWS = ['Day', 'Week', 'Month', 'Year']
// Calendars macOS ships on every account before the user adds any of their own.
const SYSTEM: [string, 'blue' | 'yellow'][] = [
  ['Scheduled Reminders', 'blue'],
  ['Birthdays', 'blue'],
  ['Siri Suggestions', 'yellow']
]

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Six Monday-first weeks covering `month`, the way Apple's month grid always draws them. */
const weeks = (month: Date) => {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setDate(1 - ((start.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

const label = (d: Date) => `${d.toLocaleDateString('en', { month: 'long' })} ${d.getFullYear()}`

export const Calendar = () => {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  const [today, setToday] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const goToday = () => {
    const now = new Date()
    setToday(now)
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  // The box decides, not the display: a split half is as narrow as the cover and drops the sidebar.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  const days = weeks(month)
  return (
    <div ref={root} {...stylex.props(styles.root)}>
      {wide && (
        <aside {...stylex.props(styles.side)}>
          <div {...stylex.props(styles.sideBar)}>
            <button type="button" aria-label="Hide sidebar" {...stylex.props(styles.tool, styles.toolOn)}>
              <Sym name="sidebar" size={15} />
            </button>
            <button type="button" aria-label="Inbox" {...stylex.props(styles.tool)}>
              <Sym name="imports" size={15} />
            </button>
          </div>
          <div {...stylex.props(styles.sideList)}>
            <div {...stylex.props(styles.group)}>Other</div>
            {SYSTEM.map(([name, tint]) => (
              <label key={name} {...stylex.props(styles.cal)}>
                <input type="checkbox" defaultChecked {...stylex.props(styles.check, styles.tint(tint))} />
                {name}
              </label>
            ))}
          </div>
          <div {...stylex.props(styles.mini)}>
            <div {...stylex.props(styles.miniHdr)}>
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shift(-1)}
                {...stylex.props(styles.arrow)}
              >
                <Sym name="back" size={11} />
              </button>
              {label(month)}
              <button type="button" aria-label="Next month" onClick={() => shift(1)} {...stylex.props(styles.arrow)}>
                <Sym name="forward" size={11} />
              </button>
            </div>
            <div {...stylex.props(styles.miniGrid)}>
              {WEEKDAYS.map((d) => (
                <span key={d} {...stylex.props(styles.miniWd)}>
                  {d[0]}
                </span>
              ))}
              {days.map((d) => (
                <span
                  key={d.getTime()}
                  {...stylex.props(
                    styles.miniDay,
                    d.getMonth() !== month.getMonth() && styles.dim,
                    sameDay(d, today) && styles.miniToday
                  )}
                >
                  {d.getDate()}
                </span>
              ))}
            </div>
          </div>
        </aside>
      )}
      <div {...stylex.props(styles.main)}>
        <div {...stylex.props(styles.topBar)}>
          <button type="button" aria-label="New event" {...stylex.props(styles.tool)}>
            <Sym name="plus" size={14} />
          </button>
          <div {...stylex.props(styles.seg)}>
            {VIEWS.map((v) => (
              <button type="button" key={v} {...stylex.props(styles.segBtn, v === 'Month' && styles.segOn)}>
                {v}
              </button>
            ))}
          </div>
          <button type="button" aria-label="Search" {...stylex.props(styles.tool, styles.plain)}>
            <Sym name="search" size={17} />
          </button>
        </div>
        <div {...stylex.props(styles.titleRow, !wide && styles.titleRowSm)}>
          <h1 {...stylex.props(styles.title, !wide && styles.titleSm)}>
            <b>{month.toLocaleDateString('en', { month: 'long' })}</b> {month.getFullYear()}
          </h1>
          <div {...stylex.props(styles.nav)}>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift(-1)}
              {...stylex.props(styles.navBtn)}
            >
              <Sym name="back" size={11} />
            </button>
            <button type="button" onClick={goToday} {...stylex.props(styles.navBtn, styles.todayBtn)}>
              Today
            </button>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} {...stylex.props(styles.navBtn)}>
              <Sym name="forward" size={11} />
            </button>
          </div>
        </div>
        <div {...stylex.props(styles.wds)}>
          {WEEKDAYS.map((d, i) => (
            <span key={d} {...stylex.props(styles.wd, i > 4 && styles.dim)}>
              {d}
            </span>
          ))}
        </div>
        <div {...stylex.props(styles.grid)}>
          {days.map((d, i) => {
            const out = d.getMonth() !== month.getMonth()
            return (
              <div key={d.getTime()} {...stylex.props(styles.day, i % 7 > 4 && styles.weekend)}>
                <span
                  {...stylex.props(styles.num, (out || i % 7 > 4) && styles.dim, sameDay(d, today) && styles.today)}
                >
                  {d.getDate() === 1 ? `1 ${d.toLocaleDateString('en', { month: 'short' })}` : d.getDate()}
                </span>
              </div>
            )
          })}
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
      <WidgetLabel xstyle={[styles.calDay]}>{today.toLocaleDateString('en', { weekday: 'long' })}</WidgetLabel>
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
