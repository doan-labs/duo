import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Same as shared.ts's. StyleX resolves a keyframe name at compile time, so one
// imported from another module reads as a theme variable and fails the build.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

const rip = stylex.keyframes({ to: { transform: 'scale(2.3)', opacity: 0 } })

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  stage: { position: 'absolute', inset: 0 },
  newBtn: { opacity: 1, color: colors.blueDark },
  person: { backgroundColor: colors.darkElevated, borderBottomColor: appAppearance.notesColor6, cursor: 'pointer' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: appAppearance.settingsBorderRadius,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center'
  },
  tint: (bg: string) => ({ backgroundImage: bg }),
  name: { fontWeight: appAppearance.musicFontWeight2 },
  blue: { color: colors.blueDark },
  ft: { position: 'absolute', inset: 0, backgroundColor: colors.black },
  remote: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  remoteJoined: { transitionProperty: 'opacity', transitionDuration: '.6s', opacity: 0.35 },
  av: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.phoneBackgroundColor2,
    display: 'grid',
    placeItems: 'center',
    fontSize: appAppearance.calculatorBorderRadius,
    fontWeight: appAppearance.homeFontWeight,
    marginBottom: 10
  },
  rip: {
    position: 'absolute',
    inset: -4,
    borderRadius: appAppearance.settingsBorderRadius,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: appAppearance.phoneBorderColor,
    animationName: rip,
    animationDuration: '2.2s',
    animationTimingFunction: appAppearance.phoneAnimationTimingFunction,
    animationIterationCount: 'infinite'
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 58,
    textAlign: 'center',
    fontSize: appAppearance.podcastsFontSize,
    fontWeight: appAppearance.musicFontWeight3,
    textShadow: appAppearance.facetimeTextShadow
  },
  state: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 86,
    textAlign: 'center',
    fontSize: appAppearance.musicFontSize6,
    opacity: 0.7
  },
  pip: {
    position: 'absolute',
    right: 12,
    top: 56,
    width: 96,
    height: 132,
    borderRadius: appAppearance.musicBorderRadius,
    overflow: 'hidden',
    boxShadow: appAppearance.facetimeBoxShadow,
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
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.phoneBackgroundColor3,
    display: 'grid',
    placeItems: 'center',
    fontSize: appAppearance.podcastsFontSize
  },
  hang: { backgroundColor: colors.redBright },
  camMsg: { position: 'absolute', inset: 0, backgroundColor: colors.black }
})
