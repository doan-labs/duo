import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { color, font } from '../tokens.stylex'
import { diagram, Stat } from './diagram'

const W = 640
const H = 200
const BARS = 64
const STEP = W / BARS
const REST = 0.06
const TICK_MS = 70
const MAX_MS = 30_000

type Take = { url: string; size: number; type: string; ms: number }
type Phase = 'idle' | 'asking' | 'live' | 'done' | 'blocked'

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Voice Memos' live meter on the reader's own microphone: RMS per tick, bars
 * scrolling in from the right, the take kept as a Blob. The page holds the mic
 * here; in Duo the shell does, and the app is handed the same Blob.
 */
export function MicWave() {
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(REST))
  const [phase, setPhase] = useState<Phase>('idle')
  const [ms, setMs] = useState(0)
  const [take, setTake] = useState<Take | null>(null)
  const [bytes, setBytes] = useState(0)
  const [rms, setRms] = useState(0)
  const [playing, setPlaying] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(
    () => () => {
      stopRef.current?.()
      audio.current?.pause()
    },
    []
  )
  useEffect(() => () => void (take && URL.revokeObjectURL(take.url)), [take])

  const record = async () => {
    audio.current?.pause()
    setPlaying(false)
    setPhase('asking')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setPhase('blocked')
      return
    }
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const rec = new MediaRecorder(stream)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      chunks.push(e.data)
      setBytes((b) => b + e.data.size)
    }
    const t0 = performance.now()
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType })
      setTake({
        url: URL.createObjectURL(blob),
        size: blob.size,
        type: blob.type.split(';')[0] ?? blob.type,
        ms: performance.now() - t0
      })
      setPhase('done')
    }
    // A slice every 250 ms, so the size so far is the encoder's real output, not a guess from the bitrate.
    rec.start(250)
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += v * v
      // sqrt of RMS lifts speech into view without clipping a shout.
      const r = Math.sqrt(sum / buf.length)
      setRms(r)
      const level = Math.max(REST, Math.min(1, Math.sqrt(r) * 1.6))
      setLevels((l) => [...l.slice(1), level])
      const now = performance.now() - t0
      setMs(now)
      if (now >= MAX_MS) stop()
    }, TICK_MS)
    const stop = () => {
      window.clearInterval(timer)
      if (rec.state !== 'inactive') rec.stop()
      for (const t of stream.getTracks()) t.stop()
      void ctx.close()
      stopRef.current = null
    }
    stopRef.current = stop
    setTake(null)
    setBytes(0)
    setMs(0)
    setPhase('live')
  }

  const play = () => {
    if (!take) return
    if (playing) {
      audio.current?.pause()
      setPlaying(false)
      return
    }
    const a = new Audio(take.url)
    a.onended = () => setPlaying(false)
    audio.current = a
    void a.play()
    setPlaying(true)
  }

  const live = phase === 'live'
  const sec = ms / 1000
  const db = rms > 0 ? `${Math.max(-60, 20 * Math.log10(rms)).toFixed(0)} dB` : '-inf dB'
  // The same four calls Voice Memos makes; each line's comment is what it just returned.
  const lines: [code: string, result: string, at: Phase[]][] = [
    [
      'await os.mic.start()',
      phase === 'blocked'
        ? 'denied: allow the mic to try'
        : phase === 'asking'
          ? 'asking…'
          : phase === 'idle'
            ? ''
            : 'recording',
      ['asking', 'blocked']
    ],
    [
      'os.mic.onStatus((s) => meter(s.level))',
      phase === 'idle' || phase === 'asking' ? '' : `level ${Math.min(1, rms * 4).toFixed(2)}`,
      ['live']
    ],
    ['const take = await os.mic.stop()', take ? `${take.type}, ${(take.ms / 1000).toFixed(1)} s` : '', []],
    ["await os.files.put('memo.webm', take.blob)", take ? `${kb(take.size)} in appfiles` : '', ['done']]
  ]

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div {...stylex.props(styles.eyebrow)}>Voice Memos</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={live ? 'Live microphone level' : 'Waveform'}
        {...stylex.props(styles.svg)}
      >
        <title>Microphone waveform</title>
        {levels.map((v, i) => {
          const h = Math.max(8, v * (H - 8))
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: bars are slots, the level scrolls through them.
            <rect key={i} x={i * STEP + 2.5} y={(H - h) / 2} width={5} height={h} rx={2.5} fill={color.rec} />
          )
        })}
      </svg>
      <div {...stylex.props(styles.controls)}>
        <button
          type="button"
          onClick={live ? () => stopRef.current?.() : record}
          disabled={phase === 'asking'}
          aria-label={live ? 'Stop recording' : 'Record'}
          {...stylex.props(styles.rec)}
        >
          <span {...stylex.props(styles.dot, live && styles.square)} />
        </button>
        <span {...stylex.props(styles.time)}>{clock(ms)}</span>
        {take && !live && (
          <button type="button" onClick={play} {...stylex.props(diagram.button)}>
            {playing ? 'Stop' : 'Play take'}
          </button>
        )}
      </div>
      <ol {...stylex.props(styles.code)} aria-live="polite">
        {lines.map(([code, result, at]) => (
          <li
            key={code}
            {...stylex.props(styles.line, at.includes(phase) && styles.lineOn, !result && styles.lineAhead)}
          >
            <span>{code}</span>
            {result && <span {...stylex.props(styles.result)}>{`// ${result}`}</span>}
          </li>
        ))}
      </ol>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Elapsed" value={`${sec.toFixed(1)} s`} />
        <Stat label="Input" value={live ? db : '-'} />
        <Stat label={take ? 'File size' : 'Size so far'} value={kb(take?.size ?? bytes)} />
        <Stat
          label="Bitrate"
          value={sec > 0.5 ? `${(((take?.size ?? bytes) * 8) / 1000 / sec).toFixed(0)} kbps` : '-'}
        />
      </dl>
    </figure>
  )
}

const styles = stylex.create({
  eyebrow: { textAlign: 'center', fontFamily: font.sans, fontSize: '15px', fontWeight: 500, color: color.red },
  svg: { display: 'block', width: '100%', height: 'auto', marginTop: '12px' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '12px' },
  rec: {
    display: 'grid',
    placeItems: 'center',
    width: '52px',
    height: '52px',
    padding: 0,
    borderWidth: '3px',
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    borderRadius: '50%',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  dot: {
    width: '38px',
    height: '38px',
    borderRadius: '19px',
    backgroundColor: color.rec,
    transitionProperty: 'width, height, border-radius',
    transitionDuration: '0.25s'
  },
  square: { width: '20px', height: '20px', borderRadius: '5px' },
  time: { width: '48px', fontFamily: font.mono, fontSize: '15px', color: color.text },
  code: {
    listStyleType: 'none',
    marginTop: '16px',
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: color.well,
    borderRadius: '10px',
    overflowX: 'auto',
    fontFamily: font.mono,
    fontSize: '13px',
    lineHeight: 1.9
  },
  line: {
    display: 'flex',
    gap: '14px',
    whiteSpace: 'pre',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
    color: color.text,
    transitionProperty: 'opacity, background-color',
    transitionDuration: '0.2s'
  },
  lineOn: { borderLeftColor: color.rec, backgroundColor: color.redBg },
  lineAhead: { opacity: 0.45 },
  result: { color: color.green }
})
