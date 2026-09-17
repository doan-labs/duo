import type { Os } from '@doan-labs/ipduo-sdk'
import { mmss } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

type Memo = { url: string; len: number; at: Date }

/** Lazy, like `beep`'s: constructing one before a gesture gets it suspended. */
let ac: AudioContext | undefined

/** What a recording in progress holds on to. */
type Live = { rec?: MediaRecorder; stream?: MediaStream; ana?: AnalyserNode }

const stopRec = (live: Live, clock: HTMLDivElement | null) => {
  if (live.rec?.state === 'recording') live.rec.stop()
  live.stream?.getTracks().forEach((t) => t.stop())
  live.ana = undefined
  live.rec = undefined
  if (clock) clock.textContent = '00:00'
}

const MemoRow = ({ memo, n }: { memo: Memo; n: number }) => {
  const a = useRef<HTMLAudioElement>(null)
  return (
    <div {...stylex.props(shared.row, styles.darkRow)}>
      <div {...stylex.props(styles.grow)}>
        <div {...stylex.props(styles.name)}>Recording {n}</div>
        <div {...stylex.props(shared.sub)}>
          {memo.at.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} · {mmss(memo.len)}
        </div>
      </div>
      {/* biome-ignore lint/a11y/useMediaCaption: a voice memo has no transcript */}
      <audio ref={a} src={memo.url} />
      <button
        type="button"
        {...stylex.props(shared.pill)}
        onClick={() => (a.current!.paused ? a.current!.play() : a.current!.pause())}
      >
        ▶ Play
      </button>
    </div>
  )
}

export const Memos = (_: { os: Os }) => {
  const cv = useRef<HTMLCanvasElement>(null)
  const clock = useRef<HTMLDivElement>(null)
  const [list, setList] = useState<Memo[]>([])
  const listRef = useRef(list)
  listRef.current = list
  const [on, setOn] = useState(false)
  const [denied, setDenied] = useState(false)

  const live = useRef<Live>({})
  const t0 = useRef(0)
  const hist = useRef<number[]>([])

  useEffect(() => {
    const c = cv.current!
    const g = c.getContext('2d')!
    const buf = new Uint8Array(64)
    let raf = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const w = c.clientWidth,
        ht = c.clientHeight
      if (c.width !== w * 2) {
        c.width = w * 2
        c.height = ht * 2
      }
      const a = live.current.ana
      if (a) {
        a.getByteTimeDomainData(buf)
        let peak = 0
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128)
        hist.current.push(peak)
        if (hist.current.length > w / 3) hist.current.shift()
        clock.current!.textContent = mmss((Date.now() - t0.current) / 1000)
      }
      g.setTransform(2, 0, 0, 2, 0, 0)
      g.clearRect(0, 0, w, ht)
      g.fillStyle = '#ff453a'
      hist.current.forEach((v, i) => {
        const bh = Math.max(2, v * ht * 0.92)
        g.fillRect(i * 3, (ht - bh) / 2, 2, bh)
      })
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      stopRec(live.current, clock.current)
      listRef.current.forEach((m) => URL.revokeObjectURL(m.url))
    }
  }, [])

  const start = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    live.current.stream = s
    ac ??= new AudioContext()
    const a = ac.createAnalyser()
    a.fftSize = 128
    ac.createMediaStreamSource(s).connect(a)
    live.current.ana = a
    const chunks: Blob[] = []
    const r = new MediaRecorder(s)
    r.ondataavailable = (e) => chunks.push(e.data)
    r.onstop = () =>
      setList((l) => [
        {
          url: URL.createObjectURL(new Blob(chunks, { type: r.mimeType })),
          len: (Date.now() - t0.current) / 1000,
          at: new Date()
        },
        ...l
      ])
    r.start()
    live.current.rec = r
    t0.current = Date.now()
    hist.current.length = 0
  }
  const toggle = () => {
    if (live.current.rec) {
      setOn(false)
      stopRec(live.current, clock.current)
      return
    }
    setOn(true)
    start().catch(() => {
      setOn(false)
      setDenied(true)
    })
  }

  return (
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(shared.hdr)}>Voice Memos</div>
      <div {...stylex.props(styles.deck)}>
        <canvas ref={cv} {...stylex.props(styles.wave)} />
        <div ref={clock} {...stylex.props(styles.clock)}>
          00:00
        </div>
        <button type="button" {...stylex.props(styles.rec)} onClick={toggle}>
          <i {...stylex.props(styles.dot, on && styles.dotOn)} />
        </button>
        {denied && (
          <div {...stylex.props(shared.ph, styles.note)}>Microphone unavailable. Allow access and reopen.</div>
        )}
      </div>
      <div {...stylex.props(shared.hdr, styles.hdrSm)}>All Recordings</div>
      <div {...stylex.props(shared.grp)}>
        {list.map((m, i) => (
          <MemoRow key={m.url} memo={m} n={list.length - i} />
        ))}
      </div>
    </div>
  )
}
