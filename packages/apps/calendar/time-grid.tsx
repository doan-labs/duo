import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import type { Event } from './data.ts'
import { eventsOn, HOUR, minutes, sameDay, time } from './dates.ts'
import { pack } from './lanes.ts'
import { enter, styles } from './styles.ts'

type Props = {
  days: Date[]
  today: Date
  events: Event[]
  colors: Map<string, string>
  /** Which way the last move went, so the sheet comes in from that side. */
  dir: number
  /** The page being shown. Changing it replays the entrance without remounting the scroller. */
  stamp: string
  onSlot: (d: Date) => void
  onEvent: (e: Event) => void
}

const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

/** Day and Week are the same grid with one or seven columns. */
export function TimeGrid({ days, today, events, colors, dir, stamp, onSlot, onEvent }: Props) {
  const scroll = useRef<HTMLDivElement>(null)
  // The weekend is shaded to set it off from the working week, so a lone Sunday in
  // Day view has nothing to be set off from and stays the colour of the sheet.
  const wash = (d: Date) => days.length > 1 && (d.getDay() === 0 || d.getDay() === 6)
  // Open on the working morning, as Apple does, rather than at midnight.
  useEffect(() => {
    scroll.current!.scrollTop = HOUR * 7.5
  }, [])
  const now = today.getHours() * 60 + today.getMinutes()
  const here = days.some((d) => sameDay(d, today))
  const slide = enter(dir)
  const pick = (d: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    onSlot(new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(y / HOUR)))
  }
  return (
    <>
      <div key={stamp} {...stylex.props(styles.tgHead, styles.cols(days.length), styles.anim, slide)}>
        <span {...stylex.props(styles.tgGutter)} />
        {days.map((d, i) => (
          <div key={d.getTime()} {...stylex.props(styles.tgDay, styles.colAt(i + 1), wash(d) && styles.weekend)}>
            <span {...stylex.props(wash(d) ? styles.off : styles.dim)}>
              {d.toLocaleDateString('en', { weekday: 'short' })}
            </span>
            <span {...stylex.props(styles.tgNum, sameDay(d, today) && styles.today)}>{d.getDate()}</span>
          </div>
        ))}
        <span {...stylex.props(styles.allDayLabel)}>all-day</span>
        {/* The empty days carry the rules; the lanes span them so one bar covers its whole run. */}
        {days.map((d, i) => (
          <span
            key={d.getTime()}
            {...stylex.props(styles.allDayCell, styles.colAt(i + 1), wash(d) && styles.weekend)}
          />
        ))}
        <div {...stylex.props(styles.allDay, styles.laneCols(days.length), styles.slot(1, days.length, 2))}>
          {pack(
            days,
            events.filter((e) => e.allDay)
          ).placed.map((p) => (
            <button
              type="button"
              key={p.e.id}
              onClick={() => onEvent(p.e)}
              {...stylex.props(
                styles.item,
                styles.bar,
                styles.slot(p.col, p.span, p.lane + 1),
                styles.tint(colors.get(p.e.calendar))
              )}
            >
              <span {...stylex.props(styles.chipTitle)}>{p.e.title || 'New Event'}</span>
            </button>
          ))}
        </div>
      </div>
      <div ref={scroll} {...stylex.props(styles.tgScroll)}>
        <div key={stamp} {...stylex.props(styles.tgBody, styles.cols(days.length), styles.anim, slide)}>
          <div {...stylex.props(styles.hours)}>
            {hours.map((h, i) => (
              <span key={h} {...stylex.props(styles.hour, styles.at(i * 60))}>
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
              {...stylex.props(styles.col, wash(d) && styles.weekend)}
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
                      {...stylex.props(styles.block, styles.soft(colors.get(e.calendar)), styles.span(from, to - from))}
                    >
                      <b>{e.title || 'New Event'}</b>
                      <span>{time(e.start)}</span>
                    </button>
                  )
                })}
              {sameDay(d, today) && <i {...stylex.props(styles.now, styles.at(now))} />}
            </div>
          ))}
          {/* Now runs pale across the week and reads as a time in the gutter, as Apple draws it. */}
          {here && (
            <>
              <i {...stylex.props(styles.nowFaint, styles.at(now))} />
              <span {...stylex.props(styles.nowPill, styles.at(now))}>
                {today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  )
}
