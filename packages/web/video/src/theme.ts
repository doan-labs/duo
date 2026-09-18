// Plain copies of ../src/tokens.stylex.ts (dark values). Remotion has no StyleX build step.
import { Easing, interpolate } from 'remotion'

export const c = {
  bg: '#0b0b0a',
  surface: '#141413',
  well: '#1b1b19',
  ink: '#f2f1ec',
  ink2: '#a3a29a',
  ink3: '#6f6e67',
  accent: '#8f8fff',
  accentSoft: 'rgba(143,143,255,0.14)',
  glowA: 'rgba(120,110,255,0.42)',
  glowB: 'rgba(255,140,90,0.30)',
  hair: 'rgba(242,241,236,0.10)',
  hairStrong: 'rgba(242,241,236,0.22)'
}

export const font = {
  display: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export function ease(frame: number, from: number, to: number, out: [number, number] = [0, 1]) {
  return interpolate(frame, [from, to], out, { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) })
}

export function linear(frame: number, from: number, to: number, out: [number, number] = [0, 1]) {
  return interpolate(frame, [from, to], out, clamp)
}

/** Character count of `text` revealed between two frames, for the type-on titles. */
export function typed(text: string, frame: number, from: number, to: number) {
  return text.slice(0, Math.round(linear(frame, from, to, [0, text.length])))
}
