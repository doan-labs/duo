// Every on-screen number rolls through @sfinterface/numbers. Formatting is
// plain Intl.NumberFormat; `undefined` renders the em dash the apps already use.
// Whole numbers by default, as the apps rounded before. The box is inline-flex,
// so a suffix's leading space becomes a no-break space or it collapses.
import { Numbers, type NumbersProps } from '@sfinterface/numbers'
import '@sfinterface/numbers/styles.css'

const whole = { maximumFractionDigits: 0 }

export function Num({
  value,
  format = whole,
  suffix,
  ...rest
}: Omit<NumbersProps, 'value'> & { value: number | undefined }) {
  if (value == null || !Number.isFinite(value)) return <>—</>
  const sfx = typeof suffix === 'string' ? suffix.replace(/^ /, ' ') : suffix
  return <Numbers value={value} format={format} suffix={sfx} {...rest} />
}
