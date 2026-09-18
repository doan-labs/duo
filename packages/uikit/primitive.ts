import * as stylex from '@stylexjs/stylex'
import type { ComponentPropsWithRef, ElementType } from 'react'
import { type AnimationName, animations } from './animations.ts'

export type KitStyle = stylex.StyleXArray<
  stylex.CompiledStyles | readonly [stylex.CompiledStyles, stylex.InlineStyles] | false | null | undefined
>

/** Styling extensions compose after the harvested defaults; DOM styles stay private. */
export type PrimitiveProps<T extends ElementType = 'div'> = Omit<
  ComponentPropsWithRef<T>,
  'className' | 'style' | 'as'
> & {
  as?: T
  xstyle?: KitStyle
  animate?: AnimationName
}
export const appearance = (base: KitStyle, xstyle?: KitStyle, animate?: AnimationName) =>
  stylex.props(base, animate && animations[animate], xstyle)
