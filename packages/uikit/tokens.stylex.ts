// Design tokens for the fake iOS. Only `defineVars` / `defineConsts` named
// exports may live in this file; StyleX resolves them at compile time.
import * as stylex from '@stylexjs/stylex'

/** iOS system colours as they appear in Apple's palette. */
export const colors = stylex.defineVars({
  blue: '#007aff',
  /** iOS 26's brighter tint for filled controls and bubbles. */
  blueBright: '#0a7cff',
  blueDark: '#0a84ff',
  green: '#34c759',
  greenBright: '#31d158',
  red: '#ff3b30',
  redBright: '#ff453a',
  pink: '#ff375f',
  orange: '#ff9f0a',
  yellow: '#ffd60a',
  indigo: '#5e5ce6',
  teal: '#00c7be',
  cyan: '#22e0f5',
  weatherNight: '#172c47',
  weatherSun: '#ffe6a0',
  weatherRain: '#a2e1ff',
  weatherScrollThumb: 'rgba(235,247,255,.42)',
  weatherScrollHover: 'rgba(245,251,255,.65)',
  weatherScrollActive: 'rgba(255,255,255,.82)',
  weatherScrollTrack: 'rgba(10,30,50,.1)',
  weatherScrollRim: 'rgba(255,255,255,.28)',
  purple: '#bf5af2',
  /** Secondary label. */
  grey: '#8e8e93',
  /** Section header text on grouped lists. */
  grey2: '#6d6d72',
  /** Placeholder / tertiary fill. */
  grey3: '#c7c7cc',
  /** Light separator. */
  separator: '#e5e5ea',
  /** Grouped background, light. */
  groupedLight: '#f2f2f7',
  /** Toolbar background, light. */
  barLight: '#f7f7f9',
  /** Track for switches at rest. */
  trackLight: '#e9e9eb',
  /** Elevated dark surface. */
  darkElevated: '#1c1c1e',
  /** iOS `systemFill` at 16%; buttons and pills over any background. */
  fill: 'rgba(120,120,128,.16)',
  fillThin: 'rgba(120,120,128,.12)',
  fillThick: 'rgba(120,120,128,.22)',
  white: '#fff',
  black: '#000'
})

export const fonts = stylex.defineVars({
  system: '-apple-system,"SF Pro Text",system-ui,"Helvetica Neue",sans-serif'
})

/**
 * Per-app surface. The shell themes these per app (`light` apps get the
 * grouped light background), so nav pages and sheets pick up the right one.
 */
export const app = stylex.defineVars({
  bg: '#000',
  fg: '#fff'
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
  dockRight: '10px'
})

export const easing = stylex.defineConsts({
  /** iOS push / zoom */
  push: 'cubic-bezier(.25,.85,.28,1)',
  pop: 'cubic-bezier(.2,.9,.3,1)',
  spring: 'cubic-bezier(.2,1.25,.4,1)',
  bounce: 'cubic-bezier(.2,1.4,.4,1)'
})
