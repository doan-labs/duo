import type { Os } from '@doan-labs/ipduo-sdk'
import { Button, Screen } from '@doan-labs/ipduo-uikit'
import { beep } from '@doan-labs/ipduo-uikit/shared.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

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
    <Screen xstyle={[styles.body]}>
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
          <Button key={qa[0]} type="button" xstyle={[styles.chip]} onClick={() => ask(qa)}>
            {qa[0]}
          </Button>
        ))}
      </div>
    </Screen>
  )
}
