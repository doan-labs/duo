import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { colors, easing } from '../uikit/tokens.stylex.ts'
import { beep } from './shared.ts'

const ASKS: [string, string][] = [
  ['What is the weather?', 'It is 16° and partly cloudy in San Francisco, with a high of 18° today.'],
  ['Open Freeform', 'Opening Freeform.'],
  [
    'How wide is iPhone Duo?',
    'Unfolded it measures 164.6 mm across — 80.4 mm of usable display either side of the hinge.'
  ],
  ['Set a timer for 5 minutes', 'Five minutes, starting now.'],
  ['Play something', 'Here is a station based on what you have been listening to.']
]

/** Lazy, like `beep`'s: constructing one before a gesture gets it suspended. */
let ac: AudioContext | undefined

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

export const Siri = ({ os }: { os: Os }) => {
  const [said, setSaid] = useState('What can I help you with?')
  const [answer, setAnswer] = useState<string | null>(null)
  const orb = useRef<HTMLDivElement>(null)
  const stream = useRef<MediaStream>(undefined)
  const raf = useRef(0)
  const timers = useRef<number[]>([])

  /** Live mic level drives the orb, so it visibly reacts to the room. */
  const listen = async () => {
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    ac ??= new AudioContext()
    const ana = ac.createAnalyser()
    ana.fftSize = 128
    ac.createMediaStreamSource(stream.current).connect(ana)
    const buf = new Uint8Array(64)
    const frame = () => {
      raf.current = requestAnimationFrame(frame)
      ana.getByteTimeDomainData(buf)
      let peak = 0
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128)
      if (orb.current) orb.current.style.transform = `scale(${1 + Math.min(0.45, peak * 2.4)})`
    }
    frame()
  }
  const hush = () => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = undefined
    if (orb.current) orb.current.style.transform = ''
  }
  // Same as `hush`, spelled out so the effect closes over refs only.
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      stream.current?.getTracks().forEach((t) => t.stop())
      for (const t of timers.current) clearTimeout(t)
    },
    []
  )

  const ask = ([q, a]: [string, string]) => {
    setSaid(q)
    setAnswer(null)
    beep([880, 1320], 0.1, 0.05)
    timers.current.push(
      window.setTimeout(() => {
        setAnswer(a)
        if (q.startsWith('Open ')) timers.current.push(window.setTimeout(() => os.open(q.slice(5)), 700))
      }, 520)
    )
  }

  return (
    <div {...stylex.props(shared.body, styles.body)}>
      <div {...stylex.props(styles.grow)} />
      <div
        ref={orb}
        {...stylex.props(styles.orb)}
        onClick={() => (raf.current ? hush() : listen().catch(() => setSaid('Microphone unavailable.')))}
      />
      <div {...stylex.props(styles.said)}>{said}</div>
      <div {...stylex.props(styles.out)}>
        {answer && (
          <div key={answer} {...stylex.props(styles.ans)}>
            {answer}
          </div>
        )}
      </div>
      <div {...stylex.props(styles.chips)}>
        {ASKS.map((qa) => (
          <button key={qa[0]} type="button" {...stylex.props(shared.pill, styles.chip)} onClick={() => ask(qa)}>
            {qa[0]}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    backgroundImage: 'radial-gradient(120% 70% at 50% 110%,#2a1b4d,#000)'
  },
  grow: { flexGrow: 1 },
  orb: {
    position: 'relative',
    width: 112,
    height: 112,
    borderRadius: '50%',
    marginInline: 'auto',
    cursor: 'pointer',
    backgroundImage: 'conic-gradient(#0a84ff,#bf5af2,#ff375f,#ff9f0a,#30d158,#0a84ff)',
    boxShadow: '0 0 52px rgba(120,90,255,.6),inset -10px -14px 34px rgba(0,0,0,.45)',
    animationName: spin,
    animationDuration: '7s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    transitionProperty: 'transform',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.bounce,
    // Two overlays turn a flat colour wheel into a sphere: a broad top-left
    // specular, then a tight highlight where a real glass ball would catch a lamp.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      backgroundImage: 'radial-gradient(70% 60% at 32% 26%,rgba(255,255,255,.6),rgba(255,255,255,0) 70%)'
    },
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      backgroundImage: 'radial-gradient(16% 14% at 34% 24%,rgba(255,255,255,.95),rgba(255,255,255,0) 100%)'
    }
  },
  said: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingInline: 22,
    fontSize: 22,
    fontWeight: 300,
    lineHeight: 1.35,
    textAlign: 'center',
    minHeight: 64
  },
  out: { paddingBottom: 16 },
  ans: {
    marginInline: 18,
    borderRadius: 18,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 17,
    backgroundColor: colors.fillThick,
    fontSize: 15,
    lineHeight: 1.45,
    animationName: rise,
    animationDuration: '.4s',
    animationFillMode: 'backwards'
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    paddingInline: 18
  },
  chip: { backgroundColor: 'rgba(255,255,255,.14)', color: colors.white }
})
