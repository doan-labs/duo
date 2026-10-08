import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../../sdk/legacy.ts'
import { colors } from '../../uikit/tokens.stylex.ts'
import { byName } from '../apps.ts'
import { goHome } from '../device.ts'
import { launchFrame } from './bridge.ts'
import { development } from './development.ts'
import { observeDisplay, releaseHiddenFocus, viewInfo } from './display.ts'
import { restore } from './lifecycle.ts'
import { previewState } from './preview-events.ts'
import { closeSession, session } from './sessions.ts'

export function Sandbox({ id, os, wide, side }: { id: string; os: Os; wide: boolean; side?: 'left' | 'right' }) {
  const root = useRef<HTMLDivElement>(null)
  const live = useRef<ReturnType<typeof launchFrame> | undefined>(undefined)
  const [status, setStatus] = useState('Connecting…')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState(false)
  const placement = useRef(side)
  placement.current = side
  useEffect(() => {
    let disposed = false
    setError(false)
    setStatus('Connecting…')
    const refresh = () => {
      const el = root.current
      if (!el) return
      const info = viewInfo(el, wide ? 'inner' : 'cover', placement.current ?? 'full')
      // Focus follows the same truth the frame is about to receive; a blur
      // changes `focused`, so recompute it before posting.
      if (releaseHiddenFocus(el, info)) info.focused = el.contains(document.activeElement)
      live.current?.update(info)
    }
    const unwatch = observeDisplay(refresh)
    // A parked or covered scene hides the frame's ancestors without a display
    // event; push the truth when the DOM actually hides it, not at next frame.
    const mo = new MutationObserver(refresh)
    for (let el = root.current?.parentElement; el && el !== document.body; el = el.parentElement)
      mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] })
    void session(id, os.arg, attempt > 0)
      .then((app) => {
        if (disposed) {
          if (!app.views.size) app.end('closed')
          return
        }
        live.current = launchFrame(
          app,
          root.current!,
          viewInfo(root.current!, wide ? 'inner' : 'cover', placement.current ?? 'full'),
          {
            home: goHome,
            open: (target, arg) => {
              const app = byName(target)
              if (app) os.open(app.id ?? app.name, arg)
            },
            state: (state, message) => {
              if (disposed) return
              previewState(id, app.bundle.release.build.hash, state, message)
              setError(state === 'revoked')
              setStatus(state === 'ready' ? '' : (message ?? 'Connecting…'))
            }
          },
          development.get(id)?.src
        )
      })
      .catch((e) => {
        previewState(id, '', 'revoked', String(e.message))
        if (!disposed) {
          setError(true)
          setStatus(String(e.message))
        }
      })
    return () => {
      disposed = true
      unwatch()
      mo.disconnect()
      live.current?.close()
      live.current = undefined
    }
  }, [id, os, wide, attempt])
  return (
    <div {...stylex.props(styles.root)}>
      <div ref={root} {...stylex.props(styles.frame)} />
      {status && (
        <div role="status" {...stylex.props(styles.sheet)}>
          <p>{status}</p>
          {error && (
            <>
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  live.current?.close()
                  void closeSession(id)
                    .then(() => restore(id))
                    .then(() => setAttempt((n) => n + 1))
                    .catch((e) => setStatus(String(e.message)))
                }}
              >
                Restore previous version
              </button>
              <p>Restore keeps newer edits aside; they may be missing from the restored version.</p>
              <button type="button" onClick={goHome}>
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
const styles = stylex.create({
  root: { flexGrow: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' },
  frame: { flexGrow: 1, minHeight: 0 },
  sheet: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.black,
    color: colors.white,
    textAlign: 'center'
  }
})
