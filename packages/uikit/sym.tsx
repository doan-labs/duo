import * as stylex from '@stylexjs/stylex'
import { SYM } from './icons/index.ts'

export type SymProps = { name: keyof typeof SYM; size?: number }

/**
 * An SF Symbol, tinted by the element's colour through a mask. Decorative by
 * default: name the enclosing button when the symbol is its only content.
 */
export const Sym = ({ name, size = 17 }: SymProps) => (
  <i aria-hidden="true" {...stylex.props(styles.sym, styles.symSize(size, `url(${SYM[name]})`))} />
)

const styles = stylex.create({
  sym: {
    display: 'inline-block',
    backgroundColor: 'currentColor',
    flexShrink: 0,
    maskPosition: 'center',
    maskSize: 'contain',
    maskRepeat: 'no-repeat'
  },
  symSize: (px: number, mask: string) => ({ width: px, height: px, maskImage: mask })
})
