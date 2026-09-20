import { app, colors, leading, radius, shadow, tracking, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  // Cover: the chrome is a column on the right and the page keeps the rest.
  bodyRail: { flexDirection: 'row' },
  page: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  marks: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    overflowX: 'auto',
    backgroundColor: app.elevated,
    flexShrink: 0
  },
  mark: {
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    whiteSpace: 'nowrap',
    boxShadow: shadow.card,
    color: colors.black
  },
  url: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    alignItems: 'center',
    backgroundColor: app.elevated,
    flexShrink: 0,
    color: colors.blue
  },
  input: {
    flexGrow: 1,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: 9,
    paddingInline: 12,
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
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
    backgroundColor: app.elevated,
    flexShrink: 0,
    color: colors.blue
  },
  // The camera column, 82 wide so its centre lands under the punch-hole (right
  // 24 + half the 34 ring). The stack above is 18 + hole 25 + time 21 + ring 45.
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 82,
    paddingTop: 138,
    paddingBottom: 16,
    backgroundColor: app.elevated,
    color: colors.black,
    flexShrink: 0
  },
  // Two glass pills of two circles each, as Apple's cover Safari: back and
  // bookmarks under the status stack, new tab and tabs at the bottom.
  railPill: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 3,
    borderRadius: radius.pill,
    boxShadow: '0 0 0 .5px rgba(0,0,0,.06)'
  },
  railBtn: {
    width: 40,
    height: 40,
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(255,255,255,.7)',
    boxShadow: `0 1px 2px rgba(0,0,0,.08), 0 0 0 .5px rgba(0,0,0,.08), ${shadow.rim}`
  },
  railGap: { flexGrow: 1 },
  barBtn: {
    display: 'grid',
    placeItems: 'center',
    paddingBlock: 4,
    paddingInline: 10,
    opacity: { default: null, ':disabled': 0.3 }
  }
})
