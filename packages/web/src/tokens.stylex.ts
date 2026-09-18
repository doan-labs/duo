// The site's design tokens. Light is the default, dark follows the system
// unless the visitor picks one in the nav (see theme.ts). Warm neutrals, one
// indigo accent, a grotesk for display and a mono for labels.
import * as stylex from '@stylexjs/stylex'

const DARK = '@media (prefers-color-scheme: dark)'

export const color = stylex.defineVars({
  /** Page background. */
  bg: { default: '#faf9f6', [DARK]: '#0b0b0a' },
  /** Raised surface: cards, code, the nav sheet. */
  surface: { default: '#ffffff', [DARK]: '#141413' },
  /** Sunken surface: alternate sections, table stripes. */
  well: { default: '#f1efea', [DARK]: '#1b1b19' },
  text: { default: '#141413', [DARK]: '#f2f1ec' },
  text2: { default: '#5f5e58', [DARK]: '#a3a29a' },
  text3: { default: '#6f6e67', [DARK]: '#8d8c85' },
  border: { default: 'rgba(20,20,19,0.10)', [DARK]: 'rgba(242,241,236,0.10)' },
  borderStrong: { default: 'rgba(20,20,19,0.22)', [DARK]: 'rgba(242,241,236,0.22)' },
  accent: { default: '#5a5ad6', [DARK]: '#8f8fff' },
  accentHover: { default: '#4a4ac4', [DARK]: '#a3a3ff' },
  accentSoft: { default: 'rgba(90,90,214,0.10)', [DARK]: 'rgba(143,143,255,0.14)' },
  onAccent: { default: '#ffffff', [DARK]: '#0b0b0a' },
  navBg: { default: 'rgba(250,249,246,0.72)', [DARK]: 'rgba(11,11,10,0.72)' },
  shadow: {
    default: '0 1px 2px rgba(20,20,19,0.06), 0 12px 40px rgba(20,20,19,0.10)',
    [DARK]: '0 1px 2px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.5)'
  },
  green: { default: '#1f7a3f', [DARK]: '#5ecf84' },
  greenBg: { default: 'rgba(31,122,63,0.10)', [DARK]: 'rgba(94,207,132,0.12)' },
  orange: { default: '#a75400', [DARK]: '#ffb266' },
  orangeBg: { default: 'rgba(167,84,0,0.10)', [DARK]: 'rgba(255,178,102,0.12)' },
  red: { default: '#b3261e', [DARK]: '#ff8a80' },
  redBg: { default: 'rgba(179,38,30,0.10)', [DARK]: 'rgba(255,138,128,0.12)' },
  gray: { default: '#5f5e58', [DARK]: '#a3a29a' },
  grayBg: { default: 'rgba(20,20,19,0.06)', [DARK]: 'rgba(242,241,236,0.08)' }
})

/** Explicit overrides when the visitor picks a theme; each flattens the media query away. */
export const light = stylex.createTheme(color, {
  bg: '#faf9f6',
  surface: '#ffffff',
  well: '#f1efea',
  text: '#141413',
  text2: '#5f5e58',
  text3: '#6f6e67',
  border: 'rgba(20,20,19,0.10)',
  borderStrong: 'rgba(20,20,19,0.22)',
  accent: '#5a5ad6',
  accentHover: '#4a4ac4',
  accentSoft: 'rgba(90,90,214,0.10)',
  onAccent: '#ffffff',
  navBg: 'rgba(250,249,246,0.72)',
  shadow: '0 1px 2px rgba(20,20,19,0.06), 0 12px 40px rgba(20,20,19,0.10)',
  green: '#1f7a3f',
  greenBg: 'rgba(31,122,63,0.10)',
  orange: '#a75400',
  orangeBg: 'rgba(167,84,0,0.10)',
  red: '#b3261e',
  redBg: 'rgba(179,38,30,0.10)',
  gray: '#5f5e58',
  grayBg: 'rgba(20,20,19,0.06)'
})

export const dark = stylex.createTheme(color, {
  bg: '#0b0b0a',
  surface: '#141413',
  well: '#1b1b19',
  text: '#f2f1ec',
  text2: '#a3a29a',
  text3: '#6f6e67',
  border: 'rgba(242,241,236,0.10)',
  borderStrong: 'rgba(242,241,236,0.22)',
  accent: '#8f8fff',
  accentHover: '#a3a3ff',
  accentSoft: 'rgba(143,143,255,0.14)',
  onAccent: '#0b0b0a',
  navBg: 'rgba(11,11,10,0.72)',
  shadow: '0 1px 2px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.5)',
  green: '#5ecf84',
  greenBg: 'rgba(94,207,132,0.12)',
  orange: '#ffb266',
  orangeBg: 'rgba(255,178,102,0.12)',
  red: '#ff8a80',
  redBg: 'rgba(255,138,128,0.12)',
  gray: '#a3a29a',
  grayBg: 'rgba(242,241,236,0.08)'
})

export const font = stylex.defineVars({
  /** Display and body. Loaded from Google Fonts in __root.tsx; falls back to the system grotesk. */
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  display: '"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace'
})

export const radius = stylex.defineVars({
  sm: '8px',
  md: '14px',
  lg: '24px',
  pill: '999px'
})

export const ease = stylex.defineVars({
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)'
})

// Breakpoints are NOT exported: StyleX 0.19 cannot resolve imported strings as
// media-query keys. Declare them locally in each file:
//   const MID = '@media (max-width: 1068px)'
//   const NARROW = '@media (max-width: 833px)'
//   const SMALL = '@media (max-width: 734px)'
