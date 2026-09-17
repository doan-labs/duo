import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
    borderRadius: 14,
    backgroundColor: colors.white,
    fontSize: 12,
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 2px rgba(0,0,0,.1)',
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
    borderRadius: 11,
    paddingBlock: 9,
    paddingInline: 12,
    backgroundColor: colors.white,
    boxShadow: '0 1px 3px rgba(0,0,0,.12)',
    fontSize: 14,
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
