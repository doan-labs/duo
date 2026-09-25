// Handwritten math recognition for Math Notes' ink canvas, dependency-free: a
// $P-style point-cloud recognizer. Strokes are resampled to a fixed count,
// normalized to a unit box by aspect-preserving scale, then greedily matched
// against a small template alphabet (digits, operators, a few letters).
//
// Above that it does the vertical-arithmetic trick from iPadOS: a long
// horizontal stroke under a stack of digit clusters reads as a sum.

export type Pt = { x: number; y: number }
export type Stroke = Pt[]

type Cloud = { pts: { x: number; y: number; s: number }[]; strokes: number }
type Template = { g: string; cloud: Cloud }

const N = 48 // points per candidate cloud

const path = (pts: number[][]): Stroke => pts.map(([x, y]) => ({ x: x ?? 0, y: y ?? 0 }))
const dots = (x: number, y: number): Stroke => [
  { x: x - 1, y },
  { x: x + 1, y: y + 1 }
]

/** Hand-drawn templates on a 100x100 box; extra elements after the glyph are variants. */
const RAW: [string, ...number[][][][]][] = [
  [
    '0',
    [
      [
        [45, 8],
        [70, 12],
        [88, 38],
        [86, 66],
        [70, 88],
        [45, 92],
        [20, 88],
        [8, 62],
        [10, 36],
        [22, 14],
        [45, 8]
      ]
    ]
  ],
  [
    '1',
    [
      [
        [48, 18],
        [50, 15],
        [50, 92]
      ]
    ],
    [
      [
        [55, 15],
        [48, 18],
        [50, 92]
      ]
    ]
  ],
  [
    '2',
    [
      [
        [16, 26],
        [40, 10],
        [66, 14],
        [76, 34],
        [58, 58],
        [18, 90],
        [82, 90]
      ]
    ]
  ],
  [
    '3',
    [
      [
        [22, 20],
        [60, 14],
        [72, 30],
        [52, 46],
        [72, 62],
        [60, 86],
        [24, 92]
      ]
    ]
  ],
  [
    '4',
    [
      [
        [62, 10],
        [14, 66],
        [86, 66]
      ],
      [
        [62, 10],
        [62, 94]
      ]
    ],
    [
      [
        [62, 10],
        [14, 66],
        [86, 66]
      ]
    ]
  ],
  [
    '5',
    [
      [
        [72, 12],
        [28, 10],
        [24, 44],
        [56, 38],
        [78, 54],
        [72, 80],
        [30, 92]
      ]
    ]
  ],
  [
    '6',
    [
      [
        [66, 12],
        [34, 28],
        [14, 58],
        [24, 84],
        [54, 92],
        [76, 78],
        [58, 54],
        [24, 60]
      ]
    ]
  ],
  [
    '7',
    [
      [
        [10, 16],
        [86, 16],
        [44, 94]
      ]
    ]
  ],
  [
    '8',
    [
      [
        [50, 48],
        [26, 30],
        [42, 10],
        [70, 14],
        [76, 34],
        [50, 48],
        [22, 68],
        [36, 94],
        [66, 90],
        [80, 66],
        [50, 48]
      ]
    ]
  ],
  [
    '9',
    [
      [
        [64, 10],
        [36, 14],
        [20, 38],
        [36, 58],
        [64, 54],
        [76, 30],
        [70, 62],
        [50, 94]
      ]
    ]
  ],
  [
    '+',
    [
      [
        [50, 12],
        [50, 88]
      ],
      [
        [12, 50],
        [88, 50]
      ]
    ]
  ],
  [
    '-',
    [
      [
        [12, 50],
        [88, 50]
      ]
    ]
  ],
  [
    '×',
    [
      [
        [16, 16],
        [84, 84]
      ],
      [
        [84, 16],
        [16, 84]
      ]
    ]
  ],
  [
    '÷',
    [
      [
        [10, 50],
        [90, 50]
      ],
      [
        [50, 22],
        [51, 23]
      ],
      [
        [50, 78],
        [51, 79]
      ]
    ]
  ],
  [
    '=',
    [
      [
        [10, 34],
        [90, 34]
      ],
      [
        [10, 66],
        [90, 66]
      ]
    ]
  ],
  ['.', [dots(50, 88).map((p) => [p.x, p.y])]],
  [
    '(',
    [
      [
        [68, 10],
        [38, 30],
        [30, 56],
        [46, 84],
        [68, 94]
      ]
    ]
  ],
  [
    ')',
    [
      [
        [32, 10],
        [62, 30],
        [70, 56],
        [54, 84],
        [32, 94]
      ]
    ]
  ],
  [
    '%',
    [
      [
        [16, 86],
        [84, 14]
      ],
      [
        [18, 18],
        [30, 20],
        [28, 32],
        [18, 32],
        [18, 20]
      ],
      [
        [70, 70],
        [82, 72],
        [80, 84],
        [70, 84],
        [70, 72]
      ]
    ]
  ],
  [
    '!',
    [
      [
        [50, 8],
        [50, 62]
      ],
      [
        [50, 88],
        [51, 89]
      ]
    ]
  ],
  [
    '^',
    [
      [
        [26, 62],
        [50, 14],
        [74, 62]
      ]
    ]
  ],
  [
    '√',
    [
      [
        [10, 56],
        [30, 62],
        [46, 92],
        [86, 8]
      ]
    ]
  ],
  [
    'π',
    [
      [
        [14, 20],
        [86, 20]
      ],
      [
        [30, 20],
        [24, 86]
      ],
      [
        [70, 20],
        [76, 86]
      ]
    ]
  ],
  [
    'x',
    [
      [
        [18, 20],
        [82, 88]
      ],
      [
        [84, 20],
        [16, 88]
      ]
    ]
  ],
  [
    'y',
    [
      [
        [16, 14],
        [50, 52]
      ],
      [
        [86, 14],
        [38, 96]
      ]
    ]
  ],
  [
    'z',
    [
      [
        [16, 20],
        [84, 20],
        [16, 86],
        [84, 86]
      ]
    ]
  ],
  [
    'e',
    [
      [
        [72, 44],
        [32, 40],
        [20, 60],
        [34, 86],
        [70, 82]
      ]
    ]
  ]
]

