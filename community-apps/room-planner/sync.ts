import type { Core, Mirror, PlanDoc } from './plan.ts'
import { coreOf, sameCore } from './plan.ts'

/**
 * The wire-order marker of the doc this copy currently shows: what an
 * incoming mirror must beat to take the screen. `updated` versions the
 * plan's core (name/room/items); `at` stamps when a state became current for
 * its writer; `by` breaks exact ties so both copies pick the same winner.
 */
export type DocHead = { id: string; updated: number; at: number; by: string }

export const headOf = (m: Mirror): DocHead => ({
  id: m.doc.id,
  updated: m.doc.updated,
  at: m.at,
  by: m.by
})

/**
 * Session adoption order. Two different axes, compared only inside the one
 * that applies:
 * - same plan id: the doc's own version (`updated`) orders the core. An
 *   equal stamp with equal content is a view/selection republication and is
 *   taken only from a genuinely newer publication; an equal stamp with a
 *   different core is a same-version conflict resolved by (by, at) so every
 *   copy converges on one winner.
 * - different plan id: a plan switch. Ordered by publication time alone - a
 *   peer opening a plan last edited long ago is a fresh selection, while a
 *   delayed mirror of a plan they have since left must not pull this copy
 *   back. Exact-tie flips resolve on the plan id.
 */
export const shouldAdopt = (cur: DocHead | null, next: Mirror, curCore?: Core): boolean => {
  if (!cur) return true
  if (next.doc.id === cur.id) {
    if (next.doc.updated !== cur.updated) return next.doc.updated > cur.updated
    const same = curCore !== undefined && sameCore(coreOf(next.doc), curCore)
    if (same) return next.at > cur.at
    // Equal versions with different cores: the writers forked on one base.
    // `at` is per-writer monotonic, not a shared clock - a longer write
    // chain on one copy inflates it inside a millisecond - so the winner
    // must be writer id first; the stamp only settles a same-writer fork.
    if (next.by !== cur.by) return next.by > cur.by
    return next.at > cur.at
  }
  if (next.at !== cur.at) return next.at > cur.at
  return next.doc.id > cur.id
}

/**
 * Owns the session-channel authority for one display copy. Local states are
 * published only through `stamp`, which serializes and records the wire
 * marker in one step; foreign mirrors enter only through `admit`, which
 * compares them against the live doc's version plus the recorded marker.
 * A delayed or out-of-order payload can therefore never regress a newer
 * accepted local or peer state, while a peer's genuinely newer write -
 * including a switch to a plan last touched long ago - still adopts.
 */
export class DocSync {
  head: DocHead | null = null
  constructor(readonly me: string) {}

  /** Stamp a local state for the wire. The marker stays ahead of any just-
   * adopted foreign stamp, or this publish could lose its own ordering. */
  stamp(doc: PlanDoc): number {
    const at = Math.max(Date.now(), (this.head?.at ?? 0) + 1)
    this.head = { id: doc.id, updated: doc.updated, at, by: this.me }
    return at
  }

  /**
   * Compare a foreign mirror with the live doc and, when it wins, record it
   * as the current head. `cur` is the live doc (its `updated` may lead the
   * wire marker while an admitted gesture is mid-flight - an older foreign
   * doc dropped here cannot clobber the gesture, and the peer's durable
   * union still lands on its next publish).
   */
  admit(next: Mirror, cur: PlanDoc | null): boolean {
    const curHead: DocHead | null = cur
      ? {
          id: cur.id,
          updated: cur.updated,
          at: this.head?.at ?? 0,
          by: this.head?.by ?? ''
        }
      : null
    if (!shouldAdopt(curHead, next, cur ? coreOf(cur) : undefined)) return false
    this.head = headOf(next)
    return true
  }
}

/**
 * Editor-keyboard admission: live view flags alone are not enough - an open
 * confirmation sheet holds modal authority over the document, so while one
 * is up no editor shortcut (Delete/Backspace/arrows/R/Ctrl+Z/Shift+Z/Y) may
 * reach the plan beneath. Returning without consuming keeps the sheet's own
 * keys - focus navigation, Escape, Enter on its buttons - untouched.
 */
export const admitEditorKey = (live: boolean, modalOpen: boolean, targetIsField: boolean): boolean =>
  live && !modalOpen && !targetIsField
