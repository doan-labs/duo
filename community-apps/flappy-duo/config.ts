// Types, tuning numbers and every line of copy. Change the jokes here.

export type Status = 'ready' | 'playing' | 'over'
export type Cameo = 'tim' | 'steve' | 'john'
export type Hazard = 'drift' | 'blur' | 'notify' | 'fast'
export type Slab = { x: number; gapY: number; label: string; passed: boolean; cameo?: Cameo; n: number }
export type Shard = { x: number; y: number; vx: number; vy: number; r: number; life: number }
export type Cloud = { x: number; y: number; s: number; layer: number }
export type Banner = { title: string; text: string; y: number; life: number }
export type World = {
  status: Status
  y: number
  vy: number
  fold: number
  slabs: Slab[]
  shards: Shard[]
  clouds: Cloud[]
  banners: Banner[]
  score: number
  folds: number
  scroll: number
  slow: number
  cause: 'slab' | 'floor' | null
}

// Vertical values are in units of canvas height, horizontal in canvas width,
// so the same game fits the cover and the inner display.
export const GRAVITY = 2.6
export const FLAP = -0.78
export const SPEED = 0.42
export const SLAB_SPACING = 0.5
export const SLAB_WIDTH = 0.11
export const GAP = 0.3
export const PHONE = 0.2 // wingspan as a fraction of height
export const DUO_X = 0.3
export const FLOOR = 0.88
export const HINGE_RATING = 200000
export const PRICE = 2399
export const BANNER_LIFE = 4.5

export const START_LINES = [
  'Tap to fold. Every fold comes off the warranty.',
  'Hinge rated for 200,000 folds. Let us test that.',
  `You paid $${PRICE.toLocaleString()} for this. Make it count.`,
  'The crease is permanent. So is your record.',
  'Flappy Bird, but the bird cost more than your rent.'
]

export const SLAB_LABELS = [
  'CREASE',
  `$${PRICE.toLocaleString()}`,
  'GENIUS BAR',
  'APPLECARE+',
  'iOS 27 BETA',
  'HINGE',
  'NO CHARGER',
  'PRE-ORDER',
  'DONGLE',
  'BATTERY 79%'
]

export const MILESTONES: Record<number, string> = {
  1: 'One. The Genius Bar is proud of you.',
  5: 'Five. AppleCare does not cover skill.',
  7: 'Seven. The hinge is squeaking. Ignore it.',
  10: 'Ten. Still cheaper than a screen repair.',
  15: 'Fifteen. Please stop folding it.',
  20: 'Twenty. The engineers are nervous.',
  30: 'Thirty. HR has been notified.',
  50: 'Fifty. Nobody is coming to save you.'
}

// The game gets worse the better you do. Each one is announced like a software update.
export const HAZARDS: [number, Hazard, string][] = [
  [3, 'drift', 'Update installed. The slabs move now. You are welcome.'],
  [6, 'blur', 'iOS 27 beta: sharp rendering is a Pro feature.'],
  [9, 'notify', 'Notifications on. Focus mode is a paid add-on.'],
  [13, 'fast', 'Thermal throttling detected. Compensating by going faster.']
]
export const NOTICES: [string, string][] = [
  ['Storage Almost Full', 'You can manage storage in Settings. You will not.'],
  ['Screen Time', 'Your folding was up 400% last week.'],
  ['AppleCare+', 'Your coverage ends today. Your problems do not.'],
  ['Software Update', 'iOS 27.0.1 fixes an issue where the phone worked.'],
  ['Battery', 'Maximum capacity 79%. Peak performance: no.'],
  ['Find My', 'Your Duo was last seen falling.'],
  ['Duo Store', 'Trade in your Duo for $40. Ha.']
]

export const ROASTS: [number, string[]][] = [
  [
    1,
    [
      'Zero. You dropped a $2,399 phone into the clouds.',
      'Died before the first slab. Refund denied.',
      'The tutorial was one tap. You failed the tutorial.'
    ]
  ],
  [4, ['The slabs were standing still. You were not.', 'Hinge failure. Cause: you.', 'It was a beta. So were you.']],
  [
    9,
    [
      'Almost mediocre. The bar is on the floor and you clipped it.',
      'The crease saw that coming.',
      'Face ID did not recognise that attempt.'
    ]
  ],
  [16, ['Fine. Some skill. Still dead.', 'Impressive. The hinge disagrees.', 'You have a talent. It is falling.']],
  [
    Number.POSITIVE_INFINITY,
    [
      'Screenshot it. The support forum will not believe you.',
      'You have folded more than most owners ever will.',
      'Go outside. The phone would have wanted that.'
    ]
  ]
]

export const FLOOR_ROASTS = [
  'You hit the floor. The floor is fine.',
  'Gravity: 1. You: still 0.',
  'Face down on a glass deck. Iconic.'
]

export const MEDALS: [number, string][] = [
  [1, 'Participation'],
  [5, 'Refurbished'],
  [10, 'Out of warranty'],
  [20, 'Genius, allegedly'],
  [40, 'Suspiciously good'],
  [Number.POSITIVE_INFINITY, 'Please seek help']
]

export const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]!
export const roastFor = (score: number) => pick(ROASTS.find(([max]) => score < max)![1])
export const medalFor = (score: number) => MEDALS.find(([max]) => score < max)![1]
export const gapFor = (score: number) => Math.max(0.24, GAP - score * 0.003)
export const has = (score: number, h: Hazard) => HAZARDS.some(([min, name]) => name === h && score >= min)
export const speedFor = (score: number) => SPEED * (has(score, 'fast') ? 1.3 : 1)
export const gapCenter = (s: Slab, score: number, scroll: number) =>
  has(score, 'drift') ? s.gapY + Math.sin(scroll * 5 + s.n * 1.9) * 0.07 : s.gapY

// Every fifth slab has an executive peeking out of it. Cartoon likenesses, for fun only.
export const CAMEO_ORDER: Cameo[] = ['tim', 'john', 'steve']
export const CAMEO_LINES: Record<Cameo, string[]> = {
  tim: [
    'Tim: "Wonderful. Just wonderful."',
    'Tim: "This is our best Duo yet. You are not our best user."',
    'Tim: "Good morning! Your hinge says otherwise."'
  ],
  john: [
    'John: "It is the thinnest crash we have ever made."',
    'John: "We engineered every fold. Not that one."',
    'John: "Titanium. Still not idiot-proof."'
  ],
  steve: [
    'Steve: "You are folding it wrong."',
    'Steve: "One more thing. You are bad at this."',
    'Steve: "It just works. You do not."'
  ]
}
