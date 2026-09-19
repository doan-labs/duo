import * as stylex from '@stylexjs/stylex'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { Sym, type SymProps } from './sym.tsx'
import { app } from './tokens.stylex.ts'

/**
 * A toolbar button that is only a symbol: the plus, the chevrons, the sidebar
 * toggle. `plain` sits on the bar, `tinted` is a rounded square over `fill`,
 * `round` is the small circle a stepper uses. The label is required because the
 * glyph is decorative.
 */
export type IconButtonProps = Omit<PrimitiveProps<'button'>, 'as' | 'children'> & {
  name: SymProps['name']
  size?: number
  variant?: 'plain' | 'tinted' | 'round'
  'aria-label': string
}
export function IconButton({
  name,
  size = 15,
  variant = 'plain',
  xstyle,
  animate,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      {...props}
      {...appearance(
        [styles.base, variant === 'tinted' && styles.tinted, variant === 'round' && styles.round],
        xstyle,
        animate
      )}
    >
      <Sym name={name} size={size} />
    </button>
  )
}

const styles = stylex.create({
  base: {
    width: 30,
    height: 24,
    padding: 0,
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: 7,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    flexShrink: 0,
    opacity: { default: 1, ':active': 0.6, ':disabled': 0.35 }
  },
  tinted: { backgroundColor: app.fill },
  round: { width: 24, height: 24, borderRadius: '50%', backgroundColor: app.fill }
})
