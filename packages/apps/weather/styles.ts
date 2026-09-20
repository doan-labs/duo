import {
  appAppearance,
  colors,
  easing,
  glass,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const drift = stylex.keyframes({ from: { transform: 'translateX(-4%)' }, to: { transform: 'translateX(4%)' } })
const fall = stylex.keyframes({
  from: { backgroundPosition: '0 0, 0 0' },
  to: { backgroundPosition: '0 240px, 0 300px' }
})
const snowfall = stylex.keyframes({
  from: { backgroundPosition: '0 0, 0 0, 0 0' },
  to: { backgroundPosition: '40px 420px, -60px 560px, 30px 700px' }
})
const flash = stylex.keyframes({
  '0%, 92%, 96%, 100%': { opacity: 0 },
  '93%, 97%': { opacity: 0.55 }
})
const lift = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(28px) scale(.985)' } })
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

// Every card is the same tinted glass: a translucent blue over a blurred sky, a
// half-pixel hairline and a 1px top highlight. Headers are quiet and separated
// from the body by a hairline, as in the real app.
const wide = '@container (min-width: 600px)'
const reduce = '@media (prefers-reduced-motion: reduce)'
const pressed = `${motion.pressDuration}, .2s`

export const styles = stylex.create({
  scrollbar: {
    scrollbarWidth: { default: 'auto', '@supports not selector(::-webkit-scrollbar)': 'thin' },
    scrollbarColor: {
      default: 'auto',
      '@supports not selector(::-webkit-scrollbar)': `${appAppearance.weatherScrollThumb} ${appAppearance.weatherScrollTrack}`
    },
    '::-webkit-scrollbar': { width: 10, height: 10, backgroundColor: 'transparent' },
    '::-webkit-scrollbar-track': {
      backgroundColor: appAppearance.weatherScrollTrack,
      backgroundClip: 'padding-box',
      borderRadius: radius.pill,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'transparent',
      marginBlock: 4,
      marginInline: 4
    },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: {
        default: appAppearance.weatherScrollThumb,
        ':hover': appAppearance.weatherScrollHover,
        ':active': appAppearance.weatherScrollActive
      },
      backgroundClip: 'padding-box',
      borderRadius: radius.pill,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'transparent',
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
    backgroundColor: appAppearance.weatherNight,
    textShadow: shadow.text
  },

  // Sky scenes. The root paints the gradient; layers add glare, stars, clouds or precipitation.
  clear: { backgroundImage: appAppearance.weatherSceneClear },
  night: { backgroundImage: appAppearance.weatherSceneNight },
  cloudy: { backgroundImage: appAppearance.weatherSceneCloudy },
  cloudyNight: { backgroundImage: appAppearance.weatherSceneCloudyNight },
  rain: { backgroundImage: appAppearance.weatherSceneRain },
  storm: { backgroundImage: appAppearance.weatherSceneStorm },
  snow: { backgroundImage: appAppearance.weatherSceneSnow },
  fog: { backgroundImage: appAppearance.weatherSceneFog },
  layer: { pointerEvents: 'none', position: 'absolute', inset: 0 },
  glare: { backgroundImage: appAppearance.weatherGlare },
  moon: { backgroundImage: appAppearance.weatherMoonGlow },
  stars: { backgroundImage: appAppearance.weatherStars },
  clouds: {
    inset: '-10%',
    opacity: 0.35,
    backgroundImage: appAppearance.weatherHaze,
    animationName: { default: drift, [reduce]: 'none' },
    animationDuration: '28s',
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationTimingFunction: easing.inOut
  },
  cloudsBack: { animationDuration: '44s', animationDirection: 'alternate-reverse', opacity: 0.22, top: '18%' },
  streaks: {
    inset: '-20%',
    opacity: 0.5,
    transform: 'rotate(12deg)',
    backgroundImage: appAppearance.weatherRainStreaks,
    backgroundSize: '3px 60px, 2px 75px',
    backgroundPosition: '0 0, 17px 20px',
    animationName: { default: fall, [reduce]: 'none' },
    animationDuration: '.9s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },
  heavy: { opacity: 0.7, animationDuration: '.6s' },
  lightning: {
    backgroundColor: colors.white,
    animationName: { default: flash, [reduce]: 'none' },
    animationDuration: '9s',
    animationIterationCount: 'infinite'
  },
  flakes: {
    inset: '-20%',
    opacity: 0.85,
    backgroundImage: appAppearance.weatherSnowFlakes,
    backgroundSize: '70px 70px, 110px 110px, 160px 160px',
    animationName: { default: snowfall, [reduce]: 'none' },
    animationDuration: '18s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },
  bands: {
    inset: '-10%',
    backgroundImage: appAppearance.weatherFogBands,
    animationName: { default: drift, [reduce]: 'none' },
    animationDuration: '36s',
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationTimingFunction: easing.inOut
  },

  // Bars. Weather is an `edge` app: the status stack sits over the top padding.
  top: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    paddingTop: 46,
    paddingBottom: 2,
    paddingInline: 14,
    flexShrink: 0
  },
  topLeft: { display: 'flex', justifyContent: 'flex-start' },
  topRight: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  wideOnly: { display: { default: 'none', [wide]: 'flex' } },
  bottom: {
    position: 'relative',
    zIndex: 1,
    display: { default: 'grid', [wide]: 'none' },
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    paddingInline: 16,
    paddingBlock: 10,
    flexShrink: 0,
    backgroundColor: appAppearance.weatherBottomBar,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `inset 0 0.5px 0 ${appAppearance.weatherHairline}`
  },
  dots: { display: 'flex', alignItems: 'center', gap: 4 },
  dot: {
    display: 'grid',
    placeItems: 'center',
    width: 20,
    height: 20,
    padding: 0,
    color: appAppearance.weatherDot,
    cursor: 'pointer',
    borderRadius: radius.circle,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: appAppearance.weatherOutline,
    '::before': {
      content: '""',
      width: 6,
      height: 6,
      borderRadius: radius.circle,
      backgroundColor: 'currentColor'
    }
  },
  dotCurrent: { color: colors.white },
  dotLocal: { '::before': { display: 'none' } },
  /** Icon-only glass circle, the only control the real app puts on the sky. */
  control: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    minWidth: 36,
    paddingInline: 0,
    borderRadius: radius.pill,
    color: colors.white,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.regular,
    textShadow: null,
    whiteSpace: 'nowrap',
    backgroundColor: {
      default: appAppearance.weatherControl,
      ':hover': appAppearance.weatherControlHover,
      ':active': appAppearance.weatherChip
    },
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: appAppearance.weatherCardRim,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: appAppearance.weatherOutline,
    outlineOffset: 2,
    // A refreshing control keeps its glass; the spinning glyph is the state.
    cursor: { default: 'pointer', ':disabled': 'default' },
    transitionProperty: 'transform, background-color',
    transitionDuration: pressed,
    transform: { default: null, ':active': motion.press }
  },
  /** Text pill: Back, Retry, Use Current Location. */
  pill: { paddingInline: 14 },
  plain: { backgroundColor: 'transparent', boxShadow: null, backdropFilter: null, WebkitBackdropFilter: null },
  spin: {
    display: 'grid',
    placeItems: 'center',
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },

  scroll: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingInline: 16,
    paddingBottom: 24,
    scrollbarGutter: 'stable'
  },
  hero: {
    textAlign: 'center',
    paddingTop: { default: 22, [wide]: 12 },
    paddingBottom: { default: 44, [wide]: 30 },
    fontWeight: weight.regular
  },
  eyebrow: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    // Uppercase region name: the footnote's own negative tracking closes it up,
    // so this one opens out instead.
    letterSpacing: 1,
    opacity: 0.85
  },
  city: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.regular,
    marginTop: 0,
    marginBottom: 0
  },
  temperature: {
    fontSize: typeScale.displayXxl,
    lineHeight: 1,
    letterSpacing: -2,
    fontWeight: weight.thin,
    paddingLeft: 22,
    textShadow: shadow.text
  },
  condition: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    opacity: 0.95
  },
  highLow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    marginTop: 2
  },
  localTime: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    opacity: 0.75,
    marginTop: 8
  },

  card: {
    position: 'relative',
    borderRadius: radius.lg,
    paddingInline: 14,
    paddingBlock: 12,
    marginBottom: 10,
    minWidth: 0,
    color: colors.white,
    backgroundColor: appAppearance.weatherCard,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: appAppearance.weatherCardRim
  },
  summary: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.weatherHairline
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    // Uppercase card header, same opened-out tracking as `eyebrow`.
    letterSpacing: 1,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.weatherHairline
  },
  labelPlain: { borderBottomWidth: 0, paddingBottom: 4 },
  hourly: {
    display: 'flex',
    overflowX: 'auto',
    gap: 2,
    marginInline: -8,
    paddingInline: 4,
    paddingTop: 4,
    paddingBottom: 4,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  hour: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 54,
    paddingBlock: 8,
    paddingInline: 4,
    borderRadius: radius.lg,
    color: colors.white,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.weatherControl },
    transitionProperty: 'transform, background-color',
    transitionDuration: pressed,
    transform: { default: null, ':active': motion.press }
  },
  hourIcon: { display: 'grid', placeItems: 'center', height: 40, color: colors.white },
  sunColor: { color: appAppearance.weatherSun },
  rainColor: { color: appAppearance.weatherRain },
  chance: {
    fontSize: typeScale.caption2,
    color: appAppearance.weatherRain,
    fontWeight: weight.semibold,
    lineHeight: 1,
    marginTop: -4
  },
  hourEvent: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },

  // Wide: four columns, the ten-day card takes the left half for three rows and
  // the tiles flow around it, then continue full width below, as on iPad.
  grid: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr', [wide]: 'repeat(4, 1fr)' },
    gap: 10,
    alignItems: 'stretch'
  },
  forecast: {
    marginBottom: 0,
    paddingBottom: 4,
    gridColumn: { default: 'auto', [wide]: 'span 2' },
    gridRow: { default: 'auto', [wide]: 'span 3' }
  },
  daily: {
    display: 'grid',
    gridTemplateColumns: '48px 36px 38px 1fr 38px',
    alignItems: 'center',
    gap: 10,
    width: 'calc(100% + 16px)',
    marginInline: -8,
    paddingInline: 8,
    minHeight: 46,
    borderRadius: radius.lg,
    color: colors.white,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.medium,
    textAlign: 'left',
    borderTopWidth: { default: 0.5, ':first-of-type': 0 },
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.weatherHairline,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.weatherControl },
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '.2s'
  },
  dailyIcon: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: colors.white },
  muted: { opacity: 0.6 },
  track: {
    position: 'relative',
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.weatherBarTrack,
    overflow: 'visible'
  },
  /** The bar is a window onto one gradient spanning the whole ten-day range. */
  range: (left: number, width: number) => ({
    position: 'absolute',
    top: 0,
    height: '100%',
    left: `${left}%`,
    width: `${width}%`,
    borderRadius: radius.pill,
    backgroundImage: appAppearance.weatherBar,
    backgroundSize: `${10000 / width}% 100%`,
    backgroundPosition: `${width >= 100 ? 0 : (left / (100 - width)) * 100}% 0`
  }),
  // The ring around the marker is a solid border, so it is drawn as an outline
  // rather than a shadow: the scale has no ring shadow and should not grow one.
  marker: (left: number) => ({
    position: 'absolute',
    top: -1,
    left: `calc(${left}% - 3.5px)`,
    width: 7,
    height: 7,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: appAppearance.weatherMarkerRing
  }),

  tiles: { display: { default: 'grid', [wide]: 'contents' }, gridTemplateColumns: '1fr 1fr', gap: 10 },
  tile: {
    marginBottom: 0,
    aspectRatio: { default: 'auto', [wide]: '1 / 1' },
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column'
  },
  tileWide: { gridColumn: { default: '1 / -1', [wide]: 'span 2' }, aspectRatio: 'auto' },
  tileValue: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.regular,
    marginTop: 8
  },
  tileSub: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
  tileBody: { flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 },
  tileNote: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    marginBottom: 0,
    marginTop: 'auto',
    paddingTop: 8
  },
  spectrum: (image: string, position: number) => ({
    position: 'relative',
    height: 5,
    marginTop: 10,
    borderRadius: radius.pill,
    backgroundImage: image,
    '::after': {
      content: '""',
      position: 'absolute',
      top: -1,
      left: `calc(${position}% - 3.5px)`,
      width: 7,
      height: 7,
      borderRadius: radius.circle,
      backgroundColor: colors.white,
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: appAppearance.weatherMarkerRing
    }
  }),
  gauge: { display: 'block', width: '100%', height: 'auto', maxHeight: 96, marginTop: 6, overflow: 'visible' },
  stroke: { fill: 'none', stroke: colors.white, strokeLinecap: 'round' },
  faint: { opacity: 0.3 },
  fill: { fill: colors.white },
  svgText: {
    fill: colors.white,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    opacity: 0.8
  },
  compassValue: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.medium,
    opacity: 1
  },
  bars: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, marginTop: 8 },
  bar: (height: number) => ({
    flexGrow: 1,
    minHeight: 2,
    height: `${height}%`,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.weatherRain,
    opacity: height > 3 ? 1 : 0.4
  }),

  footnote: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.7,
    textAlign: 'center',
    marginBlock: 18
  },
  link: { color: colors.white, textDecoration: 'underline', textUnderlineOffset: 2 },
  notice: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    paddingBlock: 8,
    paddingLeft: 14,
    paddingRight: 8
  },

  // Locations list.
  listHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12
  },
  listTitle: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    margin: 0
  },
  menuWrap: { position: 'relative' },
  // Where the kit's `Menu` hangs off the title row, and the night glass it wears;
  // the sheet, the tick and the float in and out are the kit's.
  menu: {
    position: 'absolute',
    right: 0,
    top: 42,
    minWidth: 190,
    padding: 6,
    borderRadius: radius.xl,
    backgroundColor: appAppearance.weatherMenu,
    boxShadow: `${appAppearance.weatherCardRim},${shadow.float}`
  },
  menuItem: {
    gap: 12,
    paddingBlock: 9,
    paddingInline: 10,
    borderRadius: radius.md,
    color: colors.white,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.weatherControl }
  },
  searchBox: { position: 'relative', marginBottom: 12 },
  searchIcon: {
    zIndex: 1,
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'grid',
    opacity: 0.7,
    pointerEvents: 'none'
  },
  search: {
    width: '100%',
    height: 38,
    paddingLeft: 36,
    paddingRight: 14,
    borderWidth: 0,
    borderRadius: radius.md,
    appearance: 'none',
    color: colors.white,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    backgroundColor: { default: appAppearance.weatherBarTrack, ':focus': appAppearance.weatherControl },
    outlineStyle: 'none',
    transitionProperty: 'background-color',
    transitionDuration: '.2s',
    '::placeholder': { color: appAppearance.weatherMuted },
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  message: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    minHeight: 20,
    marginTop: 0,
    marginBottom: 10,
    opacity: 0.85
  },
  result: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    gap: 2,
    width: '100%',
    textAlign: 'left',
    color: colors.white,
    paddingBlock: 12,
    paddingLeft: 14,
    paddingRight: 52,
    marginBottom: 8,
    borderRadius: radius.xl,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    backgroundColor: { default: appAppearance.weatherCard, ':hover': appAppearance.weatherControlHover },
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: appAppearance.weatherCardRim,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: pressed,
    transform: { default: null, ':active': motion.press }
  },
  resultName: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  add: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.weatherControl
  },
  /** A saved city: its own sky, name and time left, temperature right, condition and range below. */
  location: {
    position: 'relative',
    borderRadius: radius.xl,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: appAppearance.weatherNight,
    boxShadow: {
      default: `${appAppearance.weatherCardRim},${shadow.card}`,
      ':hover': `${shadow.rim},${shadow.float}`
    },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '.2s',
    transform: { default: null, ':active': motion.press }
  },
  // Selection is a ring, so it is an outline; the card keeps its glass rim.
  locationSelected: {
    boxShadow: `${shadow.rim},${shadow.float}`,
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: appAppearance.weatherOutline,
    outlineOffset: -2
  },
  locationMain: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gridTemplateRows: 'auto 1fr auto',
    alignItems: 'start',
    gap: 2,
    width: '100%',
    minHeight: 112,
    color: colors.white,
    textAlign: 'left',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    cursor: 'pointer',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  locationName: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.semibold
  },
  locationTime: { fontSize: typeScale.footnote, lineHeight: leading.footnote, opacity: 0.9 },
  locationCondition: {
    alignSelf: 'end',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    opacity: 0.95
  },
  locationTemp: {
    gridRow: '1 / 3',
    gridColumn: 2,
    fontSize: typeScale.display,
    fontWeight: weight.thin,
    lineHeight: 1,
    letterSpacing: -1.5
  },
  locationRange: {
    gridColumn: 2,
    alignSelf: 'end',
    justifySelf: 'end',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote
  },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    height: 26,
    minWidth: 26,
    opacity: { default: 0.7, ':hover': 1 }
  },

  sheet: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.weatherDeep,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    animationName: { default: lift, [reduce]: 'none' },
    animationDuration: '.36s',
    animationTimingFunction: easing.pop
  },
  sheetTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    textAlign: 'center'
  },
  detailTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.regular,
    marginTop: 18
  },
  detailSummary: {
    textAlign: 'center',
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    opacity: 0.85
  },
  dayControls: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 },
  detailRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 30px 1fr 1fr 1fr',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    borderTopWidth: 0.5,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.weatherHairline
  },

  widget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: appAppearance.weatherDusk,
    color: colors.white,
    textAlign: 'left'
  },
  widgetTemp: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.thin,
    letterSpacing: -1
  },
  widgetFoot: { marginTop: 'auto' }
})
