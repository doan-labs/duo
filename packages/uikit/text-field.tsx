import * as stylex from '@stylexjs/stylex'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { app, colors } from './tokens.stylex.ts'

/**
 * Native text input over `fill`, the field in a form or a sheet. Any `type`
 * works, including `date`, `time` and `datetime-local`; `multiline` swaps in a
 * textarea. Supply a visible label or aria-label.
 */
export type TextFieldProps = Omit<PrimitiveProps<'input'>, 'as'> & { multiline?: boolean }
export function TextField({ multiline, xstyle, animate, ...props }: TextFieldProps) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Tag {...(props as object)} {...appearance([fieldStyles.control, multiline && styles.area], xstyle, animate)} />
  )
}

export const fieldStyles = stylex.create({
  control: {
    height: 28,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: app.fill,
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 13,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.blue,
    outlineOffset: 1,
    colorScheme: 'inherit'
  }
})
const styles = stylex.create({
  area: { height: 'auto', minHeight: 64, paddingTop: 6, paddingBottom: 6, resize: 'vertical', lineHeight: 1.4 }
})
