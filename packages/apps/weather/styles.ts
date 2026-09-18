import { appAppearance, colors, easing } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const drift = stylex.keyframes({ from: { transform: 'translateX(-4%)' }, to: { transform: 'translateX(4%)' } })
const lift = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(28px) scale(.985)' } })
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

// One glass recipe for every surface: a thin white fill over a blurred, saturated
// backdrop, a 1 px top highlight, a half-pixel rim, and a soft drop. Cards use
// it as-is; controls layer hover/active fills and a press scale on top.
const blur = 'blur(24px) saturate(170%)'
const rim = appAppearance.weatherRim

export const styles = stylex.create({
  scrollbar: {
    // Non-auto standard properties override the detailed WebKit scrollbar skin in Chromium.
    scrollbarWidth: { default: 'auto', '@supports not selector(::-webkit-scrollbar)': 'thin' },
    scrollbarColor: {
      default: 'auto',
      '@supports not selector(::-webkit-scrollbar)': `${colors.weatherScrollThumb} ${colors.weatherScrollTrack}`
    },
    '::-webkit-scrollbar': { width: 10, height: 10, backgroundColor: 'transparent' },
    '::-webkit-scrollbar-track': {
      backgroundColor: colors.weatherScrollTrack,
      backgroundClip: 'padding-box',
      borderRadius: appAppearance.weatherBorderRadius,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'transparent',
      marginBlock: 4,
      marginInline: 4
    },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: {
        default: colors.weatherScrollThumb,
        ':hover': colors.weatherScrollHover,
        ':active': colors.weatherScrollActive
      },
      backgroundImage: appAppearance.weatherBackgroundImage,
      backgroundClip: 'padding-box',
      borderRadius: appAppearance.weatherBorderRadius,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'transparent',
      boxShadow: `inset 0 0 0 1px ${colors.weatherScrollRim}`,
      minHeight: 32,
      minWidth: 32
    },
    '::-webkit-scrollbar-button': { display: 'none', width: 0, height: 0 },
    '::-webkit-scrollbar-corner': { backgroundColor: 'transparent' }
  },
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    color: colors.white,
    containerType: 'inline-size',
    backgroundColor: colors.weatherNight,
    textShadow: appAppearance.weatherTextShadow
  },
  day: { backgroundImage: appAppearance.weatherBackgroundImage2 },
  night: { backgroundImage: appAppearance.weatherBackgroundImage3 },
  cloudy: { backgroundImage: appAppearance.weatherBackgroundImage4 },
  atmosphere: {
    pointerEvents: 'none',
    position: 'absolute',
    inset: 0,
    backgroundImage: appAppearance.weatherBackgroundImage5
  },
  stars: {
    backgroundImage:
      'radial-gradient(1px 1px at 15% 12%,white,transparent),radial-gradient(1px 1px at 70% 20%,white,transparent),radial-gradient(2px 2px at 85% 7%,white,transparent),radial-gradient(1px 1px at 40% 30%,white,transparent)'
  },
  clouds: {
    pointerEvents: 'none',
    position: 'absolute',
    inset: '-10%',
    opacity: 0.25,
    backgroundImage: appAppearance.weatherBackgroundImage6,
    animationName: { default: drift, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '24s',
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationTimingFunction: appAppearance.weatherAnimationTimingFunction
  },

  toolbar: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Weather is an `edge` app: the status stack sits over this padding.
    paddingTop: 46,
    paddingBottom: 6,
    paddingInline: 14,
    gap: 8,
    flexShrink: 0,
    minHeight: 48
  },
  toolbarTitle: {
    fontSize: appAppearance.musicFontSize,
    fontWeight: appAppearance.musicFontWeight2,
    letterSpacing: -0.2
  },
  actions: { display: 'flex', gap: 8, alignItems: 'center' },
  /** Glass capsule control. Text with an optional leading symbol; `icon` makes it a circle. */
  button: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    paddingInline: 14,
    borderRadius: appAppearance.weatherBorderRadius,
    color: colors.white,
    fontSize: appAppearance.musicBorderRadius,
    fontWeight: appAppearance.musicFontWeight2,
    letterSpacing: -0.2,
    textShadow: 'none',
    whiteSpace: 'nowrap',
    backgroundColor: {
      default: appAppearance.cameraBackgroundColor2,
      ':hover': appAppearance.weatherBackgroundColor,
      ':active': appAppearance.weatherBackgroundColor2
    },
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: `${rim},${appAppearance.weatherShadowSmall}`,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: appAppearance.weatherOutlineColor,
    outlineOffset: 2,
    opacity: { default: 1, ':disabled': 0.45 },
    cursor: { default: 'pointer', ':disabled': 'default' },
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .2s',
    transform: { default: null, ':active': 'scale(.94)' }
  },
  icon: { width: 36, paddingInline: 0 },
  spin: {
    display: 'grid',
    placeItems: 'center',
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: appAppearance.musicTransitionTimingFunction,
    animationIterationCount: 'infinite'
  },

  scroll: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingInline: 16,
    paddingBottom: 40
  },
  hero: { textAlign: 'center', paddingTop: 6, paddingBottom: 26 },
  eyebrow: {
    fontSize: appAppearance.musicFontSize3,
    fontWeight: appAppearance.musicFontWeight2,
    letterSpacing: 1.6,
    opacity: 0.72
  },
  city: {
    fontSize: appAppearance.shortcutsFontSize,
    fontWeight: appAppearance.musicFontWeight3,
    marginTop: 4,
    marginBottom: 0,
    letterSpacing: -0.6
  },
  temperature: {
    fontSize: appAppearance.weatherFontSize,
    lineHeight: 1.02,
    letterSpacing: -5,
    fontWeight: appAppearance.weatherFontWeight,
    paddingLeft: 18,
    textShadow: appAppearance.weatherTextShadow2
  },
  condition: { fontSize: appAppearance.podcastsFontSize, fontWeight: appAppearance.musicFontWeight3, opacity: 0.92 },
  highLow: { fontSize: appAppearance.musicFontSize5, fontWeight: appAppearance.musicFontWeight3, marginTop: 4 },
  localTime: { fontSize: appAppearance.calendarFontSize2, opacity: 0.7, marginTop: 10 },

  card: {
    position: 'relative',
    borderRadius: appAppearance.mailFontSize,
    paddingInline: 16,
    paddingBlock: 14,
    marginBottom: 12,
    minWidth: 0,
    backgroundColor: appAppearance.notesBorderBottomColor,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: `${rim},${appAppearance.weatherShadowLarge}`
  },
  summary: {
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.5,
    paddingBottom: 12,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.weatherBorderBottomColor
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: appAppearance.musicFontSize3,
    fontWeight: appAppearance.musicFontWeight2,
    letterSpacing: 0.8,
    opacity: 0.7,
    marginTop: 0,
    marginBottom: 10
  },
  hourly: { display: 'flex', overflowX: 'auto', gap: 6, marginInline: -8, paddingInline: 8, paddingBottom: 6 },
  hour: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    minWidth: 52,
    paddingBlock: 8,
    paddingInline: 4,
    borderRadius: appAppearance.calendarFontSize,
    color: colors.white,
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight3,
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.cameraBackgroundColor2 },
    boxShadow: { default: 'none', ':hover': rim },
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .2s',
    transform: { default: null, ':active': 'scale(.94)' }
  },
  weatherIcon: {
    fontSize: appAppearance.appstoreFontSize,
    color: colors.weatherSun,
    lineHeight: 1.1,
    textShadow: appAppearance.weatherTextShadow3
  },
  chance: {
    fontSize: appAppearance.musicFontSize3,
    color: colors.weatherRain,
    fontWeight: appAppearance.musicFontWeight2
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr', '@container (min-width: 600px)': '1.1fr 1fr' },
    gap: 12,
    alignItems: 'start'
  },
  forecast: { marginBottom: 0, paddingBottom: 6 },
  daily: {
    display: 'grid',
    gridTemplateColumns: '50px 32px 34px 1fr 34px 12px',
    alignItems: 'center',
    gap: 8,
    width: 'calc(100% + 16px)',
    marginInline: -8,
    paddingInline: 8,
    minHeight: 46,
    borderRadius: appAppearance.calendarFontSize2,
    color: colors.white,
    fontSize: appAppearance.musicFontSize,
    fontWeight: appAppearance.musicFontWeight3,
    textAlign: 'left',
    borderTopWidth: { default: 0.5, ':first-of-type': 0 },
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.weatherBorderTopColor,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.homeColor3 },
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '.2s'
  },
  dailyIcon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: appAppearance.podcastsFontSize,
    color: colors.weatherSun
  },
  muted: { opacity: 0.65 },
  track: {
    height: 5,
    backgroundColor: appAppearance.phoneBackgroundColor3,
    borderRadius: appAppearance.memosBorderRadius,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: appAppearance.weatherBoxShadow
  },
  range: (left: number, width: number) => ({
    position: 'absolute',
    height: '100%',
    left: `${left}%`,
    width: `${width}%`,
    borderRadius: appAppearance.memosBorderRadius,
    backgroundImage: appAppearance.weatherBackgroundImage7,
    boxShadow: appAppearance.weatherBoxShadow2
  }),
  metrics: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  metric: { marginBottom: 0, minHeight: 128, display: 'flex', flexDirection: 'column' },
  metricValue: {
    fontSize: appAppearance.phoneFontSize2,
    fontWeight: appAppearance.musicFontWeight3,
    letterSpacing: -0.7
  },
  metricDescription: {
    fontSize: appAppearance.weatherFontSize2,
    lineHeight: 1.45,
    marginBottom: 0,
    marginTop: 'auto',
    paddingTop: 10,
    opacity: 0.78
  },
  footnote: {
    fontSize: appAppearance.weatherFontSize2,
    opacity: 0.72,
    lineHeight: 1.7,
    textAlign: 'center',
    marginBlock: 20
  },
  link: { color: colors.white, textDecoration: 'underline', textUnderlineOffset: 2 },
  notice: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    fontSize: appAppearance.musicFontSize6,
    lineHeight: 1.5,
    paddingBlock: 10,
    paddingLeft: 16,
    paddingRight: 10,
    borderRadius: appAppearance.musicFontSize5,
    marginBottom: 12,
    backgroundColor: appAppearance.podcastsBorderTopColor,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: `${rim},${appAppearance.weatherShadowLarge}`
  },

  listTitle: {
    fontSize: appAppearance.shortcutsFontSize,
    fontWeight: appAppearance.musicFontWeight,
    letterSpacing: -0.8,
    marginTop: 6,
    marginBottom: 14
  },
  searchBox: { position: 'relative', marginBottom: 10 },
  searchIcon: {
    zIndex: 1,
    position: 'absolute',
    left: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'grid',
    opacity: 0.75,
    pointerEvents: 'none'
  },
  search: {
    width: '100%',
    height: 46,
    paddingLeft: 42,
    paddingRight: 16,
    borderWidth: 0,
    borderRadius: appAppearance.weatherBorderRadius,
    appearance: 'none',
    color: colors.white,
    fontSize: appAppearance.calendarFontSize,
    backgroundColor: { default: appAppearance.homeColor3, ':focus': appAppearance.weatherBorderTopColor },
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: {
      default: `${rim},${appAppearance.weatherShadowInput}`,
      ':focus': appAppearance.weatherBoxShadow3
    },
    outlineStyle: 'none',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.2s',
    '::placeholder': { color: appAppearance.weatherColor },
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  locate: { marginBottom: 14 },
  message: { fontSize: appAppearance.musicFontSize6, minHeight: 20, marginTop: 0, marginBottom: 10, opacity: 0.85 },
  result: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    gap: 3,
    width: '100%',
    textAlign: 'left',
    color: colors.white,
    paddingBlock: 13,
    paddingLeft: 16,
    paddingRight: 56,
    marginBottom: 8,
    borderRadius: appAppearance.musicFontSize5,
    fontSize: appAppearance.musicFontSize6,
    backgroundColor: { default: appAppearance.podcastsBorderTopColor, ':hover': appAppearance.weatherBorderTopColor },
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: rim,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .2s',
    transform: { default: null, ':active': 'scale(.985)' }
  },
  resultName: { fontSize: appAppearance.calendarFontSize, fontWeight: appAppearance.musicFontWeight2 },
  add: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 30,
    height: 30,
    borderRadius: appAppearance.settingsBorderRadius,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.weatherBorderTopColor,
    boxShadow: rim
  },
  location: {
    position: 'relative',
    borderRadius: appAppearance.appstoreFontSize,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundImage: appAppearance.weatherBackgroundImage8,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    boxShadow: {
      default: `${rim},${appAppearance.weatherShadowCard}`,
      ':hover': appAppearance.weatherBoxShadow4
    },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.985)' }
  },
  locationSelected: {
    boxShadow: appAppearance.weatherBoxShadow5
  },
  locationMain: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    color: colors.white,
    textAlign: 'left',
    paddingTop: 16,
    paddingBottom: 18,
    paddingLeft: 18,
    paddingRight: 110,
    cursor: 'pointer',
    fontSize: appAppearance.musicFontSize6
  },
  locationName: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: appAppearance.appstoreFontSize,
    fontWeight: appAppearance.musicFontWeight2,
    letterSpacing: -0.4
  },
  locationCondition: {
    marginTop: 10,
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight3,
    opacity: 0.9
  },
  locationTemp: {
    position: 'absolute',
    top: 12,
    right: 18,
    fontSize: appAppearance.weatherFontSize3,
    fontWeight: appAppearance.weatherFontWeight,
    letterSpacing: -2
  },
  remove: { position: 'absolute', right: 14, bottom: 14, height: 30, width: 30, paddingInline: 0 },

  sheet: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.weatherBackgroundColor3,
    backdropFilter: 'blur(30px) saturate(160%)',
    WebkitBackdropFilter: 'blur(30px) saturate(160%)',
    animationName: { default: lift, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.36s',
    animationTimingFunction: easing.pop
  },
  detailTitle: {
    textAlign: 'center',
    fontSize: appAppearance.stocksFontSize,
    fontWeight: appAppearance.musicFontWeight3,
    letterSpacing: -0.5,
    marginTop: 18
  },
  detailSummary: { textAlign: 'center', fontSize: appAppearance.calendarFontSize, lineHeight: 1.7, opacity: 0.85 },
  dayControls: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 },
  detailRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 30px 1fr 1fr 1fr',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    fontSize: appAppearance.musicFontSize6,
    borderTopWidth: 0.5,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.weatherBorderTopColor
  },

  widget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: appAppearance.weatherBackgroundImage9,
    color: colors.white,
    textAlign: 'left'
  },
  widgetTemp: {
    fontSize: appAppearance.shortcutsFontSize,
    fontWeight: appAppearance.homeFontWeight,
    letterSpacing: -1
  },
  widgetFoot: { marginTop: 'auto' }
})
