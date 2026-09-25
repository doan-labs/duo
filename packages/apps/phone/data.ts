// The Phone app's book and call history: shapes, the seed it starts with and
// the number handling every pane shares. Contacts keeps its own copy of the
// same people; the comments there explain why the two apps each carry one.

export type Contact = {
  id: string
  first: string
  last: string
  company: string
  phone: string
  email: string
  notes: string
  favorite: boolean
  blocked: boolean
}

export type Book = {
  contacts: Contact[]
  /** Favorite contact ids in the user's own order; the Favorites tab is this list. */
  favOrder: string[]
}

export type Recent = {
  id: string
  /** Display name: the contact's name, or the formatted number when unknown. */
  name: string
  number: string
  contactId?: string
  dir: 'out' | 'in'
  missed: boolean
  /** Epoch ms; the row shows the time of day, the detail the full stamp. */
  at: number
  /** Connected seconds; absent on a missed or cancelled call. */
  secs?: number
}

export type Voicemail = {
  id: string
  name: string
  number: string
  contactId?: string
  at: number
  /** Audio length in seconds. */
  secs: number
  heard: boolean
  transcript: string
}

const person = (
  id: string,
  first: string,
  last: string,
  phone: string,
  company = '',
  extra: Partial<Contact> = {}
): Contact => ({
  id,
  first,
  last,
  company,
  phone,
  email: extra.email ?? `${(first || company).split(' ')[0]!.toLowerCase()}@icloud.com`,
  notes: extra.notes ?? '',
  favorite: extra.favorite ?? false,
  blocked: extra.blocked ?? false
})

export const SEED: Book = {
  contacts: [
    person('jony', 'Jony', '', '+1 (408) 555-0134', 'Apple', { favorite: true }),
    person('ada', 'Ada', 'Lovelace', '+44 20 7946 0812'),
    person('mum', 'Mum', '', '+1 (415) 555-0177', '', { favorite: true }),
    person('kim', 'Kim', 'Minh', '+84 90 555 214', '', { favorite: true }),
    person('blender', 'Blender', 'Foundation', '+31 20 555 9011', 'Blender Foundation', {
      email: 'foundation@blender.org'
    }),
    person('alan', 'Alan', 'Turing', '+44 161 555 0918'),
    person('apple-park', 'Apple Park', 'Reception', '+1 (408) 555-0100', 'Apple', {
      email: 'reception@apple.com'
    }),
    person('grace', 'Grace', 'Hopper', '+1 (202) 555-0146'),
    person('hideo', 'Hideo', 'Kojima', '+81 3 5555 2049', 'Kojima Productions'),
    person('katherine', 'Katherine', 'Johnson', '+1 (757) 555-0163'),
    person('thanh', 'Nguyễn', 'Thanh', '+84 28 555 771'),
    person('radia', 'Radia', 'Perlman', '+1 (617) 555-0129'),
    person('susan', 'Susan', 'Kare', '+1 (415) 555-0188'),
    person('tim', 'Tim', '', '+1 (408) 555-0111', 'Apple', { favorite: true }),
    person('vera', 'Vera', 'Rubin', '+1 (520) 555-0154')
  ],
  favOrder: ['mum', 'jony', 'kim', 'tim']
}

export const SEED_RECENTS: Recent[] = [
  {
    id: 'r1',
    name: 'Mum',
    number: '+1 (415) 555-0177',
    contactId: 'mum',
    dir: 'in',
    missed: true,
    at: Date.now() - 32 * 60000
  },
  {
    id: 'r2',
    name: 'Jony',
    number: '+1 (408) 555-0134',
    contactId: 'jony',
    dir: 'out',
    missed: false,
    at: Date.now() - 2 * 3600000,
    secs: 754
  },
  { id: 'r3', name: '+84 90 555 887', number: '+84 90 555 887', dir: 'in', missed: true, at: Date.now() - 4 * 3600000 },
  {
    id: 'r4',
    name: 'Apple Park Reception',
    number: '+1 (408) 555-0100',
    contactId: 'apple-park',
    dir: 'in',
    missed: false,
    at: Date.now() - 26 * 3600000,
    secs: 126
  },
  {
    id: 'r5',
    name: 'Kim Minh',
    number: '+84 90 555 214',
    contactId: 'kim',
    dir: 'out',
    missed: false,
    at: Date.now() - 30 * 3600000,
    secs: 2430
  },
  {
    id: 'r6',
    name: 'Hideo Kojima',
    number: '+81 3 5555 2049',
    contactId: 'hideo',
    dir: 'in',
    missed: false,
    at: Date.now() - 2 * 86400000,
    secs: 311
  },
  {
    id: 'r7',
    name: 'Grace Hopper',
    number: '+1 (202) 555-0146',
    contactId: 'grace',
    dir: 'out',
    missed: true,
    at: Date.now() - 3 * 86400000
  }
]

