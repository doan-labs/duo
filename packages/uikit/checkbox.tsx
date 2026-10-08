import * as stylex from '@stylexjs/stylex'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { colors, easing, radius } from './tokens.stylex.ts'

/**
 * Native checkbox drawn as macOS Calendar's tinted square: hollow at rest, filled
 * with a white tick when checked. `tint` is any CSS colour. Supply a visible
 * label or aria-label.
 */
export type CheckboxProps = Omit<PrimitiveProps<'input'>, 'type' | 'as'> & { tint?: string }
export function Checkbox({ tint = colors.blue, xstyle, animate, ...props }: CheckboxProps) {
  return <input type="checkbox" {...props} {...appearance([styles.box, styles.tint(tint)], xstyle, animate)} />
}

const styles = stylex.create({
  box: {
    appearance: 'none',
    position: 'relative',
    width: 14,
    height: 14,
    margin: 0,
    flexShrink: 0,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: 'currentColor',
    backgroundColor: { default: 'transparent', ':checked': 'currentColor' },
    transform: {
      default: 'scale(1)',
      ':active': 'scale(.92)',
      '@media (prefers-reduced-motion: reduce)': { ':active': 'scale(1)' }
    },
    transitionProperty: 'background-color, transform',
    transitionDuration: '.18s, .12s',
    transitionTimingFunction: easing.pop,
    cursor: 'pointer',
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 1,
      backgroundColor: colors.white,
      maskImage: 'url(/icons/sym/checkmark.webp)',
      maskSize: 'contain',
      maskPosition: 'center',
      maskRepeat: 'no-repeat',
      opacity: { default: 0, ':checked': 1 },
      // Under reduced motion the check is revealed by opacity only.
      transform: {
        default: 'scale(.5)',
        ':checked': 'scale(1)',
        '@media (prefers-reduced-motion: reduce)': { default: 'scale(1)', ':checked': 'scale(1)' }
      },
      transitionProperty: 'opacity, transform',
      transitionDuration: '.18s',
      transitionTimingFunction: easing.spring
    }
  },
  tint: (c: string) => ({ color: c })
})
