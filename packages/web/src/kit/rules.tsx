// The four build rules from DESIGN.md as one drawing sheet, in the blueprint
// the blog's hardware figure uses (`blog/heard.tsx`): a grid, the part in one
// ink that draws itself in, crop marks, mono notes, what the code sees printed
// on the glass. One control per rule; it plays itself until the reader touches it.
import { dark as kitDark, light as kitLight } from '@doan-labs/duo-uikit/styles.ts'
import { app } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { motion, useInView } from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'
import { keyed, useAutoplay } from '../blog/autoplay'
import { diagram, Roll, Stat } from '../blog/diagram'
import { rr } from '../blog/heard'
import { Cap, Headline } from '../home/parts'
import { Button } from '../layout'
import { color, ease, font } from '../tokens.stylex'

const SLOT = 6
const VW = 560
const VH = 340

/** `t`: seconds into this rule's turn while the sheet plays itself, null once the reader has taken over. */
type Stage = { t: number | null; stop: () => void; seen: boolean; picks: ReactNode }

const RULES = [
  { name: 'cover-first', Stage: CoverFirst },
  { name: 'runs-twice', Stage: RunsTwice },
  { name: 'one-file', Stage: OneFile },
  { name: 'tokens-only', Stage: TokensOnly }
]

export function Principles() {
  const [pick, setPick] = useState(0)
  const [t, setT] = useState(0)
  const auto = useAutoplay<HTMLDivElement>((s) => {
    setPick(Math.floor(s / SLOT) % RULES.length)
    setT(s % SLOT)
  })
  const seen = useInView(auto.ref, { once: true, amount: 0.3 })
  const { Stage } = RULES[pick] ?? RULES[0]!
  return (
    <section {...stylex.props(styles.section)} aria-labelledby="rules-title">
      <div {...stylex.props(styles.inner)}>
        <div {...stylex.props(styles.head)}>
          <div>
            <Cap>How we build it</Cap>
            <Headline id="rules-title" size="md" lines={['Four rules,', 'no exceptions.']} />
          </div>
          <div {...stylex.props(styles.actions)}>
            <Button to="/guidelines">Read the guidelines</Button>
            <Button to="/docs" outline>
              Docs
            </Button>
          </div>
        </div>
        <figure ref={auto.ref} {...stylex.props(diagram.figure, styles.figure)}>
          {/* Keyed by rule, so each one draws itself in as it arrives. */}
          <Stage
            key={pick}
            t={auto.on ? t : null}
            stop={auto.stop}
            seen={seen}
            picks={
              <div {...stylex.props(diagram.controls, styles.picks)}>
                {RULES.map((r, i) => (
                  <button
                    key={r.name}
                    type="button"
                    aria-pressed={pick === i}
                    onClick={() => {
                      auto.stop()
                      setPick(i)
                    }}
                    {...stylex.props(diagram.button, styles.pick, pick !== i && styles.off)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            }
          />
        </figure>
      </div>
    </section>
  )
}

/** The drawing sheet: the grid, then the part. */
/** `live` sheets hold controls, so they are a group rather than one image. */
function Sheet({ label, live, children }: { label: string; live?: boolean; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.sheet)}>
      <svg viewBox={`0 0 ${VW} ${VH}`} role={live ? 'group' : 'img'} aria-label={label}>
        <defs>
          <pattern id="rulesGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" {...stylex.props(styles.grid)} />
          </pattern>
          <marker id="rulesArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L8 4L0 8" {...stylex.props(styles.arrowHead)} />
          </marker>
        </defs>
        <rect width={VW} height={VH} fill="url(#rulesGrid)" />
        {children}
      </svg>
    </div>
  )
}

/** Crop marks at a part's corners, the way a drawing sheet frames it. */
const crops = (x: number, y: number, w: number, h: number) =>
  [
    [x - 8, y, 1, 1],
    [x + w + 8, y, -1, 1],
    [x - 8, y + h, 1, -1],
    [x + w + 8, y + h, -1, -1]
  ]
    .map(([cx, cy, sx, sy]) => `M${cx} ${cy! + 10 * sy!}V${cy}H${cx! + 10 * sx!}`)
    .join('')

/** Construction lines through a part's centre. */
const cross = (x: number, y: number, w: number, h: number) =>
  `M${x + w / 2} ${y - 12}V${y + h + 12}M${x - 12} ${y + h / 2}H${x + w + 12}`

/** What the code sees, printed on the glass: the call above, the value on a plate. */
function Plate({ x, y, type, value, w = 132 }: { x: number; y: number; type: string; value: string; w?: number }) {
  return (
    <g>
      <text x={x} y={y - 16} {...stylex.props(styles.screenType, styles.mid)}>
        {type}
      </text>
      <rect x={x - w / 2} y={y - 6} width={w} height={28} rx={8} {...stylex.props(styles.plate)} />
      <text x={x} y={y + 13} {...stylex.props(styles.screenValue, styles.mid)}>
        {value}
      </text>
    </g>
  )
}

/** Ink that draws itself in once the sheet is on screen, after `delay`. */
const ink = (seen: boolean, delay = '0s', faint = false) => [
  faint ? styles.faint : styles.body,
  seen && styles.draw,
  styles.wait(delay)
]
const fade = (seen: boolean, delay = '0.6s') => [styles.hidden, seen && styles.show, styles.wait(delay)]

/** Lay out for 387 points and let width decide: past 600 the list keeps a cover's width and a detail fills the rest. */
function CoverFirst({ t, stop, seen, picks }: Stage) {
  const [own, setOwn] = useState(430)
  const w =
    t === null
      ? own
      : keyed(t, [
          [0, 387],
          [1, 387],
          [3, 790],
          [5, 790],
          [6, 387]
        ])
  const wide = w >= 600
  const s = 0.5
  // Pinned at the left, so it grows the way a window does and the 600 line stays put.
  const x = (VW - 790 * s) / 2
  const y = 84
  const h = 200
  const dw = w * s
  const pane = wide ? 387 * s : dw
  return (
    <>
      <Sheet label={`A display ${Math.round(w)} points wide`}>
        <path d={rr(x, y, dw, h, [12, 12, 12, 12])} pathLength={1} {...stylex.props(...ink(seen))} />
        <path d={crops(x, y, dw, h)} {...stylex.props(...fade(seen, '0.5s'), styles.faintLine)} />
        <path d={cross(x, y, dw, h)} {...stylex.props(...fade(seen), styles.center)} />
        <rect
          x={x + 6}
          y={y + 6}
          width={pane - 12}
          height={h - 12}
          rx={8}
          {...stylex.props(styles.pane, wide && styles.paneOn)}
        />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={x + 16}
            y={y + 20 + i * 26}
            width={pane - 32}
            height={18}
            rx={4}
            {...stylex.props(styles.faintLine)}
          />
        ))}
        {wide && (
          <g {...stylex.props(styles.arrive)}>
            <path d={`M${x + pane} ${y + 6}V${y + h - 6}`} {...stylex.props(styles.center)} />
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M${x + pane + 16} ${y + 26 + i * 16}H${x + dw - 20 - (i % 2) * 40}`}
                {...stylex.props(styles.faintLine)}
              />
            ))}
          </g>
        )}
        {/* The dimension above the part. */}
        <path d={`M${x} 50H${x + dw}M${x} 44V56M${x + dw} 44V56`} {...stylex.props(styles.faintLine)} />
        <text x={x + dw / 2} y={40} {...stylex.props(styles.note, styles.mid)}>
          {Math.round(w)} pt
        </text>
        {/* useWide's breakpoint, fixed on the sheet. */}
        <path d={`M${x + 300} ${y - 14}V${y + h + 14}`} {...stylex.props(styles.lead, styles.heard)} />
        <text x={x + 300} y={y + h + 30} {...stylex.props(styles.tag, styles.heardFill, styles.mid)}>
          600
        </text>
        <text x={x + 387 * s} y={y + h + 30} {...stylex.props(styles.tag, styles.takenFill, styles.mid)}>
          387
        </text>
        <Plate x={x + pane / 2} y={y + h - 50} type="useWide()" value={String(wide)} w={112} />
      </Sheet>
      {picks}
      <div {...stylex.props(diagram.controls)}>
        <input
          type="range"
          min={387}
          max={790}
          value={Math.round(w)}
          aria-label="Display width"
          onChange={(e) => {
            stop()
            setOwn(+e.target.value)
          }}
          {...stylex.props(diagram.range)}
        />
        <span {...stylex.props(diagram.deg, styles.wide)}>{Math.round(w)} pt</span>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Width" value={<Roll text={`${Math.round(w)} pt`} />} />
        <Stat label="useWide()" value={String(wide)} />
        <Stat label="Columns" value={wide ? '2' : '1'} />
        <Stat label="List" value="387 pt" />
      </dl>
    </>
  )
}

/** Both displays hold the app, both running: the fold only moves which one you see. */
function RunsTwice({ t, stop, seen, picks }: Stage) {
  const [own, setOwn] = useState(0)
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSec((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const hinge =
    t === null
      ? own
      : keyed(t, [
          [0, 0],
          [1.4, 0],
          [3, 180],
          [4.6, 180],
          [6, 0]
        ])
  const inner = hinge > 90
  const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const y = 60
  const h = 196
  const cover = { x: 44, w: 136 }
  const wide = { x: 236, w: 280 }
  const a = (hinge * Math.PI) / 180
  const screen = (
    d: { x: number; w: number },
    on: boolean,
    name: string,
    corners: [number, number, number, number]
  ) => (
    <g {...stylex.props(styles.screen, !on && styles.asleep)}>
      <path d={rr(d.x, y, d.w, h, corners)} pathLength={1} {...stylex.props(...ink(seen))} />
      <path
        d={rr(d.x + 4, y + 4, d.w - 8, h - 8, corners.map((c) => Math.max(1, c - 4)) as typeof corners)}
        {...stylex.props(styles.glass, on && styles.glassOn)}
      />
      <path d={crops(d.x, y, d.w, h)} {...stylex.props(...fade(seen, '0.5s'), styles.faintLine)} />
      <path d={cross(d.x, y, d.w, h)} {...stylex.props(...fade(seen), styles.center)} />
      <Plate x={d.x + d.w / 2} y={y + h / 2} type={name} value={clock} w={96} />
      <text x={d.x + d.w / 2} y={y + h - 14} {...stylex.props(styles.note, styles.mid)}>
        {on ? 'on screen' : 'running'}
      </text>
    </g>
  )
  return (
    <>
      <Sheet label={`Two displays, one app, the ${inner ? 'inner' : 'cover'} on screen`}>
        {screen(cover, !inner, 'cover', [2, 20, 20, 2])}
        {screen(wide, inner, 'inner', [18, 18, 18, 18])}
        {/* The live copy: each tick crosses to the other display. */}
        <path d={`M${cover.x + cover.w + 10} ${y + 40}H${wide.x - 10}`} {...stylex.props(styles.lead, styles.state)} />
        <motion.circle
          key={sec}
          r={3.5}
          cy={y + 40}
          initial={{ cx: cover.x + cover.w + 10, opacity: 1 }}
          animate={{ cx: wide.x - 10, opacity: [1, 1, 0] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          {...stylex.props(styles.stateFill)}
        />
        {/* The hinge, side on: a fixed leaf, the other swinging open. */}
        <g transform={`translate(${VW / 2} ${VH - 36})`}>
          <path d="M-40 0H0" {...stylex.props(styles.body, styles.drawn)} />
          <path d={`M0 0L${-40 * Math.cos(a)} ${-40 * Math.sin(a)}`} {...stylex.props(styles.body, styles.drawn)} />
          <path
            d={`M-26 0A26 26 0 0 1 ${-26 * Math.cos(a)} ${-26 * Math.sin(a)}`}
            markerEnd={hinge > 8 ? 'url(#rulesArrow)' : undefined}
            {...stylex.props(styles.lead, styles.state)}
          />
          <circle r={3} {...stylex.props(styles.takenFill)} />
          <text x={52} y={4} {...stylex.props(styles.note)}>
            hinge {Math.round(hinge)}°
          </text>
        </g>
      </Sheet>
      {picks}
      <div {...stylex.props(diagram.controls)}>
        <input
          type="range"
          min={0}
          max={180}
          value={Math.round(hinge)}
          aria-label="Hinge angle"
          onChange={(e) => {
            stop()
            setOwn(+e.target.value)
          }}
          {...stylex.props(diagram.range)}
        />
        <span {...stylex.props(diagram.deg)}>{Math.round(hinge)}°</span>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Hinge" value={`${Math.round(hinge)}°`} />
        <Stat label="On screen" value={inner ? 'inner' : 'cover'} />
        <Stat label="Timer" value={<Roll text={clock} />} />
        <Stat label="Remounts" value="0" />
      </dl>
    </>
  )
}

// Each inline part and the request it would try; the CSP row is a switch.
const PARTS = [
  { part: '<meta csp>', call: '' },
  { part: '<style>', call: 'url()' },
  { part: '<script>', call: 'fetch()' },
  { part: 'data:image', call: '<img src>' }
]

/** Every byte inline, its CSP first: a request out of the document stops at the wall. Tap a part to fire it, or pull the CSP. */
function OneFile({ t, stop, seen, picks }: Stage) {
  const [own, setOwn] = useState({ n: 0, from: 2, csp: true, blocked: 0, touched: false })
  const auto = t === null ? null : Math.floor(t / 1.5) + 1
  const n = auto ?? own.n
  const from = auto ? ((auto - 1) % 3) + 1 : own.from
  const csp = auto ? true : own.csp
  const blocked = auto ?? own.blocked
  const doc = { x: 64, y: 50, w: 176, h: 236 }
  const wall = 392
  const line = 168
  const net = { x: 430, y: 138, w: 100, h: 60 }
  const rowY = (i: number) => doc.y + 59 + i * 44
  const tap = (i: number) => {
    stop()
    setOwn((o) => {
      // The first touch carries on from where the autoplay was.
      const b = auto && !o.touched ? { n, from, csp, blocked, touched: true } : o
      if (i === 0) return { ...b, touched: true, csp: !b.csp }
      return { ...b, touched: true, n: b.n + 1, from: i, blocked: b.blocked + (b.csp ? 1 : 0) }
    })
  }
  const end = csp ? wall - 4 : net.x + 6
  return (
    <>
      <Sheet label="One document; tap a part to fire its request, or switch the CSP off" live>
        <path
          d={`M${doc.x} ${doc.y}H${doc.x + doc.w - 26}L${doc.x + doc.w} ${doc.y + 26}V${doc.y + doc.h}H${doc.x}Z`}
          pathLength={1}
          {...stylex.props(...ink(seen))}
        />
        <path
          d={`M${doc.x + doc.w - 26} ${doc.y}V${doc.y + 26}H${doc.x + doc.w}`}
          {...stylex.props(...fade(seen, '0.5s'), styles.faintLine)}
        />
        <path d={crops(doc.x, doc.y, doc.w, doc.h)} {...stylex.props(...fade(seen, '0.5s'), styles.faintLine)} />
        <text x={doc.x + 16} y={doc.y + 24} {...stylex.props(styles.note)}>
          app.html
        </text>
        <text x={doc.x + doc.w + 24} y={doc.y + 12} {...stylex.props(styles.note, ...fade(seen, '1s'))}>
          tap a part
        </text>
        {PARTS.map((p, i) => {
          const on = i === 0 ? csp : n > 0 && i === from
          return (
            // biome-ignore lint/a11y/useSemanticElements: an svg part has no button element
            <g
              key={p.part}
              role="button"
              tabIndex={0}
              aria-pressed={i === 0 ? csp : undefined}
              aria-label={i === 0 ? 'Content security policy' : `Fire ${p.call} from ${p.part}`}
              onClick={() => tap(i)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                tap(i)
              }}
              {...stylex.props(styles.part, ...fade(seen, `${0.4 + i * 0.1}s`))}
            >
              <rect
                x={doc.x + 16}
                y={doc.y + 44 + i * 44}
                width={doc.w - 32}
                height={30}
                rx={6}
                {...stylex.props(styles.glass, styles.hover, on && styles.glassOn, i === 0 && !csp && styles.cut)}
              />
              <text x={doc.x + 28} y={rowY(i) + 4} {...stylex.props(styles.row, styles.through, on && styles.rowOn)}>
                {p.part}
              </text>
              <text x={doc.x + doc.w - 28} y={rowY(i) + 4} {...stylex.props(styles.note, styles.end, styles.through)}>
                {i === 0 ? (csp ? 'on' : 'off') : '›'}
              </text>
            </g>
          )
        })}
        <text x={doc.x + doc.w / 2} y={doc.y + doc.h + 24} {...stylex.props(styles.note, styles.mid)}>
          origin: null
        </text>
        <path d={`M${doc.x + doc.w + 4} ${line}H${end}`} {...stylex.props(styles.lead, styles.dashed)} />
        <g {...stylex.props(styles.screen, !csp && styles.gone)}>
          <path
            d={`M${wall} 70V270M${wall - 6} 70H${wall + 6}M${wall - 6} 270H${wall + 6}`}
            {...stylex.props(styles.wall)}
          />
          <text x={wall} y={292} {...stylex.props(styles.tag, styles.redFill, styles.mid)}>
            csp
          </text>
        </g>
        <path
          d={rr(net.x, net.y, net.w, net.h, [12, 12, 12, 12])}
          {...stylex.props(styles.faintLine, !csp && styles.red)}
        />
        <text x={net.x + net.w / 2} y={net.y + 34} {...stylex.props(styles.note, styles.mid, !csp && styles.redFill)}>
          network
        </text>
        {n > 0 && (
          <g key={n}>
            <motion.circle
              r={3.5}
              initial={{ cx: doc.x + doc.w - 16, cy: rowY(from), opacity: 1 }}
              animate={{
                cx: [doc.x + doc.w - 16, doc.x + doc.w + 4, end],
                cy: [rowY(from), line, line],
                opacity: [1, 1, 1, 0]
              }}
              transition={{ duration: 0.8, times: [0, 0.3, 1], ease: 'easeOut' }}
              {...stylex.props(styles.takenFill)}
            />
            <motion.circle
              cx={csp ? wall : net.x + net.w / 2}
              cy={line}
              initial={{ r: 4, opacity: 0 }}
              animate={{ r: [4, 4, csp ? 22 : 44], opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.2, times: [0, 0.6, 1], ease: 'easeOut' }}
              {...stylex.props(styles.ring, styles.red)}
            />
          </g>
        )}
        <Plate x={316} y={line - 44} type={PARTS[from]!.call} value={csp ? 'blocked' : 'sent'} w={96} />
      </Sheet>
      {picks}
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Files" value="1" />
        <Stat label="Origin" value="null" />
        <Stat label="CSP" value={csp ? 'on' : 'off'} />
        <Stat label="Blocked" value={<Roll text={String(blocked)} />} />
      </dl>
    </>
  )
}

const TOKENS = ['app.bg', 'app.surface', 'app.fg', 'app.link'] as const

/** One file of values, themed by the shell: flip the appearance and every part follows, none of it hard-coded. */
function TokensOnly({ t, stop, seen, picks }: Stage) {
  const [own, setOwn] = useState<'light' | 'dark'>('dark')
  const mode = t === null ? own : t < SLOT / 2 ? 'light' : 'dark'
  const fill = { 'app.bg': app.bg, 'app.surface': app.surface, 'app.fg': app.fg, 'app.link': app.link }
  const file = { x: 40, y: 70, w: 184, h: 200 }
  const ph = { x: 346, y: 46, w: 170, h: 248 }
  // Where each token lands on the screen.
  const to = [
    [ph.x + 8, 70],
    [ph.x + 16, 140],
    [ph.x + 30, 116],
    [ph.x + 30, 226]
  ]
  return (
    <>
      <Sheet label={`Four tokens theming a screen, ${mode}`}>
        <g {...stylex.props(mode === 'dark' ? kitDark : kitLight)}>
          <path
            d={rr(file.x, file.y, file.w, file.h, [10, 10, 10, 10])}
            pathLength={1}
            {...stylex.props(...ink(seen))}
          />
          <path d={crops(file.x, file.y, file.w, file.h)} {...stylex.props(...fade(seen, '0.5s'), styles.faintLine)} />
          <text x={file.x + 16} y={file.y + 26} {...stylex.props(styles.note)}>
            tokens.stylex.ts
          </text>
          {TOKENS.map((k, i) => (
            <g key={k} {...stylex.props(...fade(seen, `${0.4 + i * 0.1}s`))}>
              <circle cx={file.x + 28} cy={file.y + 62 + i * 38} r={9} {...stylex.props(styles.paint(fill[k]))} />
              <text x={file.x + 46} y={file.y + 66 + i * 38} {...stylex.props(styles.row)}>
                {k}
              </text>
              <path
                d={`M${file.x + file.w + 4} ${file.y + 62 + i * 38}C${290} ${file.y + 62 + i * 38} ${290} ${to[i]![1]} ${to[i]![0]} ${to[i]![1]}`}
                pathLength={1}
                {...stylex.props(
                  styles.lead,
                  styles.taken,
                  styles.undrawn,
                  seen && styles.draw,
                  styles.wait(`${0.8 + i * 0.1}s`)
                )}
              />
            </g>
          ))}
          <path
            d={rr(ph.x, ph.y, ph.w, ph.h, [2, 24, 24, 2])}
            {...stylex.props(styles.paint(app.bg), styles.outline)}
          />
          <path d={crops(ph.x, ph.y, ph.w, ph.h)} {...stylex.props(...fade(seen, '0.5s'), styles.faintLine)} />
          <rect x={ph.x + 20} y={ph.y + 20} width={70} height={14} rx={7} {...stylex.props(styles.paint(app.fg))} />
          <rect
            x={ph.x + 16}
            y={ph.y + 56}
            width={ph.w - 32}
            height={84}
            rx={12}
            {...stylex.props(styles.paint(app.surface))}
          />
          <rect x={ph.x + 30} y={ph.y + 72} width={96} height={10} rx={5} {...stylex.props(styles.paint(app.fg))} />
          <rect
            x={ph.x + 30}
            y={ph.y + 94}
            width={110}
            height={7}
            rx={3.5}
            {...stylex.props(styles.paint(app.fg), styles.soft)}
          />
          <rect
            x={ph.x + 30}
            y={ph.y + 164}
            width={ph.w - 60}
            height={32}
            rx={16}
            {...stylex.props(styles.paint(app.link))}
          />
          <text x={ph.x + ph.w / 2} y={ph.y + ph.h + 24} {...stylex.props(styles.note, styles.mid)}>
            {mode}
          </text>
        </g>
      </Sheet>
      {picks}
      <div {...stylex.props(diagram.controls)}>
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              stop()
              setOwn(m)
            }}
            {...stylex.props(diagram.button, styles.pick, mode !== m && styles.off)}
          >
            {m}
          </button>
        ))}
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Appearance" value={mode} />
        <Stat label="app.link" value={mode === 'dark' ? '#0091ff' : '#0088ff'} />
        <Stat label="Tokens" value="4" />
        <Stat label="Hard-coded" value="0" />
      </dl>
    </>
  )
}

const draw = stylex.keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } })
const appear = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
const INK = color.accent

const styles = stylex.create({
  section: {
    paddingTop: { default: '64px', [SMALL]: '40px' },
    paddingBottom: { default: '64px', [SMALL]: '40px' },
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  inner: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: { default: '40px', [SMALL]: '16px' },
    paddingRight: { default: '40px', [SMALL]: '16px' }
  },
  head: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '24px'
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: { default: 0, [MID]: '8px' } },
  figure: { marginTop: '32px', marginBottom: 0 },
  sheet: { maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' },
  grid: { fill: 'none', stroke: color.accent, strokeOpacity: 0.09, strokeWidth: 1 },
  arrowHead: { fill: 'none', stroke: color.green, strokeWidth: 1.4, strokeLinejoin: 'round' },
  // Strokes start undrawn; the draw-in holds them drawn (forwards), per docs/working.md.
  body: { fill: 'none', stroke: INK, strokeWidth: 1.6, strokeDasharray: 1, strokeDashoffset: 1 },
  faint: { fill: 'none', stroke: INK, strokeOpacity: 0.45, strokeWidth: 1, strokeDasharray: 1, strokeDashoffset: 1 },
  drawn: { strokeDasharray: 'none', strokeDashoffset: 0 },
  undrawn: { strokeDasharray: 1, strokeDashoffset: 1 },
  outline: { stroke: INK, strokeWidth: 1.6 },
  faintLine: { fill: 'none', stroke: INK, strokeOpacity: 0.45, strokeWidth: 1 },
  center: { fill: 'none', stroke: INK, strokeOpacity: 0.3, strokeWidth: 0.8, strokeDasharray: '6 3 1 3' },
  draw: {
    animationName: draw,
    animationDuration: '0.9s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  hidden: { opacity: 0 },
  show: {
    animationName: appear,
    animationDuration: '0.4s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  arrive: { animationName: appear, animationDuration: '0.35s', animationTimingFunction: ease.out },
  wait: (delay: string) => ({ animationDelay: delay }),
  pane: {
    fill: 'transparent',
    stroke: INK,
    strokeOpacity: 0,
    strokeWidth: 1,
    transitionProperty: 'fill, stroke-opacity',
    transitionDuration: '0.3s'
  },
  paneOn: { fill: color.accentSoft, strokeOpacity: 0.6 },
  glass: { fill: color.surface, stroke: INK, strokeOpacity: 0.35, strokeWidth: 1 },
  glassOn: { fill: color.accentSoft, stroke: INK, strokeOpacity: 0.8, strokeWidth: 1 },
  part: {
    cursor: 'pointer',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '2px',
    outlineColor: color.accent,
    outlineOffset: '2px'
  },
  // Labels over a part must not steal its hover.
  through: { pointerEvents: 'none' },
  hover: {
    fill: { default: null, ':hover': color.accentSoft },
    strokeOpacity: { default: null, ':hover': 0.8 },
    transitionProperty: 'fill, stroke-opacity',
    transitionDuration: '0.2s'
  },
  cut: { strokeDasharray: '4 3', fill: color.surface },
  gone: { opacity: 0.15 },
  end: { textAnchor: 'end' },
  screen: { transitionProperty: 'opacity', transitionDuration: '0.4s', transitionTimingFunction: ease.out },
  asleep: { opacity: 0.4 },
  note: { fontFamily: font.mono, fontSize: '10px', fill: INK, fillOpacity: 0.6 },
  row: { fontFamily: font.mono, fontSize: '11px', fill: color.text2 },
  rowOn: { fill: INK },
  mid: { textAnchor: 'middle' },
  screenType: { fontFamily: font.mono, fontSize: '11px', fill: color.text3 },
  screenValue: { fontFamily: font.mono, fontSize: '14px', fill: color.text },
  // A card under the readout so construction lines never run through the value.
  plate: { fill: color.surface, fillOpacity: 0.88, stroke: INK, strokeOpacity: 0.25, strokeWidth: 1 },
  lead: { fill: 'none', pointerEvents: 'none', strokeWidth: 1.3 },
  dashed: { stroke: INK, strokeOpacity: 0.5, strokeDasharray: '3 3' },
  taken: { stroke: color.accent },
  heard: { stroke: color.orange, strokeDasharray: '4 3' },
  state: { stroke: color.green },
  red: { stroke: color.red },
  takenFill: { fill: color.accent },
  heardFill: { fill: color.orange },
  stateFill: { fill: color.green },
  redFill: { fill: color.red },
  wall: { fill: 'none', stroke: color.red, strokeWidth: 1.6 },
  ring: { fill: 'none', strokeWidth: 1.5 },
  tag: { fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' },
  paint: (fill: string) => ({
    fill,
    transitionProperty: 'fill',
    transitionDuration: '0.5s',
    transitionTimingFunction: ease.out
  }),
  soft: { opacity: 0.5 },
  wide: { width: '64px' },
  picks: { flexWrap: 'wrap', gap: '8px', justifyContent: 'center' },
  pick: { minWidth: 0, fontFamily: font.mono, fontSize: '13px' },
  off: { backgroundColor: { default: color.well, ':hover': color.border }, color: color.text }
})
