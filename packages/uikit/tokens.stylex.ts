// Design tokens for the fake iOS. Only `defineVars` / `defineConsts` named
// exports may live in this file; StyleX resolves them at compile time.
//
// Sources, checked 2026-09-19:
// - Hues and greys: Apple HIG "Color", iOS/iPadOS system colors (the unified
//   iOS 26 palette: blue is 0,136,255, not the iOS 13 0,122,255).
// - Semantic labels, fills, separators, backgrounds: UIKit dynamic colors.
// - Type ramp: HIG "Typography", Dynamic Type at the Large (default) size.
// - Tracking: the HIG SF Pro tracking table, in points at 1x.
import * as stylex from '@stylexjs/stylex'

/**
 * iOS system colours. Plain names are the light appearance; `*Dark` is what the
 * same colour becomes in a dark app. A hue is for tinting (an icon square, a
 * chart, a switch) and for the one interaction colour, `blue`. Text, fills and
 * surfaces come from `app`, never from here.
 */
export const colors = stylex.defineVars({
  red: '#ff383c',
  redDark: '#ff4245',
  orange: '#ff8d28',
  orangeDark: '#ff9230',
  yellow: '#ffcc00',
  yellowDark: '#ffd600',
  green: '#34c759',
  greenDark: '#30d158',
  mint: '#00c8b3',
  mintDark: '#00dac3',
  teal: '#00c3d0',
  tealDark: '#00d2e0',
  cyan: '#00c0e8',
  cyanDark: '#3cd3fe',
  /** The interaction colour: links, tinted buttons, selection, the switch. */
  blue: '#0088ff',
  blueDark: '#0091ff',
  indigo: '#6155f5',
  indigoDark: '#6d7cff',
  purple: '#cb30e0',
  purpleDark: '#db34f2',
  pink: '#ff2d55',
  pinkDark: '#ff375f',
  brown: '#ac7f5e',
  brownDark: '#b78a66',
  /** systemGray .. systemGray6, light; the same steps in a dark app. */
  grey: '#8e8e93',
  grey2: '#aeaeb2',
  grey3: '#c7c7cc',
  grey4: '#d1d1d6',
  grey5: '#e5e5ea',
  grey6: '#f2f2f7',
  grey2Dark: '#636366',
  grey3Dark: '#48484a',
  grey4Dark: '#3a3a3c',
  grey5Dark: '#2c2c2e',
  grey6Dark: '#1c1c1e',
  white: '#fff',
  black: '#000',
  /** The rim of the Apple Pencil in the shell's device scene. */
  penRim: '#e7e7ea'
})

export const fonts = stylex.defineVars({
  /** SF Pro. `-apple-system` first so WebKit picks the real face with optical sizing. */
  system: '-apple-system,BlinkMacSystemFont,system-ui,"SF Pro Text","Helvetica Neue",sans-serif',
  /** SF Pro Rounded: the lock-screen clock, widget numerals. */
  rounded: 'ui-rounded,"SF Pro Rounded",-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
  /** New York: Books and Preview body text. */
  serif: '"New York",ui-serif,Georgia,serif',
  /** SF Mono: card numbers, code. */
  mono: 'ui-monospace,"SF Mono",Menlo,monospace'
})

/**
 * Per-app surface, the UIKit dynamic colours. The shell themes these per app,
 * so nav pages, sheets, rows, separators and switches all pick up the right
 * one. Apply `light` or `dark` from `styles.ts` rather than hand-rolling a
 * `createTheme`. Defaults are the light grouped appearance.
 */
