import * as stylex from '@stylexjs/stylex'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { colors } from './tokens.stylex.ts'

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
    borderRadius: 4,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: 'currentColor',
    backgroundColor: { default: 'transparent', ':checked': 'currentColor' },
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
      opacity: { default: 0, ':checked': 1 }
    }
  },
  tint: (c: string) => ({ color: c })
})
