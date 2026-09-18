import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** Centred empty, unavailable or loading content harvested from five existing apps. */
export type PlaceholderProps<T extends ElementType = 'div'> = PrimitiveProps<T>
export function Placeholder<T extends ElementType = 'div'>({ as, xstyle, animate, ...props }: PlaceholderProps<T>) {
  const Tag = as ?? 'div'
  return <Tag {...props} {...appearance(shared.ph, xstyle, animate)} />
}
