// The flex modifiers `HStack` and `VStack` share. Compiled StyleX blocks are
// plain objects, so unlike `keyframes` they travel across an import fine.
import * as stylex from '@stylexjs/stylex'

export type Align = 'start' | 'center' | 'end' | 'baseline' | 'stretch'
export type Justify = 'start' | 'center' | 'end' | 'between'

/** Props both stacks accept on top of the primitive ones. */
export type StackProps = {
  /** Space between children, in px. */
  gap?: number
  /** Cross axis. `HStack` centres by default; `VStack` leaves it to the parent. */
  align?: Align
  /** Main axis. */
  justify?: Justify
  /** Let children flow onto another line rather than shrink. */
  wrap?: boolean
}

const box = stylex.create({
  row: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  gap: (n: number) => ({ gap: n }),
  start: { alignItems: 'flex-start' },
  center: { alignItems: 'center' },
  end: { alignItems: 'flex-end' },
  baseline: { alignItems: 'baseline' },
  stretch: { alignItems: 'stretch' },
  jStart: { justifyContent: 'flex-start' },
  jCenter: { justifyContent: 'center' },
  jEnd: { justifyContent: 'flex-end' },
  jBetween: { justifyContent: 'space-between' }
})

export const row = box.row

const ALIGN = { start: box.start, center: box.center, end: box.end, baseline: box.baseline, stretch: box.stretch }
const JUSTIFY = { start: box.jStart, center: box.jCenter, end: box.jEnd, between: box.jBetween }

/** The modifier blocks for one set of stack props, in the order they compose. */
export const stackStyles = ({ gap, align, justify, wrap }: StackProps) => [
  gap !== undefined && box.gap(gap),
  align && ALIGN[align],
  justify && JUSTIFY[justify],
  wrap && box.wrap
]
