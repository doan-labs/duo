import { app, colors, leading, radius, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  cols: {
    position: 'relative',
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: colors.black,
    color: colors.white
  },
  gold: { color: colors.yellow, opacity: 1 },
  flat: { display: 'flex', padding: 0 },
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 22 },
  list: {
    width: 208,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  listHdr: { display: 'flex', alignItems: 'center', paddingInline: 12, paddingTop: 4, paddingBottom: 6, flexShrink: 0 },
  listTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.bold
  },
  listCount: { fontSize: typeScale.caption2, lineHeight: leading.caption2, letterSpacing: tracking.caption2 },
  push: { marginLeft: 'auto' },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginInline: 10,
    marginBottom: 6,
    paddingInline: 8,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: colors.grey,
    flexShrink: 0
  },
  searchIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  round: {
    width: 27,
    height: 27,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill2,
    color: colors.white,
    flexShrink: 0
  }
})
