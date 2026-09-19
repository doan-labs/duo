import * as stylex from '@stylexjs/stylex'
import type { Event } from './data.ts'
import { eventsOn, sameDay, time, WEEKDAYS, weeks } from './dates.ts'
import { styles } from './styles.ts'

type Props = {
  month: Date
  today: Date
  events: Event[]
  colors: Map<string, string>
  onDay: (d: Date) => void
  onEvent: (e: Event) => void
}

export function MonthView({ month, today, events, colors, onDay, onEvent }: Props) {
  return (
    <>
      <div {...stylex.props(styles.wds)}>
        {WEEKDAYS.map((d, i) => (
          <span key={d} {...stylex.props(styles.wd, i > 4 && styles.dim)}>
            {d}
          </span>
        ))}
      </div>
      <div {...stylex.props(styles.grid)}>
        {weeks(month).map((d, i) => {
          const out = d.getMonth() !== month.getMonth()
          const weekend = i % 7 > 4
          return (
            // The cell is the click target for a new event; its events stop the click so they open themselves.
            <div
              key={d.getTime()}
              onClick={() => onDay(d)}
              onKeyDown={(e) => e.key === 'Enter' && onDay(d)}
              role="button"
              tabIndex={0}
              aria-label={d.toDateString()}
              {...stylex.props(styles.day, weekend && styles.weekend)}
            >
              <span {...stylex.props(styles.num, (out || weekend) && styles.dim, sameDay(d, today) && styles.today)}>
                {d.getDate() === 1 ? `1 ${d.toLocaleDateString('en', { month: 'short' })}` : d.getDate()}
              </span>
              {eventsOn(events, d).map((e) => (
                <button
                  type="button"
                  key={e.id}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onEvent(e)
                  }}
                  title={e.allDay ? e.title : `${time(e.start)} ${e.title}`}
                  {...stylex.props(
                    styles.chip,
                    e.allDay && styles.chipAllDay,
                    e.allDay && styles.tint(colors.get(e.calendar))
                  )}
                >
                  {!e.allDay && <i {...stylex.props(styles.dot, styles.ring(colors.get(e.calendar)))} />}
                  <span {...stylex.props(styles.chipTitle)}>{e.title || 'New Event'}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
