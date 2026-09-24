import { art } from '@doan-labs/duo-fixtures'
import { Sym } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { type Contact, fullName, initials } from './data.ts'
import { styles } from './styles.ts'

/** The monogram disc: initials over a hue fixed by the name, a person glyph when there are none. */
export const Avatar = ({
  contact,
  size = 40
}: {
  contact: Pick<Contact, 'first' | 'last' | 'company'>
  size?: number
}) => {
  const text = initials(contact)
  return (
    <div
      aria-hidden="true"
      {...stylex.props(styles.mono, styles.monoSize(size, Math.round(size * 0.42), art(fullName(contact))))}
    >
      {text || (
        <span {...stylex.props(styles.monoGlyph)}>
          <Sym name="personFill" size={size} />
        </span>
      )}
    </div>
  )
}
