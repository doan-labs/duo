import type { ElementType } from 'react'
import { LargeTitle, type LargeTitleProps } from './large-title.tsx'

/** Large introductory title; shares the established large-title typography. */
export type HeroProps<T extends ElementType = 'div'> = LargeTitleProps<T>
export function Hero<T extends ElementType = 'div'>(props: HeroProps<T>) {
  return <LargeTitle {...props} />
}
