import type { Color } from './engine.ts'
import { adoptGame, derive, type Mode, newGame, OPENING_ID, type SavedGame } from './game.ts'

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
