import * as stylex from '@stylexjs/stylex'
import type { ElementType, ReactNode } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** Grouped row with optional leading icon and trailing detail. Use as="button" for an action. */
export type RowProps<T extends ElementType = 'div'> = PrimitiveProps<T> & {
  label?: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  chevron?: boolean
}
export function Row<T extends ElementType = 'div'>({
  as,
  label,
  detail,
  icon,
  chevron,
  children,
  xstyle,
  animate,
  ...props
}: RowProps<T>) {
  const Tag = as ?? 'div'
  return (
    <Tag
      {...(Tag === 'button' ? { type: 'button' as const } : {})}
      {...props}
      {...appearance(shared.row, xstyle, animate)}
    >
      {icon}
      {label}
      {children}
      {(detail != null || chevron) && (
        <span {...stylex.props(shared.rowR)}>
          {detail}
          {chevron && ' ›'}
        </span>
      )}
    </Tag>
  )
}
