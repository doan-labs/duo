// Fitness's summary on the kit's dark theme: the rings fill on mount, the totals
// roll up from nothing through `Num`, and the week grows out of its axis.
import { Num } from '@doan-labs/duo-uikit'
import { Bars, RINGS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { app, leading, space, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'

const WEEK = [412, 530, 388, 604, 571, 297, 486]

export default function Activity() {
  // Zero on the first frame, then the real totals: the digits roll instead of appearing.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div {...stylex.props(styles.scene)}>
      <Rings size={200} stroke={19} />
      <ul {...stylex.props(styles.totals)}>
        {RINGS.map(([label, tint, done, goal, unit]) => (
          <li key={label} {...stylex.props(styles.total)}>
            <span {...stylex.props(styles.label)}>{label}</span>
            <span {...stylex.props(styles.value, styles.tint(tint))}>
              <Num value={shown ? done : 0} />
              <span {...stylex.props(styles.goal)}>
                /{goal} {unit}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div {...stylex.props(styles.week)}>
        <span {...stylex.props(styles.label)}>This week</span>
        <Bars values={WEEK} colour={RINGS[0]![1]} />
      </div>
    </div>
  )
}

const styles = stylex.create({
  scene: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: space.xl,
    paddingLeft: space.xl,
    paddingRight: space.xl,
    paddingBottom: space.xl
  },
  totals: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: space.sm
  },
  total: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  label: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.label2
  },
  value: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap'
  },
  tint: (c: string) => ({ color: c }),
  goal: { fontSize: typeScale.caption1, fontWeight: weight.semibold, marginLeft: space.xxs, opacity: 0.7 },
  week: { display: 'flex', flexDirection: 'column', gap: space.xs }
})
