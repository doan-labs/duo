// Activity: a date scrubber over the rings - the same day on both displays -
// then the day's totals and a fortnight of ring history. Scrubbing back and
// forth walks through the seeded 90 days plus anything logged.

import { day, dayAt, rings, ringsClosed } from '@doan-labs/duo-fixtures/health.ts'
import { RING_TINTS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { MiniRings, midDate, num, WoRow } from './parts.tsx'
import { goTo, scrubDay, setDayOffset, useBook, useDayOffset } from './store.ts'
import { styles } from './styles.ts'

const TINTS = [RING_TINTS.move, RING_TINTS.exercise, RING_TINTS.stand]

export function ActivityPage({ wide }: { wide: boolean }) {
  const book = useBook()
  const back = useDayOffset()
  const key = dayAt(back)
  const rs = rings(key)
  const d = day(key)
  const done = ringsClosed(key)
  const daysWorkouts = book.workouts.filter((w) => w.at.slice(0, 10) === key)
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Activity</span>
        {done && (
          <span {...stylex.props(styles.headSide)}>
            <span {...stylex.props(styles.chip)}>
              <Sym name="check" size={11} />
              Rings closed
            </span>
          </span>
        )}
      </div>
      <div {...stylex.props(styles.scrubber)}>
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => scrubDay(1)}
          {...stylex.props(styles.iconBtn, shared.press)}
        >
          <Sym name="back" size={13} />
        </button>
        <span {...stylex.props(styles.woName)}>{back === 0 ? 'Today' : midDate(key)}</span>
        <button
          type="button"
          aria-label="Next day"
          disabled={back === 0}
          onClick={() => scrubDay(-1)}
          {...stylex.props(styles.iconBtn, shared.press)}
        >
          <Sym name="forward" size={13} />
        </button>
      </div>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.ringsRow)}>
            <Rings
              size={wide ? 190 : 150}
              stroke={wide ? 17 : 13}
              values={[
                ['Move', RING_TINTS.move, rs[0].done, rs[0].goal, 'KCAL'],
                ['Exercise', RING_TINTS.exercise, rs[1].done, rs[1].goal, 'MIN'],
                ['Stand', RING_TINTS.stand, rs[2].done, rs[2].goal, 'HRS']
              ]}
            />
            <div {...stylex.props(styles.ringStats)}>
              {rs.map((r, i) => (
                <div key={r.id} {...stylex.props(styles.ringStat)}>
                  <span {...stylex.props(styles.dot(TINTS[i]!))} /> {r.label}: {num(r.done)}
                  <span {...stylex.props(shared.sub)}>
                    /{num(r.goal)} {r.unit}
                  </span>
                </div>
              ))}
              <div {...stylex.props(styles.ringStat)}>
                <span {...stylex.props(styles.dot(RING_TINTS.move))} /> Steps: {num(d.steps)}
                <span {...stylex.props(shared.sub)}> · {d.km.toFixed(2)} km</span>
              </div>
            </div>
          </div>

          {daysWorkouts.length > 0 && (
            <>
              <div {...stylex.props(styles.secHead)}>
                <span {...stylex.props(typography.headline)}>Workouts</span>
              </div>
              <div {...stylex.props(styles.grid)}>
                {daysWorkouts.map((w) => (
                  <WoRow key={w.id} w={w} open={() => goTo(`w:${w.id}`)} />
                ))}
              </div>
            </>
          )}

          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>History</span>
          </div>
          <div {...stylex.props(styles.grid)}>
            {Array.from({ length: 14 }, (_, i) => i + 1).map((i) => {
              const k = dayAt(i)
              const dd = day(k)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDayOffset(i)}
                  {...stylex.props(styles.dcard, styles.dcardBtn, styles.histRow)}
                >
                  <MiniRings forKey={k} />
                  <span>
                    <div {...stylex.props(styles.woName)}>{midDate(k)}</div>
                    <div {...stylex.props(styles.woSub)}>
                      {num(dd.kcal)} kcal · {dd.exercise} min · {dd.stand} hrs
                    </div>
                  </span>
                  <span {...stylex.props(styles.woRight)}>
                    {ringsClosed(k) ? <Sym name="check" size={14} /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
