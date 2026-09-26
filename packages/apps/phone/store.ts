import { beep } from '@doan-labs/duo-fixtures'
import { useMemo, useSyncExternalStore } from 'react'
import {
  type Book,
  byName,
  type Contact,
  findContact,
  formatNumber,
  fullName,
  matchNumber,
  type Recent,
  SEED,
  SEED_RECENTS,
  SEED_VM,
  type Voicemail
} from './data.ts'

/**
 * A module store, the baked-app pattern: both displays render the same module,
 * so one snapshot keeps them in agreement, and the book survives reloads
 * through localStorage. Call and playback engines live at module level too:
 * the fold copy draws their state but starts no timer of its own.
 */
function cell<T>(key: string | null, initial: T) {
  let value = initial
  if (key) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) value = JSON.parse(raw) as T
    } catch {}
  }
  const subs = new Set<() => void>()
  return {
    subscribe: (fn: () => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    get: () => value,
    set: (v: T) => {
      value = v
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {}
      }
      for (const fn of subs) fn()
    }
  }
}

const bookCell = cell<Book>('phone.book', SEED)
const recentsCell = cell<Recent[]>('phone.recents', SEED_RECENTS)
const vmCell = cell<Voicemail[]>('phone.voicemail', SEED_VM)

// ---------- session cells: shared by both displays, never persisted ----------

type AnyCell = ReturnType<typeof cell<unknown>>
const shared = new Map<string, AnyCell>()
/** Navigation and transient state both displays share for the session. */
export function useShared<T>(key: string, initial: T) {
  let c = shared.get(key)
  if (!c) {
    c = cell<T>(null, initial) as unknown as AnyCell
    shared.set(key, c)
  }
  return [useSyncExternalStore(c.subscribe, c.get as () => T), c.set as (v: T) => void] as const
}

// ---------- recents ----------

let seq = 0
const rid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

/** One line in Recents: prepend, cap the log at fifty. */
function pushRecent(r: Omit<Recent, 'id' | 'at'>) {
  recentsCell.set([{ ...r, id: rid('r'), at: Date.now() }, ...recentsCell.get()].slice(0, 50))
}

// ---------- the call engine ----------

export type LiveCall = {
  id: number
  name: string
  number: string
  contactId?: string
  dir: 'out' | 'in'
  /** dialling → active/held → ended. */
  phase: 'calling' | 'active' | 'held' | 'ended'
  /** When the call connected; the timer reads off it. */
  connectAt: number
  /** Connected seconds, mirrored here so both displays tick together. */
  secs: number
  muted: boolean
  speaker: boolean
  keypad: boolean
}

export type Incoming = { name: string; number: string; contactId?: string; screening: boolean }

const callsCell = cell<LiveCall[]>(null, [])
const incomingCell = cell<Incoming | null>(null, null)

let callSeq = 0
let ticker = 0
let ringTimer = 0
const dialTimers = new Map<number, number>()

const patchCall = (id: number, patch: Partial<LiveCall>) =>
  callsCell.set(callsCell.get().map((c) => (c.id === id ? { ...c, ...patch } : c)))

/** The one second hand every live call shares; starts on the first call, stops after the last. */
function ensureTicker() {
  if (ticker || !callsCell.get().length) return
  ticker = window.setInterval(() => {
    const list = callsCell.get()
    const live = list.some((c) => c.phase === 'active')
    if (!live) {
      clearInterval(ticker)
      ticker = 0
      return
    }
    callsCell.set(
      list.map((c) => (c.phase === 'active' ? { ...c, secs: Math.round((Date.now() - c.connectAt) / 1000) } : c))
    )
  }, 1000)
}

/** Who a dial reaches: the contact the number belongs to, else the number itself. */
function resolve(raw: string): { name: string; number: string; contactId?: string } {
  const hit = matchByDigits(raw)
  if (hit) return { name: fullName(hit), number: hit.phone, contactId: hit.id }
  return { name: formatNumber(raw) || raw, number: raw }
}

