import {
  app,
  colors,
  easing,
  fonts,
  glass,
  leading,
  motion,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const reduce = '@media (prefers-reduced-motion: reduce)'

const boardIn = stylex.keyframes({
  from: {
    opacity: 0,
    scale: '.98',
    translate: `0 ${space.md}`
  },
  to: {
    opacity: 1,
    scale: '1',
    translate: '0 0'
  }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.xl,
    paddingRight: space.xxl,
    paddingBottom: `calc(${space.xxxl} + ${space.xxl})`,
    paddingLeft: space.xxl,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular,
    color: app.fg,
    backgroundColor: app.bg
  },
  pocket: {
    gap: space.sm,
    paddingTop: space.md,
    paddingRight: space.xl,
    paddingLeft: space.xl
  },
  wide: {
    gap: space.lg,
    paddingTop: space.xxl,
    paddingRight: space.xxxl,
    paddingLeft: space.xxxl
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: space.md,
    color: colors.cyanDark,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.semibold
  },
  board: {
    minWidth: 0,
    paddingBlock: space.lg,
    paddingInline: space.xl,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: motion.pressDuration,
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  boardWide: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)',
    alignItems: 'center',
    columnGap: space.xxxl,
    paddingBlock: space.xxl,
    paddingInline: space.xxl
  },
  readout: {
    minWidth: 0
  },
  mode: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium
  },
  angle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.displayXl,
    lineHeight: 1,
    fontWeight: weight.thin,
    fontVariantNumeric: 'tabular-nums'
  },
  angleWide: {
    fontSize: typeScale.displayXxl
  },
  degrees: {
    color: colors.cyanDark,
    fontSize: typeScale.display,
    fontWeight: weight.regular
  },
  gauge: {
    minWidth: 0
  },
  track: {
    height: space.sm,
    marginBlock: space.md,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: app.fill
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.cyanDark,
    transitionProperty: 'width',
    transitionDuration: { default: motion.pressDuration, [reduce]: '0s' },
    transitionTimingFunction: easing.push
  },
  fillWidth: (angle: number) => ({
    width: `${(angle / 180) * 100}%`
  }),
  description: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body
  },
  details: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  detailsWide: {
    justifyContent: 'space-between'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium
  },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { default: app.separator, ':focus': colors.cyanDark },
    borderRadius: radius.md,
    paddingBlock: space.md,
    paddingInline: space.md,
    color: app.fg,
    backgroundColor: app.fill3,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body
  },
  status: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  }
})
