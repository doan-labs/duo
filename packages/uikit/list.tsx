import * as stylex from '@stylexjs/stylex'
import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'

/** Semantic list. Use Row as="li" for direct children, or place Sections inside list items. */
export type ListProps<T extends ElementType = 'ul'> = PrimitiveProps<T>
export function List<T extends ElementType = 'ul'>({ as, xstyle, animate, ...props }: ListProps<T>) {
  const Tag = as ?? 'ul'
  return <Tag {...props} {...appearance(styles.list, xstyle, animate)} />
}
const styles = stylex.create({
  list: {
    listStyleType: 'none',
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0
  }
})
