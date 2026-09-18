import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { shared } from './styles.ts'

/** Native checkbox styled as the existing iOS switch. Supply a visible label or aria-label. */
export type ToggleProps = Omit<PrimitiveProps<'input'>, 'type' | 'as'>
export function Toggle({ xstyle, animate, ...props }: ToggleProps) {
  return <input type="checkbox" {...props} {...appearance(shared.sw, xstyle, animate)} />
}
