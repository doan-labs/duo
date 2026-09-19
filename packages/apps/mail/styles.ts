import { app, colors, leading, radius, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  rel: { position: 'relative' },
  hdrMd: { fontSize: typeScale.headline, lineHeight: leading.headline, letterSpacing: tracking.headline },
  actions: { color: colors.blueDark, opacity: 1 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingInline: 16,
    paddingBottom: 11,
    backgroundColor: { default: colors.white, ':active': app.fill3 },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.circle,
    backgroundColor: colors.blueDark,
    flexShrink: 0,
    marginTop: 6
  },
  gutter: { width: 9, flexShrink: 0 },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  who: {
    display: 'block',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  subj: { fontSize: typeScale.footnote, lineHeight: leading.footnote, letterSpacing: tracking.footnote },
  preview: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2,
    maxHeight: '2.7em',
    overflow: 'hidden'
  },
  noShrink: { flexShrink: 0 },
  head: { paddingInline: 18, paddingBottom: 12 },
  subject: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    marginBottom: 10
  },
  from: { display: 'flex', gap: 10, alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.white
  },
  tint: (bg: string) => ({ backgroundImage: bg }),
  name: { fontWeight: weight.semibold },
  when: { marginLeft: 'auto' },
  artTxt: {
    paddingTop: 4,
    paddingInline: 18,
    paddingBottom: 24,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout
  },
  para: { marginBottom: 14 }
})
