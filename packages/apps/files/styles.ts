import { app, leading, motion, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  sec: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingInline: 16,
    fontWeight: weight.bold,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    backgroundColor: app.fill3,
    color: app.label2,
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  locIcon: { fontSize: typeScale.title3 },
  dz: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))',
    rowGap: 16,
    columnGap: 10,
    paddingTop: 10,
    paddingInline: 16,
    paddingBottom: 24
  },
  f: {
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  // The emoji is the artwork here, so it runs on the display steps, set solid.
  fIcon: { fontSize: typeScale.display, lineHeight: 1 },
  size: { fontSize: typeScale.caption2, lineHeight: leading.caption2, letterSpacing: tracking.caption2 },
  bigIcon: { fontSize: typeScale.displayLg, lineHeight: 1 },
  count: { textAlign: 'center', paddingBlock: 6, paddingInline: 6 }
})
