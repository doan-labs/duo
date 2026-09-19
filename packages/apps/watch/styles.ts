import {
  app,
  appAppearance,
  colors,
  fonts,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  face: {
    width: 132,
    height: 162,
    borderRadius: radius.xxl,
    backgroundColor: colors.black,
    boxShadow: appAppearance.watchCase,
    marginTop: 14,
    marginInline: 'auto',
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    color: colors.white
  },
  date: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: colors.orange,
    fontWeight: weight.semibold
  },
  // The clock is a numeral: set solid so the face stays centred.
  time: {
    fontWeight: weight.semibold,
    fontSize: typeScale.largeTitle,
    lineHeight: 1,
    fontFamily: fonts.system,
    letterSpacing: tracking.largeTitle
  },
  mini: { transform: 'scale(.42)', marginBlock: -26 },
  center: { textAlign: 'center' },
  name: { fontWeight: weight.semibold },
  hdrSm: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    marginTop: 10
  },
  darkRow: { backgroundColor: app.fill3, borderBottomColor: app.separator }
})
