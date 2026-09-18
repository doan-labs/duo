import * as stylex from '@stylexjs/stylex'
import type { ElementType } from 'react'
import { animations } from './animations.ts'
import { Num } from './num.tsx'
import type { PrimitiveProps } from './primitive.ts'
import { shared, typography } from './styles.ts'
import { colors } from './tokens.stylex.ts'

/** A step of the type ramp. `body` emits nothing, so it inherits. */
type Ramp = keyof typeof typography

/**
 * Inline text or a formatted animated number.
 *
 * `size` names a step of the type ramp, which carries size, leading and weight
 * together. `caption`, `footnote` and `title` are the kit's original names and
 * still render exactly as they did; unlike the ramp steps they also set a
 * colour. Prefer `size="subheadline" color="secondary"` over `size="caption"`
 * in new UI.
 */
export type TextProps<T extends ElementType = 'span'> = PrimitiveProps<T> & {
  size?: Ramp | 'caption' | 'footnote' | 'title'
  weight?: 'regular' | 'medium' | 'bold'
  color?: 'primary' | 'secondary' | 'accent'
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
        // The three original names win over the ramp step they shadow, so no
        // existing call site moves. `body` emits nothing and inherits, which is
        // what lets a Text inside a header still read at the header's size.
        size === 'caption'
          ? shared.sub
          : size === 'footnote'
            ? styles.footnote
            : size === 'title'
              ? styles.title
              : size !== 'body' && typography[size],
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
  footnote: { fontSize: 11, color: colors.grey },
  title: { fontSize: 22 },
  regular: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  bold: { fontWeight: 700 },
  primary: { color: 'inherit' },
  secondary: { color: colors.grey },
  accent: { color: colors.blue }
})
