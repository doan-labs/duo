// The Messages store: a module-level snapshot both display copies render, so
// the cover and the inner panel can never diverge (phone/store.ts is the
// reference pattern, decisions.md 59). Durable cells write JSON to
// localStorage under `duo.messages.*` - the prefix Erase All Content and
// Settings wipes. Session cells (search, scroll) are shared by both copies
// for the session but never persisted.
//
// The reply engine is the demo's effect owner: timers are module state armed
// once per pending reply, and `resume()` on the non-mirror copy re-arms them
// after a reload. The mirror copy draws the same store - typing dots included -
// but starts nothing and plays no sound of its own.

import { beep } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { useSyncExternalStore } from 'react'
import {
  type Conversation,
  convName,
  type Message,
  type Pending,
  type Person,
  personById,
  personByName,
  replyFor,
  seedConversations
} from './data.ts'

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

// ---------- persisted cells ----------

/** The conversation store; the seed lands only when no saved store exists. */
const convsCell = cell<Conversation[]>('duo.messages', seedConversations())
/** The open pane: a conversation id, 'new' for the unsent card, or ''. */
const selCell = cell<string>('duo.messages.sel', '')
/** The unsent New Message card's To field, so it survives a reload. */
const composeCell = cell<string>('duo.messages.compose', '')

// ---------- session cells: shared by both displays, never persisted ----------

type AnyCell = ReturnType<typeof cell<unknown>>
const shared = new Map<string, AnyCell>()
/** Transient state both copies share for the session: search text, scroll spots. */
export function useShared<T>(key: string, initial: T) {
  let c = shared.get(key)
  if (!c) {
    c = cell<T>(null, initial) as unknown as AnyCell
    shared.set(key, c)
  }
  return [useSyncExternalStore(c.subscribe, c.get as () => T), c.set as (v: T) => void] as const
}

/** Bumped whenever a typing window opens or closes, so both copies re-render. */
const tickCell = cell<number>(null, 0)
const tick = () => tickCell.set(tickCell.get() + 1)

// ---------- reads ----------

export const useConvs = () => useSyncExternalStore(convsCell.subscribe, convsCell.get)
export const useSel = () => useSyncExternalStore(selCell.subscribe, selCell.get)
export const useComposeTo = () => useSyncExternalStore(composeCell.subscribe, composeCell.get)
/** Subscribes the caller to the typing clock; the value itself is noise. */
export const useTick = () => useSyncExternalStore(tickCell.subscribe, tickCell.get)
export const getConv = (id: string) => convsCell.get().find((c) => c.id === id)

// ---------- writes ----------

let seq = 0
const rid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

const patchConv = (id: string, fn: (c: Conversation) => Conversation) =>
  convsCell.set(convsCell.get().map((c) => (c.id === id ? fn(c) : c)))

/** The conversation a person or raw address belongs to, created on demand. */
export function convFor(target: { person?: Person; to: string }) {
  const list = convsCell.get()
  const hit = target.person
    ? list.find((c) => c.personId === target.person!.id)
    : list.find((c) => !c.personId && c.to === target.to)
  if (hit) return hit
  const conv: Conversation = {
    id: rid('c'),
    personId: target.person?.id,
    to: target.person ? undefined : target.to,
    messages: [],
    unread: 0,
    draft: ''
  }
  convsCell.set([conv, ...list])
  return conv
}

/** Open a pane: a conversation (marked read) or 'new'. Closing is select(''). */
export function select(id: string) {
  selCell.set(id)
  if (id && id !== 'new') patchConv(id, (c) => (c.unread ? { ...c, unread: 0 } : c))
}

/** The unsent card's To text; kept persisted so a reload loses nothing typed. */
export const setComposeTo = (to: string) => composeCell.set(to)

export const setDraft = (id: string, draft: string) => patchConv(id, (c) => ({ ...c, draft }))