const resample = (stroke: Stroke, n: number): Stroke => {
  if (stroke.length === 1) return Array.from({ length: n }, () => ({ ...stroke[0]! }))
  const lens: number[] = [0]
  for (let i = 1; i < stroke.length; i++) {
    lens.push(lens[i - 1]! + Math.hypot(stroke[i]!.x - stroke[i - 1]!.x, stroke[i]!.y - stroke[i - 1]!.y))
  }
  const total = lens[lens.length - 1]!
  const step = total / (n - 1)
  const out: Stroke = [stroke[0]!]
  let d = 0
  let i = 1
  const pts = stroke.map((p) => ({ ...p }))
  while (i < pts.length) {
    const seg = lens[i]! - lens[i - 1]!
    if (seg > 0 && d + seg >= step) {
      const t = (step - d) / seg
      const q = {
        x: pts[i - 1]!.x + t * (pts[i]!.x - pts[i - 1]!.x),
        y: pts[i - 1]!.y + t * (pts[i]!.y - pts[i - 1]!.y)
      }
      out.push(q)
      pts.splice(i, 0, q)
      lens.splice(i, 0, lens[i - 1]! + seg * t)
      // Advance past the inserted point; the remainder of the segment is what
      // is left to sample.
      i++
      d = 0
    } else {
      d += seg
      i++
    }
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1]! })
  return out.slice(0, n)
}

const strokeLen = (s: Stroke) => {
  let t = 0
  for (let i = 1; i < s.length; i++) t += Math.hypot(s[i]!.x - s[i - 1]!.x, s[i]!.y - s[i - 1]!.y)
  return t
}

/** Strokes -> normalized cloud: each stroke resampled by its length share of N
 *  (no connector points between strokes), unit-box scaled, centroided. */
const toCloud = (strokes: Stroke[]): Cloud => {
  const total = strokes.reduce((s, st) => s + strokeLen(st), 0) || 1
  // Shares sum to exactly N so every cloud has the same point count; leftover
  // points go to the longest strokes.
  const shares = strokes.map((st) => Math.max(1, Math.floor((N * strokeLen(st)) / total)))
  let extra = N - shares.reduce((a, b) => a + b, 0)
  const order = strokes.map((_, i) => i).sort((a, b) => strokeLen(strokes[b]!) - strokeLen(strokes[a]!))
  for (let k = 0; extra > 0 && order.length; k++) {
    shares[order[k % order.length]!]! += 1
    extra--
  }
  const raw: { x: number; y: number; s: number }[] = []
  strokes.forEach((st, si) => {
    for (const p of resample(st, shares[si]!)) raw.push({ x: p.x, y: p.y, s: si })
  })
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const p of raw) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const scale = Math.max(maxX - minX, maxY - minY, 1e-6)
  let cx = 0,
    cy = 0
  const mid = raw.map((p) => ({ x: (p.x - minX) / scale, y: (p.y - minY) / scale, s: p.s }))
  for (const p of mid) {
    cx += p.x
    cy += p.y
  }
  cx /= mid.length
  cy /= mid.length
  return { pts: mid.map((p) => ({ x: p.x - cx, y: p.y - cy, s: p.s })), strokes: strokes.length }
}

/** Greedy point-cloud distance: each point of A pairs with the closest unclaimed of B. */
const cloudDist = (a: Cloud, b: Cloud): number => {
  const used = new Array<boolean>(b.pts.length).fill(false)
  let sum = 0
  for (const p of a.pts) {
    let best = Infinity
    let bi = -1
    for (let i = 0; i < b.pts.length; i++) {
      if (used[i]) continue
      const q = b.pts[i]!
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.s === q.s ? 0 : 0.15)
      if (d < best) {
        best = d
        bi = i
      }
    }
    if (bi >= 0) used[bi] = true
    else {
      // More points in A than B (over-N stroke counts): pair with the nearest
      // point, reuse allowed, so distance stays finite.
      for (const q of b.pts) {
        const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.s === q.s ? 0 : 0.15)
        if (d < best) best = d
      }
    }
    sum += best
  }
  return sum / a.pts.length
}

