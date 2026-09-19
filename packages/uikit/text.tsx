import * as stylex from '@stylexjs/stylex'
import type { ElementType } from 'react'
import { animations } from './animations.ts'
import { Num } from './num.tsx'
import type { PrimitiveProps } from './primitive.ts'
import { shared, typography } from './styles.ts'
import { app, weight as weights } from './tokens.stylex.ts'

/** A step of the type ramp. `body` emits nothing, so it inherits. */
type Ramp = keyof typeof typography

/**
 * Inline text or a formatted animated number.
 *
 * `size` names a step of Dynamic Type, which carries size, leading, tracking
 * and weight together. `weight` emphasises the step on the HIG ladder. `caption`
 * is the kit's original name for `shared.sub` and still renders as it did;
 * prefer `size="footnote" color="secondary"` in new UI.
 */
export type TextProps<T extends ElementType = 'span'> = PrimitiveProps<T> & {
  size?: Ramp | 'caption'
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent'
  value?: number
  format?: Intl.NumberFormatOptions
  suffix?: string
}
export function Text<T extends ElementType = 'span'>({
  as,
  size = 'body',
  weight,
  color,
  value,
  format,
  suffix,
  children,
  xstyle,
  animate,
  ...props
}: TextProps<T>) {
  const Tag = as ?? 'span'
  return (
    <Tag
      {...props}
      {...stylex.props(
        // `body` emits nothing and inherits, which is what lets a Text inside a
        // header still read at the header's size.
        size === 'caption' ? shared.sub : size !== 'body' && typography[size],
        weight && styles[weight],
        color && styles[color],
        animate && animations[animate],
        xstyle
      )}
    >
      {value === undefined && !format ? children : <Num value={value} format={format} suffix={suffix} />}
    </Tag>
  )
}
const styles = stylex.create({
  regular: { fontWeight: weights.regular },
  medium: { fontWeight: weights.medium },
  semibold: { fontWeight: weights.semibold },
  bold: { fontWeight: weights.bold },
  primary: { color: 'inherit' },
  secondary: { color: app.label2 },
  tertiary: { color: app.label3 },
  accent: { color: app.link }
})
