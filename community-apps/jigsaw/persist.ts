// Shared-state write path: every mutation rebases on confirmed reads straight
// from the stores, then publishes the serialized envelopes. Two rules make it
// safe against the failure modes the display pair produces:
//
//   * A resolved read is authoritative - null means the key is genuinely
//     empty and may seed. A REJECTED read means the settled state is unknown;
//     the step fails instead of writing from a guessed snapshot. Writing from
//     a null-as-empty snapshot is how a one-game library overwrites every
//     other saved puzzle, and how stale prefs overwrite a peer's newer ones.
//   * Rejection is loud on purpose: the enqueue caller gets the failed step's
//     promise, the intent is dropped (never retried inside the step, so a
//     canceled mutation cannot resurrect), and the queue itself survives -
//     see queue.ts.

import { type ArtId, isArtId } from './art.ts'
import {
  COUNTS,
  type Count,
  type Game,
  gameKeyOf,
  type Live,
  newerDoc,
  parseLive,
  parseSaves,
  type Saves,
  serializeSaves
} from './puzzle.ts'
import { enqueue } from './queue.ts'

export const LIVE_KEY = 'jigsaw-live'
export const SAVES_KEY = 'jigsaw-saves'
export const PREFS_KEY = 'jigsaw-prefs'

export type KVLike = {
  get(k: string): Promise<string | null>
  set(k: string, v: string): Promise<unknown>
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
export type Clock = { rev: number; by: string }

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
  /** A foreign saves envelope won: bump the clock and keep the raw doc. */
  acceptSaves(sd: Saves): void
  /** Persist the mutation: state setters plus both KV writes. */
  apply(payload: GameApply): void
  /** Publish only the live doc (heals never touch the library). */
  writeLive(raw: string): void
  /** Publish only the saves doc. */
  writeSaves(raw: string): void
  /** The last accepted saves envelope, for republishing on a heal. */
  savesDoc(): Saves | null
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
        const liveRaw = await deps.liveKV.get(deps.liveKey)
        const doc = parseLive(liveRaw)
        if (doc && doc.by !== deps.me && newerDoc(doc.rev, doc.by, deps.clocks.live.rev, deps.clocks.live.by)) {
          deps.adopt(doc)
          return
        }
        const game = deps.refs.game.current
        if (!game) return
        deps.clocks.live.rev = Math.max(deps.clocks.live.rev, doc?.rev ?? 0) + 1
        deps.clocks.live.by = deps.me
        deps.writeLive(
          JSON.stringify({
            v: 1,
            by: deps.me,
            rev: deps.clocks.live.rev,
            held: deps.refs.held.current,
            game
          } satisfies Live)
        )
      })
    },
    healSaves() {
      return enqueue(deps.queue, async () => {
        const raw = await deps.savesKV.get(deps.savesKey)
        const sd = parseSaves(raw)
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
        // Republish union-style: their keys survive, our pending ones win.
        deps.writeSaves(
          serializeSaves({ ...mine, games: { ...sd.games, ...mine.games }, rev: deps.clocks.saves.rev, by: deps.me })
        )
      })
    },
    act(fn, bind) {
      return enqueue(deps.queue, async () => {
        const [liveRaw, savesRaw] = await Promise.all([deps.liveKV.get(deps.liveKey), deps.savesKV.get(deps.savesKey)])
        const doc = parseLive(liveRaw)
        let base = deps.refs.game.current
        let heldBase = deps.refs.held.current
        if (doc && doc.by !== deps.me && newerDoc(doc.rev, doc.by, deps.clocks.live.rev, deps.clocks.live.by)) {
          deps.adopt(doc)
          base = doc.game
          heldBase = doc.held
        }
        const sd = parseSaves(savesRaw)
        if (newerDoc(sd.rev, sd.by, deps.clocks.saves.rev, deps.clocks.saves.by)) deps.acceptSaves(sd)
        // A piece id admitted against one puzzle means nothing on another: if
        // the live puzzle changed (peer switch, seed rollover) the intent dies
        // here rather than mutating a game it was never aimed at.
        if (bind !== undefined && (!base || gameKeyOf(base) !== bind)) return
        // The queue serializes reads/rebases, not durable delivery: a
        // confirmed read can still lag behind writes this copy already
        // accepted (mirror sets fire-and-forget). When the store doc is not
        // newer than our last accepted envelope, that envelope is the better
        // library - it carries the pending games a bare rebase would drop.
        // A newer store doc has just been adopted above, so savesDoc() is the
        // union winner in both cases; on a cold start it falls back to the
        // confirmed read.
        const lib = (deps.savesDoc() ?? sd).games
        const r = fn({ game: base, held: heldBase, saves: lib })
        if (!r) return
        deps.clocks.live.rev = Math.max(deps.clocks.live.rev, doc?.rev ?? 0) + 1
        deps.clocks.live.by = deps.me
        deps.clocks.saves.rev += 1
        deps.clocks.saves.by = deps.me
        const key = `${r.next.art}:${r.next.count}`
        const savesDoc: Saves = {
          rev: deps.clocks.saves.rev,
          by: deps.me,
          current: key,
          games: { ...lib, [key]: r.next }
        }
        const payload: GameApply = {
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
        deps.apply(payload)
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
        const env = parsePrefsDoc(await deps.kv.get(deps.key))
        if (env.by !== deps.me && newerDoc(env.rev, env.by, deps.clock.rev, deps.clock.by)) {
          deps.clock.rev = env.rev
          deps.clock.by = env.by
          deps.accept(env)
          return
        }
        if (deps.clock.rev === 0) return
        deps.clock.rev = Math.max(deps.clock.rev, env.rev) + 1
        deps.clock.by = deps.me
        deps.apply({
          prefs: deps.current(),
          raw: JSON.stringify({ ...deps.current(), rev: deps.clock.rev, by: deps.me })
        })
      })
    },
    setPrefs(patch) {
      return enqueue(deps.queue, async () => {
        const env = parsePrefsDoc(await deps.kv.get(deps.key))
        let base = deps.current()
        if (env.by !== deps.me && newerDoc(env.rev, env.by, deps.clock.rev, deps.clock.by)) {
          deps.clock.rev = env.rev
          deps.clock.by = env.by
          deps.accept(env)
          base = env.prefs
        }
        const next = { ...base, ...patch }
        deps.clock.rev += 1
        deps.clock.by = deps.me
        deps.apply({ prefs: next, raw: JSON.stringify({ ...next, rev: deps.clock.rev, by: deps.me }) })
      })
    }
  }
}
