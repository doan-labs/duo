import { app, appAppearance, colors, radius, shadow, space, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  openBtn: { marginLeft: 'auto', color: app.link, fontWeight: weight.medium },
  lead: {
    marginInline: space.lg,
    marginBottom: 14,
    borderRadius: radius.xl,
    paddingBlock: space.lg,
    paddingInline: space.lg,
    color: colors.white,
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    cursor: 'pointer',
    boxShadow: shadow.float
  },
  kicker: { fontWeight: weight.bold, opacity: 0.8 },
  leadTitle: { fontWeight: weight.bold, marginTop: 6 },
  leadMeta: { opacity: 0.8, marginTop: space.sm },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingInline: space.lg,
    paddingBottom: 11,
    backgroundColor: { default: app.surface, ':active': app.fill3 },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  title: { display: 'block', fontWeight: weight.semibold },
  meta: { color: app.label2, maxHeight: '2.7em', overflow: 'hidden' },
  thumb: { width: 56, height: 56, borderRadius: radius.md, flexShrink: 0 },
  tint: (bg: string) => ({ backgroundImage: bg }),
  pad20: { paddingBlock: space.xl, paddingInline: space.xl },
  hero: { height: 130, marginInline: space.lg, marginBottom: 14, borderRadius: radius.xl },
  head: { paddingInline: 18, paddingBottom: 14 },
  mt8: { marginTop: space.sm },
  cmt: {
    paddingBlock: 10,
    paddingInline: space.lg,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.newsHairline
  },
  cmtAuthor: { display: 'block', color: app.label2, marginBottom: 3 }
})
