import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  rel: { position: 'relative' },
  hdrMd: { fontSize: 17 },
  actions: { color: colors.blueDark, opacity: 1 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingInline: 16,
    paddingBottom: 11,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)',
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  dot: { width: 9, height: 9, borderRadius: '50%', backgroundColor: colors.blueDark, flexShrink: 0, marginTop: 6 },
  gutter: { width: 9, flexShrink: 0 },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  who: { display: 'block', fontSize: 15, fontWeight: 600 },
  subj: { fontSize: 14 },
  preview: { fontSize: 13, color: colors.grey, lineHeight: 1.35, maxHeight: '2.7em', overflow: 'hidden' },
  noShrink: { flexShrink: 0 },
  head: { paddingInline: 18, paddingBottom: 12 },
  subject: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 10 },
  from: { display: 'flex', gap: 10, alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.white
  },
  tint: (bg: string) => ({ backgroundImage: bg }),
  name: { fontWeight: 600 },
  when: { marginLeft: 'auto' },
  artTxt: { paddingTop: 4, paddingInline: 18, paddingBottom: 24, fontSize: 16, lineHeight: 1.55 },
  para: { marginBottom: 14 }
})
