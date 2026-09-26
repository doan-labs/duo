// The Messages model: the people the demo reaches, the seed a first launch
// starts with, the stamps rows and threads share, and the deterministic demo
// reply model. Apps read SDK and kit exports, never another app's data
// (docs/working.md), so this is Messages' own copy of the cast Phone and
// Contacts carry - same ids, names and numbers, so a thread opened from Phone
// by `os.open('Messages', name)` finds its person.

import { hue } from '@doan-labs/duo-fixtures'

export type Person = {
  id: string
  name: string
  number: string
}

export type Message = {
  id: string
  /** Epoch ms. */
  at: number
  me: boolean
  text: string
  /** Set on lines the demo reply model landed; flags them as simulated. */
  demo?: true
}

export type Pending = {
  /** The reply text, already chosen when scheduled. */
  text: string
  /** When the typing dots appear. */
  typeAt: number
  /** When the reply lands as a message. */
  at: number
}

export type Conversation = {
  id: string
  /** Local recipient model id; absent for a raw address typed into New Message. */
  personId?: string
  /** Display label of an unmatched recipient: the name or the formatted number. */
  to?: string
  messages: Message[]
  unread: number
  draft: string
  pending?: Pending
}

export const PEOPLE: Person[] = [
  { id: 'jony', name: 'Jony', number: '+1 (408) 555-0134' },
  { id: 'ada', name: 'Ada Lovelace', number: '+44 20 7946 0812' },
  { id: 'mum', name: 'Mum', number: '+1 (415) 555-0177' },
  { id: 'kim', name: 'Kim Minh', number: '+84 90 555 214' },
  { id: 'blender', name: 'Blender Foundation', number: '+31 20 555 9011' },
  { id: 'alan', name: 'Alan Turing', number: '+44 161 555 0918' },
  { id: 'apple-park', name: 'Apple Park Reception', number: '+1 (408) 555-0100' },
  { id: 'grace', name: 'Grace Hopper', number: '+1 (202) 555-0146' },
  { id: 'hideo', name: 'Hideo Kojima', number: '+81 3 5555 2049' },
  { id: 'katherine', name: 'Katherine Johnson', number: '+1 (757) 555-0163' },
  { id: 'thanh', name: 'Nguyễn Thanh', number: '+84 28 555 771' },
  { id: 'radia', name: 'Radia Perlman', number: '+1 (617) 555-0129' },
  { id: 'susan', name: 'Susan Kare', number: '+1 (415) 555-0188' },
  { id: 'tim', name: 'Tim', number: '+1 (408) 555-0111' },
  { id: 'vera', name: 'Vera Rubin', number: '+1 (520) 555-0154' }
]

const say = (id: string, at: number, text: string, me = false): Message => ({ id, at, me, text })

const H = 3600000
const D = 24 * H

/** The conversations a first launch starts with; only written when no store exists yet. */
export function seedConversations(now = Date.now()): Conversation[] {
  return [
    {
      id: 'c-jony',
      personId: 'jony',
      unread: 2,
      draft: '',
      messages: [
        say('m-j1', now - 40 * 60000, 'The chamfer catches the strip light beautifully.'),
        say('m-j2', now - 2 * 60000, 'Did you ship the titanium yet?')
      ]
    },
    {
      id: 'c-mum',
      personId: 'mum',
      unread: 0,
      draft: '',
      messages: [
        say('m-m1', now - D - 2 * H, 'Do not forget your aunt lands Thursday now.'),
        say('m-m2', now - D - H, 'Call me when you land ❤️')
      ]
    },
    {
      id: 'c-ada',
      personId: 'ada',
      unread: 1,
      draft: '',
      messages: [
        say('m-a1', now - 4 * D, 'The Analytical Engine weaves algebraic patterns.', true),
        say('m-a2', now - 4 * D + 12 * 60000, 'Send me the render when it finishes?')
      ]
    },
    {
      id: 'c-kim',
      personId: 'kim',
      unread: 0,
      draft: '',
      messages: [say('m-k1', now - 6 * D, 'quán cà phê 8h nhé'), say('m-k2', now - 6 * D + 5 * 60000, 'mang laptop đi')]
    },
    {
      id: 'c-blender',
      personId: 'blender',
      unread: 0,
      draft: '',
      messages: [say('m-b1', now - 12 * D, 'Cycles 5.2 is out. AgX by default.')]
    }
  ]
}

export const personById = (id?: string) => PEOPLE.find((p) => p.id === id)

/** Who a conversation is with: the person's name, else the raw address label. */
export const convName = (c: Conversation) => personById(c.personId)?.name ?? c.to ?? 'Unknown'

/** The activity a conversation sorts by in the inbox. */
export const lastAt = (c: Conversation) => Math.max(c.messages.at(-1)?.at ?? 0, c.pending?.at ?? 0)

/** A conversation worth listing: it has a message, a reply in flight, or a draft. */
export const visible = (c: Conversation) => !!c.messages.length || !!c.pending || !!c.draft.trim()

// ---------- recipients ----------

/**
 * Who free text names: a person on a name or number match, else the trimmed
 * text itself when it looks like an address. Returns the raw string so a New
 * Message can always land somewhere honest.
 */
export function resolveRecipient(raw: string): { person?: Person; to: string } | null {
  const s = raw.trim()
  if (!s) return null
  const n = s.toLowerCase()
  const person = PEOPLE.find(
    (p) =>
      p.name.toLowerCase() === n ||
      p.name.toLowerCase().startsWith(n) ||
      (digits(s).replace(/^\+/, '').length > 3 && matchNumber(p.number, s))
  )
  if (person) return { person, to: person.name }
  return { to: formatNumber(s) || s }
}

