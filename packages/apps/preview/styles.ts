import {
  app,
  appAppearance,
  colors,
  easing,
  fonts,
  leading,
  radius,
  shadow,
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
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.bold,
    backgroundColor: app.fill3,
    color: app.label2,
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  emoji: { fontSize: typeScale.title2, lineHeight: leading.title2 },
  grow: { flexGrow: 1 },
  name: { fontWeight: weight.medium },
  hdr17: { fontSize: typeScale.body, lineHeight: leading.body, letterSpacing: tracking.body },
  viewerBody: { paddingTop: 14, paddingInline: 26, paddingBottom: 0, overflow: 'auto' },
  sheet: {
    backgroundColor: colors.white,
    color: colors.black,
    aspectRatio: '1/1.3',
    borderRadius: radius.xs,
    boxShadow: shadow.float,
    paddingTop: 22,
    paddingBottom: 22,
    paddingInline: 22,
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.pop,
    transformOrigin: 'top center'
  },
  zoom: (z: number) => ({ transform: `scale(${z})` }),
  bg: (img: string) => ({ backgroundImage: img }),
  tint: { height: 5, width: '44%', borderRadius: radius.xs },
  title: {
    fontFamily: fonts.serif,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.bold,
    marginTop: 12,
    marginBottom: 8
  },
  line: { height: 6, borderRadius: radius.xs, marginBottom: 7 },
  lineFull: { backgroundColor: app.fill, width: '100%' },
  lineShort: { backgroundColor: appAppearance.previewFill, width: '58%' },
  figure: { height: 64, borderRadius: radius.sm, marginTop: 12 },
  cap: { textAlign: 'center', paddingBlock: 10, paddingInline: 10 },
  pager: { display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: 20 }
})
