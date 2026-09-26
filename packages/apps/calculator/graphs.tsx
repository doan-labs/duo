// The graph sheet. `y = f(x)` equations share one 2D plot (SVG curves over a
// grid, drag to pan, wheel to zoom); `z = f(x,y)` equations render as 3D
// surfaces on a canvas with software shading and drag-to-orbit. Variables not
// on an axis and not defined in the notes get sliders, so changing `a` in
// `y = a*x` (or writing it in the notes) reshapes the graph live.

import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useMemo, useRef, useState } from 'react'
import { deps, evalNode, fmt, type Node, parse, type Scope } from './engine.ts'
import type { GraphEq } from './store.ts'
import { styles } from './styles.ts'
import { mixColor, resolveColor } from './theme.ts'

const PALETTE = [
  colors.orange,
  colors.cyanDark,
  colors.greenDark,
  colors.pinkDark,
  colors.purpleDark,
  colors.yellowDark
]

type Plotted = { eq: GraphEq; node: Node; vars: string[] }
const plotted = (eq: GraphEq, axis: string[]): Plotted | null => {
  try {
    const node = parse(eq.expr)
    return { eq, node, vars: [...deps(node)].filter((d) => !axis.includes(d)) }
  } catch {
    return null
  }
}

/** Variables that drive sliders: not an axis variable, not defined by the notes. */
const slidersOf = (items: Plotted[], scope: Scope) => {
  const names = new Set<string>()
  for (const p of items) for (const v of p.vars) if (!(v in scope)) names.add(v)
  return [...names].sort()
}

const useSize = () => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 320, h: 240 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  return { ref, size }
}

// 1-2-5 grid steps at least ~56 CSS px apart.
const niceStep = (pxPerUnit: number) => {
  const want = 56 / pxPerUnit
  const p = 10 ** Math.floor(Math.log10(want))
  for (const m of [1, 2, 5, 10]) if (p * m >= want) return p * m
  return p * 10
}

