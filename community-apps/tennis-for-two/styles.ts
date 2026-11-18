import {
  app,
  colors,
  fonts,
  glass,
  leading,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.xxxl,
    paddingRight: space.xl,
    paddingBottom: `calc(${space.xxxl} + ${space.sm})`,
    paddingLeft: space.xl,
    overflow: 'hidden',
    fontFamily: fonts.mono,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular,
    color: colors.greenDark,
    backgroundColor: colors.black,
    userSelect: 'none',
    touchAction: 'manipulation'
  },
  cover: {
    gap: space.sm,
    paddingTop: space.xxl,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  wide: {
    gap: space.lg,
    paddingRight: space.xxxl,
    paddingLeft: space.xxxl
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.md
  },
  titles: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  kicker: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    textTransform: 'uppercase'
  },
  title: {
    marginBlock: 0,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    textShadow: shadow.text
  },
  titleWide: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1
  },
  board: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: space.lg
  },
  player: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  playerRight: {
    alignItems: 'flex-end'
  },
  name: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    textTransform: 'uppercase'
  },
  dot: {
    width: space.xs,
    height: space.xs,
    borderRadius: radius.circle,
    backgroundColor: colors.greenDark
  },
  points: {
    fontSize: typeScale.display,
    lineHeight: 1,
    fontWeight: weight.regular,
    fontVariantNumeric: 'tabular-nums'
  },
  pointsWide: {
    fontSize: typeScale.displayLg
  },
  stage: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: radius.xl,
    boxShadow: shadow.rim,
    cursor: 'crosshair'
  },
  // Its inherited `color` and its `backgroundColor` are the ink main.tsx hands to draw.ts.
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    backgroundColor: colors.black
  },
  panel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.xl,
    paddingInline: space.xxl,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    whiteSpace: 'nowrap'
  },
  panelTitle: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold
  },
  panelScore: {
    color: app.fg,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontVariantNumeric: 'tabular-nums'
  },
  muted: {
    color: app.label2
  },
  hint: {
    marginBlock: 0,
    minHeight: leading.footnote,
    textAlign: 'center',
    color: app.label2
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    fontFamily: fonts.system,
    color: app.fg
  },
  restart: {
    color: colors.greenDark
  }
})