export const matchByDigits = (raw: string) => matchNumber(bookCell.get(), raw)

/** Place a call: to a contact, a Recent, or a dialled number. */
export function place(raw: { number: string; contactId?: string }) {
  const who = raw.contactId ? (findContact(bookCell.get(), raw.contactId) ?? resolve(raw.number)) : resolve(raw.number)
  const name = 'first' in who ? fullName(who) : who.name
  const number = 'first' in who ? who.phone : who.number
  const contactId = 'first' in who ? who.id : who.contactId
  // A second call puts the live one on hold, the way the Phone app does.
  for (const c of callsCell.get()) if (c.phase === 'active') patchCall(c.id, { phase: 'held' })
  const call: LiveCall = {
    id: ++callSeq,
    name,
    number,
    contactId,
    dir: 'out',
    phase: 'calling',
    connectAt: 0,
    secs: 0,
    muted: false,
    speaker: false,
    keypad: false
  }
  callsCell.set([...callsCell.get(), call])
  beep([350, 440], 0.5, 0.05)
  dialTimers.set(
    call.id,
    window.setTimeout(() => {
      patchCall(call.id, { phase: 'active', connectAt: Date.now() })
      beep([440, 660], 0.1, 0.07)
      ensureTicker()
    }, 2400)
  )
  return call.id
}

/** Hang up: the row lingers a beat as 'call ended', then lands in Recents. */
export function end(id: number) {
  const call = callsCell.get().find((c) => c.id === id)
  if (!call) return
  clearTimeout(dialTimers.get(id))
  dialTimers.delete(id)
  pushRecent({
    name: call.name,
    number: call.number,
    contactId: call.contactId,
    dir: call.dir,
    missed: false,
    secs: call.phase === 'active' || call.phase === 'held' ? call.secs : undefined
  })
  patchCall(id, { phase: 'ended' })
  window.setTimeout(() => {
    const rest = callsCell.get().filter((c) => c.id !== id)
    callsCell.set(rest)
    // Hand the line back: a call surviving on hold resumes when the other ends.
    if (rest.length === 1 && rest[0]!.phase === 'held') {
      patchCall(rest[0]!.id, { phase: 'active', connectAt: Date.now() - rest[0]!.secs * 1000 })
      ensureTicker()
    }
  }, 700)
}

export function toggleCall(id: number, key: 'muted' | 'speaker' | 'keypad') {
  const c = callsCell.get().find((x) => x.id === id)
  if (c) patchCall(id, { [key]: !c[key] })
}

/** Pick the held line back up, putting the live one down: iOS's swap. */
export function swapCalls(id: number) {
  for (const c of callsCell.get()) {
    if (c.id === id) patchCall(c.id, { phase: 'active', connectAt: Date.now() - c.secs * 1000 })
    else if (c.phase === 'active') patchCall(c.id, { phase: 'held' })
  }
  ensureTicker()
}

// ---------- incoming ----------

const VM_FALLBACK = 'Hi, it is me. Call me back when you get this, okay?'

/** The phone rings. `*#0#` on the keypad dials this directly. */
export function ring(raw?: { name?: string; number?: string }) {
  if (incomingCell.get()) return
  const book = bookCell.get()
  const pick = raw?.number ? resolve(raw.number) : undefined
  const caller = raw?.name
    ? { name: raw.name, number: raw.number ?? '' }
    : (pick ??
      (() => {
        const pool = book.contacts.filter((c) => c.phone && !c.blocked)
        // An emptied or fully blocked book still needs someone to ring in.
        if (!pool.length) return { name: 'Unknown', number: '+1 (800) 555-0199' }
        const c = pool[((Date.now() / 1000 + pool.length) % pool.length) | 0]!
        return { name: fullName(c), number: c.phone, contactId: c.id }
      })())
  incomingCell.set({ name: caller.name, number: caller.number, contactId: caller.contactId, screening: false })
  beep([880, 990, 1180], 0.9, 0.08)
  window.clearTimeout(ringTimer)
  ringTimer = window.setTimeout(() => {
    const inc = incomingCell.get()
    if (!inc) return
    incomingCell.set(null)
    pushRecent({ name: inc.name, number: inc.number, contactId: inc.contactId, dir: 'in', missed: true })
    dropVoicemail(inc)
  }, 24000)
}

