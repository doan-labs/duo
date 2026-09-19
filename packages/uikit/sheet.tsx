import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { animations } from './animations.ts'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { app } from './tokens.stylex.ts'

/**
 * A modal card over the app: a native `<dialog>`, so focus, Escape and the
 * backdrop come from the platform. `open` drives `showModal`; `onClose` fires
 * for Escape and a click outside the card as well as your own buttons.
 */
export type SheetProps = Omit<PrimitiveProps<'dialog'>, 'as' | 'open' | 'onClose'> & {
  open: boolean
  onClose: () => void
}
export function Sheet({ open, onClose, xstyle, animate, ...props }: SheetProps) {
  const el = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = el.current!
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={el}
      onClose={onClose}
      onClick={(e) => e.target === el.current && onClose()}
      {...props}
      {...appearance([styles.card, animations.pop], xstyle, animate)}
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
    borderRadius: 12,
    backgroundColor: app.elevated,
    color: app.fg,
    boxShadow: '0 18px 50px rgba(0,0,0,.45)',
    '::backdrop': { backgroundColor: 'rgba(0,0,0,.25)' }
  }
})