export const app = stylex.defineVars({
  /** systemGroupedBackground: the page behind grouped rows. */
  bg: '#f2f2f7',
  /** label. */
  fg: '#000',
  /** secondarySystemGroupedBackground: a row, card or grouped-list surface over `bg`. */
  surface: '#fff',
  /** tertiarySystemBackground: a toolbar or sheet header that reads as raised above `surface`. */
  elevated: '#fff',
  /** secondaryLabel: trailing detail, captions, section headers. */
  label2: 'rgba(60,60,67,.6)',
  /** tertiaryLabel and placeholderText. */
  label3: 'rgba(60,60,67,.3)',
  /** link: the interaction colour on this surface. */
  link: '#0088ff',
  /** separator: the hairline between rows. */
  separator: 'rgba(60,60,67,.29)',
  /** systemFill: pills and plain controls over any surface. */
  fill: 'rgba(120,120,128,.2)',
  /** secondarySystemFill: a switch at rest, a quieter chip. */
  fill2: 'rgba(120,120,128,.16)',
  /** tertiarySystemFill: an input field, a search bar. */
  fill3: 'rgba(118,118,128,.12)',
  /** The raised segment of a segmented control. */
  control: '#fff'
})

/**
 * Dynamic Type at the Large size, in CSS px. `Text`'s `size` prop names these
 * through `typography` in `styles.ts`, which carries leading and tracking too;
 * reach for the consts directly only inside an app's own block.
 */
export const typeScale = stylex.defineConsts({
  largeTitle: '34px',
  title1: '28px',
  title2: '22px',
  title3: '20px',
  headline: '17px',
  body: '17px',
  callout: '16px',
  subheadline: '15px',
  footnote: '13px',
  caption1: '12px',
  caption2: '11px',
  /** Oversized numerals: a temperature, a clock, a calculator result. Set solid (line-height 1), weight thin or regular. */
  display: '44px',
  displayLg: '56px',
  displayXl: '72px',
  displayXxl: '96px'
})

/** The HIG's leading for each step, in px. */
export const leading = stylex.defineConsts({
  largeTitle: '41px',
  title1: '34px',
  title2: '28px',
  title3: '25px',
  headline: '22px',
  body: '22px',
  callout: '21px',
  subheadline: '20px',
  footnote: '18px',
  caption1: '16px',
  caption2: '13px'
})

/** SF Pro tracking per step, in px: negative through the text sizes, positive from 24 up. */
export const tracking = stylex.defineConsts({
  largeTitle: '0.4px',
  title1: '0.36px',
  title2: '-0.26px',
  title3: '-0.45px',
  headline: '-0.43px',
  body: '-0.43px',
  callout: '-0.32px',
  subheadline: '-0.24px',
  footnote: '-0.08px',
  caption1: '0px',
  caption2: '0.07px'
})

/** The weight ladder. Nothing lighter than regular except `weight.thin` for oversized numerals. */
export const weight = stylex.defineConsts({
  thin: 200,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
})

/** 4 px grid. */
export const space = stylex.defineConsts({
  xxs: '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px'
})

/** Continuous corners. One radius per role; nothing in between. */
export const radius = stylex.defineConsts({
  /** A checkbox, a tiny thumbnail, a bar in a chart. */
  xs: '4px',
  /** A button, a row icon square, an inline image. */
  sm: '8px',
  /** An inset grouped list, a segmented control, a text field. */
  md: '10px',
  /** A card, a sheet, a menu. */
  lg: '12px',
  /** A large card or a hero tile. */
  xl: '16px',
  /** A home-screen widget or a glass tray. */
  xxl: '22px',
  pill: '999px',
  circle: '50%'
})

/**
 * Every shadow in the system. Elevation otherwise comes from surface change and
 * blur; nothing else gets a shadow.
 */
export const shadow = stylex.defineConsts({
  /** A card or segment resting on a light surface. */
  card: '0 1px 3px rgba(0,0,0,.12)',
  /** A sheet, popover, HUD or dragged tile floating over content. */
  float: '0 8px 24px rgba(0,0,0,.24)',
  /** A glass rim: the hairline decision 18 allows and nothing else. */
  rim: 'inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 .5px rgba(255,255,255,.14)',
  /** Text sitting directly on wallpaper or photography. */
  text: '0 1px 3px rgba(0,0,0,.4)'
})

