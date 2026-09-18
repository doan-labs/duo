import * as stylex from '@stylexjs/stylex'
import { animations } from './animations.ts'
import type { PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'
import { colors } from './tokens.stylex.ts'

/** Native button with the existing tinted capsule or filled/plain variants. Icon-only buttons need aria-label. */
export type ButtonProps = PrimitiveProps<'button'> & { variant?: 'filled' | 'tinted' | 'plain' }
export function Button({ variant = 'tinted', xstyle, animate, as: _as, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      {...stylex.props(
        variant !== 'plain' && shared.pill,
        variant === 'filled' && styles.filled,
        styles.control,
        animate && animations[animate],
        xstyle
      )}
    />
  )
}
const styles = stylex.create({
  filled: { backgroundColor: colors.blue, color: colors.white },
  control: {
    outlineOffset: 3,
    opacity: { default: 1, ':disabled': 0.5 },
    cursor: { default: 'pointer', ':disabled': 'not-allowed' }
  }
})