/** Unread is a real flag, so it can also be set back on. */
export const setUnread = (id: string, on: boolean) => patchConv(id, (c) => ({ ...c, unread: on ? 1 : 0 }))

export function removeConv(id: string) {
  disarm(id)
  convsCell.set(convsCell.get().filter((c) => c.id !== id))
  if (selCell.get() === id) selCell.set('')
}

// ---------- the demo reply engine ----------

/**
 * Armed timers, one pair per pending reply. Module-level on purpose: the live
 * copy arms them in `send` and `resume`, and they keep running while the app
 * is parked, which is exactly when a reply arriving still counts.
 */
const armed = new Map<string, ReturnType<typeof setTimeout>[]>()

function disarm(id: string) {
  for (const t of armed.get(id) ?? []) clearTimeout(t)
  armed.delete(id)
}

/** Land a pending reply as a message; reads the store fresh so a delete wins. */
function land(os: Os, id: string) {
  armed.delete(id)
  const conv = getConv(id)
  const pending = conv?.pending
  if (!conv || !pending) return
  patchConv(id, (c) => ({
    ...c,
    pending: undefined,
    unread: selCell.get() === id ? 0 : c.unread + 1,
    messages: [...c.messages, { id: rid('m'), at: pending.at, me: false, text: pending.text, demo: true }]
  }))
  // The sound belongs to the copy that owns effects at fire time; the mirror
  // draws the incoming bubble but never beeps (decisions.md 24).
  if (!os.mirror) beep([880, 1320], 0.06, 0.05)
}

/** Arm timers for a conversation's pending reply; idempotent per conversation. */
function arm(os: Os, id: string) {
  if (armed.has(id)) return
  const pending = getConv(id)?.pending
  if (!pending) return
  const now = Date.now()
  armed.set(id, [
    setTimeout(tick, Math.max(0, pending.typeAt - now)),
    setTimeout(() => land(os, id), Math.max(0, pending.at - now))
  ])
}

/**
 * Compose and schedule the demo reply a send earns. The reply text is stored
 * before the timers arm, so a reload mid-flight still lands the same line.
 */
function schedule(os: Os, conv: Conversation, sent: string) {
  const text = replyFor(personById(conv.personId), conv, sent)
  if (text == null) return
  const now = Date.now()
  const pending: Pending = {
    text,
    typeAt: now + 700,
    at: now + 700 + 900 + (sent.length % 12) * 220
  }
  disarm(conv.id)
  patchConv(conv.id, (c) => ({ ...c, pending }))
  arm(os, conv.id)
}

/**
 * Re-arm the demo replies a reload left behind; called by the copy that owns
 * effects (`!os.mirror`) on mount. Overdue replies land on the spot.
 */
export function resume(os: Os) {
  for (const conv of convsCell.get()) if (conv.pending) arm(os, conv.id)
  tick()
}

/** A send: append, clear the draft, and earn the demo reply a person gives. */
export function send(os: Os, id: string, text: string) {
  const t = text.trim()
  if (!t) return
  const conv = getConv(id)
  if (!conv) return
  const msg: Message = { id: rid('m'), at: Date.now(), me: true, text: t }
  patchConv(id, (c) => ({ ...c, messages: [...c.messages, msg], draft: '' }))
  schedule(os, conv, t)
}

/**
 * The deep link `os.open('Messages', name)` hands the mounting copy: resolve
 * the name to the local recipient model and open its thread, creating one if
 * it does not exist. An unmatched name still lands somewhere honest - a new
 * thread labelled with the name it was given.
 */
export function openArg(arg: string) {
  const name = arg.trim()
  if (!name) return
  const person = personByName(name)
  const conv =
    (person ? convFor({ person, to: person.name }) : undefined) ??
    convsCell.get().find((c) => convName(c).toLowerCase() === name.toLowerCase()) ??
    convFor({ to: name })
  select(conv.id)
}