const TEMPLATES: Template[] = RAW.flatMap(([g, ...variants]) =>
  variants.map((v) => ({ g, cloud: toCloud(v.map(path)) }))
)

/** Groups strokes into glyphs by x-overlap: a multi-stroke glyph (+, =, ÷, !, π, x)
 *  has its strokes cross each other horizontally, while neighbours never do. */
const cluster = (strokes: Stroke[]): Stroke[][] => {
  const groups: { strokes: Stroke[]; x0: number; x1: number }[] = []
  for (const s of strokes) {
    const xs = s.map((p) => p.x)
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const g = groups.find((g) => x0 <= g.x1 && x1 >= g.x0)
    if (g) {
      g.strokes.push(s)
      g.x0 = Math.min(g.x0, x0)
      g.x1 = Math.max(g.x1, x1)
    } else {
      groups.push({ strokes: [s], x0, x1 })
    }
  }
  return groups.map((g) => g.strokes)
}

export const scoreGlyph = (strokes: Stroke[]): [string, number][] => {
  const c = toCloud(strokes)
  return TEMPLATES.map((t): [string, number] => [t.g, cloudDist(c, t.cloud)]).sort((a, b) => a[1] - b[1])
}

const recognizeOne = (strokes: Stroke[]): string => {
  const c = toCloud(strokes)
  let best = Infinity
  let g = ''
  for (const t of TEMPLATES) {
    const d = cloudDist(c, t.cloud)
    if (d < best) {
      best = d
      g = t.g
    }
  }
  return g
}

/**
 * Strokes -> a line of math text. A long horizontal stroke under digit rows
 * reads as vertical arithmetic (a sum of the stacked numbers). Otherwise the
 * glyphs assemble left to right.
 */
export function recognize(strokes: Stroke[]): string | null {
  if (strokes.length === 0) return null
  const all = strokes.flat()
  const w = Math.max(...all.map((p) => p.x)) - Math.min(...all.map((p) => p.x))
  const h = Math.max(...all.map((p) => p.y)) - Math.min(...all.map((p) => p.y))
  if (w < 8 && h < 8) return null

  // Vertical arithmetic: one wide flat stroke with content stacked above it.
  const rules = strokes.filter((s) => {
    const xs = s.map((p) => p.x)
    const ys = s.map((p) => p.y)
    return Math.max(...xs) - Math.min(...xs) > w * 0.55 && Math.max(...ys) - Math.min(...ys) < h * 0.12
  })
  const rest = strokes.filter((s) => !rules.includes(s))
  if (rules.length > 0 && rest.length > 0) {
    const ruleY = Math.min(...rules[rules.length - 1]!.map((p) => p.y))
    const above = rest.filter((s) => Math.max(...s.map((p) => p.y)) < ruleY)
    const below = rest.filter((s) => Math.max(...s.map((p) => p.y)) >= ruleY)
    // Rows are strokes sharing a y-band; a row's glyphs join left to right.
    const sorted = above.slice().sort((a, b) => cy([a]) - cy([b]))
    const rows: Stroke[][] = []
    for (const s of sorted) {
      const last = rows.at(-1)
      if (last && Math.abs(cy([s]) - cy(last)) < h * 0.18) last.push(s)
      else rows.push([s])
    }
    const cells = rows.map((row) =>
      cluster(row)
        .sort((a, b) => midX(a) - midX(b))
        .map(recognizeOne)
        .join('')
    )
    const isOp = (t: string) => /^[+−×÷-]$/.test(t)
    const ops = cells.filter(isOp)
    const nums = cells.filter((t) => /^[0-9.]+$/.test(t))
    if (rows.length >= 2 && nums.length >= 2) {
      const belowTxt = below.length ? cluster(below).map(recognizeOne).join('') : ''
      return `${nums.join(` ${ops[0] ?? '+'} `)} =${belowTxt ? ` ${belowTxt}` : ''}`
    }
  }

  // Normal horizontal line: cluster glyphs (on every stroke, including any
  // stroke that looked like a rule — for +, ÷, = the bar IS part of a glyph),
  // order left to right.
  const cells = cluster(strokes)
    .map((strokes) => ({ strokes, x: midX(strokes) }))
    .sort((a, b) => a.x - b.x)
    .map((g) => recognizeOne(g.strokes))
  // A cross between two numeric cells is a multiply sign; anywhere else it is
  // the variable x (the x and × glyphs look the same by hand).
  const isNum = (t?: string) => !!t && /^[0-9.]+$/.test(t)
  return (
    cells
      .map((t, i) =>
        (t === 'x' || t === '×') && isNum(cells[i - 1]) && isNum(cells[i + 1]) ? '×' : t === '×' ? 'x' : t
      )
      .join('') || null
  )
}
const midX = (s: Stroke[]) => {
  const xs = s.flat().map((p) => p.x)
  return (Math.min(...xs) + Math.max(...xs)) / 2
}
const cy = (s: Stroke[]) => {
  const ys = s.flat().map((p) => p.y)
  return (Math.min(...ys) + Math.max(...ys)) / 2
}