/** Liquid glass: blur and tint, per decision 18. */
export const glass = stylex.defineConsts({
  blur: 'blur(18px) saturate(170%)',
  tint: 'rgba(255,255,255,.18)',
  tintDark: 'rgba(30,30,32,.55)'
})

/**
 * Home-grid geometry in CSS px at 5 px/mm. `os/screen.ts` bakes the same
 * numbers at 12 px/mm: change one, change both, or the grid jumps mid-fold.
 */
export const layout = stylex.defineConsts({
  icon: '51px',
  cell: '70px',
  row: '78px',
  seam: '36px',
  top: '47px',
  widget: '127px',
  dock: '57px',
  dockRight: '10px',
  /** Apple's continuous corner on icon artwork, as a ratio so the dock's smaller icons match. */
  iconRadius: '22.5%',
  /**
   * The physical glass corners, not design radii: docs/architecture.md gives
   * inner 10.7 mm, cover free edge 11.4 mm, cover hinge edge 1.3 mm, here at
   * 5 px/mm. The active area sits 11 px inside the glass, concentric with it.
   */
  glassInner: '53.5px',
  glassCoverFree: '57px',
  glassCoverHinge: '6.6px',
  screenInner: '42.5px',
  screenCoverFree: '46px',
  screenCoverHinge: '2.5px'
})

/**
 * The wallpapers the shell hangs on both displays, one group of colours each.
 * `springboard/wallpaper.ts` paints them as SVG data URLs and `screen.ts` bakes
 * the same picture, so these are consts: a `var()` would not survive either.
 * Apple's dune ships as artwork and has no entry here.
 */
export const wallpaper = stylex.defineConsts({
  duskGround: '#1b1440',
  duskEmber: '#ff8d5a',
  duskViolet: '#6a4ee0',
  duskRose: '#d24f9e',
  tideGround: '#04233d',
  tideCrest: '#35b4ff',
  tideDeep: '#0f6f9f',
  tideFoam: '#8ee6ff',
  emberGround: '#170909',
  emberCore: '#ff4d2e',
  emberAmber: '#ffb347',
  emberGlow: '#ff7a45',
  mossGround: '#0a2018',
  mossLeaf: '#33c977',
  mossLime: '#d5f56a',
  mossDeep: '#1e8f6e',
  slateGround: '#111216',
  slateHaze: '#4b505c',
  slateShade: '#2c2f37'
})

/**
 * The shell's own materials: status stack, dock, switcher, Control Center, the
 * power sheet, the lock screen and the HUD under the device. Apps never read
 * these, and the shell never reads `appAppearance`. Colours only; sizes, radii,
 * shadows and timing come from the scales above.
 */
export const chrome = stylex.defineConsts({
  /** What Control Center, an open folder and the switcher lay over the display. */
  scrim: 'rgba(10,10,16,.32)',
  /** Spotlight's deeper scrim: the home screen goes quiet behind the field. */
  scrimDeep: 'rgba(18,18,20,.5)',
  /** The HUD pill under the device. Page chrome, not glass over a wallpaper. */
  hud: 'rgba(28,29,34,.68)',
  /** The wash over any wallpaper that keeps white labels legible on it. */
  wash: 'linear-gradient(rgba(0,0,0,.34),rgba(0,0,0,.04) 40%,rgba(0,0,0,.36))',
  /** A well punched into glass: a lock-screen button, the track behind a fill. */
  well: 'rgba(0,0,0,.28)',
  /** The blurred grid behind a folder's icon. */
  folder: 'rgba(120,120,128,.42)',
  /** systemFill over glass: a control at rest. */
  fill: 'rgba(255,255,255,.22)',
  /** The quieter chip, and a row under the finger. */
  fill2: 'rgba(255,255,255,.16)',
  /** The faintest well. */
  fill3: 'rgba(255,255,255,.12)',
  /** The home indicator, the grab pill, a loud glyph on glass. */
  indicator: 'rgba(255,255,255,.75)',
  /** The home indicator over a light app. */
  indicatorDark: 'rgba(0,0,0,.6)',
  /** A secondary label or glyph on glass. */
  label: 'rgba(255,255,255,.6)',
  /** A page dot at rest, an empty tile slot's dashed edge. */
  label2: 'rgba(255,255,255,.35)',
  /** The lock clock: white thinning toward the baseline, over its own bloom. */
  clockInk: 'linear-gradient(rgba(255,255,255,.92),rgba(255,255,255,.45))',
  clockBloom: 'drop-shadow(0 3px 14px rgba(20,20,40,.35))',
  /** The cool white of the flashlight card's beam. */
  beam: '#dde6ff'
})

