import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { cue } from './audio.ts'
import {
  FLOOR_ROASTS,
  HAZARDS,
  HINGE_RATING,
  has,
  MILESTONES,
  MISSILE_ROASTS,
  medalFor,
  PRICE,
  pick,
  roastFor,
  runLine,
  START_LINES,
  type Status
} from './config.ts'
import { drawOverlay, drawWorld } from './draw.ts'
import { styles } from './styles.ts'
import { flap, newWorld, step } from './world.ts'

type Notice = { title: string; text: string }
function Game() {
  const view = useDisplay()
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef(newWorld())
  const [status, setStatus] = useState<Status>('ready')
  const [score, setScore] = useState(0)
  const [run, setRun] = useState(1)
  const [folds, setFolds] = useState(0)
  const [best, setBest] = useState(0)
  const [lifetime, setLifetime] = useState(0)
  const [spent, setSpent] = useState(PRICE)
  const [toast, setToast] = useState('')
  const [roast, setRoast] = useState('')
  const [pay, setPay] = useState<'sheet' | 'processing' | 'done' | 'leaving' | null>(null)
  const onPay = useRef(() => {})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [startLine] = useState(() => pick(START_LINES))
  const cover = view.display === 'cover'
  const width = view.width || 740
  const height = view.height || 480

  useEffect(() => {
    void os.storage.get('best').then((v) => v && setBest(Number(v) || 0))
    void os.storage.get('folds').then((v) => v && setLifetime(Number(v) || 0))
    void os.storage.get('spent').then((v) => v && setSpent(Number(v) || PRICE))
    requestAnimationFrame(() => os.ready())
  }, [])

  // Home-screen widget: the receipt you cannot hide.
  useEffect(() => {
    if (!os.owner) return
    void os.widget
      .set('small', {
        tint: 'glass',
        lines: [
          { role: 'label', text: 'Flappy Duo' },
          { role: 'value', text: String(best) },
          { role: 'caption', text: `$${spent.toLocaleString()} spent` },
          { role: 'caption', text: `hinge ${((lifetime / HINGE_RATING) * 100).toFixed(2)}% used` }
        ]
      })
      .catch(() => {})
  }, [best, spent, lifetime])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 3400)
    return () => window.clearTimeout(id)
  }, [notice])

  const doFlap = () => {
    if (world.current.status === 'over') return
    world.current = flap(world.current)
    cue('flap')
    setFolds(world.current.folds)
    if (status !== 'playing') setStatus('playing')
  }

  const reset = () => {
    world.current = { ...newWorld(world.current.run + 1), clouds: world.current.clouds }
    setRun(world.current.run)
    setStatus('ready')
    setScore(0)
    setFolds(0)
    setRoast('')
    setToast('')
  }

  // Apple Pay's beat: a moment of processing, the check draws in, the sheet drops, then the receipt.
  const confirmPay = () => {
    setPay('processing')
    window.setTimeout(() => {
      setPay('done')
      cue('pay')
      setSpent((s) => {
        void os.storage.set('spent', String(s + PRICE))
        return s + PRICE
      })
    }, 1100)
    window.setTimeout(() => setPay('leaving'), 2500)
    window.setTimeout(() => {
      setPay(null)
      setNotice({ title: 'Duo Store', text: `You're charged $${PRICE.toLocaleString()}! Genius.` })
      reset()
    }, 2850)
  }

  onPay.current = confirmPay

  // The frame's side button: claim its double-click while the sheet is up, else Wallet gets it.
  useEffect(() => {
    if (pay !== 'sheet') return
    void os.sideButton.claim()
    const off = os.sideButton.onDouble(() => onPay.current())
    return () => {
      off()
      void os.sideButton.release()
    }
  }, [pay])

  useEffect(() => {
    const el = canvas.current!
    const ctx = el.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
    // The world renders offscreen so the beta blur is one filter pass, not one per shape.
    const off = document.createElement('canvas')
    off.width = el.width
    off.height = el.height
    const octx = off.getContext('2d')!
    let last = performance.now()
    let frame = 0
    let toastTimer = 0
    const say = (line: string, ms = 2000) => {
      setToast(line)
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => setToast(''), ms)
    }
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const before = world.current
      const { world: next, scored } = step(before, dt, width / height)
      world.current = next
      if (scored) {
        cue('score')
        setScore(next.score)
        const hazard = HAZARDS.find(([r, s]) => next.run >= r && s === next.score)
        const line = hazard ? hazard[3] : MILESTONES[next.score]
        if (line) say(line, hazard ? 2600 : 2000)
      }
      if (before.status === 'playing' && next.status === 'over') {
        cue('crash')
        setStatus('over')
        setToast('')
        setRoast(
          next.cause === 'floor'
            ? pick(FLOOR_ROASTS)
            : next.cause === 'missile'
              ? pick(MISSILE_ROASTS)
              : roastFor(next.score)
        )
        setBest((b) => {
          const nb = Math.max(b, next.score)
          if (nb !== b) void os.storage.set('best', String(nb))
          return nb
        })
        setLifetime((l) => {
          const nl = l + next.folds
          void os.storage.set('folds', String(nl))
          return nl
        })
      }
      const t = now / 1000
      octx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawWorld(octx, next, width, height, t)
      const blur = has(next, 'blur') && next.status === 'playing' ? Math.max(0, Math.sin(t * 1.3)) * 4 * dpr : 0
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      ctx.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none'
      // overscan so the blur does not fade the edges to black
      ctx.drawImage(off, -blur * 2, -blur * 2, el.width + blur * 4, el.height + blur * 4)
      ctx.filter = 'none'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawOverlay(ctx, next, width, height)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(toastTimer)
    }
  }, [width, height])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        if (pay) return
        if (world.current.status === 'over') reset()
        else doFlap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const newBest = status === 'over' && score > 0 && score >= best
  const warranty = Math.max(0, HINGE_RATING - lifetime)
  const price = `$${PRICE.toLocaleString()}.00`

  return (
    <main
      {...stylex.props(styles.root)}
      onPointerDown={(e) => {
        if (pay || (e.target as HTMLElement).closest('button')) return
        doFlap()
      }}
    >
      <canvas
        ref={canvas}
        aria-label="Flappy Duo"
        role="img"
        {...stylex.props(styles.canvas, styles.size(width, height))}
      />
      {status !== 'ready' && (
        <div {...stylex.props(styles.hud, cover && styles.hudCover)}>
          <span>
            {folds} {folds === 1 ? 'fold' : 'folds'}
          </span>
          <span {...stylex.props(styles.hudDim)}>hinge {((1 - warranty / HINGE_RATING) * 100).toFixed(2)}% used</span>
        </div>
      )}
      {status === 'ready' && (
        <section {...stylex.props(styles.intro, cover && styles.introCover)}>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE · FIRST CONTACT</span>
          <h1 {...stylex.props(styles.title, cover && styles.titleCover)}>Flappy Duo</h1>
          <p {...stylex.props(styles.line, cover && styles.lineCover)}>{run > 1 ? runLine(run) : startLine}</p>
          {best > 0 && (
            <p {...stylex.props(styles.best)}>
              Best {best}. Lifetime folds {lifetime.toLocaleString()} of {HINGE_RATING.toLocaleString()}.
            </p>
          )}
          <span {...stylex.props(styles.tap)}>{cover ? 'Tap to fold' : 'Tap or press space to fold'}</span>
        </section>
      )}
      {toast && status !== 'over' && <div {...stylex.props(styles.toast, cover && styles.toastCover)}>{toast}</div>}
      {status === 'over' && !pay && (
        <section
          role="alertdialog"
          aria-label="Hinge failure"
          {...stylex.props(styles.alert, cover && styles.alertCover)}
        >
          <strong {...stylex.props(styles.alertTitle)}>Hinge Failure</strong>
          <p {...stylex.props(styles.roast)}>{roast}</p>
          <p {...stylex.props(styles.fine)}>
            {folds} {folds === 1 ? 'fold' : 'folds'} this life. {warranty.toLocaleString()} remaining on the hinge. Not
            covered.
          </p>
          <div {...stylex.props(styles.stats)}>
            <div {...stylex.props(styles.stat)}>
              <span>SCORE</span>
              <strong {...stylex.props(styles.value)}>{score}</strong>
            </div>
            <div {...stylex.props(styles.stat)}>
              <span>BEST</span>
              <strong {...stylex.props(styles.value)}>{best}</strong>
            </div>
            <div {...stylex.props(styles.stat)}>
              <span>MEDAL</span>
              <strong {...stylex.props(styles.value, styles.medalValue)}>{medalFor(score)}</strong>
            </div>
          </div>
          {newBest && <p {...stylex.props(styles.best)}>New best. It has been recorded.</p>}
          <div {...stylex.props(styles.actions)}>
            <button type="button" onClick={() => setPay('sheet')} {...stylex.props(styles.button)}>
              Buy another · ${PRICE.toLocaleString()}
            </button>
          </div>
        </section>
      )}
      {pay && (
        <>
          <div {...stylex.props(styles.dim, pay === 'leaving' && styles.dimOut)} />
          <section
            role="dialog"
            aria-label="Duo Pay"
            {...stylex.props(styles.sheet, cover && styles.sheetCover, pay === 'leaving' && styles.sheetOut)}
          >
            <div {...stylex.props(styles.sheetHead)}>
              <strong {...stylex.props(styles.payMark)}>
                <span {...stylex.props(styles.apple)}></span> Pay
              </strong>
              {pay === 'sheet' && (
                <button type="button" onClick={() => setPay(null)} {...stylex.props(styles.cancel)}>
                  Cancel
                </button>
              )}
            </div>
            <div {...stylex.props(styles.cardRow)}>
              <span {...stylex.props(styles.card)} />
              <span {...stylex.props(styles.cardText)}>
                <strong>Doan Labs Card</strong>
                <span>(•••• 2399)</span>
              </span>
              <span {...stylex.props(styles.chev)}>›</span>
            </div>
            <div {...stylex.props(styles.row)}>
              <span {...stylex.props(styles.rowKey)}>TO DUO STORE</span>
              <span {...stylex.props(styles.rowValue)}>{price}</span>
            </div>
            <div {...stylex.props(styles.row, styles.last)}>
              <span {...stylex.props(styles.rowKey)}>APPLECARE+</span>
              <span {...stylex.props(styles.rowValue)}>DECLINED. BOLD.</span>
            </div>
            <div {...stylex.props(styles.faceId)}>
              {pay === 'sheet' && (
                <>
                  <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" {...stylex.props(styles.glyph)}>
                    <g fill="none" stroke="#0a84ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 22V12a6 6 0 0 1 6-6h10M42 6h10a6 6 0 0 1 6 6v10M58 42v10a6 6 0 0 1-6 6H42M22 58H12a6 6 0 0 1-6-6V42" />
                      <path d="M22 26v6M42 26v6M32 26v12h-4" />
                      <path d="M22 42c3 4 7 5 10 5s7-1 10-5" />
                    </g>
                  </svg>
                  <span {...stylex.props(styles.faceLabel)}>Face ID</span>
                  <span {...stylex.props(styles.sideHint)}>Double-press side button to pay ››</span>
                </>
              )}
              {pay === 'processing' && (
                <>
                  <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" {...stylex.props(styles.spin)}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#d1d1d6" strokeWidth="4" />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#0a84ff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="40 124"
                    />
                  </svg>
                  <span {...stylex.props(styles.faceLabel)}>Processing…</span>
                  <span {...stylex.props(styles.sideHint, styles.still)}>Do not fold the device</span>
                </>
              )}
              {(pay === 'done' || pay === 'leaving') && (
                <>
                  <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" {...stylex.props(styles.pop)}>
                    <defs>
                      <linearGradient id="okg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#0a84ff" />
                        <stop offset="1" stopColor="#30d158" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="url(#okg)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      pathLength="100"
                      {...stylex.props(styles.ring)}
                    />
                    <path
                      d="M20 33l8 8 16-17"
                      fill="none"
                      stroke="url(#okg)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="100"
                      {...stylex.props(styles.tick)}
                    />
                  </svg>
                  <span {...stylex.props(styles.faceLabel)}>Done</span>
                  <span {...stylex.props(styles.sideHint, styles.still)}>Charged to Doan Labs Card</span>
                </>
              )}
            </div>
          </section>
          {pay === 'sheet' && <div aria-hidden="true" {...stylex.props(styles.sideGlow)} />}
        </>
      )}
      {notice && (
        <div role="status" {...stylex.props(styles.notice, cover && styles.noticeCover)}>
          <span {...stylex.props(styles.noticeIcon)} />
          <div {...stylex.props(styles.noticeText)}>
            <strong>{notice.title}</strong>
            <span>{notice.text}</span>
          </div>
          <span {...stylex.props(styles.noticeTime)}>now</span>
        </div>
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Game />)
