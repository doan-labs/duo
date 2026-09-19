import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { fieldStyles } from './text-field.tsx'

/** Native select drawn like `TextField`, so a form's pop-up and its fields line up. Children are `<option>`s. */
export type SelectProps = Omit<PrimitiveProps<'select'>, 'as'>
export function Select({ xstyle, animate, ...props }: SelectProps) {
  return <select {...props} {...appearance(fieldStyles.control, xstyle, animate)} />
}
