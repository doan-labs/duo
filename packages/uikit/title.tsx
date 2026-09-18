import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** Fixed app header, or its compact trailing accessories. Use as="h1" for a semantic heading. */
export type TitleProps<T extends ElementType = 'div'> = PrimitiveProps<T> & { variant?: 'header' | 'accessory' }
export function Title<T extends ElementType = 'div'>({
  as,
  variant = 'header',
  xstyle,
  animate,
  ...props
}: TitleProps<T>) {
  const Tag = as ?? 'div'
  return <Tag {...props} {...appearance(variant === 'header' ? shared.hdr : shared.hdrSm, xstyle, animate)} />
}