/** The `os.arg` Phone sends: a contact's display name. Resolve it to a person when it is one. */
export const personByName = (name: string) => {
  const n = name.trim().toLowerCase()
  return PEOPLE.find((p) => p.name.toLowerCase() === n) ?? PEOPLE.find((p) => p.name.toLowerCase().startsWith(n))
}

// ---------- numbers ----------

/** The address stripped to digits and a leading +, for matching and display. */
export const digits = (s: string) => {
  const d = s.replace(/[^\d]/g, '')
  return s.trim().startsWith('+') ? `+${d}` : d
}

/** A typed string dials like the keypad does: (408) 555-0134, or +84 90 555 214. */
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
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (n.length > 10) return n.match(/.{1,3}/g)!.join(' ')
  const parts = [n.slice(0, 3), n.slice(3, 6), n.slice(6, 10)]
  if (n.length <= 3) return n
  if (n.length <= 6) return `(${parts[0]}) ${parts[1]}`
  const head = `(${parts[0]}) ${parts[1]}-${parts[2]}`
  return d.length > 10 ? `1 ${head}` : head
}

/** Trailing-digit match, the same rule the Phone book uses. */
export const matchNumber = (stored: string, raw: string) => {
  const d = digits(raw).replace(/^\+/, '')
  const s = digits(stored).replace(/^\+/, '')
  return s.replace(/^1(?=\d{10}$)/, '') === d.replace(/^1(?=\d{10}$)/, '') || s.endsWith(d)
}

/** True when free text can be an address: mostly digits, or an email shape. */
export const looksLikeAddress = (raw: string) => {
  const s = raw.trim()
  return digits(s).replace(/^\+/, '').length > 3 || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)
}

/** Monogram for a display name: letters only, so a bare number renders none. */
export const nameInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

// ---------- timestamps ----------

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** The inbox stamp: today reads as a time, this week as a day, else the date. */
export function when(at: number, now = new Date()) {
  const d = new Date(at)
  if (sameDay(d, now)) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')
  const week = new Date(now)
  week.setDate(now.getDate() - 6)
  if (d > week) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** The stamp a bubble group break shows inside a thread. */
export function threadStamp(at: number, now = new Date()) {
  const d = new Date(at)
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (sameDay(d, now)) return time
  const week = new Date(now)
  week.setDate(now.getDate() - 6)
  if (d > week) return `${d.toLocaleDateString([], { weekday: 'long' })} ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

/** Two bubbles share a group when the same sender wrote them inside four minutes. */
export const sameBurst = (a: Message, b: Message) => a.me === b.me && b.at - a.at < 4 * 60000

// ---------- the demo reply model ----------

/**
 * Explicit demo behavior: a send to a known person composes a reply at once and
 * stores it on the conversation, and the store lands it after the typing pause.
 * Pools are per persona so a reply sounds like who sent it; `q` answers a
 * question, `g` a greeting, `s` everything else. The pick is deterministic -
 * same person, same text, same thread position gives the same line - so a
 * pending reply survives a reload unchanged.
 */
const PERSONA: Record<string, { q: string[]; g: string[]; s: string[] }> = {
  jony: {
    q: ['It shipped this morning - you will like the chamfer.', 'Tomorrow. The render farm is still chewing.'],
    g: ['Good to hear from you. The cover build just landed.'],
    s: ['The chamfer says yes.', 'Send me the screenshot when it lands.', 'Good. Make the edge a touch softer.']
  },
  mum: {
    q: ['Of course, love. Dinner is at seven.', 'Yes - your aunt arrives Thursday now.'],
    g: ['Hello love, I was just thinking of you.'],
    s: ['Call me when you land ❤️', 'Lovely. Your father says hi.', 'Do not work too hard, love.']
  },
  ada: {
    q: ['It weaves the pattern you described - send the render?', 'Thursday. The Engine is agreeable.'],
    g: ['A pleasure as always. The numbers are behaving.'],
    s: [
      'The Analytical Engine approves.',
      'Most elegant. Send me the render when it finishes?',
      'Algebraic patterns, as promised.'
    ]
  },
  kim: {
    q: ['8h nhé, quán bên cạnh hồ.', 'Có, mang laptop đi.'],
    g: ['anh ơi, em đang online'],
    s: ['ok anh 👍', 'nhớ mang theo laptop nhé', 'hẹn 8h']
  },
  blender: {
    q: ['Cycles 5.2 ships AgX by default - try it.', 'On the tracker, issue 1042.'],
    g: ['Hello from the Institute.'],
    s: ['AgX by default. Enjoy.', 'The release notes are up.', 'Send us the render.']
  },
  tim: {
    q: ['Thursday works - send the invite.', 'Ask Jony, he has the prototypes.'],
    g: ['Good morning. Big week for the team.'],
    s: ['Looks great on the cover.', 'Thanks for sending this over.']
  }
}

const GENERIC = {
  q: ['Let me check and get back to you.', 'Yes, that works.'],
  g: ['Hey, good to hear from you.'],
  s: ['On it 👍', 'Sounds good.', 'Sending it over now.', 'Agreed.']
}

/**
 * The reply a send earns, or undefined: a raw address is someone the demo does
 * not know, and honest local state means nobody answers. Deterministic by
 * person, text and thread position.
 */
export function replyFor(person: Person | undefined, conv: Conversation, sent: string): string | undefined {
  if (!person) return undefined
  const p = PERSONA[person.id] ?? GENERIC
  const s = sent.trim()
  const pool = s.includes('?') ? p.q : s.length < 40 && /^(hi|hey|hello|yo|xin ch|chào|anh|em)\b/i.test(s) ? p.g : p.s
  return pool[(hue(`${person.id}:${s}`) + conv.messages.length) % pool.length]!
}
