import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../../sdk/legacy.ts'
import { colors } from '../../uikit/tokens.stylex.ts'
import { byName } from '../apps.ts'
import { goHome } from '../device.ts'
import { launchFrame } from './bridge.ts'
import { development } from './development.ts'
import { observeDisplay, viewInfo } from './display.ts'
import { restore } from './lifecycle.ts'
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
      if (root.current)
        live.current?.update(viewInfo(root.current, wide ? 'inner' : 'cover', placement.current ?? 'full'))
    }
    const unwatch = observeDisplay(refresh)
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
              setError(state === 'revoked')
              setStatus(state === 'ready' ? '' : (message ?? 'Connecting…'))
            }
          },
          development.get(id)?.src
        )
      })
      .catch((e) => {
        if (!disposed) {
          setError(true)
          setStatus(String(e.message))
        }
      })
    return () => {
      disposed = true
      unwatch()
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
