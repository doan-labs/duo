import * as stylex from '@stylexjs/stylex'
import { useInView, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { color, ease, font } from '../tokens.stylex'
import { diagram, Stat } from './diagram'

// A hostile app, for real: this document runs in an actual
// sandbox="allow-scripts" frame on this page (hidden; the figure draws what it
// reports), under a hash-pinned policy. Every result is the browser's own.
const STYLE = 'body{margin:0}'

const SCRIPT = `const tries = [
  ['parent.document', () => parent.document.title],
  ['localStorage', () => localStorage.length],
  ['document.cookie', () => document.cookie],
  ['indexedDB', () => indexedDB.open('steal')],
  ['fetch("/")', () => fetch('/').then((r) => r.status)],
  ['window.open', () => window.open('https://example.com') ?? Promise.reject(new Error('returned null, no popups'))]
]
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let port, nonce
async function run() {
  for (const [name, f] of tries) {
    await wait(750)
    let ok = true, text
    try { text = String(await f()) } catch (e) { ok = false; text = e.name + ': ' + e.message.replace(/^Failed to [^:]+: /, '') }
    port.postMessage({ type: 'probe', name, ok, text })
  }
  port.postMessage({ type: 'done' })
}
addEventListener('message', (e) => {
  if (port || e.data?.type !== 'launch') return
  port = e.ports[0]
  nonce = e.data.nonce
  port.onmessage = (m) => {
    if (m.data.type === 'ack') run()
    // The figure's "say hello twice": the app breaks the protocol on its own port.
    if (m.data.type === 'poke') port.postMessage({ type: 'hello', nonce })
  }
  port.postMessage({ type: 'hello', nonce })
})`

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('')
const sha = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`

/** The release: one document, its policy first in <head>, pinning its only script and style by hash. */
async function release() {
  const [s, c] = await Promise.all([sha(SCRIPT), sha(STYLE)])
  const csp = `default-src 'none'; script-src 'sha256-${b64(s)}'; style-src 'sha256-${b64(c)}'`
  const doc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><style>${STYLE}</style></head><body><script>${SCRIPT}</script></body></html>`
  return { doc, hash: hex(await sha(doc)) }
}

// The drawing, in svg units: the app in the middle, the sandbox wall around
// it, what it reaches for on either side and the one port down to the host.
const APP = { x: 250, y: 158, w: 140, h: 92 }
const WALL = { x: 196, y: 116, w: 248, h: 176 }
const MID = { x: APP.x + APP.w / 2, y: APP.y + APP.h / 2 }
const HOST = { x: MID.x, y: 392 }
const PORT = { top: APP.y + APP.h, bottom: HOST.y - 15 }
const TARGETS = [
  { name: 'parent.document', guards: "the shell's DOM", x: 92, y: 138 },
  { name: 'localStorage', guards: "the shell's storage", x: 92, y: 204 },
  { name: 'document.cookie', guards: 'cookies', x: 92, y: 270 },
  { name: 'indexedDB', guards: "another app's data", x: 548, y: 138 },
  { name: 'fetch("/")', guards: 'the network', x: 548, y: 204 },
  { name: 'window.open', guards: 'a new window', x: 548, y: 270 }
]
const CELLS = 32

/** Where the straight line from the app's centre to a target crosses the wall, and leaves the app. */
function ray(t: { x: number; y: number }) {
  const left = t.x < MID.x
  const at = (x: number) => ({ x, y: MID.y + ((x - MID.x) / (t.x - MID.x)) * (t.y - MID.y) })
  return { from: at(left ? APP.x : APP.x + APP.w), hit: at(left ? WALL.x : WALL.x + WALL.w) }
}

type State = 'idle' | 'running' | 'revoked' | 'refused'
type Probe = { ok: boolean; text: string }
type Packet = { id: number; up: boolean; label: string; bad?: boolean }
type Flip = { at: number; now: string; got: string }

/**
 * An app from a stranger, launched the way the shell launches one: verified
 * bytes, an opaque frame, a nonce and one MessagePort. It reaches for six
 * things and the browser stops each at the wall; the only way through is the
 * port. Say hello twice and the host takes the view back; flip one byte of
 * the release and it never loads. Plays itself until touched.
 */
