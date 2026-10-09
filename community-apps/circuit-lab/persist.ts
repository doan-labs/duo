// Durable writes, conditional on the read that produced them.
//
// The host kv is compare-and-set: `entry` returns the value plus the {rev, gen}
// token a matching `set`/`del` must carry in `expect`. `rev` counts every write
// in the space, so ANY sibling write since the read - a camera save, a solved
// flag, a peer's library edit - conflicts at commit instead of clobbering. The
// loop below rereads and re-derives the intent on the fresh entry; it never
// resubmits a value computed from a stale read under a fresh token.
//
// Outcomes the host reports are kept honest:
// - E_CONFLICT: a sibling write landed since the read; rebase and retry.
// - E_GONE: the app generation died (restore); nothing may write - refuse.
// - E_TIMEOUT: the ack was lost, outcome unknown. Reading the key back and
//   finding our own serialized bytes proves the write committed; anything
//   else proves nothing - a peer's write can sit on top of ours, and the lost
//   request itself cannot be proven dead. So a mismatch is terminal 'unknown':
//   never resend under a fresh token, no blind new-request retry, no fallback.
// - A failed or timed-out entry read writes nothing: an unread value is never
//   treated as blank and never seeds a write.

import {
  type Doc,
  decodeLibrary,
  emptyLibrary,
  type Library,
  latestDoc,
  pruneTombs,
  serializeLibrary
} from './circuit.ts'

export type KvEntry = { k: string; v: string | null; rev: number; gen: number }
/** The slice of the SDK KV contract the durable paths need. */
export type KvSpace = {
  entry(k: string): Promise<KvEntry>
  set(k: string, v: string, expect?: { rev: number; gen: number }): Promise<unknown>
  del(k: string, expect?: { rev: number; gen: number }): Promise<unknown>
}
export type WriteOutcome = 'written' | 'skipped' | 'gone' | 'failed' | 'unknown'
const errCode = (e: unknown): string => ((e as { code?: unknown })?.code as string) ?? ''
/** Conflicts can only livelock under a continuously-writing peer; bound the rebase. */
const WRITE_ATTEMPTS = 12

/**
 * `intent` is the semantic edit as a pure function of the freshest stored
 * bytes: null means "already true, nothing to write". It runs once per attempt
 * so every retry rebases on the entry it was just preconditioned on.
 */
export async function writeConditional(
  space: KvSpace,
  key: string,
  intent: (v: string | null) => string | null
): Promise<WriteOutcome> {
  for (let i = 0; i < WRITE_ATTEMPTS; i++) {
    let e: KvEntry
    try {
      e = await space.entry(key)
    } catch {
      return 'failed'
    }
    let next: string | null
    try {
      next = intent(e.v)
    } catch {
      return 'failed'
    }
    if (next === null) return 'skipped'
    try {
      await space.set(key, next, { rev: e.rev, gen: e.gen })
      return 'written'
    } catch (err) {
      const code = errCode(err)
      if (code === 'E_CONFLICT') continue
      if (code === 'E_GONE') return 'gone'
      if (code === 'E_TIMEOUT') {
        // Only our own bytes prove the lost write landed. A different value
        // means the outcome is unprovable - the peer write that overwrote it
        // could itself sit on our commit - so stop, don't resend the intent
        // under a fresh token, and report it honestly as unknown.
        try {
          const back = await space.entry(key)
          if (back.v === next) return 'written'
        } catch {
          return 'failed'
        }
        return 'unknown'
      }
      return 'failed'
    }
  }
  return 'failed'
}

// ---- library intents --------------------------------------------------------
//
// Every durable library mutation is expressed as a pure intent over the
// freshest decoded Library, so a conflicted write recomputes instead of
// overwriting confirmed peer facts. Tombstones carry confirmed deletions: a
// doc captured before the delete never resurrects, while a genuinely newer
// incarnation (doc.updated past the tomb) is a live concurrent intent.

export type LibIntent = (lib: Library) => Library | null

/** Persist a circuit. Confirmed tombs and newer stored versions win. */
export const putDocIntent =
  (doc: Doc): LibIntent =>
  (lib) => {
    const tomb = lib.tombs[doc.id]
    if (tomb !== undefined && doc.updated <= tomb) return null
    const existing = lib.circuits[doc.id]
    if (existing && existing.updated >= doc.updated) return null
    return pruneTombs({ ...lib, circuits: { ...lib.circuits, [doc.id]: doc } })
  }

const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v as Record<string, unknown>)
            .sort()
            .map((k) => [k, canonical((v as Record<string, unknown>)[k])])
        )
      : v

/** Content equality for an observed incarnation, key order aside. */
export const sameDoc = (a: Doc, b: Doc): boolean => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

/**
 * Delete a circuit durably: the tomb outranks any snapshot captured before it.
 * `observed` binds the deletion to the incarnation the user saw - content,
 * not just a timestamp, so a same-updated peer write with different content
 * still reads as a different incarnation. A conflicted retry that finds a
 * stored doc unequal to the observed one refuses rather than re-delete the
 * peer's work; a null observation refuses any present doc. An already-deleted
 * doc still lands its tomb - the deletion fact must propagate to displays
 * that never observed the doc at all.
 */
export const dropDocIntent =
  (id: string, at: number, observed: Doc | null): LibIntent =>
  (lib) => {
    const existing = lib.circuits[id]
    if (existing === undefined && lib.tombs[id] !== undefined) return null
    if (existing !== undefined && (observed === null || !sameDoc(existing, observed))) return null
    const circuits = { ...lib.circuits }
    delete circuits[id]
    const tombs = { ...lib.tombs, [id]: Math.max(at, existing?.updated ?? 0, lib.tombs[id] ?? 0) }
    return pruneTombs({ ...lib, circuits, tombs })
  }

/**
 * The dropCircuit intent as one atomic plan: delete the observed incarnation
 * and, when the deleted doc was open, open a replacement. `picked` is reset
 * at the TOP of every attempt so a conflicted retry that then refuses the
 * delete cannot leave a never-committed fallback doc in `picked` for the
 * caller to adopt and mirror. When the outcome is 'skipped' nothing was
 * written, so `picked.doc` stays null and the caller must not adopt it.
 */
export const dropOpenIntent =
  (id: string, at: number, observed: Doc | null, fallback: Doc | null, picked: { doc: Doc | null }): LibIntent =>
  (lib) => {
    picked.doc = null
    const cur = lib.circuits[id]
    if (cur && (observed === null || !sameDoc(cur, observed))) return null
    let next = dropDocIntent(id, at, observed)(lib) ?? lib
    if (fallback) {
      picked.doc = latestDoc(next) ?? fallback
      next = putDocIntent(picked.doc)(next) ?? next
    }
    return next === lib ? null : next
  }

export const solvedIntent =
  (id: string): LibIntent =>
  (lib) =>
    lib.solved.includes(id) ? null : { ...lib, solved: [...lib.solved, id] }

export const mutedIntent =
  (on: boolean): LibIntent =>
  (lib) =>
    lib.muted === on ? null : { ...lib, muted: on }

class CorruptStored extends Error {}

/**
 * Conditional library write. A corrupt stored blob aborts the write rather
 * than decoding to an empty library and overwriting real content.
 */
export const libWrite = (space: KvSpace, key: string, intent: LibIntent): Promise<WriteOutcome> =>
  writeConditional(space, key, (v) => {
    let lib: Library | null
    if (v === null) lib = emptyLibrary()
    else {
      lib = decodeLibrary(v)
      if (lib === null) throw new CorruptStored()
    }
    const next = intent(lib)
    return next === null ? null : serializeLibrary(next)
  })
