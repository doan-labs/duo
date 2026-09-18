import type { animations } from './styles.ts'

/** CSS-only presets; no JS timers or effect ownership. Reduced motion disables them. */
export { animations } from './styles.ts'
export type AnimationName = keyof typeof animations
