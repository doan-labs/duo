// The Wallet book: passes and their transaction ledgers in one module-level
// store both displays read, persisted under a single localStorage key (the
// baked-app way, decisions 59). Only edits land in storage; the seed is the
// same on every visit. `face` is a semantic key - the app maps it to an
// `appAppearance.wallet*` gradient so colours stay in tokens.

const KEY = 'duo.wallet.v1'

export type FaceId = 'titanium' | 'cash' | 'transit' | 'loop' | 'badge' | 'key' | 'event' | 'ticket' | 'plain'

export type PassGroup = 'cards' | 'transit' | 'passes'

export type Txn = {
  id: string
  merchant: string
  /** A Sym name for the row's leading icon. */
  icon: string
  when: string
  amount: string
}

export type Pass = {
  id: string
  name: string
  group: PassGroup
  /** Which gradient the face paints. */
  face: FaceId
  /** White ink on the face; titanium takes dark ink. */
  ink: 'light' | 'dark'
  /** A Sym name: the face's watermark and the row icon's glyph. */
  icon: string
  /** The line under the name: a balance, a validity, a use. */
  detail: string
  last4?: string
  txns: Txn[]
}

export type Book = { schema: 1; passes: Pass[] }

const txn = (merchant: string, icon: string, when: string, amount: string): Txn => ({
  id: `t-${merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${when.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  merchant,
  icon,
  when,
  amount
})

const seed = (): Book => ({
  schema: 1,
  passes: [
    {
      id: 'p-apple-card',
      name: 'Apple Card',
      group: 'cards',
      face: 'titanium',
      ink: 'dark',
      icon: 'building',
      detail: 'Balance $1,284.10',
      last4: '4022',
      txns: [
        txn('Apple Store', 'cart', 'Today', '$249.00'),
        txn('Blue Bottle', 'cup', 'Yesterday', '$5.60'),
        txn('Whole Foods', 'cart', 'Saturday', '$84.30'),
        txn('Duo Transload', 'tram', 'Friday', '$2.75')
      ]
    },
    {
      id: 'p-duo-cash',
      name: 'Duo Cash Card',
      group: 'cards',
      face: 'cash',
      ink: 'light',
      icon: 'building',
      detail: 'Balance $312.80',
      last4: '5577',
      txns: [txn('Duo Store', 'cart', 'Today', '$38.00'), txn('Corner Deli', 'fork', 'Monday', '$11.40')]
    },
    {
      id: 'p-duo-transit',
      name: 'Duo Transit',
      group: 'transit',
      face: 'transit',
      ink: 'light',
      icon: 'tram',
      detail: '$24.60 on card',
      txns: [
        txn('Line 2 · Downtown', 'tram', 'Today', '$2.75'),
        txn('Line 5 · Marina', 'tram', 'Yesterday', '$2.75'),
        txn('Bay Ferry', 'tram', 'Tuesday', '$4.50')
      ]
    },
    {
      id: 'p-city-loop',
      name: 'City Loop',
      group: 'transit',
      face: 'loop',
      ink: 'light',
      icon: 'bus',
      detail: 'Monthly · through Sep 30',
      txns: [txn('Loop · AM peak', 'bus', 'Today', 'Included'), txn('Loop · PM peak', 'bus', 'Yesterday', 'Included')]
    },
    {
      id: 'p-apple-park',
      name: 'Apple Park Badge',
      group: 'passes',
      face: 'badge',
      ink: 'light',
      icon: 'personFill',
      detail: 'Employee · Level 4',
      txns: [
        txn('Building A turnstile', 'lock', 'Today', 'Entry 9:04 AM'),
        txn('Caffè Macs', 'fork', 'Yesterday', 'Entry 12:31 PM')
      ]
    },
    {
      id: 'p-door-key',
      name: 'Front Door Key',
      group: 'passes',
      face: 'key',
      ink: 'light',
      icon: 'lock',
      detail: 'Home · auto-unlock',
      txns: [
        txn('Front Door', 'lock', 'Today', 'Unlocked 6:12 PM'),
        txn('Front Door', 'lock', 'Today', 'Locked 9:30 AM')
      ]
    },
    {
      id: 'p-wwdc',
      name: 'WWDC Pass',
      group: 'passes',
      face: 'event',
      ink: 'light',
      icon: 'star',
      detail: 'Seat 14A · Jun 9',
      txns: [txn('Moscone West', 'star', 'Jun 9', 'Checked in 9:00 AM')]
    },
    {
      id: 'p-gallery',
      name: 'Gallery Night',
      group: 'passes',
      face: 'ticket',
      ink: 'light',
      icon: 'film',
      detail: '2 tickets · Oct 3',
      txns: []
    }
  ]
})

let book: Book = (() => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Book
      if (v.schema === 1) return v
    }
  } catch {}
  const fresh = seed()
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh))
  } catch {}
  return fresh
})()

const subs = new Set<() => void>()
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(book))
  } catch {}
}
const set = (next: Book) => {
  book = next
  persist()
  for (const fn of subs) fn()
}

export const walletStore = {
  subscribe: (fn: () => void) => {
    subs.add(fn)
    return () => subs.delete(fn)
  },
  get: () => book
}

export const GROUPS: { id: PassGroup | 'all'; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'cards', name: 'Cards' },
  { id: 'transit', name: 'Transit' },
  { id: 'passes', name: 'Passes' }
]

export const groupName = (id: string) => GROUPS.find((g) => g.id === id)?.name ?? 'All'

export const passesOf = (group: string) => book.passes.filter((p) => group === 'all' || p.group === group)

export const passOf = (id: string) => book.passes.find((p) => p.id === id)

/** The face and icon a new pass of a group takes: graphite for a card. */
const NEW_FACE: Record<PassGroup, { face: FaceId; icon: string; detail: string }> = {
  cards: { face: 'plain', icon: 'building', detail: 'Balance $0.00' },
  transit: { face: 'loop', icon: 'tram', detail: 'Ready to ride' },
  passes: { face: 'ticket', icon: 'star', detail: 'Added today' }
}

let seq = 0
export function addPass(name: string, group: PassGroup) {
  const t = NEW_FACE[group]
  const id = `p-${Date.now().toString(36)}-${seq++}`
  const pass: Pass = {
    id,
    name: name.trim() || `New ${GROUPS.find((g) => g.id === group)?.name ?? 'Pass'}`,
    group,
    face: t.face,
    ink: 'light',
    icon: t.icon,
    detail: t.detail,
    ...(group === 'cards' ? { last4: String(1000 + Math.floor(Math.random() * 9000)) } : {}),
    txns: []
  }
  set({ ...book, passes: [...book.passes, pass] })
  return id
}

export function removePass(id: string) {
  set({ ...book, passes: book.passes.filter((p) => p.id !== id) })
}

/** A completed Apple Pay charge lands on the card's ledger as a pending row. */
export function charge(id: string) {
  const p = passOf(id)
  if (!p) return
  const amounts = ['$4.20', '$12.60', '$24.00']
  const amount = amounts[p.txns.length % amounts.length]!
  const t: Txn = { id: `t-${Date.now().toString(36)}`, merchant: 'Duo Café', icon: 'cup', when: 'Pending', amount }
  set({ ...book, passes: book.passes.map((q) => (q.id === id ? { ...q, txns: [t, ...q.txns] } : q)) })
}
