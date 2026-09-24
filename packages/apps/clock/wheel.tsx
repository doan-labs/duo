// The iOS drum picker: a scroll column with snap points, edge fading and a
// hairline around the selected row. Selection lands on scroll, not tap, exactly
// like the real picker; tapping a row scrolls it into the middle.

import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { styles } from './styles.ts'

const ROW = 34

export function Wheel({
  options,
  value,
  onChange,
  wide,
  aria
}: {
  options: string[]
  value: number
  onChange: (i: number) => void
  wide?: boolean
  aria?: string
}) {
  const el = useRef<HTMLFieldSetElement>(null)
  const idx = Math.min(Math.max(0, value), options.length - 1)
  // Align the drum with the stored value when the picker mounts (opening a
  // sheet) without retriggering onChange for the index already selected.
  useEffect(() => {
    if (el.current) el.current.scrollTop = idx * ROW
  }, [idx])

  const settle = () => {
    const top = el.current?.scrollTop ?? 0
    const i = Math.min(options.length - 1, Math.max(0, Math.round(top / ROW)))
    if (i !== idx) onChange(i)
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onScroll = () => {
    clearTimeout(timer.current)
    // Snap selection once scrolling idles rather than on every pixel.
    timer.current = setTimeout(settle, 90)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <fieldset ref={el} aria-label={aria} onScroll={onScroll} {...stylex.props(styles.wheel, wide && styles.wheelWide)}>
      <div {...stylex.props(styles.wheelPad)} />
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          onClick={() => {
            el.current?.scrollTo({ top: i * ROW, behavior: 'smooth' })
            onChange(i)
          }}
          {...stylex.props(styles.wheelItem, i === idx && styles.wheelItemOn)}
        >
          {o}
        </button>
      ))}
      <div {...stylex.props(styles.wheelPad)} />
    </fieldset>
  )
}
