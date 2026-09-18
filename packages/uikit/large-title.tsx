import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** The existing 34-point large app title. It wraps naturally at cover width. */
export type LargeTitleProps<T extends ElementType = 'div'> = PrimitiveProps<T>
export function LargeTitle<T extends ElementType = 'div'>({ as, xstyle, animate, ...props }: LargeTitleProps<T>) {
  const Tag = as ?? 'div'
  return <Tag {...props} {...appearance(shared.hero, xstyle, animate)} />
}
