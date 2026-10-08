import type { Color } from './engine.ts'
import { adoptGame, derive, type Mode, newGame, OPENING_ID, type SavedGame, sameMoves } from './game.ts'

export { sameMoves }

/** Status one mirrored key reports through useKV. */
export type KvStatus = 'hydrating' | 'ready' | 'saving' | 'error'

export type StoreGate = 'loading' | 'error' | 'ready'

/**
 * The store gate decides what local UI may trust: 'loading' waits for the
 * first read, 'ready' means a read (mirror or direct) answered so local state
 * may render, and 'error' means hydration exhausted retries with no answer -
 * which reads as 'unknown', never as 'empty store'. A failed hydrate must
 * never mint an opening board, a zero tally, or default prefs as authority.
 * `recovered` is the app's own confirmation: once any direct read succeeds
 * after an error, the gate re-opens without needing a reload or a mirror
 * resubscribe.
 */
export const storeGate = (status: KvStatus, recovered: boolean): StoreGate =>
  status === 'hydrating' ? 'loading' : status === 'error' && !recovered ? 'error' : 'ready'

/**
 * The snapshot a destructive swap was confirmed against: the match
 * incarnation AND the exact move history the user saw. The move list is
 * copied at ask time so a later local adoption cannot stretch it.
 */
export type Guard = { id: string; moves: number[] }

export type NewPatch = { mode?: Mode; you?: Color }

/**
 * A destructive replacement may only write over history the user actually
 * saw: the same incarnation and a wire document that is the confirmed
 * history itself or a real prefix of it (a peer undo to a seen position).
 * Anything else refuses rather than clobbering unseen work: a different
 * match id, newer unseen progress, or an unseen alternate branch of the
 * same incarnation - same or fewer plies is not proof of a seen history.
 */
export const replaceable = (base: SavedGame | null, guard: Guard): boolean =>
  !!base &&
  base.id === guard.id &&
  base.moves.length <= guard.moves.length &&
  base.moves.every((v, i) => v === guard.moves[i])

/**
 * The serial-job step for a destructive swap: build the replacement from the
 * freshest base (so settings follow the wire document, not a stale render)
 * or refuse it. A refused step writes nothing - re-offering is the caller's
 * job once the fresh state is adopted.
 */
export const replaceStep = (base: SavedGame | null, guard: Guard, patch: NewPatch | undefined, me: string) =>
  replaceable(base, guard) ? newGame(me, patch?.mode ?? base!.mode, base!.level, patch?.you ?? base!.you) : null

/** Whether a swap intent needs the confirmation Sheet or may swap directly. */
export const offerPlan = (game: SavedGame): 'confirm' | 'direct' => {
  const d = derive(game.moves)
  return d.plies > 0 && !d.over ? 'confirm' : 'direct'
}

/** The fresh local board shown only after an empty store is confirmed. */
export const openingSeed = (me: string): SavedGame => ({ ...newGame(me, 'solo', 'Medium', 'b'), id: OPENING_ID })

/**
 * What a just-read wire document means for local state: 'keep' when the
 * rendered board already is that exact history, 'adopt' when it differs -
 * a same-id alternate branch of equal plies is still unseen progress the
 * board must show before anything is re-offered against it - and 'seed'
 * when the store confirmed it holds nothing while local state is not the
 * canonical opening. The seed answer reaches past a stale rendered match
 * too: a confirmed-empty read replaces it with the shared opening, the
 * same authority a first empty read used. Unknown/error reads never reach
 * this decision - callers gate on settleGame's kind first.
 */
export const adoptDecision = (stored: SavedGame | null, local: SavedGame | null): 'keep' | 'adopt' | 'seed' => {
  if (stored) {
    const same =
      local !== null &&
      stored.id === local.id &&
      stored.mode === local.mode &&
      stored.level === local.level &&
      stored.you === local.you &&
      sameMoves(stored.moves, local.moves)
    return same ? 'keep' : 'adopt'
  }
  return local !== null && local.id === OPENING_ID && local.moves.length === 0 ? 'keep' : 'seed'
}

/**
 * Whether a mirror read actually answered. 'hydrating' is unanswered and
 * 'error' is unanswerable so far: neither may seed, adopt, or clear state.
 */
export const settledRead = (status: KvStatus): boolean => status === 'ready' || status === 'saving'

export type WireGame = { kind: 'empty' } | { kind: 'corrupt' } | { kind: 'ok'; game: SavedGame }

/**
 * The single authority path for a raw game wire value. Three honest
 * answers: 'empty' (the store confirmed it holds nothing - the only case
 * that may seed), 'corrupt' (the store answered with bytes that are not a
 * readable match - adopted nowhere, surfaced to the user, never treated
 * as authority and never blindly overwritten), or 'ok' (a readable match).
 * Anything a tolerant parse would paper over - unparseable JSON, no id,
 * no moves array - is corrupt, because an invented fallback would mint a
 * different random incarnation on every read and churn every guard.
 */
