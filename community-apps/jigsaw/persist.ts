// Shared-state write path: every mutation runs as a conditional-write
// transaction. `entry()` returns the confirmed value AND the {rev, gen}
// token in one call; `set`/`del` with that token is the atomic check inside
// the write's own host transaction. The rules that make it safe:
//
//   * A resolved entry is authoritative - null means the key is genuinely
//     empty and may seed. A REJECTED read means the settled state is
//     unknown; the step fails instead of writing from a guessed snapshot.
//   * E_CONFLICT means a peer landed first: the intent is rebased on a
//     FRESH entry - unioned games preserve the peer's confirmed facts and
//     the semantic mutation re-runs, never a frozen doc resubmitted under
//     a new token. Bounded attempts, then an honest failure.
//   * E_GONE means the generation that admitted the write is dead (a
//     restore moved past it): the intent cannot validly rebase and the
//     step refuses instead of resurrecting a stale mutation.
//   * E_TIMEOUT / unknown outcomes get ONE same-operation readback: the
//     entry must already hold our payload to count as landed. Anything
//     else fails the step - never a blind new-id retry, never a rollback
//     that could clobber a confirmed peer write.
//   * Fire-and-forget mirror setters are NOT durable acknowledgement.
//     The awaited `set` resolution is the only durable ACK; UI state still
//     commits optimistically through `apply` before the write.

import { type ArtId, isArtId } from './art.ts'
import {
  COUNTS,
  type Count,
  configKey,
  type Game,
  gameKeyOf,
  type Live,
  newerDoc,
  newerGame,
  parseLive,
  parseSaves,
  type Saves,
  sameGame,
  serializeSaves,
  unionGames
} from './puzzle.ts'
import { enqueue } from './queue.ts'

export const LIVE_KEY = 'jigsaw-live'
export const SAVES_KEY = 'jigsaw-saves'
export const PREFS_KEY = 'jigsaw-prefs'

export type EntryToken = { v: string | null; rev: number; gen: number }
export type KVLike = {
  get(k: string): Promise<string | null>
  entry(k: string): Promise<EntryToken>
  set(k: string, v: string, expect?: { rev: number; gen: number }): Promise<unknown>
  del?(k: string, expect?: { rev: number; gen: number }): Promise<unknown>
}

/** Rebound-and-retry cap for conditional writes: enough to absorb a real
 * race, small enough that a dead end reports instead of spinning. */
const CAS_ATTEMPTS = 4

export const errCode = (e: unknown): string =>
  e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string'
    ? (e as { code: string }).code
    : 'E_STORAGE'

/**
 * Awaits one conditional write and classifies the outcome. Resolves true
 * once the payload is confirmed durable (the set resolved, or a same-op
 * readback after an unknown result found our bytes already there).
 * E_CONFLICT returns false so the caller rebases; everything else throws
 * and the enqueue caller's promise fails honestly.
 */
async function casSet(kv: KVLike, key: string, raw: string, expect: { rev: number; gen: number }): Promise<boolean> {
  try {
    await kv.set(key, raw, expect)
    return true
  } catch (e) {
    const code = errCode(e)
    if (code === 'E_CONFLICT') return false
    if (code === 'E_GONE') throw e
    if (code === 'E_TIMEOUT') {
      let back: EntryToken
      try {
        back = await kv.entry(key)
      } catch {
        throw e
      }
      if (back.v === raw) return true
      throw e
    }
    throw e
  }
}
/** The SDK view fields admission cares about; null-tolerant for pre-connect. */
export type ViewSnapshot = { active: boolean; visible: boolean } | null | undefined

/** New input is admitted only on the copy that is both active and visible. A
 * folded-away or parked copy keeps reconciling shared docs but takes no new
 * gestures - a stale tap or key must die before it schedules work. */
export const admitInput = (v: ViewSnapshot): boolean => !!v && v.active === true && v.visible === true

// ---------- preferences wire ----------

export type Prefs = { art: ArtId; count: Count; muted: boolean; guide: boolean }
export const PREFS0: Prefs = { art: 'harbour', count: 12, muted: false, guide: true }