/** The caller's message lands a few seconds after a missed or declined call. */
function dropVoicemail(inc: Pick<Incoming, 'name' | 'number' | 'contactId'>) {
  window.setTimeout(() => {
    const template = SEED_VM.find((v) => v.contactId === inc.contactId)?.transcript
    vmCell.set([
      {
        id: rid('v'),
        name: inc.name,
        number: inc.number,
        contactId: inc.contactId,
        at: Date.now(),
        secs: 9 + (inc.name.length % 18),
        heard: false,
        transcript: template ?? VM_FALLBACK
      },
      ...vmCell.get()
    ])
  }, 4200)
}

export function answer() {
  const inc = incomingCell.get()
  if (!inc) return
  window.clearTimeout(ringTimer)
  incomingCell.set(null)
  // Call-waiting: a live line drops to hold when the new one connects.
  for (const c of callsCell.get()) if (c.phase === 'active') patchCall(c.id, { phase: 'held' })
  callsCell.set([
    ...callsCell.get(),
    {
      id: ++callSeq,
      name: inc.name,
      number: inc.number,
      contactId: inc.contactId,
      dir: 'in',
      phase: 'active',
      connectAt: Date.now(),
      secs: 0,
      muted: false,
      speaker: false,
      keypad: false
    }
  ])
  ensureTicker()
}

export function decline() {
  const inc = incomingCell.get()
  if (!inc) return
  window.clearTimeout(ringTimer)
  incomingCell.set(null)
  pushRecent({ name: inc.name, number: inc.number, contactId: inc.contactId, dir: 'in', missed: true })
  dropVoicemail(inc)
}

/** Call Screening: the caller hears the assistant and their reply types in. */
export const screenCall = (on: boolean) => {
  const inc = incomingCell.get()
  if (inc) incomingCell.set({ ...inc, screening: on })
}

// ---------- voicemail playback ----------

export type VmPlayback = { id: string; pos: number; playing: boolean }
const playCell = cell<VmPlayback | null>(null, null)
let playTimer = 0

export function vmPlay(id: string) {
  const vm = vmCell.get().find((v) => v.id === id)
  if (!vm) return
  const cur = playCell.get()
  playCell.set({ id, pos: cur?.id === id ? cur.pos : 0, playing: true })
  markHeard(id)
  window.clearInterval(playTimer)
  playTimer = window.setInterval(() => {
    const p = playCell.get()
    if (!p?.playing) return
    const at = vmCell.get().find((v) => v.id === p.id)
    if (!at || p.pos >= at.secs) {
      window.clearInterval(playTimer)
      playCell.set(p ? { ...p, playing: false } : null)
      return
    }
    playCell.set({ ...p, pos: Math.min(at.secs, p.pos + 1) })
  }, 1000)
}

export function vmPause() {
  const p = playCell.get()
  if (p) playCell.set({ ...p, playing: false })
}

export function vmSeek(id: string, pos: number) {
  const p = playCell.get()
  if (p?.id === id) playCell.set({ ...p, pos })
}

function markHeard(id: string) {
  vmCell.set(vmCell.get().map((v) => (v.id === id ? { ...v, heard: true } : v)))
}

// ---------- the hook ----------