export const settleGame = (raw: string | null, me: string): WireGame => {
  if (raw === null) return { kind: 'empty' }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as Record<string, unknown>).id !== 'string' ||
      !Array.isArray((parsed as Record<string, unknown>).moves)
    )
      return { kind: 'corrupt' }
  } catch {
    return { kind: 'corrupt' }
  }
  return { kind: 'ok', game: adoptGame(raw, me) }
}

export type RecoverReads = { record: string | null; prefs: string | null; game: string | null }

/**
 * The recovery batch: one direct read per durable key. Any failed read
 * rejects the whole batch so a half-recovered copy can never write on top
 * of state it never saw.
 */
export const recoverReads = (
  get: (key: string) => Promise<string | null>,
  keys: { record: string; prefs: string; game: string }
): Promise<RecoverReads> =>
  Promise.all([get(keys.record), get(keys.prefs), get(keys.game)]).then(([record, prefs, game]) => ({
    record,
    prefs,
    game
  }))

/**
 * The durable contract this app writes against: `entry` returns the value
 * plus the space-wide revision and generation that pin it to one atomic
 * authoritative moment, and `set` accepts that `{rev,gen}` token so the
 * write only lands if nothing - on any key - moved in between. Structural,
 * so the real SDK space and a controlled test adapter both satisfy it.
 */
export type EntryToken = { rev: number; gen: number }
export type KvEntry = { v: string | null; rev: number; gen: number }
export type KvSpace = {
  entry: (key: string) => Promise<KvEntry>
  set: (key: string, value: string, expect?: EntryToken) => Promise<unknown>
}

/**
 * What one commit attempt plans on a just-read entry: `wire` is the value
 * derived from that entry and only it; `land` runs local state commits
 * strictly after the durable write is confirmed, so a refused or ambiguous
 * write never publishes a board the store does not hold. Returning null is
 * an honest refusal: nothing is written and the caller re-offers.
 */
export type PlannedWrite = { wire: string; land?: () => void }

/** Bounds one conditional-commit retry: see commitCAS. */
export const CAS_TRIES = 4

const errCode = (e: unknown): string => {
  const c = (e as { code?: unknown } | null | undefined)?.code
  return typeof c === 'string' ? c : 'E_UNKNOWN'
}

/**
 * One conditional write plus its readback. 'wrote' means the store confirmed
 * the exact wire landed, by acknowledgement or by reading the same value
 * back. 'again' is the typed zero-effect E_CONFLICT alone: the space moved,
 * so the intent may be recomputed on a fresh entry. 'gone' is E_GONE, a dead
 * generation - terminal, the intent is stale forever and is never retried.
 * For an acknowledgement the wire cannot account for (timeout, host error)
 * the same operation is read back first: the host's serialized queue makes
 * that read reflect everything it accepted before it, so a matching value
 * proves the write landed. A different value proves nothing - a peer may
 * have overwritten an already committed write - so the outcome stays
 * 'unknown' and the intent is not replayed under a fresh token. Argument and
 * session errors are thrown as the real failures they are.
 */
const conditionalSet = async (
  kv: KvSpace,
  key: string,
  wire: string,
  token: EntryToken
): Promise<'wrote' | 'again' | 'gone' | 'unknown'> => {
  try {
    await kv.set(key, wire, token)
    return 'wrote'
  } catch (e) {
    const code = errCode(e)
    if (code === 'E_CONFLICT') return 'again'
    if (code === 'E_GONE') return 'gone'
    if (code === 'E_ARGS' || code === 'E_CLOSED' || code === 'E_PROTOCOL') throw e
    let back: KvEntry
    try {
      back = await kv.entry(key)
    } catch {
      return 'unknown'
    }
    return back.v === wire ? 'wrote' : 'unknown'
  }
}

/**
 * The bounded compare-and-set loop every durable mutation funnels through.
 * Each attempt reads the entry fresh and calls `plan` on it, so the intent -
 * a move, a merge, a guarded reset - is always recomputed against the newest
 * authoritative state, never replayed as a frozen document. `plan` may
 * refuse (null) when the intent no longer applies to what the store actually
 * holds; the caller then re-offers or rejects honestly. A dead generation
 * also settles 'refused' - a terminal, provably unwritten intent. 'unknown'
 * reports an unresolved commit: the store may or may not hold the write, no
 * `land` runs, and the caller must not claim success; the next read settles
 * the truth. Exhausting the bound throws instead of pretending: the space
 * kept moving or storage kept failing, and the job reports a real failure.
 */
export const commitCAS = async (
  kv: KvSpace,
  key: string,
  plan: (e: KvEntry) => PlannedWrite | null,
  tries: number = CAS_TRIES
): Promise<'wrote' | 'refused' | 'unknown'> => {
  for (let attempt = 0; attempt < tries; attempt++) {
    const e = await kv.entry(key)
    const next = plan(e)
    if (!next) return 'refused'
    const verdict = await conditionalSet(kv, key, next.wire, { rev: e.rev, gen: e.gen })
    if (verdict === 'again') continue
    if (verdict === 'gone') return 'refused'
    if (verdict === 'unknown') return 'unknown'
    next.land?.()
    return 'wrote'
  }
  throw new Error(`E_CONFLICT: "${key}" kept changing before the write could land`)
}
