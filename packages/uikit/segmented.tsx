import * as stylex from '@stylexjs/stylex'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { app } from './tokens.stylex.ts'

/**
 * Segmented control: one of a few views or filters, the selected segment raised
 * on `control`. A radio group to assistive tech; `onChange` gets the option.
 */
export type SegmentedProps<T extends string> = Omit<PrimitiveProps<'div'>, 'as' | 'onChange' | 'children'> & {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  xstyle,
  animate,
  ...props
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" {...props} {...appearance(styles.track, xstyle, animate)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          {...stylex.props(styles.seg, o === value && styles.on)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

const styles = stylex.create({
  track: { display: 'inline-flex', padding: 2, borderRadius: 7, backgroundColor: app.fill },
  seg: {
    height: 22,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 13,
    cursor: 'pointer'
  },
  on: { backgroundColor: app.control, boxShadow: '0 1px 3px rgba(0,0,0,.14),0 0 0 .5px rgba(0,0,0,.06)' }
})