export function cleanPrefs(raw: string | null): Prefs {
  try {
    const v: unknown = raw ? JSON.parse(raw) : {}
    if (typeof v !== 'object' || v === null) return PREFS0
    const o = v as Record<string, unknown>
    const art = isArtId(o.art) ? o.art : PREFS0.art
    const count = (COUNTS as readonly number[]).includes(o.count as number) ? (o.count as Count) : PREFS0.count
    return { art, count, muted: o.muted === true, guide: o.guide !== false }
  } catch {
    return PREFS0
  }
}

/** The prefs wire envelope: prefs plus the revision and writer for ordering. */
export type PrefsDoc = { rev: number; by: string; prefs: Prefs }

export function parsePrefsDoc(raw: string | null): PrefsDoc {
  const prefs = cleanPrefs(raw)
  try {
    const v: unknown = raw ? JSON.parse(raw) : null
    if (typeof v !== 'object' || v === null) return { rev: 0, by: '', prefs }
    const o = v as Record<string, unknown>
    return {
      rev: typeof o.rev === 'number' && Number.isSafeInteger(o.rev) ? o.rev : 0,
      by: typeof o.by === 'string' ? o.by : '',
      prefs
    }
  } catch {
    return { rev: 0, by: '', prefs }
  }
}

/** Lamport clock for one shared key: the revision/writer last accepted. */
/** Seed retry policy: a proven pre-apply read/intent failure (nothing was
 * committed) may re-derive on fresh authoritative entries, bounded by the
 * caller; a dead generation is terminal and anything ambiguous - a commit
 * outcome, an exhausted CAS - is never auto-retried. */
export function seedRetryable(e: unknown): boolean {
  return (e as { preApply?: boolean })?.preApply === true && errCode(e) !== 'E_GONE'
}

export type Clock = { rev: number; by: string }

/** A live envelope carrying a strictly older incarnation than the confirmed
 * saves library is stale at the adoption boundary: converging on it would
 * regress the adopted game - and every write seeded from it later - to a
 * dead generation. Adopt the envelope (its revision still advances the
 * clock) but substitute the newer confirmed incarnation for the game. */
export function fenceAdoptGame(doc: Live, lib: Record<string, Game> | undefined): Live {
  const alt = lib?.[configKey(doc.game.art, doc.game.count)]
  return alt && alt.gen > doc.game.gen ? { ...doc, game: alt } : doc
}

/** Merge an adopted saves envelope with the mirror's pending library. Games
 * are per-key unioned so exclusive keys the incoming doc lacks stay pending;
 * `missing` reports whether the adopted doc was behind that union (and thus
 * needs one bounded heal to restore the durable copy). */
export function mergedSaves(prevRaw: string | null, env: Saves): { doc: Saves; missing: boolean } {
  const merged = unionGames(env.games, parseSaves(prevRaw)?.games ?? {})
  const missing = Object.keys(merged).some((k) => !(k in env.games) || !sameGame(merged[k]!, env.games[k]!))
  return { doc: { ...env, games: merged }, missing }
}

// ---------- live + saves pair ----------

export type MutationCtx = { game: Game | null; held: number | null; saves: Record<string, Game> }
export type MutationResult = { next: Game; held: number | null } | null
export type GameApply = {
  /** The mutation result to publish. */
  game: Game
  held: number | null
  /** Serialized live + saves payloads to write. */
  live: string
  saves: string
  /** The parsed saves envelope (for mirrors that keep the raw doc). */
  savesDoc: Saves
}

/**
 * The serialized game mutation loop shared by the UI and tests. One queued
 * step: confirmed reads (rejection fails the step), foreign adoption reported
 * through hooks, an optional bind to the puzzle the intent was admitted
 * against, then the two writes with bumped clocks.
 */
