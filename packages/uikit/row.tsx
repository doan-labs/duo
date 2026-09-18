import * as stylex from '@stylexjs/stylex'
import type { ElementType, ReactNode } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'
import { Sym } from './sym.tsx'
import { app, colors } from './tokens.stylex.ts'

/**
 * Grouped row with an optional leading icon, a secondary line under the label
 * and trailing detail. Use `as="button"` for an action, `as="li"` inside a
 * `List`.
 */
export type RowProps<T extends ElementType = 'div'> = PrimitiveProps<T> & {
  label?: ReactNode
  /** Second line under `label`, in the secondary colour. Most iOS rows have one. */
  subtitle?: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  chevron?: boolean
}
export function Row<T extends ElementType = 'div'>({
  as,
  label,
  subtitle,
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
      {subtitle == null ? (
        label
      ) : (
        <span {...stylex.props(styles.pair)}>
          <span>{label}</span>
          <span {...stylex.props(styles.subtitle)}>{subtitle}</span>
        </span>
      )}
      {children}
      {(detail != null || chevron) && (
        <span {...stylex.props(shared.rowR, styles.trail)}>
          {detail}
          {chevron && (
            <span {...stylex.props(styles.chevron)}>
              <Sym name="forward" size={13} />
            </span>
          )}
        </span>
      )}
    </Tag>
  )
}
const styles = stylex.create({
  // A row is a centred flex line, so the label column stacks on its own and
  // keeps the first line where a single-line label would have put it.
  pair: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
  subtitle: { fontSize: 13, color: app.label2 },
  trail: { display: 'flex', alignItems: 'center', gap: 6 },
  // `Sym` masks `currentColor`, so the chevron is tinted by its own wrapper:
  // iOS's tertiary grey, a step lighter than the detail text beside it.
  chevron: { display: 'flex', color: colors.grey3 }
})
