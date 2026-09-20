import * as stylex from '@stylexjs/stylex'
import type { Event } from './data.ts'
import { eventsOn, sameDay, WEEKDAYS, weeks } from './dates.ts'
import { pack } from './lanes.ts'
import { styles } from './styles.ts'

type Props = {
  month: Date
  today: Date
  selected: Date
  /** The inner display shows titles; the cover has room for dots and opens the day instead. */
  wide: boolean
  events: Event[]
  colors: Map<string, string>
  /** A click picks the day, the way Apple's month sheet does; the second one writes on it. */
  onPick: (d: Date) => void
  onNew: (d: Date) => void
  onOpen: (d: Date) => void
  onEvent: (e: Event) => void
}

/** Event rows a week shows before the rest become a count; styles.ts repeats the number in the row template. */
const LANES = 3

/** Apple names the month on its first day, so the edges of the sheet still read. */
const label = (d: Date) =>
  d.getDate() === 1 ? `${d.getDate()} ${d.toLocaleDateString('en', { month: 'short' })}` : d.getDate()

export function MonthView({ month, today, selected, wide, events, colors, onPick, onNew, onOpen, onEvent }: Props) {
  const grid = weeks(month)
  return (
    <div {...stylex.props(styles.month)}>
      <div {...stylex.props(styles.wds)}>
        {WEEKDAYS.map((d) => (
          <span key={d} {...stylex.props(styles.wd)}>
            {d}
          </span>
        ))}
      </div>
      {Array.from({ length: grid.length / 7 }, (_, w) => grid.slice(w * 7, w * 7 + 7)).map((days) => {
        const { placed, more } = wide ? pack(days, events, LANES) : { placed: [], more: [] }
        return (
          <div key={days[0]!.getTime()} {...stylex.props(styles.week, !wide && styles.weekSm)}>
            {/* The empty part of a day picks it; its events sit above and open themselves. */}
            {days.map((d, i) => (
              <div
                key={d.getTime()}
                onClick={() => (wide ? onPick(d) : onOpen(d))}
                onDoubleClick={() => onNew(d)}
                onKeyDown={(e) => e.key === 'Enter' && onNew(d)}
                role="button"
                tabIndex={0}
                aria-label={d.toDateString()}
                {...stylex.props(styles.cell, styles.colAt(i))}
              />
            ))}
            {days.map((d, i) => {
              const now = sameDay(d, today)
              const pick = !now && sameDay(d, selected)
              return (
                <span
                  key={d.getTime()}
                  {...stylex.props(
                    styles.num,
                    styles.colAt(i),
                    d.getMonth() !== month.getMonth() && styles.numOut,
                    (now || pick) && styles.disc,
                    now && styles.today,
                    pick && styles.picked
                  )}
                >
                  {/* A disc holds the number alone; the month name would stretch it into a pill. */}
                  {now || pick ? d.getDate() : label(d)}
                </span>
              )
            })}
            {!wide &&
              days.map((d, i) => (
                <div key={d.getTime()} {...stylex.props(styles.dots, styles.colAt(i))}>
                  {eventsOn(events, d)
                    .slice(0, 4)
                    .map((e) => (
                      <i key={e.id} {...stylex.props(styles.dot, styles.tint(colors.get(e.calendar)))} />
                    ))}
                </div>
              ))}
            {placed.map((p) => {
              const bar = !!p.e.allDay || p.span > 1
              const tint = colors.get(p.e.calendar)
              return (
                <button
                  type="button"
                  key={p.e.id}
                  onClick={() => onEvent(p.e)}
                  title={p.e.title || 'New Event'}
                  {...stylex.props(
                    styles.item,
                    styles.slot(p.col, p.span, p.lane + 2),
                    bar ? styles.bar : styles.plain,
                    bar && styles.tint(tint)
                  )}
                >
                  {!bar && <i {...stylex.props(styles.dot, styles.tint(tint))} />}
                  <span {...stylex.props(styles.chipTitle)}>{p.e.title || 'New Event'}</span>
                </button>
              )
            })}
            {more.map((n, i) =>
              n > 0 ? (
                <button
                  type="button"
                  key={days[i]!.getTime()}
                  onClick={() => onOpen(days[i]!)}
                  {...stylex.props(styles.item, styles.more, styles.slot(i, 1, LANES + 1))}
                >
                  {n} more
                </button>
              ) : null
            )}
          </div>
        )
      })}
    </div>
  )
}
