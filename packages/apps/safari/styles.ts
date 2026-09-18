import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  marks: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    overflowX: 'auto',
    backgroundColor: colors.barLight,
    flexShrink: 0
  },
  mark: {
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: appAppearance.musicBorderRadius,
    backgroundColor: colors.white,
    fontSize: appAppearance.calendarFontSize2,
    whiteSpace: 'nowrap',
    boxShadow: appAppearance.safariBoxShadow,
    color: colors.black
  },
  url: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    alignItems: 'center',
    backgroundColor: colors.barLight,
    flexShrink: 0,
    color: colors.blue
  },
  input: {
    flexGrow: 1,
    borderWidth: 0,
    borderRadius: appAppearance.musicFontSize3,
    paddingBlock: 9,
    paddingInline: 12,
    backgroundColor: colors.white,
    boxShadow: appAppearance.safariBoxShadow2,
    fontSize: appAppearance.musicBorderRadius,
    textAlign: 'center',
    color: colors.black,
    outline: 0
  },
  bar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingInline: 20,
    paddingBottom: 10,
    backgroundColor: colors.barLight,
    flexShrink: 0,
    color: colors.blue
  },
  barBtn: {
    display: 'grid',
    placeItems: 'center',
    paddingBlock: 4,
    paddingInline: 10,
    opacity: { default: null, ':disabled': 0.3 }
  }
})
