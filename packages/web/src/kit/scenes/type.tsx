// The type ramp as `Text` sets it, largest first, each step carrying its own
// size, leading and tracking. The four families sit above it.
import { Text, type TextProps } from '@doan-labs/duo-uikit'
import { delay } from '@doan-labs/duo-uikit/styles.ts'
import { app, fonts, leading, radius, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

type Step = NonNullable<TextProps['size']>

const RAMP: [Step, string, string][] = [
  ['largeTitle', 'Large Title', '34'],
  ['title1', 'Title 1', '28'],
  ['title2', 'Title 2', '22'],
  ['title3', 'Title 3', '20'],
  ['headline', 'Headline', '17'],
  ['body', 'Body', '17'],
  ['callout', 'Callout', '16'],
  ['subheadline', 'Subheadline', '15'],
  ['footnote', 'Footnote', '13'],
  ['caption1', 'Caption 1', '12'],
  ['caption2', 'Caption 2', '11']
]

const FAMILIES = [
  ['SF Pro', fonts.system],
  ['Rounded', fonts.rounded],
  ['New York', fonts.serif],
  ['Mono', fonts.mono]
] as const

export default function Type() {
  return (
    <div {...stylex.props(styles.scene)}>
      <ul {...stylex.props(styles.families)}>
        {FAMILIES.map(([name, family]) => (
          <li key={name} {...stylex.props(styles.family)}>
            <span {...stylex.props(styles.glyph, styles.face(family))}>Aa</span>
            <span {...stylex.props(styles.meta)}>{name}</span>
          </li>
        ))}
      </ul>
      <ul {...stylex.props(styles.ramp)}>
        {RAMP.map(([size, name, pt], i) => (
          <li key={size} {...stylex.props(styles.step)}>
            <Text
              size={size}
              weight={size === 'largeTitle' ? undefined : 'regular'}
              animate="rise"
              xstyle={delay.ms(i * 50)}
            >
              {name}
            </Text>
            <span {...stylex.props(styles.meta)}>{pt}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const styles = stylex.create({
  scene: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    paddingTop: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.lg
  },
  families: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: space.sm
  },
  family: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderRadius: radius.lg,
    backgroundColor: app.surface
  },
  glyph: { fontSize: typeScale.title1, lineHeight: leading.title1 },
  face: (family: string) => ({ fontFamily: family }),
  ramp: {
    listStyleType: 'none',
    margin: 0,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    overflow: 'hidden'
  },
  step: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  meta: { fontFamily: fonts.mono, fontSize: typeScale.caption2, lineHeight: leading.caption2, color: app.label2 }
})
