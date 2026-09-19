import {
  app,
  appAppearance,
  colors,
  easing,
  radius,
  shadow,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Same as shared.ts's. StyleX resolves a keyframe name at compile time, so one
// imported from another module reads as a theme variable and fails the build.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

const rip = stylex.keyframes({ to: { transform: 'scale(2.3)', opacity: 0 } })

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  stage: { position: 'absolute', inset: 0 },
  newBtn: { opacity: 1, color: app.link },
  /** A contact row is tappable; its surface and hairline are the grouped list's. */
  person: { cursor: 'pointer' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center'
  },
  tint: (bg: string) => ({ backgroundImage: bg }),
  name: { fontWeight: weight.semibold },
  blue: { color: app.link },
  ft: { position: 'absolute', inset: 0, backgroundColor: colors.black },
  remote: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  remoteJoined: { transitionProperty: 'opacity', transitionDuration: '.6s', opacity: 0.35 },
  av: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: radius.circle,
    backgroundColor: colors.grey2Dark,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.display,
    lineHeight: 1,
    fontWeight: weight.regular,
    marginBottom: 10
  },
  rip: {
    position: 'absolute',
    inset: -4,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: appAppearance.facetimeRipple,
    animationName: rip,
    animationDuration: '2.2s',
    animationTimingFunction: easing.out,
    animationIterationCount: 'infinite'
  },
  /** Caller and call state sit over the video, so both carry the text shadow. */
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 58,
    textAlign: 'center',
    fontWeight: weight.medium,
    textShadow: shadow.text
  },
  state: { position: 'absolute', left: 0, right: 0, top: 86, textAlign: 'center', opacity: 0.7 },
  pip: {
    position: 'absolute',
    right: space.md,
    top: 56,
    width: 96,
    height: 132,
    borderRadius: radius.xl,
    overflow: 'hidden',
    boxShadow: shadow.float,
    zIndex: 3,
    animationName: pop,
    animationDuration: '.5s'
  },
  ctl: {
    position: 'absolute',
    left: '50%',
    bottom: 26,
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 22,
    marginTop: 26
  },
  ctlBtn: {
    width: 62,
    height: 62,
    borderRadius: radius.circle,
    backgroundColor: app.fill,
    display: 'grid',
    placeItems: 'center'
  },
  hang: { backgroundColor: colors.redDark },
  camMsg: { position: 'absolute', inset: 0, backgroundColor: colors.black }
})
