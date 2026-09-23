import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { animations } from './animations.ts'
import { usePresence } from './presence.ts'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { app, radius } from './tokens.stylex.ts'

/** The backdrop's own fade. StyleX resolves keyframes per file, so it cannot come from styles.ts. */
const dim = stylex.keyframes({ from: { opacity: 0 } })
const undim = stylex.keyframes({ to: { opacity: 0 } })

/**
 * A modal card over the app: a native `<dialog>`, so focus, Escape and the
 * backdrop come from the platform. `open` drives `showModal`; `onClose` fires
 * for Escape and a click outside the card as well as your own buttons. Closing
 * is held back until the card has shrunk away, so it leaves the way it came.
 */
export type SheetProps = Omit<PrimitiveProps<'dialog'>, 'as' | 'open' | 'onClose'> & {
  open: boolean
  onClose: () => void
}
export function Sheet({ open, onClose, xstyle, animate, ...props }: SheetProps) {
  const el = useRef<HTMLDialogElement>(null)
  const { mounted, closing } = usePresence(open, 200)
  useEffect(() => {
    const d = el.current!
    if (mounted && !d.open) d.showModal()
    else if (!mounted && d.open) d.close()
  }, [mounted])
  return (
    <dialog
      ref={el}
      // Escape would close the dialog outright; let React take it so the exit plays.
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === el.current && onClose()}
      {...props}
      {...appearance(
        [styles.card, animations.pop, closing && animations.popOut, closing && styles.leaving],
        xstyle,
        animate
      )}
    />
  )
}

const styles = stylex.create({
  card: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    marginTop: 'auto',
    marginRight: 'auto',
    marginBottom: 'auto',
    marginLeft: 'auto',
    width: 320,
    maxWidth: 'calc(100vw - 32px)',
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: app.elevated,
    color: app.fg,
    boxShadow: '0 18px 50px rgba(0,0,0,.45)',
    '::backdrop': {
      backgroundColor: 'rgba(0,0,0,.25)',
      animationName: { default: dim, '@media (prefers-reduced-motion: reduce)': 'none' },
      animationDuration: '.25s'
    }
  },
  /** The backdrop lifts with the card rather than snapping away under it. */
  leaving: {
    '::backdrop': {
      animationName: { default: undim, '@media (prefers-reduced-motion: reduce)': 'none' },
      animationDuration: '.2s',
      animationFillMode: 'forwards'
    }
  }
})
