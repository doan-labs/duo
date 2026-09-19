// Types, tuning numbers and every line of copy. Change the jokes here.

export type Status = 'ready' | 'playing' | 'over'
export type Hazard = 'drift' | 'blur' | 'notify' | 'slam' | 'fast' | 'throw'
/** slam: 0..1 progress of a slab snapping shut toward dir once the phone gets close. */
export type Slab = { x: number; gapY: number; label: string; passed: boolean; n: number; slam: number; dir: 1 | -1 }
/** An accessory thrown from the right edge. */
export type Missile = { x: number; y: number; vx: number; vy: number; rot: number; label: string }
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
  missiles: Missile[]
  /** Game number this session; each one unlocks more. */
  run: number
  score: number
  folds: number
  scroll: number
  slow: number
  cause: 'slab' | 'floor' | 'missile' | null
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
/** The replacement costs more every game: 2,399, 2,999, 3,699, 4,699, 5,899… always ending in 99. */
export const priceFor = (run: number) => Math.round((PRICE * 1.25 ** (run - 1)) / 100) * 100 - 1

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

// The game gets worse with every game and every point. [game, score, hazard, announcement].
export const HAZARDS: [number, number, Hazard, string][] = [
  [1, 2, 'drift', 'Update installed. The slabs move now.'],
  [2, 1, 'blur', 'iOS 27 beta installed overnight. Sharp rendering is a Pro feature.'],
  [2, 3, 'notify', 'Notifications restored from backup.'],
  [3, 1, 'slam', 'Hinge recall. Slabs may close without notice.'],
  [3, 4, 'fast', 'Thermal throttling detected. Compensating by going faster.'],
  [4, 1, 'throw', 'Accessories sold separately. Shipping now.']
]
export const RUN_LINES = [
  'Game 1. Rated for 200,000 folds.',
  'Game 2. An update was installed while you were dead.',
  'Game 3. A recall notice is attached.',
  'Game 4. Accessories are on their way.',
  'Game 5. Everything, at once, faster.'
]
// The receipt arrives as a message from the top. `$` is replaced with the amount.
export const RECEIPTS: [string, string][] = [
  ['Tim Cook', 'Thank you for choosing Duo again. We noticed.'],
  ['John Ternus', 'The hinge is rated for 200,000 folds. Not that fold.'],
  ['Tim Cook', 'Your loyalty has been recorded. So has the $.'],
  ['John Ternus', 'Titanium is very strong. The $ charge is stronger.'],
  ['Tim Cook', 'This is our best Duo yet. Your previous one agreed.'],
  ['John Ternus', 'Thinnest Duo ever. The $ invoice is not.'],
  ['Tim Cook', 'Good morning. $ has left your account.'],
  ['John Ternus', 'Same factory as your last one. Same outcome expected.'],
  ['Tim Cook', 'Environmental note: your old Duo is now landfill. Our margins are not.'],
  ['John Ternus', 'We tested the hinge against everything. Except you.']
]
export const receiptFor = (run: number, price: number): { title: string; text: string } => {
  const [title, line] = RECEIPTS[(run - 1) % RECEIPTS.length]!
  return { title, text: line.replace('$', `$${price.toLocaleString()}`) }
}
export const MISSILE_LABELS = ['DONGLE', 'USB-C', 'CHARGER', 'PENCIL', 'AIRTAG']
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
      'Zero folds. The hinge remains in factory condition.',
      'The first slab was stationary. Noted.',
      'Warranty unaffected. Nothing happened.'
    ]
  ],
  [
    4,
    [
      'The slab did not move. That was the arrangement.',
      'Hinge failure. The cause has been identified.',
      'Four would have been a milestone.'
    ]
  ],
  [
    9,
    ['Adequate. The paperwork will say adequate.', 'The crease has seen this before.', 'Face ID declined to comment.']
  ],
  [
    16,
    [
      'A respectable number. The hinge has filed a complaint.',
      'Competent. Not covered.',
      'The engineers rated it for more. So did you.'
    ]
  ],
  [
    Number.POSITIVE_INFINITY,
    [
      'Above the average owner. The average owner is not playing.',
      'This will be described as normal wear.',
      'Support has been notified. They are not coming.'
    ]
  ]
]

export const MISSILE_ROASTS = [
  'Struck by an accessory. Sold separately.',
  'The dongle arrived before the phone did.',
  'Hit by a charger. Not included in the box.'
]

export const FLOOR_ROASTS = [
  'The floor was there the whole time.',
  'Gravity performed as documented.',
  'Screen down. The recommendation is screen up.'
]

export const MEDALS: [number, string][] = [
  [1, 'Participation'],
  [5, 'Refurbished'],
  [10, 'Out of warranty'],
  [20, 'Genius, allegedly'],
  [40, 'Suspiciously good'],
  [Number.POSITIVE_INFINITY, 'Refer to a specialist']
]

export const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]!
export const roastFor = (score: number) => pick(ROASTS.find(([max]) => score < max)![1])
export const medalFor = (score: number) => MEDALS.find(([max]) => score < max)![1]
type Stage = { run: number; score: number }
export const has = ({ run, score }: Stage, h: Hazard) =>
  HAZARDS.some(([r, s, name]) => name === h && run >= r && score >= s)
export const runLine = (run: number) => RUN_LINES[Math.min(run, RUN_LINES.length) - 1]!
/** Every game past the first shaves the gap and adds speed, on top of the score. */
export const gapFor = (w: Stage) => Math.max(0.2, GAP - w.score * 0.003 - (w.run - 1) * 0.012)
export const speedFor = (w: Stage) => SPEED * (has(w, 'fast') ? 1.3 : 1) * Math.min(1.35, 1 + (w.run - 1) * 0.05)
export const gapCenter = (s: Slab, w: Stage & { scroll: number }) =>
  s.gapY + (has(w, 'drift') ? Math.sin(w.scroll * 5 + s.n * 1.9) * 0.07 : 0) + s.slam * 0.14 * s.dir