export function createGamePersistence(deps: {
  me: string
  liveKV: KVLike
  savesKV: KVLike
  liveKey: string
  savesKey: string
  queue: { current: Promise<unknown> }
  clocks: { live: Clock; saves: Clock }
  /** Local mirrors kept ahead of the state setters for same-tick reads. */
  refs: { game: { current: Game | null }; held: { current: number | null } }
  /** A foreign live doc won the revision race: apply it to UI and clocks. */
  adopt(doc: Live): void
  /** A foreign saves envelope won: bump the clock and keep the raw doc.
   * Implementations must store `mergedSaves(prev, sd).doc`, never the bare
   * envelope, so pending keys survive adoption. */
  acceptSaves(sd: Saves): void
  /** Commit the mutation's optimistic UI state synchronously. Called once
   * per CAS attempt with that attempt's rebased payload; durable truth is
   * the awaited conditional write that follows, never this hook. */
  apply(payload: GameApply): unknown
  /** The last CONFIRMED saves envelope (foreign adoptions and acked writes
   * only, never an optimistic payload), for the rebase baseline and heal
   * republish. */
  savesDoc(): Saves | null
  /** Record a durably published saves doc in local bookkeeping. */
  recordSaves(raw: string): void
  /** A union repair surfaced a newer game for the current puzzle: swap it in
   * locally so the UI follows the state that actually survived. */
  adoptGame?(g: Game): void
  /** Kick the live-doc heal after a write whose session half never
   * confirmed (the saves half verified landed via readback). */
  repairLive?(): void
}): {
  /** Runs a mutation after confirmed reads. `bind` is the gameKeyOf the intent
   * was admitted against: a different puzzle live by step time drops it. */
  act(fn: (ctx: MutationCtx) => MutationResult, bind?: string): Promise<void>
  /** Heals a stale racing live doc with our newer one. Same queue and same
   * confirmed-read rule as act, but it writes ONLY the live doc: routing a
   * repair through act would also bump the saves revision, and each foreign
   * saves echo can trigger a peer heal - an infinite cross-doc ping-pong. */
  heal(): Promise<void>
  /** Heals a stale saves doc the same way: a confirmed read first (a doc
   * already at-or-past our clock is adopted, never overwritten), then at
   * most one higher-revision write. Unqueued blind repairs regress below
   * whatever the peer just landed, and each regression re-triggers its
   * stale check - the other half of the ping-pong. */
  healSaves(): Promise<void>
} {
  return {
    heal() {
      return enqueue(deps.queue, async () => {
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          const ent = await deps.liveKV.entry(deps.liveKey)
          const doc = parseLive(ent.v)
          if (doc && doc.by !== deps.me && newerDoc(doc.rev, doc.by, deps.clocks.live.rev, deps.clocks.live.by)) {
            // Same boundary fence as act: a stale incarnation in the live
            // doc must not pull the adopted game backwards.
            deps.adopt(fenceAdoptGame(doc, deps.savesDoc()?.games))
            return
          }
          const game = deps.refs.game.current
          if (!game) return
          deps.clocks.live.rev = Math.max(deps.clocks.live.rev, doc?.rev ?? 0) + 1
          deps.clocks.live.by = deps.me
          const raw = JSON.stringify({
            v: 1,
            by: deps.me,
            rev: deps.clocks.live.rev,
            held: deps.refs.held.current,
            game
          } satisfies Live)
          if (await casSet(deps.liveKV, deps.liveKey, raw, { rev: ent.rev, gen: ent.gen })) return
        }
        throw new Error('E_CONFLICT: live heal could not rebase')
      })
    },
    healSaves() {
      return enqueue(deps.queue, async () => {
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          const ent = await deps.savesKV.entry(deps.savesKey)
          const sd = parseSaves(ent.v)
          // The confirmed doc is already at-or-past our clock: adopt it and
          // write nothing. Healing on top of a peer's newer doc is what a
          // stale mirror event makes the unwary write path do.
          if (sd.by !== deps.me && newerDoc(sd.rev, sd.by, deps.clocks.saves.rev, deps.clocks.saves.by)) {
            deps.acceptSaves(sd)
            return
          }
          const mine = deps.savesDoc()
          if (!mine) return
          deps.clocks.saves.rev = Math.max(deps.clocks.saves.rev, sd.rev) + 1
          deps.clocks.saves.by = deps.me
          // The store doc can hold saves our mirror never saw (a peer write
          // that landed between our last accepted envelope and this read).
          // Republish union-style: every key survives, per-key newer wins.
          const raw = serializeSaves({
            ...mine,
            games: unionGames(sd.games, mine.games),
            rev: deps.clocks.saves.rev,
            by: deps.me
          })
          if (await casSet(deps.savesKV, deps.savesKey, raw, { rev: ent.rev, gen: ent.gen })) {
            deps.recordSaves(raw)
            return
          }
        }
        throw new Error('E_CONFLICT: saves heal could not rebase')
      })
    },
    act(fn, bind) {
      return enqueue(deps.queue, async () => {
        // Once the step has reached a conditional write its outcome is
        // ambiguous; before that every failure is a proven read/intent
        // failure that a retry on fresh entries cannot make worse.
        let commitAttempted = false
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          // One confirmed read of BOTH entries: value plus the {rev, gen}
          // precondition token for this attempt's conditional writes.
          let payload: GameApply
          let liveEnt: EntryToken
          let savesEnt: EntryToken
          try {
            ;[liveEnt, savesEnt] = await Promise.all([
              deps.liveKV.entry(deps.liveKey),
              deps.savesKV.entry(deps.savesKey)
            ])
            const sd = parseSaves(savesEnt.v)
            if (newerDoc(sd.rev, sd.by, deps.clocks.saves.rev, deps.clocks.saves.by)) deps.acceptSaves(sd)
            // The library is always the per-key union of the store doc and
            // our last CONFIRMED envelope, so exclusive keys a racer holds
            // survive whoever wins the commit race. savesDoc() never reports
            // an optimistic payload - this baseline is durable truth only.
            const lib = unionGames(sd.games, deps.savesDoc()?.games ?? {})
            const doc = parseLive(liveEnt.v)
            // The rebase base is confirmed state, never the optimistic mirror:
            // a foreign live doc wins adoption (fenced against dead
            // incarnations), then the unioned library's same-key entry. The
            // mirror seeds the base ONLY when no confirmed doc covers the
            // running puzzle - otherwise the semantic intent re-runs on the
            // confirmed copy, so a peer placement that landed mid-flight is
            // preserved instead of overwritten by our stale whole-doc.
            let base: Game | null = null
            let heldBase: number | null = null
            if (doc && doc.by !== deps.me && newerDoc(doc.rev, doc.by, deps.clocks.live.rev, deps.clocks.live.by)) {
              const fenced = fenceAdoptGame(doc, lib)
              deps.adopt(fenced)
              base = fenced.game
              heldBase = fenced === doc ? doc.held : null
            }
            const running = base ?? deps.refs.game.current
            if (!base) {
              const alt = running ? lib[configKey(running.art, running.count)] : undefined
              base = alt ?? running
              heldBase = alt && !sameGame(alt, running!) ? null : deps.refs.held.current
            } else {
              const alt = lib[configKey(base.art, base.count)]
              if (alt && newerGame(alt, base) !== base) {
                base = alt
                heldBase = null
              }
            }
            // A piece id admitted against one puzzle means nothing on another:
            // if the live puzzle changed (peer switch, seed rollover, a reset
            // that bumped the incarnation) the intent dies here rather than
            // mutating a game it was never aimed at.
            if (bind !== undefined && (!base || gameKeyOf(base) !== bind)) return
            const r = fn({ game: base, held: heldBase, saves: lib })
            if (!r) return
            deps.clocks.live.rev = Math.max(deps.clocks.live.rev, doc?.rev ?? 0) + 1
            deps.clocks.live.by = deps.me
            deps.clocks.saves.rev = Math.max(deps.clocks.saves.rev, sd.rev) + 1
            deps.clocks.saves.by = deps.me
            const key = `${r.next.art}:${r.next.count}`
            const savesDoc: Saves = {
              rev: deps.clocks.saves.rev,
              by: deps.me,
              current: key,
              games: { ...lib, [key]: r.next }
            }
            payload = {
              game: r.next,
              held: r.held,
              live: JSON.stringify({
                v: 1,
                by: deps.me,
                rev: deps.clocks.live.rev,
                held: r.held,
                game: r.next
              } satisfies Live),
              saves: serializeSaves(savesDoc),
              savesDoc
            }
          } catch (e) {
            // A rejection with no commit attempt behind it is a proven
            // pre-apply read/intent failure; callers may retry it safely.
            // Once any conditional write ran, the outcome stays ambiguous
            // and the error is never marked retry-safe.
            if (!commitAttempted) (e as { preApply?: boolean }).preApply = true
            throw e
          }
          // Optimistic UI commit for this attempt; durable truth is the
          // awaited conditional write below.
          deps.apply(payload)
          try {
            commitAttempted = true
            await Promise.all([
              deps.liveKV.set(deps.liveKey, payload.live, { rev: liveEnt.rev, gen: liveEnt.gen }),
              deps.savesKV.set(deps.savesKey, payload.saves, { rev: savesEnt.rev, gen: savesEnt.gen })
            ])
            deps.recordSaves(payload.saves)
            return
          } catch (e) {
            const code = errCode(e)
            // A peer landed between our entry read and the commit: loop
            // back, adopt/union the fresh entries, and re-run the intent.
            if (code === 'E_CONFLICT') continue
            // The generation that admitted this write is dead: refuse.
            if (code === 'E_GONE') throw e
            if (code === 'E_TIMEOUT') {
              // Unknown ACK: one same-operation readback decides landed-or-
              // not. If our saves payload is already durable the write
              // completed; if not, the step fails - never a blind retry.
              let back: EntryToken
              try {
                back = await deps.savesKV.entry(deps.savesKey)
              } catch {
                throw e
              }
              if (back.v !== payload.saves) throw e
              deps.recordSaves(payload.saves)
              // Saves verified landed; a session doc that stayed behind
              // converges through the normal heal.
              try {
                const liveBack = await deps.liveKV.entry(deps.liveKey)
                if (liveBack.v !== payload.live) deps.repairLive?.()
              } catch {
                deps.repairLive?.()
              }
              return
            }
            throw e
          }
        }
        throw new Error('E_CONFLICT: act could not rebase')
      })
    }
  }
}