export function BreakIt() {
  const [rel, setRel] = useState<{ doc: string; hash: string } | null>(null)
  const [state, setState] = useState<State>('idle')
  const [probes, setProbes] = useState<Record<string, Probe>>({})
  const [last, setLast] = useState('')
  const [packets, setPackets] = useState<Packet[]>([])
  const [done, setDone] = useState(false)
  const [flip, setFlip] = useState<Flip | null>(null)
  const [run, setRun] = useState(0)
  const [touched, setTouched] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const port = useRef<MessagePort | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const seen = useInView(svg, { amount: 0.4 })
  const still = useReducedMotion()
  const n = useRef(0)
  const auto = seen && !touched && !still

  const send = useCallback((up: boolean, label: string, bad = false) => {
    n.current += 1
    const id = n.current
    setPackets((p) => [...p, { id, up, label, bad }].slice(-3))
  }, [])

  useEffect(() => {
    release().then(setRel)
  }, [])

  const launch = useCallback(() => {
    port.current?.close()
    port.current = null
    setFlip(null)
    setProbes({})
    setPackets([])
    setDone(false)
    setLast('verified: sha-256 matches the release, policy first in <head>')
    setState('running')
    setRun((r) => r + 1)
  }, [])

  const poke = useCallback(() => port.current?.postMessage({ type: 'poke' }), [])

  const tamper = useCallback(async () => {
    if (!rel) return
    port.current?.close()
    port.current = null
    // One byte in the script: the kind of change a compromised mirror would make.
    const start = rel.doc.indexOf('<script>') + 8
    const at = start + 40 + Math.floor(Math.random() * (SCRIPT.length - 80))
    const now = rel.doc[at] === 'x' ? 'y' : 'x'
    const got = hex(await sha(rel.doc.slice(0, at) + now + rel.doc.slice(at + 1)))
    setFlip({ at, now, got })
    setProbes({})
    setPackets([])
    setDone(false)
    setLast(`refused: computed sha-256 ${short(got)}, the release says ${short(rel.hash)}`)
    setState('refused')
  }, [rel])

  // The first time it scrolls in, launch; while it plays itself, break it every way in turn.
  useEffect(() => {
    if (seen && rel && state === 'idle') launch()
  }, [seen, rel, state, launch])
  useEffect(() => {
    if (!auto) return
    const next =
      state === 'running' && done
        ? [poke, 1600]
        : state === 'revoked'
          ? [tamper, 2800]
          : state === 'refused'
            ? [launch, 3600]
            : null
    if (!next) return
    const t = window.setTimeout(next[0] as () => void, next[1] as number)
    return () => clearTimeout(t)
  }, [auto, state, done, poke, tamper, launch])

  // Once the new frame has loaded: hand it a nonce and the port, then answer on the port only.
  const loaded = () => {
    const win = frame.current?.contentWindow
    if (!win || state !== 'running') return
    const nonce = hex(crypto.getRandomValues(new Uint8Array(4)).buffer)
    const ch = new MessageChannel()
    let hello = false
    port.current = ch.port1
    ch.port1.onmessage = (
      m: MessageEvent<{ type: string; nonce?: string; name?: string; ok?: boolean; text?: string }>
    ) => {
      const d = m.data
      if (d.type === 'hello' && d.nonce === nonce && !hello) {
        hello = true
        send(true, `hello ${nonce}`)
        window.setTimeout(() => send(false, 'ack'), 500)
        ch.port1.postMessage({ type: 'ack' })
      } else if (d.type === 'hello') {
        send(true, 'hello, again', true)
        setLast('revoked: a second hello after the ack. Port closed, frame removed')
        ch.port1.close()
        port.current = null
        window.setTimeout(() => setState('revoked'), 700)
      } else if (d.type === 'probe' && d.name) {
        setProbes((p) => ({ ...p, [d.name as string]: { ok: Boolean(d.ok), text: d.text ?? '' } }))
        setLast(`${d.name}: ${d.text ?? ''}`)
      } else if (d.type === 'done') setDone(true)
    }
    win.postMessage({ type: 'launch', nonce }, '*', [ch.port2])
  }

  const touch = (f: () => void) => () => {
    setTouched(true)
    f()
  }

  const blocked = Object.values(probes).filter((p) => !p.ok).length
  const live = state === 'running'
  const bytes = rel?.doc ?? ''
  const from = flip ? Math.max(0, flip.at - CELLS / 2) : 0
  const cells = Array.from({ length: CELLS }, (_, i) => {
    const at = from + i
    const ch = flip && at === flip.at ? flip.now : (bytes[at] ?? ' ')
    return { at, hex: ch.charCodeAt(0).toString(16).padStart(2, '0'), bad: flip?.at === at }
  })

  return (
    <figure {...stylex.props(diagram.figure)}>
      <svg ref={svg} viewBox="0 0 640 450" role="img" aria-label={`A sandboxed app: ${blocked} of 6 escapes blocked`}>
        <title>A stranger's app, sandboxed</title>
        {/* The release's bytes, and the hash the shell checks them against. */}
        <text x="20" y="26" {...stylex.props(diagram.svgText)}>
          {flip ? `the release, byte ${flip.at}` : 'the release, first bytes'}
        </text>
        <text x="620" y="26" textAnchor="end" {...stylex.props(diagram.svgText, flip ? styles.red : styles.green)}>
          {rel ? (flip ? `✕ sha-256 ${short(flip.got)}` : `✓ sha-256 ${short(rel.hash)}`) : 'hashing…'}
        </text>
        {cells.map((c, i) => (
          <g key={c.at}>
            <rect
              x={20 + i * 19}
              y="36"
              width="18"
              height="20"
              rx="3"
              {...stylex.props(styles.cell, c.bad && styles.cellBad)}
            />
            <text x={29 + i * 19} y="50" textAnchor="middle" {...stylex.props(styles.byte, c.bad && styles.byteBad)}>
              {c.hex}
            </text>
          </g>
        ))}

        {/* The wall: the frame's opaque origin. Nothing crosses it but the port. */}
        <rect
          x={WALL.x}
          y={WALL.y}
          width={WALL.w}
          height={WALL.h}
          rx="22"
          {...stylex.props(styles.wall, state === 'revoked' && styles.wallGone, state === 'refused' && styles.ghost)}
        />
        <text x={WALL.x + 14} y={WALL.y + 20} {...stylex.props(diagram.svgText, styles.small)}>
          sandbox="allow-scripts"
        </text>

        {TARGETS.map((t) => {
          const p = probes[t.name]
          const r = ray(t)
          const left = t.x < MID.x
          return (
            <g key={t.name}>
              <rect
                x={t.x - 70}
                y={t.y - 15}
                width="140"
                height="30"
                rx="15"
                {...stylex.props(styles.target, p && (p.ok ? styles.targetOpen : styles.targetSafe))}
              />
              <text x={t.x} y={t.y + 4} textAnchor="middle" {...stylex.props(styles.targetName)}>
                {t.name}
              </text>
              <text x={t.x} y={t.y + 30} textAnchor="middle" {...stylex.props(diagram.svgText, styles.small)}>
                {p ? (p.ok ? 'got through' : 'blocked') : t.guards}
              </text>
              {p && live && (
                <g key={`${run}-${t.name}`}>
                  <line
                    x1={r.from.x}
                    y1={r.from.y}
                    x2={r.hit.x}
                    y2={r.hit.y}
                    pathLength={1}
                    {...stylex.props(styles.probe)}
                  />
                  {/* The rest of the way it never went. */}
                  <line
                    x1={r.hit.x}
                    y1={r.hit.y}
                    x2={t.x + (left ? 70 : -70)}
                    y2={t.y}
                    {...stylex.props(styles.missed)}
                  />
                  <g transform={`translate(${r.hit.x} ${r.hit.y})`}>
                    <g {...stylex.props(styles.hit)}>
                      <circle r="9" {...stylex.props(styles.hitRing)} />
                      <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" {...stylex.props(styles.hitX)} />
                    </g>
                  </g>
                </g>
              )}
            </g>
          )
        })}

        {/* The app. */}
        <rect
          x={APP.x}
          y={APP.y}
          width={APP.w}
          height={APP.h}
          rx="14"
          {...stylex.props(styles.app, state === 'revoked' && styles.appGone, state === 'refused' && styles.ghost)}
        />
        <text x={MID.x} y={MID.y - 4} textAnchor="middle" {...stylex.props(styles.appName)}>
          {state === 'refused' ? 'never loaded' : state === 'revoked' ? 'revoked' : "a stranger's app"}
        </text>
        <text x={MID.x} y={MID.y + 16} textAnchor="middle" {...stylex.props(diagram.svgText, styles.small)}>
          origin "null"
        </text>

        {/* The one port, and the messages on it. */}
        <line
          x1={MID.x}
          x2={MID.x}
          y1={PORT.top}
          y2={PORT.bottom}
          {...stylex.props(styles.port, !live && styles.portCut)}
        />
        <text
          x={MID.x + 10}
          y={(WALL.y + WALL.h + PORT.bottom) / 2 + 12}
          {...stylex.props(diagram.svgText, styles.small)}
        >
          one MessagePort
        </text>
        {state === 'revoked' && (
          <g transform={`translate(${MID.x} ${(PORT.top + PORT.bottom) / 2})`}>
            <g {...stylex.props(styles.hit)}>
              <circle r="9" {...stylex.props(styles.hitRing)} />
              <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" {...stylex.props(styles.hitX)} />
            </g>
          </g>
        )}
        {packets.map((p) => (
          <g key={p.id} {...stylex.props(styles.packet, p.up ? styles.up : styles.down)}>
            <circle cx={MID.x} cy={PORT.top} r="5" {...stylex.props(p.bad ? styles.dotBad : styles.dot)} />
            <text
              x={MID.x - 12}
              y={PORT.top + 4}
              textAnchor="end"
              {...stylex.props(styles.packetText, p.bad && styles.red)}
            >
              {p.label}
            </text>
          </g>
        ))}
        <rect x={HOST.x - 80} y={HOST.y - 15} width="160" height="30" rx="15" {...stylex.props(styles.host)} />
        <text x={HOST.x} y={HOST.y + 4} textAnchor="middle" {...stylex.props(styles.targetName, styles.hostName)}>
          Runtime · the host
        </text>

        {/* What the browser just said, verbatim. */}
        <text
          x="320"
          y="438"
          textAnchor="middle"
          {...stylex.props(styles.said, last.startsWith('verified') ? styles.green : styles.red)}
        >
          {last.length > 92 ? `${last.slice(0, 91)}…` : last}
        </text>
      </svg>
      {live && rel && (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onLoad is the launch, not an interaction.
        <iframe
          key={run}
          ref={frame}
          title="The stranger's app, running sandboxed"
          sandbox="allow-scripts"
          srcDoc={rel.doc}
          onLoad={loaded}
          tabIndex={-1}
          aria-hidden="true"
          {...stylex.props(styles.frame)}
        />
      )}
      <div {...stylex.props(diagram.controls, styles.buttons)}>
        <button type="button" onClick={touch(launch)} {...stylex.props(diagram.button)}>
          {live ? 'Relaunch' : 'Launch'}
        </button>
        <button type="button" onClick={touch(poke)} disabled={!live} {...stylex.props(diagram.button, styles.quiet)}>
          Say hello twice
        </button>
        <button type="button" onClick={touch(tamper)} {...stylex.props(diagram.button, styles.quiet)}>
          Flip a byte
        </button>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Escapes blocked" value={`${blocked} / ${TARGETS.length}`} />
        <Stat label="Hash" value={flip ? 'Mismatch' : 'Matches'} />
        <Stat label="Nonce" value={state === 'refused' ? 'Never sent' : 'One use'} />
        <Stat
          label="View"
          value={live ? 'Live' : state === 'revoked' ? 'Revoked' : state === 'refused' ? 'Refused' : '…'}
        />
      </dl>
      <figcaption {...stylex.props(diagram.caption)}>
        A real sandboxed frame runs on this page; the drawing is what it reports, and every error is your browser's.
      </figcaption>
    </figure>
  )
}

