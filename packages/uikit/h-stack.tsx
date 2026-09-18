import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { row, type StackProps, stackStyles } from './stack.ts'

/**
 * A horizontal row of children, centred on the cross axis. The kit had no
 * horizontal primitive, so every app wrote its own flex block: reach for this
 * before a `stylex.create`.
 */
export type HStackProps<T extends ElementType = 'div'> = PrimitiveProps<T> & StackProps
export function HStack<T extends ElementType = 'div'>({
  as,
  gap,
  align,
  justify,
  wrap,
  xstyle,
  animate,
  ...props
}: HStackProps<T>) {
  const Tag = as ?? 'div'
  return <Tag {...props} {...appearance([row, ...stackStyles({ gap, align, justify, wrap })], xstyle, animate)} />
}
