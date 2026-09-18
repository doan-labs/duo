import type { ElementType } from 'react'
import { useDisplay } from './display.ts'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** Scrolling app content. Exposes display metadata without opening a bridge or starting effects. */
export type ScreenProps<T extends ElementType = 'div'> = PrimitiveProps<T>
export function Screen<T extends ElementType = 'div'>({ as, xstyle, animate, ...props }: ScreenProps<T>) {
  const Tag = as ?? 'div'
  const view = useDisplay()
  return (
    <Tag
      data-display={view.width ? view.display : undefined}
      {...props}
      {...appearance(shared.body, xstyle, animate)}
    />
  )
}