const Plot2D = ({ items, scope, sliders, rad }: { items: Plotted[]; scope: Scope; sliders: Scope; rad: boolean }) => {
  const { ref, size } = useSize()
  const [view, setView] = useState({ cx: 0, cy: 0, k: 36 })
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const { w, h } = size
  const px = (x: number) => (x - view.cx) * view.k + w / 2
  const py = (y: number) => h / 2 - (y - view.cy) * view.k
  const step = niceStep(view.k)
  const xLines = []
  for (let x = Math.floor((view.cx - w / 2 / view.k) / step) * step; px(x) <= w; x += step) xLines.push(x)
  const yLines = []
  for (let y = Math.ceil((view.cy - h / 2 / view.k) / step) * step; py(y) >= 0; y += step) yLines.push(y)

  const paths = items.map((p, i) => {
    const full: Scope = { ...scope, ...sliders }
    let d = ''
    let pen = false
    for (let sx = 0; sx <= w; sx += 2) {
      const x = (sx - w / 2) / view.k + view.cx
      let y: number
      try {
        y = evalNode(p.node, { ...full, x }, rad)
      } catch {
        y = NaN
      }
      const ok = Number.isFinite(y) && Math.abs(py(y)) < h * 8
      if (ok) d += `${pen ? 'L' : 'M'}${sx},${py(y).toFixed(1)}`
      pen = ok
    }
    return { d, color: PALETTE[i % PALETTE.length]!, key: p.eq.id }
  })

  return (
    <div
      ref={ref}
      {...stylex.props(styles.plotBox)}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        setView((v) => ({
          ...v,
          cx: drag.current!.cx - (e.clientX - drag.current!.x) / v.k,
          cy: drag.current!.cy + (e.clientY - drag.current!.y) / v.k
        }))
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onWheel={(e) => {
        const mx = (e.clientX - e.currentTarget.getBoundingClientRect().left - w / 2) / view.k + view.cx
        const my = view.cy - (e.clientY - e.currentTarget.getBoundingClientRect().top - h / 2) / view.k
        const k2 = Math.min(4000, Math.max(4, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        setView({ k: k2, cx: mx - (mx - view.cx) * (view.k / k2), cy: my - (my - view.cy) * (view.k / k2) })
      }}
    >
      <svg {...stylex.props(styles.plotSvg)} role="img" aria-label="Graph">
        {xLines.map((x) => (
          <g key={`x${x}`}>
            <line x1={px(x)} y1={0} x2={px(x)} y2={h} {...stylex.props(styles.grid)} />
            {x !== 0 && (
              <text x={px(x) + 3} y={py(0) - 4} {...stylex.props(styles.gridText)}>
                {fmt(x, 3)}
              </text>
            )}
          </g>
        ))}
        {yLines.map((y) => (
          <g key={`y${y}`}>
            <line x1={0} y1={py(y)} x2={w} y2={py(y)} {...stylex.props(styles.grid)} />
            {y !== 0 && (
              <text x={px(0) + 4} y={py(y) - 3} {...stylex.props(styles.gridText)}>
                {fmt(y, 3)}
              </text>
            )}
          </g>
        ))}
        <line x1={px(0)} y1={0} x2={px(0)} y2={h} {...stylex.props(styles.axis)} />
        <line x1={0} y1={py(0)} x2={w} y2={py(0)} {...stylex.props(styles.axis)} />
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  )
}

const GRID = 26
const RANGE = 4

const Plot3D = ({ items, scope, sliders, rad }: { items: Plotted[]; scope: Scope; sliders: Scope; rad: boolean }) => {
  const { ref, size } = useSize()
  const cv = useRef<HTMLCanvasElement | null>(null)
  const [cam, setCam] = useState({ a: 0.7, e: 0.9 })
  const drag = useRef<{ x: number; y: number; a: number; e: number } | null>(null)

  useEffect(() => {
    const c = cv.current
    const w = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || !w || size.w === 0) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr
    c.height = size.h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const dim = resolveColor(w, colors.grey) || 'currentColor'
    const black = resolveColor(w, colors.black) || 'black'
    ctx.clearRect(0, 0, size.w, size.h)

    const S = Math.min(size.w, size.h) / (RANGE * 2.4)
    const ca = Math.cos(cam.a),
      sa = Math.sin(cam.a),
      ce = Math.cos(cam.e),
      se = Math.sin(cam.e)
    const proj = (x: number, y: number, z: number) => {
      const x1 = x * ca - y * sa
      const y1 = x * sa + y * ca
      const y2 = y1 * ce - z * se
      const z2 = y1 * se + z * ce
      return { x: size.w / 2 + x1 * S, y: size.h / 2 - y2 * S, d: z2 }
    }
    // Axes through the origin.
    ctx.strokeStyle = dim
    ctx.lineWidth = 1
    for (const [a, b] of [
      [
        [-RANGE, 0, 0],
        [RANGE, 0, 0]
      ],
      [
        [0, -RANGE, 0],
        [0, RANGE, 0]
      ],
      [
        [0, 0, -RANGE / 2],
        [0, 0, RANGE]
      ]
    ] as const) {
      const p = proj(a[0], a[1], a[2])
      const q = proj(b[0], b[1], b[2])
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
      ctx.stroke()
    }
    ctx.font = '11px system-ui'
    ctx.fillStyle = dim
    const label = (t: string, x: number, y: number, z: number) => {
      const p = proj(x, y, z)
      ctx.fillText(t, p.x + 4, p.y - 4)
    }
    label('x', RANGE, 0, 0)
    label('y', 0, RANGE, 0)
    label('z', 0, 0, RANGE)

    items.forEach((p, pi) => {
      const base = resolveColor(w, PALETTE[pi % PALETTE.length]!) || 'white'
      const full: Scope = { ...scope, ...sliders }
      const at = (x: number, y: number) => {
        try {
          return evalNode(p.node, { ...full, x, y }, rad)
        } catch {
          return NaN
        }
      }
      type Quad = { pts: { x: number; y: number }[]; d: number; z: number }
      const quads: Quad[] = []
      let zMin = Infinity,
        zMax = -Infinity
      const zs: number[][] = []
      for (let i = 0; i <= GRID; i++) {
        zs.push([])
        for (let j = 0; j <= GRID; j++) {
          const x = -RANGE + (i / GRID) * RANGE * 2
          const y = -RANGE + (j / GRID) * RANGE * 2
          const z = at(x, y)
          zs[i]!.push(z)
          if (Number.isFinite(z)) {
            zMin = Math.min(zMin, z)
            zMax = Math.max(zMax, z)
          }
        }
      }
      const zSpan = Math.max(zMax - zMin, 1e-9)
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const corners: [number, number][] = [
            [i, j],
            [i + 1, j],
            [i + 1, j + 1],
            [i, j + 1]
          ]
          const zv = corners.map(([a, b]) => zs[a]![b]!)
          if (zv.some((z) => !Number.isFinite(z))) continue
          const pts3 = corners.map(([a, b]) => {
            const x = -RANGE + (a / GRID) * RANGE * 2
            const y = -RANGE + (b / GRID) * RANGE * 2
            return proj(x, y, zs[a]![b]!)
          })
          quads.push({
            pts: pts3.map(({ x, y }) => ({ x, y })),
            d: pts3.reduce((s, q) => s + q.d, 0) / 4,
            z: zv.reduce((s, z) => s + z, 0) / 4
          })
        }
      }
      // Painter: farthest first.
      quads.sort((q1, q2) => q2.d - q1.d)
      for (const q of quads) {
        const t = (q.z - zMin) / zSpan
        ctx.fillStyle = mixColor(base, black, 0.45 - t * 0.3)
        ctx.strokeStyle = ctx.fillStyle
        ctx.beginPath()
        ctx.moveTo(q.pts[0]!.x, q.pts[0]!.y)
        for (const p2 of q.pts.slice(1)) ctx.lineTo(p2.x, p2.y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    })
  })

  return (
    <div
      ref={ref}
      {...stylex.props(styles.plotBox)}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, a: cam.a, e: cam.e }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        setCam({
          a: drag.current.a + (e.clientX - drag.current.x) / 120,
          e: Math.min(1.45, Math.max(-0.2, drag.current.e + (e.clientY - drag.current.y) / 160))
        })
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <canvas ref={cv} {...stylex.props(styles.plotCanvas)} />
    </div>
  )
}