const draw = stylex.keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } })
const pop = stylex.keyframes({
  '0%, 55%': { opacity: 0, transform: 'scale(0.3)' },
  '75%': { opacity: 1, transform: 'scale(1.3)' },
  '100%': { opacity: 1, transform: 'scale(1)' }
})
const fade = stylex.keyframes({ '0%, 60%': { opacity: 0 }, '100%': { opacity: 0.5 } })
// A message rides the port, the app's bottom edge to the host: PORT.bottom - PORT.top.
const down = stylex.keyframes({
  from: { transform: 'translateY(0)', opacity: 0 },
  '15%': { opacity: 1 },
  '85%': { opacity: 1 },
  to: { transform: 'translateY(127px)', opacity: 0 }
})
const up = stylex.keyframes({
  from: { transform: 'translateY(127px)', opacity: 0 },
  '15%': { opacity: 1 },
  '85%': { opacity: 1 },
  to: { transform: 'translateY(0)', opacity: 0 }
})

const styles = stylex.create({
  cell: { fill: color.well, stroke: color.border, strokeWidth: 1 },
  cellBad: { fill: color.red, stroke: color.red },
  byte: { fontFamily: font.mono, fontSize: '9px', fill: color.text3 },
  byteBad: { fill: color.onAccent, fontWeight: 600 },
  red: { fill: color.red },
  green: { fill: color.green },
  small: { fontSize: '10.5px' },
  wall: {
    fill: 'none',
    stroke: color.borderStrong,
    strokeWidth: 1.5,
    strokeDasharray: '6 5',
    transitionProperty: 'stroke, opacity',
    transitionDuration: '0.4s'
  },
  wallGone: { stroke: color.red },
  ghost: { opacity: 0.3 },
  target: {
    fill: color.well,
    stroke: color.border,
    strokeWidth: 1,
    transitionProperty: 'stroke, fill',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  targetSafe: { stroke: color.green, fill: color.greenBg },
  targetOpen: { stroke: color.red, fill: color.redBg },
  targetName: { fontFamily: font.mono, fontSize: '12px', fontWeight: 500, fill: color.text },
  probe: {
    stroke: color.orange,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeDasharray: 1,
    strokeDashoffset: 1,
    animationName: draw,
    animationDuration: '0.35s',
    animationTimingFunction: 'ease-in',
    animationFillMode: 'forwards'
  },
  missed: {
    stroke: color.red,
    strokeWidth: 1,
    strokeDasharray: '2 4',
    opacity: 0,
    animationName: fade,
    animationDuration: '0.7s',
    animationFillMode: 'forwards'
  },
  hit: {
    opacity: 0,
    transformBox: 'fill-box',
    transformOrigin: 'center',
    animationName: pop,
    animationDuration: '0.6s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  hitRing: { fill: color.red },
  hitX: { stroke: color.onAccent, strokeWidth: 2, strokeLinecap: 'round' },
  app: {
    fill: color.accentSoft,
    stroke: color.accent,
    strokeWidth: 2,
    transitionProperty: 'fill, stroke, opacity',
    transitionDuration: '0.4s'
  },
  appGone: { fill: color.redBg, stroke: color.red },
  appName: { fontFamily: font.sans, fontSize: '15px', fontWeight: 600, fill: color.text },
  port: { stroke: color.accent, strokeWidth: 2, transitionProperty: 'stroke, opacity', transitionDuration: '0.3s' },
  portCut: { stroke: color.red, opacity: 0.5 },
  packet: { opacity: 0, animationDuration: '0.9s', animationTimingFunction: ease.inOut, animationFillMode: 'forwards' },
  down: { animationName: down },
  up: { animationName: up },
  dot: { fill: color.accent },
  dotBad: { fill: color.red },
  packetText: { fontFamily: font.mono, fontSize: '11px', fill: color.accent },
  host: { fill: color.greenBg, stroke: color.green, strokeWidth: 1.5 },
  hostName: { fill: color.green },
  said: { fontFamily: font.mono, fontSize: '11.5px' },
  // The frame runs, but the figure is the view of it.
  frame: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: 0,
    pointerEvents: 'none',
    borderWidth: 0
  },
  buttons: { flexWrap: 'wrap' },
  quiet: {
    backgroundColor: { default: color.well, ':hover': color.border },
    color: color.text,
    opacity: { default: 1, ':disabled': 0.45 },
    cursor: { default: 'pointer', ':disabled': 'default' }
  }
})