export function usePhone() {
  const book = useSyncExternalStore(bookCell.subscribe, bookCell.get)
  const recents = useSyncExternalStore(recentsCell.subscribe, recentsCell.get)
  const voicemails = useSyncExternalStore(vmCell.subscribe, vmCell.get)
  const calls = useSyncExternalStore(callsCell.subscribe, callsCell.get)
  const incoming = useSyncExternalStore(incomingCell.subscribe, incomingCell.get)
  const playback = useSyncExternalStore(playCell.subscribe, playCell.get)
  const contacts = useMemo(() => [...book.contacts].sort(byName), [book.contacts])
  const favorites = useMemo(
    () => book.favOrder.map((id) => book.contacts.find((c) => c.id === id)).filter((c): c is Contact => !!c),
    [book]
  )
  return {
    book,
    contacts,
    favorites,
    recents,
    voicemails,
    calls,
    incoming,
    playback,
    // The actions read the cells, not the render's snapshot: two mutations in
    // one gesture (save a contact, then link a recent to it) must not lose the
    // first write to a stale closure.
    save(c: Contact) {
      const bookNow = bookCell.get()
      const exists = bookNow.contacts.some((v) => v.id === c.id)
      const next = exists ? bookNow.contacts.map((v) => (v.id === c.id ? c : v)) : [...bookNow.contacts, c]
      const favOrder = c.favorite && !bookNow.favOrder.includes(c.id) ? [...bookNow.favOrder, c.id] : bookNow.favOrder
      bookCell.set({ contacts: next, favOrder: c.favorite ? favOrder : favOrder.filter((i) => i !== c.id) })
    },
    remove(id: string) {
      const bookNow = bookCell.get()
      bookCell.set({
        contacts: bookNow.contacts.filter((c) => c.id !== id),
        favOrder: bookNow.favOrder.filter((i) => i !== id)
      })
      // iOS keeps the call but forgets the name: linked recents and voicemails
      // fall back to showing the bare number.
      const detach = <T extends { name: string; number: string; contactId?: string }>(r: T): T =>
        r.contactId === id ? { ...r, contactId: undefined, name: formatNumber(r.number) || r.number } : r
      recentsCell.set(recentsCell.get().map(detach))
      vmCell.set(vmCell.get().map(detach))
    },
    /** Favorite is a flag on the contact and a slot in the order; both move together. */
    toggleFavorite(id: string) {
      const bookNow = bookCell.get()
      const c = findContact(bookNow, id)
      if (!c) return
      bookCell.set({
        contacts: bookNow.contacts.map((v) => (v.id === id ? { ...v, favorite: !v.favorite } : v)),
        favOrder: c.favorite ? bookNow.favOrder.filter((i) => i !== id) : [...bookNow.favOrder, id]
      })
    },
    /** Edit-mode drag: put `id` before the favorite at `to`, or last when `to` is the end. */
    moveFavorite(id: string, to: number) {
      const bookNow = bookCell.get()
      const rest = bookNow.favOrder.filter((i) => i !== id)
      rest.splice(Math.max(0, Math.min(to, rest.length)), 0, id)
      bookCell.set({ ...bookNow, favOrder: rest })
    },
    toggleBlocked(id: string) {
      const bookNow = bookCell.get()
      bookCell.set({
        ...bookNow,
        contacts: bookNow.contacts.map((c) => (c.id === id ? { ...c, blocked: !c.blocked } : c))
      })
    },
    removeRecent(id: string) {
      recentsCell.set(recentsCell.get().filter((r) => r.id !== id))
    },
    /** A Recent tied to a contact gains their name, the way Add to Existing works. */
    linkRecent(id: string, contactId: string) {
      const c = findContact(bookCell.get(), contactId)
      if (!c) return
      recentsCell.set(recentsCell.get().map((r) => (r.id === id ? { ...r, contactId, name: fullName(c) } : r)))
    },
    clearRecents() {
      recentsCell.set([])
    },
    removeVoicemail(id: string) {
      if (playCell.get()?.id === id) {
        window.clearInterval(playTimer)
        playCell.set(null)
      }
      vmCell.set(vmCell.get().filter((v) => v.id !== id))
    }
  }
}

export const blank = (): Contact => ({
  id: rid('c'),
  first: '',
  last: '',
  company: '',
  phone: '',
  email: '',
  notes: '',
  favorite: false,
  blocked: false
})
