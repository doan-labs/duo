// The Home book: rooms and their accessories in one module-level store both
// displays read, persisted under a single localStorage key. Switches, levels
// and scenes are edits - only they land in storage, so a reload and the other
// display see the same house. Tint and icon are keys the app maps to tokens.

const KEY = 'duo.home.v1'

export type AccKind = 'light' | 'climate' | 'lock' | 'fan' | 'speaker' | 'tv'

export type Acc = {
  id: string
  name: string
  kind: AccKind
  /** On/off. For a lock, on means locked. */
  on: boolean
  /** 0-100 for a light, a fan or a speaker. */
  level?: number
  /** Degrees for a climate accessory. */
  temp?: number
}

export type Room = {
  id: string
  name: string
  /** A palette key; the app maps it to `colors.*`. */
  tint: string
  /** A Sym name. */
  icon: string
  accs: Acc[]
}

export type Book = { schema: 1; rooms: Room[] }

export const GROUPS: { id: string; name: string; kinds: AccKind[] }[] = [
  { id: 'lights', name: 'Lights', kinds: ['light'] },
  { id: 'climate', name: 'Climate', kinds: ['climate', 'fan'] },
  { id: 'security', name: 'Security', kinds: ['lock'] },
  { id: 'media', name: 'Media', kinds: ['speaker', 'tv'] }
]

export const KIND_NAME: Record<AccKind, string> = {
  light: 'Light',
  climate: 'Thermostat',
  lock: 'Lock',
  fan: 'Fan',
  speaker: 'Speaker',
  tv: 'TV'
}

const seed = (): Book => ({
  schema: 1,
  rooms: [
    {
      id: 'r-studio',
      name: 'Studio',
      tint: 'indigo',
      icon: 'keypad',
      accs: [
        { id: 'a-desk', name: 'Desk Lamp', kind: 'light', on: true, level: 80 },
        { id: 'a-key', name: 'Key Light', kind: 'light', on: true, level: 100 },
        { id: 'a-rim', name: 'Rim Lights', kind: 'light', on: false, level: 45 },
        { id: 'a-fan', name: 'Ceiling Fan', kind: 'fan', on: false, level: 40 }
      ]
    },
    {
      id: 'r-entry',
      name: 'Entry',
      tint: 'green',
      icon: 'lock',
      accs: [
        { id: 'a-door', name: 'Front Door', kind: 'lock', on: true },
        { id: 'a-porch', name: 'Porch Light', kind: 'light', on: false, level: 60 }
      ]
    },
    {
      id: 'r-living',
      name: 'Living',
      tint: 'orange',
      icon: 'people',
      accs: [
        { id: 'a-speaker', name: 'Speaker', kind: 'speaker', on: true, level: 35 },
        { id: 'a-tv', name: 'TV', kind: 'tv', on: false },
        { id: 'a-thermo', name: 'Thermostat', kind: 'climate', on: true, temp: 21 }
      ]
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

export const homeStore = {
  subscribe: (fn: () => void) => {
    subs.add(fn)
    return () => subs.delete(fn)
  },
  get: () => book
}

export const roomOf = (id: string) => book.rooms.find((r) => r.id === id)

/** Finds an accessory anywhere in the house; detail paths store only its id. */
export function accOf(id: string) {
  for (const room of book.rooms) {
    const acc = room.accs.find((a) => a.id === id)
    if (acc) return { room, acc }
  }
  return undefined
}

export const accsOf = (kinds: AccKind[]) =>
  book.rooms.flatMap((room) => room.accs.filter((a) => kinds.includes(a.kind)).map((acc) => ({ room, acc })))

const edit = (accId: string, patch: Partial<Acc>) =>
  set({
    ...book,
    rooms: book.rooms.map((room) => ({
      ...room,
      accs: room.accs.map((a) => (a.id === accId ? { ...a, ...patch } : a))
    }))
  })

export const flipAcc = (accId: string, on?: boolean) => {
  const found = accOf(accId)
  if (found) edit(accId, { on: on ?? !found.acc.on })
}

export const setLevel = (accId: string, level: number) =>
  edit(accId, { level: Math.round(Math.min(100, Math.max(0, level))) })
export const setTemp = (accId: string, temp: number) => edit(accId, { temp: Math.round(temp * 2) / 2 })

const KIND_SEED: Record<AccKind, Omit<Acc, 'id' | 'name' | 'kind'>> = {
  light: { on: false, level: 60 },
  climate: { on: false, temp: 21 },
  lock: { on: false },
  fan: { on: false, level: 50 },
  speaker: { on: false, level: 30 },
  tv: { on: false }
}

let seq = 0
export function addAcc(roomId: string, name: string, kind: AccKind) {
  const room = roomOf(roomId)
  if (!room) return
  const id = `a-${Date.now().toString(36)}-${seq++}`
  const acc: Acc = { id, name: name.trim() || `New ${KIND_NAME[kind]}`, kind, ...KIND_SEED[kind] }
  set({ ...book, rooms: book.rooms.map((r) => (r.id === roomId ? { ...r, accs: [...r.accs, acc] } : r)) })
  return id
}

export const ROOM_TINTS = ['blue', 'teal', 'pink', 'purple', 'red', 'yellow', 'indigo', 'green', 'orange']
export const ROOM_ICONS = ['people', 'star', 'book', 'leaf', 'film', 'bolt', 'gear', 'keypad', 'pin', 'moon']

export function addRoom(name: string) {
  const taken = new Set(book.rooms.map((r) => r.tint))
  const tint = ROOM_TINTS.find((t) => !taken.has(t)) ?? ROOM_TINTS[book.rooms.length % ROOM_TINTS.length]!
  const icons = new Set(book.rooms.map((r) => r.icon))
  const icon = ROOM_ICONS.find((i) => !icons.has(i)) ?? 'star'
  const id = `r-${Date.now().toString(36)}-${seq++}`
  set({
    ...book,
    rooms: [...book.rooms, { id, name: name.trim() || 'New Room', tint, icon, accs: [] }]
  })
  return id
}

export function removeAcc(accId: string) {
  set({
    ...book,
    rooms: book.rooms.map((room) => ({ ...room, accs: room.accs.filter((a) => a.id !== accId) }))
  })
}

/** Scenes write a whole house at once so every switch animates together. */
export const SCENES: { id: string; name: string; icon: string; tint: string }[] = [
  { id: 'arrive', name: 'Arrive Home', icon: 'sunrise', tint: 'orange' },
  { id: 'night', name: 'Good Night', icon: 'moonStars', tint: 'indigo' }
]

export function applyScene(id: string) {
  const arrive = id === 'arrive'
  set({
    ...book,
    rooms: book.rooms.map((room) => ({
      ...room,
      accs: room.accs.map((a) => {
        if (arrive) {
          if (a.kind === 'light' || a.kind === 'speaker') return { ...a, on: true }
          if (a.kind === 'lock') return { ...a, on: false }
          if (a.kind === 'climate') return { ...a, on: true, temp: 22 }
          return { ...a, on: false }
        }
        if (a.kind === 'lock') return { ...a, on: true }
        if (a.kind === 'climate') return { ...a, on: true, temp: 19 }
        return { ...a, on: false }
      })
    }))
  })
}

/** The one-line state a row reports: "On", "Off", a level, a setpoint, a lock. */
export const stateOf = (a: Acc) => {
  if (a.kind === 'lock') return a.on ? 'Locked' : 'Unlocked'
  if (a.kind === 'climate') return a.on ? `Heating to ${a.temp}°` : 'Off'
  if (!a.on) return 'Off'
  return a.level == null ? 'On' : `On · ${a.level}%`
}
