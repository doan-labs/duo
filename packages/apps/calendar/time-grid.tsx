import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import type { Event } from './data.ts'
import { eventsOn, HOUR, minutes, sameDay, time } from './dates.ts'
import { styles } from './styles.ts'

type Props = {
  days: Date[]
  today: Date
  events: Event[]
  colors: Map<string, string>
  onSlot: (d: Date) => void
  onEvent: (e: Event) => void
}

const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

/** Day and Week are the same grid with one or seven columns. */
export function TimeGrid({ days, today, events, colors, onSlot, onEvent }: Props) {
  const scroll = useRef<HTMLDivElement>(null)
  // Open on the working morning, as Apple does, rather than at midnight.
  useEffect(() => {
    scroll.current!.scrollTop = HOUR * 7.5
  }, [])
  const now = today.getHours() * 60 + today.getMinutes()
  const pick = (d: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    onSlot(new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(y / HOUR)))
  }
  return (
    <>
      <div {...stylex.props(styles.tgHead, styles.cols(days.length))}>
        <span />
        {days.map((d) => (
          <div key={d.getTime()} {...stylex.props(styles.tgDay)}>
            <span {...stylex.props(styles.dim)}>{d.toLocaleDateString('en', { weekday: 'short' })}</span>
            <span {...stylex.props(styles.tgNum, sameDay(d, today) && styles.today)}>{d.getDate()}</span>
          </div>
        ))}
        <span {...stylex.props(styles.allDayLabel)}>all-day</span>
        {days.map((d) => (
          <div key={d.getTime()} {...stylex.props(styles.allDay)}>
            {eventsOn(events, d)
              .filter((e) => e.allDay)
              .map((e) => (
                <button
                  type="button"
                  key={e.id}
                  onClick={() => onEvent(e)}
                  {...stylex.props(styles.chip, styles.chipAllDay, styles.tint(colors.get(e.calendar)))}
                >
                  <span {...stylex.props(styles.chipTitle)}>{e.title || 'New Event'}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
      <div ref={scroll} {...stylex.props(styles.tgScroll)}>
        <div {...stylex.props(styles.tgBody, styles.cols(days.length))}>
          <div {...stylex.props(styles.hours)}>
            {hours.map((h) => (
              <span key={h} {...stylex.props(styles.hour)}>
                {h}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d.getTime()}
              onClick={(e) => pick(d, e)}
              onKeyDown={(e) => e.key === 'Enter' && onSlot(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9))}
              role="button"
              tabIndex={0}
              aria-label={d.toDateString()}
              {...stylex.props(styles.col)}
            >
              {eventsOn(events, d)
                .filter((e) => !e.allDay)
                .map((e) => {
                  const from = minutes(e.start, d, 0)
                  const to = Math.max(minutes(e.end, d, 1440), from + 20)
                  return (
                    <button
                      type="button"
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onEvent(e)
                      }}
                      {...stylex.props(styles.block, styles.tint(colors.get(e.calendar)), styles.span(from, to - from))}
                    >
                      <b>{e.title || 'New Event'}</b>
                      <span>{time(e.start)}</span>
                    </button>
                  )
                })}
              {sameDay(d, today) && <i {...stylex.props(styles.now, styles.at(now))} />}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
