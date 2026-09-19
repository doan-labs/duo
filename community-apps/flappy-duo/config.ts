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
  1: 'One slab cleared. This has been noted.',
  5: 'Five. Within the expected range for a first-time owner.',
  7: 'Seven. The hinge is operating outside its comfort range.',
  10: 'Ten. Comparable to a screen repair, in cost terms.',
  15: 'Fifteen. Continued folding is at your discretion.',
  20: 'Twenty. Engineering has been informed.',
  30: 'Thirty. Legal has been informed.',
  50: 'Fifty. No further assistance is available.'
}

// The game gets worse with every game and every point. [game, score, hazard, announcement].
export const HAZARDS: [number, number, Hazard, string][] = [
  [1, 2, 'drift', 'Update installed. Slab positions are now dynamic.'],
  [2, 1, 'blur', 'iOS 27 beta installed overnight. Sharp rendering is available on Pro models.'],
  [2, 3, 'notify', 'Notification settings restored from backup.'],
  [3, 1, 'slam', 'Recall notice. Slabs may close without prior notice.'],
  [3, 4, 'fast', 'Thermal condition detected. Scroll speed increased to compensate.'],
  [4, 1, 'throw', 'Accessories are sold separately and shipped directly.']
]
// Only the second and third purchases are acknowledged. Later ones alternate the same two lines.
export const receiptFor = (run: number): { title: string; text: string } | null => {
  if (run < 2) return null
  return run % 2 === 0
    ? { title: 'Tim Cook', text: 'Thank you for your contribution.' }
    : { title: 'John Ternus', text: 'We appreciate your continued support.' }
}
export const MISSILE_LABELS = ['DONGLE', 'USB-C', 'CHARGER', 'PENCIL', 'AIRTAG']
export const NOTICES: [string, string][] = [
  ['Storage Almost Full', 'You can manage storage in Settings. Most owners do not.'],
  ['Screen Time', 'Folding activity increased 400% compared to last week.'],
  ['AppleCare+', 'Your coverage ends today. Your device does not know this.'],
  ['Software Update', 'iOS 27.0.1 addresses an issue where the device functioned as expected.'],
  ['Battery', 'Maximum capacity 79%. Peak performance capability has been disabled.'],
  ['Find My', 'Your Duo was last seen descending.'],
  ['Duo Store', 'Your Duo is eligible for a $40 trade-in credit.']
]

export const ROASTS: [number, string[]][] = [
  [
    1,
    [
      'Zero slabs cleared. The hinge remains in factory condition.',
      'The first slab was stationary at the time of impact.',
      'No warranty impact. No progress either.'
    ]
  ],
  [
    4,
    [
      'The slab did not move. This was the arrangement.',
      'Hinge failure. The cause has been identified as the operator.',
      'Four would have been a milestone.'
    ]
  ],
  [
    9,
    [
      'Adequate. The report will say adequate.',
      'The crease has recorded this outcome before.',
      'Face ID declined to comment.'
    ]
  ],
  [
    16,
    [
      'A respectable figure. The hinge has filed a complaint.',
      'Competent. Not covered.',
      'The device was rated for more. So were you.'
    ]
  ],
  [
    Number.POSITIVE_INFINITY,
    [
      'Above the average owner. The average owner is not playing.',
      'This will be recorded as normal wear.',
      'Support has been notified. Support is not coming.'
    ]
  ]
]

export const MISSILE_ROASTS = [
  'Impact with an accessory. Accessories are sold separately.',
  'The charging cable arrived ahead of schedule.',
  'Struck by a charger. The charger is not included.'
]

export const FLOOR_ROASTS = [
  'The floor was present for the duration.',
  'Gravity performed within specification.',
  'The device is screen down. Screen up is recommended.'
]

export const MEDALS: [number, string][] = [
  [1, 'Participation'],
  [5, 'Refurbished'],
  [10, 'Out of warranty'],
  [20, 'Under review'],
  [40, 'Under investigation'],
  [Number.POSITIVE_INFINITY, 'Referred to a specialist']
]

export const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]!
export const roastFor = (score: number) => pick(ROASTS.find(([max]) => score < max)![1])
export const medalFor = (score: number) => MEDALS.find(([max]) => score < max)![1]
type Stage = { run: number; score: number }
export const has = ({ run, score }: Stage, h: Hazard) =>
  HAZARDS.some(([r, s, name]) => name === h && run >= r && score >= s)
/** Every game past the first shaves the gap and adds speed, on top of the score. */
export const gapFor = (w: Stage) => Math.max(0.2, GAP - w.score * 0.003 - (w.run - 1) * 0.012)
export const speedFor = (w: Stage) => SPEED * (has(w, 'fast') ? 1.3 : 1) * Math.min(1.35, 1 + (w.run - 1) * 0.05)
export const gapCenter = (s: Slab, w: Stage & { scroll: number }) =>
  s.gapY + (has(w, 'drift') ? Math.sin(w.scroll * 5 + s.n * 1.9) * 0.07 : 0) + s.slam * 0.14 * s.dir
