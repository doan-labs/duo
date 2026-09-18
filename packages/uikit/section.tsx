import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** Inset rounded group of rows, retaining the original grouped-list geometry. */
export type SectionProps<T extends ElementType = 'div'> = PrimitiveProps<T>
export function Section<T extends ElementType = 'div'>({ as, xstyle, animate, ...props }: SectionProps<T>) {
  const Tag = as ?? 'div'
  return <Tag {...props} {...appearance(shared.grp, xstyle, animate)} />
}