// ---------- preferences pair ----------

export type PrefsApply = { prefs: Prefs; raw: string }

/** The prefs half of the pair: same confirmed-read rule, one envelope. */
export function createPrefsPersistence(deps: {
  me: string
  kv: KVLike
  key: string
  queue: { current: Promise<unknown> }
  clock: Clock
  /** The freshest local prefs for merging when no foreign doc wins. */
  current(): Prefs
  /** A foreign envelope won the revision race: record its clock. */
  accept(env: PrefsDoc): void
  /** Persist the merged prefs: state setter plus the KV write. */
  apply(payload: PrefsApply): void
}): { setPrefs(patch: Partial<Prefs>): Promise<void>; heal(): Promise<void> } {
  return {
    // A stale racing prefs doc is healed like the others: queued, confirmed
    // read, adopt if a peer already won, else one higher-revision write of
    // our current prefs. Never a blind clock+1 write off a mirror event.
    heal() {
      return enqueue(deps.queue, async () => {
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          const ent = await deps.kv.entry(deps.key)
          const env = parsePrefsDoc(ent.v)
          if (env.by !== deps.me && newerDoc(env.rev, env.by, deps.clock.rev, deps.clock.by)) {
            deps.clock.rev = env.rev
            deps.clock.by = env.by
            deps.accept(env)
            return
          }
          if (deps.clock.rev === 0) return
          deps.clock.rev = Math.max(deps.clock.rev, env.rev) + 1
          deps.clock.by = deps.me
          const raw = JSON.stringify({ ...deps.current(), rev: deps.clock.rev, by: deps.me })
          deps.apply({ prefs: deps.current(), raw })
          if (await casSet(deps.kv, deps.key, raw, { rev: ent.rev, gen: ent.gen })) return
        }
        throw new Error('E_CONFLICT: prefs heal could not rebase')
      })
    },
    setPrefs(patch) {
      return enqueue(deps.queue, async () => {
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          const ent = await deps.kv.entry(deps.key)
          const env = parsePrefsDoc(ent.v)
          let base = deps.current()
          if (env.by !== deps.me && newerDoc(env.rev, env.by, deps.clock.rev, deps.clock.by)) {
            deps.clock.rev = env.rev
            deps.clock.by = env.by
            deps.accept(env)
            base = env.prefs
          }
          // The intent is the patch: on a conflict the loop re-reads and
          // re-applies it onto the peer's confirmed doc, keeping peer fields
          // the patch never touched.
          const next = { ...base, ...patch }
          deps.clock.rev = Math.max(deps.clock.rev, env.rev) + 1
          deps.clock.by = deps.me
          const raw = JSON.stringify({ ...next, rev: deps.clock.rev, by: deps.me })
          deps.apply({ prefs: next, raw })
          if (await casSet(deps.kv, deps.key, raw, { rev: ent.rev, gen: ent.gen })) return
        }
        throw new Error('E_CONFLICT: prefs write could not rebase')
      })
    }
  }
}
