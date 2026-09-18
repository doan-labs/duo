import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** A shrinking vertical stack that fills its flex parent, including the cover display. */
export type VStackProps<T extends ElementType = 'div'> = PrimitiveProps<T>
export function VStack<T extends ElementType = 'div'>({ as, xstyle, animate, ...props }: VStackProps<T>) {
  const Tag = as ?? 'div'
  return <Tag {...props} {...appearance(shared.column, xstyle, animate)} />
}