const VM_TEXT: [string, string][] = [
  [
    'Mum',
    'Hi love, it is Mum. Your aunt arrives Thursday evening now, not Friday, so dinner moved too. Call me back when you land, okay? I left the keys under the blue pot by the door. Talk soon.'
  ],
  [
    'Apple Park Reception',
    'Good afternoon, this is Apple Park reception. Your visitor badge for tomorrow is ready at the main lobby desk. Bring a photo ID, and ask for the studio tour check in. We will see you at nine.'
  ],
  [
    'Kim Minh',
    'Anh ơi, em gọi nhé. Tối nay quán cà phê đóng sớm nên mình đổi sang chỗ bên cạnh hồ, tám giờ nhé. Nhớ mang theo cái laptop, em cần coi lại file design. Gọi lại cho em khi nào rảnh.'
  ]
]

export const SEED_VM: Voicemail[] = VM_TEXT.map(([name, transcript], i) => ({
  id: `v${i + 1}`,
  name,
  number: SEED.contacts.find((c) => `${c.first} ${c.last}`.trim() === name)?.phone ?? '',
  contactId: SEED.contacts.find((c) => `${c.first} ${c.last}`.trim() === name)?.id,
  at: Date.now() - (i === 0 ? 18 : i === 1 ? 3 * 24 : 7 * 24) * 3600000,
  secs: [42, 65, 17][i]!,
  heard: i === 2,
  transcript
}))

// ---------- numbers ----------

/** The dial string stripped to digits and a leading +, for matching and for Recents. */
export const digits = (s: string) => {
  const d = s.replace(/[^\d]/g, '')
  return s.trim().startsWith('+') ? `+${d}` : d
}

/**
 * The number as the keypad shows it: a US ten-digit dials as (408) 555-0134,
 * an international number keeps its + and groups by three. Partial strings
 * format up to where they reach.
 */
export function formatNumber(raw: string) {
  const d = digits(raw)
  if (!d) return ''
  if (d.startsWith('+')) {
    const rest = d.slice(1)
    const groups: string[] = []
    if (rest.length > 2) groups.push(rest.slice(0, 2), ...rest.slice(2).match(/.{1,3}/g)!)
    else groups.push(rest)
    return `+${groups.filter(Boolean).join(' ')}`
  }
  const n = d.length > 10 && d.startsWith('1') ? d.slice(1) : d
  const parts = [n.slice(0, 3), n.slice(3, 6), n.slice(6, 10)]
  if (n.length <= 3) return n
  if (n.length <= 6) return `(${parts[0]}) ${parts[1]}`
  const head = `(${parts[0]}) ${parts[1]}-${parts[2]}`
  return d.length > 10 ? `1 ${head}` : head
}

/** The contact a dialled string reaches: full or trailing-digit match over the book. */
export const matchNumber = (book: Book, raw: string) => {
  const d = digits(raw).replace(/^\+/, '')
  if (d.length < 4) return undefined
  return book.contacts.find(
    (c) =>
      digits(c.phone)
        .replace(/^\+/, '')
        .replace(/^1(?=\d{10}$)/, '') === d.replace(/^1(?=\d{10}$)/, '') || digits(c.phone).endsWith(d)
  )
}

export const findContact = (book: Book, id?: string) => book.contacts.find((c) => c.id === id)

/** How the book names a person: first and last, or the company when both are blank. */
export const fullName = (c: Pick<Contact, 'first' | 'last' | 'company'>) =>
  [c.first, c.last].filter(Boolean).join(' ').trim() || c.company || 'No Name'

export const initials = (c: Pick<Contact, 'first' | 'last' | 'company'>) =>
  (
    [c.first, c.last]
      .filter(Boolean)
      .map((w) => w[0])
      .join('') || c.company.slice(0, 1)
  ).toUpperCase()

/** Monogram for a bare display name: letters only, so a bare number renders none. */
export const nameInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

/** The A-Z list sorts on the last name, as Contacts does; one-word names sort on themselves. */
export const sortKey = (c: Contact) => (c.last || c.first || c.company || '').normalize('NFD')
export const byName = (a: Contact, b: Contact) => sortKey(a).localeCompare(sortKey(b)) || a.first.localeCompare(b.first)

/** The letter a name files under; anything outside A-Z goes to '#'. */
export function letterOf(c: Contact) {
  const ch =
    sortKey(c)
      .replace(/[\u0300-\u036f]/g, '')[0]
      ?.toUpperCase() ?? '#'
  return /[A-Z]/.test(ch) ? ch : '#'
}

// ---------- timestamps ----------

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** The row stamp: today reads as a time, this week as a day, else the date. */
export function when(at: number, now = new Date()) {
  const d = new Date(at)
  if (sameDay(d, now)) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')
  const week = new Date(now)
  week.setDate(now.getDate() - 6)
  if (d > week) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** The detail stamp: "Tuesday, September 23, 2:41 PM". */
export const stamp = (at: number) =>
  `${new Date(at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