export const easing = stylex.defineConsts({
  /** iOS push / zoom */
  push: 'cubic-bezier(.25,.85,.28,1)',
  pop: 'cubic-bezier(.2,.9,.3,1)',
  spring: 'cubic-bezier(.2,1.25,.4,1)',
  bounce: 'cubic-bezier(.2,1.4,.4,1)',
  linear: 'linear',
  out: 'ease-out',
  inOut: 'ease-in-out'
})

/** The one press state: every tappable thing shrinks to this and eases back. */
export const motion = stylex.defineConsts({
  press: 'scale(.95)',
  pressDuration: '.15s'
})

/**
 * Colours that belong to one app's identity: its brand hue, its paper, its sky.
 * Sizes, weights, radii, shadows and timing never live here; they come from the
 * scales above. A key is prefixed with the folder name of the only app that may
 * read it, and `scripts/check-app-tokens.ts` holds apps to that.
 */
export const appAppearance = stylex.defineConsts({
  // appstore
  appstoreBanner: 'rgba(255,141,40,.16)',
  appstoreBannerDev: 'rgba(0,136,255,.1)',
  appstoreInk: '#3c3c43',
  appstoreBorder: 'rgba(0,136,255,.22)',
  appstoreHeroBar: 'rgba(0,0,0,.26)',
  appstoreHeroShade: 'linear-gradient(180deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,.1) 45%,rgba(0,0,0,.5) 100%)',
  appstoreOfficial: 'rgba(52,199,89,.14)',
  appstorePillLight: 'rgba(255,255,255,.25)',
  // books
  booksPaperInk: '#fff9f0',
  booksPaper: '#f6f1e6',
  booksInk: '#241f18',
  booksInkMuted: '#8a7f6d',
  // calculator
  calculatorKey: '#333',
  calculatorKeyLight: '#a5a5a5',
  // calendar
  calendarPaper: 'rgba(255,255,255,.78)',
  calendarSidebar: '#1b1b1d',
  calendarPane: '#1f1f21',
  calendarGrid: 'rgba(255,255,255,.12)',
  calendarWeekend: 'rgba(255,255,255,.025)',
  calendarSegment: 'rgba(255,255,255,.08)',
  calendarSegmentOn: '#5c5c60',
  calendarHover: 'rgba(255,255,255,.06)',
  calendarHourLines: 'linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px)',
  // camera
  cameraGrid:
    'linear-gradient(to right, transparent calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% + .5px), transparent calc(66.66% + .5px)), linear-gradient(to bottom, transparent calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% + .5px), transparent calc(66.66% + .5px))',
  cameraScrim: 'rgba(0,0,0,.4)',
  cameraChip: 'rgba(255,255,255,.14)',
  cameraScrimStrong: 'rgba(0,0,0,.45)',
  // clock
  // contacts
  contactsSelection: 'rgba(0,136,255,.12)',
  // facetime
  /** The ring pulsing out of the caller's avatar, over the video. */
  facetimeRipple: 'rgba(255,255,255,.45)',
  // files
  // findmy
  findmyPulse: 'rgba(0,136,255,.35)',
  findmyTint: '#eaf3ff',
  /** Apple Maps: the land tone a tile paints over, the sidebar material and the floating card. */
  // fitness
  fitnessMove: '#fa114f',
  fitnessExercise: '#a6f425',
  fitnessStand: '#22e0f5',
  // freeform
  freeformPurple: '#af52de',
  freeformPanel: 'rgba(250,250,252,.9)',
  // health
  // home
  homeGlow: 'rgba(255,206,110,.7)',
  homeGlow2: 'rgba(255,255,255,.6)',
  homeGlow3: 'rgba(150,200,255,.6)',
  homeGlow4: 'rgba(120,255,170,.6)',
  homeGlow5: 'rgba(150,220,255,.6)',
  homeGlow6: 'rgba(255,140,200,.6)',
  homeAccent: '#59c8ff',
  homeHairline: 'rgba(255,255,255,.12)',
  homeFill: 'rgba(255,255,255,.09)',
  homeInk: '#111',
  // itunes
  // mail
  // maps
  mapsLand: '#f2efe9',
  mapsPanel: 'rgba(246,246,248,.82)',
  mapsCard: 'rgba(255,255,255,.96)',
  mapsControl: 'rgba(255,255,255,.86)',
  mapsField: 'rgba(118,118,128,.12)',
  mapsHairline: 'rgba(60,60,67,.13)',
  mapsHover: 'rgba(120,120,128,.1)',
  mapsSelected: 'rgba(0,136,255,.14)',
  /** Map labels sit on the tiles behind a halo instead of a plate: white over the light map, black over imagery. */
  mapsLabelHalo: '0 0 3px #fff,0 0 6px #fff,0 0 10px #fff',
  mapsLabelHaloDark: '0 0 3px rgba(0,0,0,.9),0 1px 6px rgba(0,0,0,.7)',
  mapsDotRing: '0 0 0 2.5px #fff,0 1px 6px rgba(0,0,0,.35)',
  /** Apple's brown for landmark and museum pins. */
  mapsBrown: '#a2845e',
  // memos
  memosFill: 'rgba(255,255,255,.07)',
  // messages
  messagesBubble: 'linear-gradient(#2ca5ff,#0088ff)',
  messagesBubbleGrey: '#8a8a8e',
  messagesBar: 'rgba(249,249,249,.94)',
  messagesBarEdge: '#d7d7dc',
  // music
  musicLabel: 'rgba(255,255,255,.92)',
  musicFill: 'rgba(255,255,255,.2)',
  musicFillStrong: 'rgba(255,255,255,.85)',
  musicFillFaint: 'rgba(255,255,255,.06)',
  musicHairline: 'rgba(255,255,255,.08)',
  // news
  newsHairline: 'rgba(60,60,67,.12)',
  // notes
  notesMuted: '#c8c9cd',
  notesRed: '#e8453c',
  notesTan: '#c99a5b',
  notesInk: '#2c2c2e',
  notesPaper: '#ffffff',
  notesHairline: 'rgba(255,255,255,.11)',
  notesYellow: '#e2b93b',
  // phone
  phoneKey: 'rgba(255,255,255,.4)',
  phoneDial: 'linear-gradient(#3a3a3c,#101012)',
  phoneKeyDark: '#5a5a5e',
  phoneKeyRim: 'rgba(255,255,255,.45)',
  phoneKeyFaint: 'rgba(255,255,255,.16)',
  // photos
  photosSidebar: '#ececec',
  photosSidebarBorder: 'rgba(0,0,0,.1)',
  photosSelection: 'rgba(0,0,0,.08)',
  photosControl: 'rgba(0,0,0,.055)',
  photosViewer: 'rgba(0,0,0,.94)',
  // podcasts
  /** The scrub track inside the mini player's dark bar. */
  podcastsTrack: 'rgba(255,255,255,.2)',
  podcastsBar: 'rgba(28,28,30,.92)',
  podcastsBarEdge: 'rgba(255,255,255,.1)',
  // preview
  previewFill: 'rgba(60,60,67,.08)',
  // reminders
  // safari
  // settings
  /** Flappy Duo's deletion-fee sheet: the scrim behind it, its own light material and ink, and the card chip. */
  settingsScrim: 'rgba(0,0,0,.35)',
  settingsPaySheet: 'rgba(255,255,255,.96)',
  settingsPayInk: '#0b1a3a',
  settingsPayCard:
    'linear-gradient(115deg, rgba(255,140,200,.35), rgba(140,200,255,.35) 45%, rgba(255,230,140,.35) 80%), linear-gradient(135deg, #ffffff, #dcdce1 60%, #f2f2f5)',
  // shortcuts
  /** The scrim that dims a shortcut tile while it runs. */
  shortcutsScrim: 'rgba(0,0,0,.45)',
  // siri
  siriSky: 'radial-gradient(120% 70% at 50% 110%,#2a1b4d,#000)',
  siriOrb: 'conic-gradient(#0091ff,#db34f2,#ff375f,#ff9230,#30d158,#0091ff)',
  siriOrbGlow: '0 0 52px rgba(120,90,255,.6),inset -10px -14px 34px rgba(0,0,0,.45)',
  siriOrbSheen: 'radial-gradient(70% 60% at 32% 26%,rgba(255,255,255,.6),rgba(255,255,255,0) 70%)',
  siriOrbSpark: 'radial-gradient(16% 14% at 34% 24%,rgba(255,255,255,.95),rgba(255,255,255,0) 100%)',
  // stocks
  // tips
  tipsWarm: 'linear-gradient(140deg,#ff9230,#ff375f)',
  tipsCool: 'linear-gradient(140deg,#0091ff,#6d7cff)',
  tipsGreen: 'linear-gradient(140deg,#34c759,#00c8b3)',
  tipsPink: 'linear-gradient(140deg,#db34f2,#ff2d55)',
  tipsYellow: 'linear-gradient(140deg,#ffd600,#ff9230)',
  // tv
  tvScrim: 'rgba(0,0,0,.55)',
  // wallet
  /** The scrim the Apple Pay sheet drops over the card stack. */
  walletScrim: 'rgba(0,0,0,.55)',
  walletAppleCard: 'linear-gradient(150deg,#f5f5f7,#c9c9ce)',
  walletTransit: 'linear-gradient(150deg,#0091ff,#6d7cff)',
  walletBadge: 'linear-gradient(150deg,#1c1c1e,#3a3a3c)',
  walletPass: 'linear-gradient(150deg,#ff375f,#ff9230)',
  // watch
  watchCase: '0 0 0 5px #6e6e73,0 16px 34px rgba(0,0,0,.45)',
  // weather
  weatherStars:
    'radial-gradient(1px 1px at 15% 12%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 88% 30%,#fff,transparent),radial-gradient(1px 1px at 40% 30%,#fff,transparent),radial-gradient(1px 1px at 55% 8%,#fff,transparent),radial-gradient(1px 1px at 30% 42%,#fff,transparent)',
  /** The ring around a temperature-range marker, a border drawn as an outline. */
  weatherMarkerRing: 'rgba(0,0,0,.35)',
  weatherNight: '#172c47',
  weatherSun: '#ffe6a0',
  weatherRain: '#a2e1ff',
  weatherScrollThumb: 'rgba(235,247,255,.42)',
  weatherScrollHover: 'rgba(245,251,255,.65)',
  weatherScrollActive: 'rgba(255,255,255,.82)',
  weatherScrollTrack: 'rgba(10,30,50,.1)',
  weatherScrollRim: 'rgba(255,255,255,.28)',
  weatherHaze:
    'radial-gradient(ellipse 40% 13% at 16% 17%,rgba(227,236,246,.7),transparent),radial-gradient(ellipse 55% 18% at 90% 35%,rgba(227,236,246,.55),transparent)',
  weatherChip: 'rgba(255,255,255,.32)',
  weatherOutline: 'rgba(255,255,255,.8)',
  weatherMuted: 'rgba(255,255,255,.62)',
  weatherDeep: 'rgba(12,26,48,.78)',
  weatherDusk: 'linear-gradient(#377aaf,#20395b)',
  // Sky scenes, one per condition family. The hero, list cards and widget share them.
  weatherSceneClear: 'linear-gradient(180deg,#2a67b8 0%,#5f9fdc 55%,#9cc7ec 100%)',
  weatherSceneNight: 'linear-gradient(180deg,#0a1730 0%,#1b3355 60%,#3a5a80 100%)',
  weatherSceneCloudy: 'linear-gradient(180deg,#4f7398 0%,#86a2ba 60%,#b3c5d3 100%)',
  weatherSceneCloudyNight: 'linear-gradient(180deg,#141f30 0%,#2b3d55 60%,#4a5f78 100%)',
  weatherSceneRain: 'linear-gradient(180deg,#26374c 0%,#4a5f78 60%,#6d8399 100%)',
  weatherSceneStorm: 'linear-gradient(180deg,#10161f 0%,#232c3d 60%,#3a4557 100%)',
  weatherSceneSnow: 'linear-gradient(180deg,#748ca4 0%,#a5b8c9 60%,#d2dde6 100%)',
  weatherSceneFog: 'linear-gradient(180deg,#65788a 0%,#94a5b2 60%,#bcc7cf 100%)',
  weatherGlare:
    'radial-gradient(circle at 22% 6%,rgba(255,255,255,.95) 0,rgba(255,255,255,.75) 4%,rgba(255,255,255,.18) 11%,transparent 22%),radial-gradient(circle at 22% 6%,transparent 27%,rgba(255,255,255,.14) 28%,transparent 30%),radial-gradient(circle at 22% 6%,transparent 44%,rgba(255,255,255,.08) 45%,transparent 48%),radial-gradient(circle at 60% 40%,rgba(255,255,255,.10),transparent 10%)',
  weatherMoonGlow:
    'radial-gradient(circle at 78% 10%,rgba(255,255,255,.55) 0,rgba(255,255,255,.12) 6%,transparent 18%)',
  weatherRainStreaks:
    'linear-gradient(to bottom,transparent 0%,rgba(255,255,255,.32) 45%,transparent 100%),linear-gradient(to bottom,transparent 0%,rgba(255,255,255,.2) 45%,transparent 100%)',
  weatherSnowFlakes:
    'radial-gradient(circle,rgba(255,255,255,.95) 1.4px,transparent 2.2px),radial-gradient(circle,rgba(255,255,255,.75) 1.1px,transparent 1.9px),radial-gradient(circle,rgba(255,255,255,.55) 0.9px,transparent 1.6px)',
  weatherFogBands:
    'linear-gradient(180deg,transparent 0%,rgba(255,255,255,.10) 30%,transparent 45%,rgba(255,255,255,.12) 70%,transparent 100%)',
  weatherCard: 'rgba(20,45,85,.30)',
  weatherCardRim: 'inset 0 0 0 0.5px rgba(255,255,255,.24),inset 0 1px 0 rgba(255,255,255,.10)',
  weatherHairline: 'rgba(255,255,255,.16)',
  weatherControl: 'rgba(255,255,255,.14)',
  weatherControlHover: 'rgba(255,255,255,.22)',
  weatherBar: 'linear-gradient(90deg,#4fb8f0,#43c7b3,#9adf7f,#f7d34a,#f5a133,#ef5d3a)',
  weatherBarTrack: 'rgba(0,0,0,.22)',
  weatherUvSpectrum: 'linear-gradient(90deg,#3fbf5f,#f7d539,#f5a623,#e94b3c,#a55ad6)',
  weatherAqiSpectrum: 'linear-gradient(90deg,#3fbf5f,#f7d539,#f5a623,#e94b3c,#a55ad6,#7e0023)',
  weatherDot: 'rgba(255,255,255,.45)',
  weatherBottomBar: 'rgba(15,35,65,.55)',
  weatherMenu: 'rgba(30,50,80,.92)',
  // youtube
  youtubeMuted: '#aaa'
})
