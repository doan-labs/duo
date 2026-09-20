import * as stylex from '@stylexjs/stylex'
import { sameDay, WEEKDAYS, weeks } from './dates.ts'
import { enter, styles } from './styles.ts'

type Props = { year: number; today: Date; dir: number; onMonth: (d: Date) => void; onDay: (d: Date) => void }

export function YearView({ year, today, dir, onMonth, onDay }: Props) {
  return (
    <div {...stylex.props(styles.year, styles.anim, enter(dir))}>
      {Array.from({ length: 12 }, (_, m) => new Date(year, m, 1)).map((month) => (
        <div key={month.getMonth()} {...stylex.props(styles.yMonth)}>
          <button
            type="button"
            onClick={() => onMonth(month)}
            {...stylex.props(
              styles.yTitle,
              month.getMonth() === today.getMonth() && year === today.getFullYear() && styles.red
            )}
          >
            {month.toLocaleDateString('en', { month: 'long' })}
          </button>
          <div {...stylex.props(styles.miniGrid)}>
            {WEEKDAYS.map((d) => (
              <span key={d} {...stylex.props(styles.miniWd)}>
                {d[0]}
              </span>
            ))}
            {weeks(month, 6).map((d) =>
              d.getMonth() === month.getMonth() ? (
                <button
                  type="button"
                  key={d.getTime()}
                  onClick={() => onDay(d)}
                  {...stylex.props(styles.miniDay, sameDay(d, today) && styles.miniToday)}
                >
                  {d.getDate()}
                </button>
              ) : (
                <span key={d.getTime()} {...stylex.props(styles.miniGap)} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
