import * as stylex from '@stylexjs/stylex'
import type { ElementType } from 'react'
import { animations } from './animations.ts'
import { Num } from './num.tsx'
import type { PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'
import { colors } from './tokens.stylex.ts'

/** Inline text or formatted animated number. Caption reproduces the harvested secondary label. */
export type TextProps<T extends ElementType = 'span'> = PrimitiveProps<T> & {
  size?: 'body' | 'caption' | 'footnote' | 'title'
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
        size === 'caption' && shared.sub,
        size === 'footnote' && styles.footnote,
        size === 'title' && styles.title,
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