export const Graphs = ({
  open,
  eqs,
  scope,
  rad,
  onRemove,
  onClose
}: {
  open: boolean
  eqs: GraphEq[]
  scope: Scope
  rad: boolean
  onRemove: (id: string) => void
  onClose: () => void
}) => {
  const [sliders, setSliders] = useState<Scope>({})
  const items = useMemo(
    () => eqs.map((g) => plotted(g, g.lhs === 'z' ? ['x', 'y'] : ['x'])).filter(Boolean) as Plotted[],
    [eqs]
  )
  const ys = items.filter((p) => p.eq.lhs === 'y')
  const zs = items.filter((p) => p.eq.lhs === 'z')
  const sliderNames = useMemo(() => slidersOf(items, scope), [items, scope])
  const sliderScope = useMemo(() => {
    const s: Scope = {}
    for (const n of sliderNames) s[n] = sliders[n] ?? 1
    return s
  }, [sliderNames, sliders])
  if (!open) return null
  return (
    <div {...stylex.props(styles.sheet)}>
      <div {...stylex.props(styles.sheetBar)}>
        <span {...stylex.props(styles.sheetTitle)}>Graphs</span>
        <button type="button" {...stylex.props(styles.mini)} aria-label="Close" onClick={onClose}>
          <Sym name="xmark" size={15} />
        </button>
      </div>
      {items.length === 0 && (
        <div {...stylex.props(styles.empty)}>No equations yet - write `y = x²` or `z = x·y` in Math Notes.</div>
      )}
      {ys.length > 0 && (
        <div {...stylex.props(styles.graphPlot)}>
          <Plot2D items={ys} scope={scope} sliders={sliderScope} rad={rad} />
        </div>
      )}
      {zs.length > 0 && (
        <div {...stylex.props(styles.graphPlot)}>
          <Plot3D items={zs} scope={scope} sliders={sliderScope} rad={rad} />
        </div>
      )}
      <div {...stylex.props(styles.graphList)}>
        {items.map((p, i) => (
          <div key={p.eq.id}>
            <div {...stylex.props(styles.gEq)}>
              <Dot i={i} />
              <span {...stylex.props(styles.gExpr)}>
                {p.eq.lhs} = {p.eq.expr}
              </span>
              <button
                type="button"
                {...stylex.props(styles.mini)}
                aria-label="Remove graph"
                onClick={() => onRemove(p.eq.id)}
              >
                <Sym name="xmark" size={12} />
              </button>
            </div>
            {p.vars.map((v) =>
              v in scope ? (
                <div key={v} {...stylex.props(styles.gSlider)}>
                  <span {...stylex.props(styles.gVar)}>{v}</span>
                  <span>from notes: {fmt(scope[v]!)}</span>
                </div>
              ) : (
                <div key={v} {...stylex.props(styles.gSlider)}>
                  <span {...stylex.props(styles.gVar)}>{v}</span>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.1}
                    value={sliders[v] ?? 1}
                    {...stylex.props(styles.slider)}
                    onChange={(e) => setSliders((s) => ({ ...s, [v]: Number(e.target.value) }))}
                  />
                  <span {...stylex.props(styles.gVal)}>{fmt(sliders[v] ?? 1)}</span>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const Dot = ({ i }: { i: number }) => {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.backgroundColor = resolveColor(ref.current, PALETTE[i % PALETTE.length]!) || ''
  }, [i])
  return <span ref={ref} {...stylex.props(styles.gDot)} />
}
