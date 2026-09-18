import type { ElementType } from 'react'
import { appearance, type PrimitiveProps } from './primitive.ts'
import { shared } from './styles.ts'

/** Passive text label using existing widget typography; never fetches or schedules refreshes. */
export type WidgetLabelProps<T extends ElementType = 'b'> = PrimitiveProps<T>
export function WidgetLabel<T extends ElementType = 'b'>({ as, xstyle, animate, ...props }: WidgetLabelProps<T>) {
  const Tag = as ?? 'b'
  return <Tag {...props} {...appearance(shared.widgetLabel, xstyle, animate)} />
}
