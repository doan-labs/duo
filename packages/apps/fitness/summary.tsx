// Summary: the rings hero first - rings that mount empty and fill in - then
// the streak, this week's Move bars, the last workouts, and the awards shelf.
// Everything reads the shared book; the goal steppers write it.

import { awards, rings, series, streak, todayKey } from '@doan-labs/duo-fixtures/health.ts'
import { RING_TINTS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { delay, shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { num, WeekBars, WoRow } from './parts.tsx'
import { goRoot, goTo, openSheet, useBook } from './store.ts'
import { styles } from './styles.ts'

export function SummaryPage({ wide }: { wide: boolean }) {
  const book = useBook()
  const rs = rings()
  const days = streak()
  const earned = awards().filter((a) => a.earned).length
  const moveWeek = series((d) => d.kcal, 'W')
  const recent = book.workouts.slice(0, 3)
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Summary</span>
        <span {...stylex.props(styles.headSide)}>
          <span {...stylex.props(styles.chip)} title="Days in a row all three rings closed">
            <Sym name="bolt" size={11} />
            {days} day{days === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => openSheet('goals')}
            {...stylex.props(styles.iconBtn, shared.press)}
            aria-label="Change goals"
            title="Change goals"
          >
            <Sym name="gauge" size={14} />
          </button>
        </span>
      </div>
      <div {...stylex.props(shared.sub, styles.date)}>{todayLine()}</div>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.ringsRow)}>
            <Rings
              size={wide ? 200 : 150}
              stroke={wide ? 17 : 13}
              values={[
                ['Move', RING_TINTS.move, rs[0].done, rs[0].goal, 'KCAL'],
                ['Exercise', RING_TINTS.exercise, rs[1].done, rs[1].goal, 'MIN'],
                ['Stand', RING_TINTS.stand, rs[2].done, rs[2].goal, 'HRS']
              ]}
            />
            <div {...stylex.props(styles.ringStats)}>
              {rs.map((r, i) => (
                <div key={r.id} {...stylex.props(shared.rise, delay.ms(i * 90))}>
                  <div {...stylex.props(styles.ringStat)}>
                    <span {...stylex.props(styles.dot([RING_TINTS.move, RING_TINTS.exercise, RING_TINTS.stand][i]!))} />{' '}
                    {r.label}
                  </div>
                  <div {...stylex.props(styles.ringStatVal)}>
                    {num(r.done)}
                    <span {...stylex.props(shared.sub)}>
                      /{num(r.goal)} {r.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>This Week</span>
          </div>
          <div {...stylex.props(styles.grid)}>
            <div {...stylex.props(styles.dcard)}>
              <div {...stylex.props(styles.cap, styles.capTint(RING_TINTS.move))}>
                <Sym name="bolt" size={13} />
                Move
              </div>
              <WeekBars pts={moveWeek} tint={RING_TINTS.move} goal={book.goals.move} />
            </div>
            <div {...stylex.props(styles.dcard)}>
              <div {...stylex.props(styles.cap, styles.capTint(RING_TINTS.exercise))}>
                <Sym name="clockSym" size={13} />
                Exercise
              </div>
              <WeekBars pts={series((d) => d.exercise, 'W')} tint={RING_TINTS.exercise} goal={book.goals.exercise} />
            </div>
          </div>

          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>Recent Workouts</span>
            <button
              type="button"
              onClick={() => goRoot('workouts')}
              {...stylex.props(styles.headSide, shared.press, styles.linkBtn)}
            >
              Show All
            </button>
          </div>
          <div {...stylex.props(styles.grid)}>
            {recent.map((w) => (
              <WoRow key={w.id} w={w} open={() => goTo(`w:${w.id}`)} />
            ))}
          </div>
          {!recent.length && (
            <p {...stylex.props(shared.sub, styles.date)}>No workouts yet. Add one and it lands in Health too.</p>
          )}

          <button
            type="button"
            onClick={() => goRoot('awards')}
            {...stylex.props(styles.dcard, styles.dcardBtn, styles.woRow, styles.awardBanner)}
          >
            <span {...stylex.props(styles.woGlyph(colors.yellow, 36))}>
              <Sym name="starFill" size={18} />
            </span>
            <span>
              <div {...stylex.props(styles.woName)}>Awards</div>
              <div {...stylex.props(styles.woSub)}>
                {earned} of {awards().length} earned
              </div>
            </span>
            <span {...stylex.props(styles.woRight)}>
              <Sym name="forward" size={12} />
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

function todayLine() {
  return new Date(`${todayKey()}T12:00:00`)
    .toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase()
}
