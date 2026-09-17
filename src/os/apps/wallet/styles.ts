import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

export const styles = stylex.create({
  cards: {
    position: 'relative',
    marginTop: 6,
    marginInline: 'auto',
    marginBottom: 0,
    maxWidth: 340,
    transitionProperty: 'height',
    transitionDuration: '.45s',
    transitionTimingFunction: 'cubic-bezier(.3,.9,.3,1)'
  },
  height: (px: number) => ({ height: px }),
  // A tap only ever changes the translate and z-index; the transition does the rest.
  pass: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 158,
    borderRadius: 17,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 15,
    cursor: 'pointer',
    boxShadow: '0 -1px 0 rgba(255,255,255,.25) inset,0 14px 30px rgba(0,0,0,.4)',
    transitionProperty: 'transform',
    transitionDuration: '.45s',
    transitionTimingFunction: 'cubic-bezier(.3,.9,.3,1)',
    display: 'flex',
    flexDirection: 'column'
  },
  look: (bg: string, fg: string) => ({ backgroundImage: bg, color: fg }),
  place: (y: number, z: number) => ({ transform: `translateY(${y}px)`, zIndex: z }),
  nm: { fontWeight: 600, fontSize: 14 },
  kind: { fontSize: 11, opacity: 0.65 },
  no: {
    marginTop: 'auto',
    fontWeight: 500,
    fontSize: 15,
    lineHeight: 1,
    fontFamily: 'ui-monospace,SFMono-Regular,monospace',
    letterSpacing: 1.5
  },
  payWrap: { textAlign: 'center', paddingTop: 18, paddingBottom: 8 },
  payBtn: {
    backgroundColor: colors.white,
    color: colors.black,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 20,
    fontSize: 14
  },
  pay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,.55)',
    backdropFilter: 'blur(14px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 6,
    color: colors.white,
    animationName: pop,
    animationDuration: '.35s'
  },
  payHint: { fontSize: 15, opacity: 0.7 },
  payTitle: { fontSize: 19, fontWeight: 600 },
  mono: {
    width: 74,
    height: 74,
    borderRadius: '50%',
    backgroundColor: colors.white,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontSize: 32,
    fontWeight: 500,
    flexShrink: 0
  }
})
