import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { animations } from './animations.ts'
import { usePresence } from './presence.ts'
import type { PrimitiveProps } from './primitive.ts'
import { appearance } from './primitive.ts'
import { app, radius } from './tokens.stylex.ts'

/** The scrim's own fade. StyleX resolves keyframes per file, so it cannot come from styles.ts. */
const dim = stylex.keyframes({ from: { opacity: 0 } })
const undim = stylex.keyframes({ to: { opacity: 0 } })

/**
 * A modal card over the app. It is a non-modal `<dialog>` on purpose:
 * `showModal` would lift the card into the top layer, and Chromium hit-tests
 * top-layer content at its untransformed position - inside the scene's
 * preserve-3d transform every point lands behind the card, dead to the finger.
 * The `open` attribute keeps it in the transformed tree where hit-testing is
 * honest, and the scrim, Escape and closing are drawn by hand. Closing is held
 * back until the card has shrunk away, so it leaves the way it came.
 */
export type SheetProps = Omit<PrimitiveProps<'dialog'>, 'as' | 'open' | 'onClose'> & {
  open: boolean
  onClose: () => void
}
export function Sheet({ open, onClose, xstyle, animate, ...props }: SheetProps) {
  const el = useRef<HTMLDialogElement>(null)
  const { mounted, closing } = usePresence(open, 200)
  useEffect(() => {
    if (mounted) el.current?.focus()
  }, [mounted])
  // A document Escape, not the dialog's own: non-modal never raises `cancel`,
  // and capturing it here also stops the key reaching the shell's Esc-goes-Home.
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [mounted, onClose])
  if (!mounted) return null
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        {...stylex.props(styles.scrim, closing && styles.scrimOut)}
        onClick={onClose}
      />
      <dialog
        ref={el}
        open
        tabIndex={-1}
        {...props}
        {...appearance([styles.card, animations.pop, closing && animations.popOut], xstyle, animate)}
      />
    </>
  )
}

const styles = stylex.create({
  /** The dim behind the card; a real element, since `::backdrop` only draws for the top layer. */
  scrim: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: 0,
    borderWidth: 0,
    cursor: 'default',
    backgroundColor: 'rgba(0,0,0,.25)',
    animationName: { default: dim, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.25s'
  },
  /** The dim lifts with the card rather than snapping away under it. */
  scrimOut: {
    animationName: { default: undim, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.2s',
    animationFillMode: 'forwards'
  },
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
    outline: 'none'
  }
})
