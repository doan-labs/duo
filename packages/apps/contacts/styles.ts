import {
  app,
  appAppearance,
  colors,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
  mono: {
    borderRadius: radius.circle,
    backgroundColor: colors.grey3,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontWeight: weight.medium,
    flexShrink: 0
  },
  monoSize: (px: number, font: number, bg: string) => ({ width: px, height: px, fontSize: font, backgroundImage: bg }),
  rowName: { fontWeight: weight.medium },
  hdr17: { fontSize: typeScale.headline, lineHeight: leading.headline, letterSpacing: tracking.headline },
  head: { display: 'grid', justifyItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
  name: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold
  },
  acts: { display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 12, paddingBottom: 16 },
  act: {
    display: 'grid',
    justifyItems: 'center',
    gap: 5,
    color: colors.blue,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  actGlyph: {
    width: 46,
    height: 46,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.contactsSelection,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  actDown: { transform: motion.press },
  white: { backgroundColor: colors.white },
  blue: { color: colors.blue },
  red: { color: colors.red }
})
