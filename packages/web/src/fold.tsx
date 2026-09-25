import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { SHEET } from './motion'
import { color, ease, radius } from './tokens.stylex'

/**
 * The site's accordion row: a hairline, a chevron, the caller's `head`, and a body
 * that grows and shrinks on the sheet spring (instantly under reduced motion).
 * A button with `aria-expanded` rather than `<details>`: a closing `<details>`
 * hides its content at once, so it could only ever animate open.
 */
export function Fold({
  head,
  open: start = false,
  children
}: {
  head: ReactNode
  open?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(start)
  const still = useReducedMotion() ?? false
  return (
    <div {...stylex.props(styles.fold)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} {...stylex.props(styles.head)}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
          {...stylex.props(styles.chevron, open && styles.chevronOpen)}
        >
          <path
            d="M6 4l4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {head}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            {...stylex.props(styles.clip)}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={still ? { duration: 0 } : SHEET}
          >
            <div {...stylex.props(styles.body)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const styles = stylex.create({
  fold: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    paddingTop: '14px',
    paddingBottom: '14px'
  },
  head: {
    margin: 0,
    padding: 0,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: color.text,
    font: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
    borderRadius: radius.sm,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  chevron: {
    flexShrink: 0,
    color: color.text3,
    transitionProperty: 'transform',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
  },
  chevronOpen: { transform: 'rotate(90deg)' },
  clip: { overflow: 'hidden' },
  // The height tween measures this box, so the gap under the head is padding: a margin would jump at the end.
  body: { paddingTop: '8px', paddingLeft: '24px' }
})
