// Flashcards state and scheduling. Pure functions only: the whole library is one
// JSON document under os.storage so both displays read and write the same truth,
// and every rule here is exercisable from `bun cards.test.ts`.
//
// Scheduling is a small SM-2 variant, deliberate and deterministic:
// - A card's due time is an absolute instant in ms, never a calendar date. A
//   timezone change can shift the local "today" the stats window counts, but it
//   cannot move a stored `due` or make a graded card come back early.
// - Again is a relearn step: 10 minutes, the run of successful reps resets, and
//   the ease factor takes a 0.2 penalty (floor 1.3).
// - Good graduates a new card at 1 day, then 6 days, then multiplies the last
//   interval by ease (starting 2.5).
// - Easy graduates at 4 days, raises ease by 0.15, then multiplies the last
//   interval by ease x 1.3.
// - Intervals cap at 365 days.

export type Grade = 'again' | 'good' | 'easy'

export type Deck = { id: string; name: string; createdAt: number }

export type Card = {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: number
  /** Absolute epoch ms when the card next comes up. New cards are due on creation. */
  due: number
  /** The span this card was last scheduled for, in ms. */
  interval: number
  ease: number
  /** Consecutive reviews graded Good or Easy. */
  reps: number
  reviews: number
  lastReview: number | null
}

export type ReviewEvent = { cardId: string; deckId: string; at: number; grade: Grade; interval: number }

export type ReviewSession = {
  deckId: string
  /** Card ids left to grade; the head is on screen. */
  queue: string[]
  /** Grades recorded this session, Again included. */
  done: number
  revealed: boolean
  startedAt: number
  finished: { graded: number; at: number } | null
}

export type Library = {
  schema: 1
  decks: Deck[]
  cards: Card[]
  history: ReviewEvent[]
  /** Grades per local day, so 'reviewed today' stays truthful past the history cap. */
  dayCounts: Record<string, number>
  /** One session per deck: starting another deck never erases a paused review. */
  reviews: Record<string, ReviewSession>
}

export const DAY_MS = 86_400_000
export const RELEARN_MS = 10 * 60 * 1000
export const START_EASE = 2.5
export const MIN_EASE = 1.3
export const EASY_BONUS = 1.3
export const EASY_EASE_BONUS = 0.15
export const AGAIN_PENALTY = 0.2
export const MAX_INTERVAL = 365 * DAY_MS
/** Review history is capped so the single document stays well under the storage quota. */
export const HISTORY_LIMIT = 500

const id = () => crypto.randomUUID()

export function newLibrary(): Library {
  return { schema: 1, decks: [], cards: [], history: [], dayCounts: {}, reviews: {} }
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const rec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseLibrary(raw: string | null): Library {
  const lib = newLibrary()
  if (!raw) return lib
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!rec(parsed)) return lib
    if (Array.isArray(parsed.decks))
      lib.decks = parsed.decks
        .filter(rec)
        .filter((d) => typeof d.id === 'string' && typeof d.name === 'string')
        .map((d) => ({ id: d.id as string, name: d.name as string, createdAt: num(d.createdAt, 0) }))
    const deckIds = new Set(lib.decks.map((d) => d.id))
    if (Array.isArray(parsed.cards))
      lib.cards = parsed.cards
        .filter(rec)
        .filter((c) => typeof c.id === 'string' && typeof c.deckId === 'string' && deckIds.has(c.deckId as string))
        .map((c) => ({
          id: c.id as string,
          deckId: c.deckId as string,
          front: str(c.front),
          back: str(c.back),
          createdAt: num(c.createdAt, 0),
          due: num(c.due, 0),
          interval: num(c.interval, 0),
          ease: Math.max(MIN_EASE, num(c.ease, START_EASE)),
          reps: Math.max(0, Math.round(num(c.reps, 0))),
          reviews: Math.max(0, Math.round(num(c.reviews, 0))),
          lastReview: typeof c.lastReview === 'number' && Number.isFinite(c.lastReview) ? c.lastReview : null
        }))
    const cardIds = new Set(lib.cards.map((c) => c.id))
    if (Array.isArray(parsed.history))
      lib.history = parsed.history
        .filter(rec)
        .filter(
          (e) =>
            typeof e.cardId === 'string' &&
            typeof e.deckId === 'string' &&
            typeof e.at === 'number' &&
            (e.grade === 'again' || e.grade === 'good' || e.grade === 'easy')
        )
        .map((e) => ({
          cardId: e.cardId as string,
          deckId: e.deckId as string,
          at: e.at as number,
          grade: e.grade as Grade,
          interval: num(e.interval, 0)
        }))
        .slice(-HISTORY_LIMIT)
    const readSession = (r: Record<string, unknown>): ReviewSession | null => {
      const queue = (Array.isArray(r.queue) ? r.queue.filter((q): q is string => typeof q === 'string') : []).filter(
        (q) => cardIds.has(q)
      )
      const deckId = str(r.deckId)
      if (!deckId || !deckIds.has(deckId)) return null
      const finished =
        rec(r.finished) && typeof r.finished.graded === 'number' && typeof r.finished.at === 'number'
          ? { graded: r.finished.graded, at: r.finished.at }
          : null
      if (!queue.length && !finished) return null
      return {
        deckId,
        queue,
        done: Math.max(0, Math.round(num(r.done, 0))),
        revealed: r.revealed === true,
        startedAt: num(r.startedAt, 0),
        finished
      }
    }
    // Current shape: one session per deck. Legacy rows carried a single
    // `review`; fold it into the map so a paused session survives the upgrade.
    if (rec(parsed.reviews))
      for (const [key, r] of Object.entries(parsed.reviews)) {
        if (!rec(r)) continue
        const s = readSession(r)
        if (s && s.deckId === key) lib.reviews[key] = s
      }
    if (rec(parsed.review) && !lib.reviews[str(parsed.review.deckId)]) {
      const s = readSession(parsed.review)
      if (s) lib.reviews[s.deckId] = s
    }
    if (rec(parsed.dayCounts))
      for (const [day, count] of Object.entries(parsed.dayCounts)) {
        const n = num(count, NaN)
        if (Number.isFinite(n) && n > 0) lib.dayCounts[day] = Math.round(n)
      }
    // Migrated rows derive per-day counts from the retained history window.
    else
      for (const e of lib.history) {
        const key = dayKey(e.at)
        lib.dayCounts[key] = (lib.dayCounts[key] ?? 0) + 1
      }
  } catch {
    return lib
  }
  return lib
}

export function serializeLibrary(lib: Library): string {
  return JSON.stringify(lib)
}

export function getDeck(lib: Library, deckId: string): Deck | undefined {
  return lib.decks.find((d) => d.id === deckId)
}

export function deckCards(lib: Library, deckId: string): Card[] {
  return lib.cards
    .filter((c) => c.deckId === deckId)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
}

/** Cards studyable right now, oldest due first. Deterministic ties by creation order. */
export function dueQueue(cards: Card[], now: number): Card[] {
  return cards
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
}

export function dueCount(lib: Library, deckId: string, now: number): number {
  return dueQueue(deckCards(lib, deckId), now).length
}

/** Local midnight of `now`: the window "reviewed today" counts, display only. */
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Zero-padded local-day key: lexicographic order is chronological. */
const dayKey = (now: number) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Honest 'reviewed today': the per-day counter outlives the capped history. */
export function reviewsToday(lib: Library, now: number): number {
  return lib.dayCounts[dayKey(now)] ?? 0
}

export function addDeck(lib: Library, name: string, now: number): Library {
  const deck: Deck = { id: id(), name: name.trim(), createdAt: now }
  return { ...lib, decks: [...lib.decks, deck] }
}

export function renameDeck(lib: Library, deckId: string, name: string): Library {
  return { ...lib, decks: lib.decks.map((d) => (d.id === deckId ? { ...d, name: name.trim() } : d)) }
}

export function removeDeck(lib: Library, deckId: string): Library {
  const dead = new Set(lib.cards.filter((c) => c.deckId === deckId).map((c) => c.id))
  const reviews = { ...lib.reviews }
  delete reviews[deckId]
  return {
    ...lib,
    decks: lib.decks.filter((d) => d.id !== deckId),
    cards: lib.cards.filter((c) => c.deckId !== deckId),
    history: lib.history.filter((e) => e.deckId !== deckId && !dead.has(e.cardId)),
    reviews
  }
}

export function addCard(lib: Library, deckId: string, front: string, back: string, now: number): Library {
  if (!getDeck(lib, deckId)) return lib
  const card: Card = {
    id: id(),
    deckId,
    front: front.trim(),
    back: back.trim(),
    createdAt: now,
    due: now,
    interval: 0,
    ease: START_EASE,
    reps: 0,
    reviews: 0,
    lastReview: null
  }
  return { ...lib, cards: [...lib.cards, card] }
}

export function updateCard(lib: Library, cardId: string, front: string, back: string): Library {
  return {
    ...lib,
    cards: lib.cards.map((c) => (c.id === cardId ? { ...c, front: front.trim(), back: back.trim() } : c))
  }
}

/** Drop a card everywhere: list, history and every review queue it sits in. */
export function removeCard(lib: Library, cardId: string): Library {
  const reviews = { ...lib.reviews }
  for (const [deckId, session] of Object.entries(reviews)) {
    const queue = session.queue.filter((q) => q !== cardId)
    if (queue.length || session.finished) reviews[deckId] = { ...session, queue }
    else delete reviews[deckId]
  }
  return {
    ...lib,
    cards: lib.cards.filter((c) => c.id !== cardId),
    history: lib.history.filter((e) => e.cardId !== cardId),
    reviews
  }
}

/** The span `grade` would schedule this card for, used for the honest hint under each grade button. */
export function nextInterval(card: Card, grade: Grade): number {
  if (grade === 'again') return RELEARN_MS
  if (grade === 'good')
    return card.reps === 0 ? DAY_MS : card.reps === 1 ? 6 * DAY_MS : Math.min(card.interval * card.ease, MAX_INTERVAL)
  const ease = card.ease + EASY_EASE_BONUS
  return card.reps === 0 ? 4 * DAY_MS : Math.min(card.interval * ease * EASY_BONUS, MAX_INTERVAL)
}

export function gradeCard(card: Card, grade: Grade, now: number): Card {
  const interval = nextInterval(card, grade)
  if (grade === 'again')
    return {
      ...card,
      due: now + interval,
      interval,
      ease: Math.max(MIN_EASE, card.ease - AGAIN_PENALTY),
      reps: 0,
      reviews: card.reviews + 1,
      lastReview: now
    }
  return {
    ...card,
    due: now + interval,
    interval,
    ease: grade === 'easy' ? card.ease + EASY_EASE_BONUS : card.ease,
    reps: card.reps + 1,
    reviews: card.reviews + 1,
    lastReview: now
  }
}

/** Snapshot the due queue of one deck into a session. Returns lib unchanged when nothing is due. */
export function startReview(lib: Library, deckId: string, now: number): Library {
  const queue = dueQueue(deckCards(lib, deckId), now).map((c) => c.id)
  if (!queue.length) return lib
  return {
    ...lib,
    reviews: {
      ...lib.reviews,
      [deckId]: { deckId, queue, done: 0, revealed: false, startedAt: now, finished: null }
    }
  }
}

export function revealReview(lib: Library, deckId: string): Library {
  const review = lib.reviews[deckId]
  if (!review || review.finished) return lib
  return { ...lib, reviews: { ...lib.reviews, [deckId]: { ...review, revealed: true } } }
}

export function abandonReview(lib: Library, deckId: string): Library {
  const reviews = { ...lib.reviews }
  delete reviews[deckId]
  return { ...lib, reviews }
}

/**
 * Grade the head card: reschedule it, log history, bump today's count and
 * advance the queue. An 'again' card leaves the session for its 10 minute
 * relearn delay instead of cycling straight back - the printed interval is
 * the actual wait.
 */
export function gradeReview(lib: Library, deckId: string, grade: Grade, now: number): Library {
  const review = lib.reviews[deckId]
  if (!review || review.finished) return lib
  const head = review.queue[0]
  if (!head) return lib
  const card = lib.cards.find((c) => c.id === head)
  const bump = (session: ReviewSession) => {
    const reviews = { ...lib.reviews }
    if (session.queue.length || session.finished) reviews[deckId] = session
    else delete reviews[deckId]
    return reviews
  }
  if (!card) {
    const queue = review.queue.slice(1)
    const next: ReviewSession = queue.length
      ? { ...review, queue, revealed: false }
      : { ...review, queue, revealed: false, finished: { graded: review.done, at: now } }
    return { ...lib, reviews: bump(next) }
  }
  const graded = gradeCard(card, grade, now)
  const event: ReviewEvent = { cardId: card.id, deckId: card.deckId, at: now, grade, interval: graded.interval }
  const queue = review.queue.slice(1)
  const done = review.done + 1
  const next: ReviewSession = queue.length
    ? { ...review, queue, done, revealed: false }
    : { ...review, queue, done, revealed: false, finished: { graded: done, at: now } }
  const key = dayKey(now)
  return {
    ...lib,
    cards: lib.cards.map((c) => (c.id === card.id ? graded : c)),
    history: [...lib.history, event].slice(-HISTORY_LIMIT),
    dayCounts: { ...lib.dayCounts, [key]: (lib.dayCounts[key] ?? 0) + 1 },
    reviews: bump(next)
  }
}

export function currentCard(lib: Library, deckId: string): Card | undefined {
  const head = lib.reviews[deckId]?.queue[0]
  return head ? lib.cards.find((c) => c.id === head) : undefined
}

const MIN_MS = 60_000
const HOUR_MS = 3_600_000

/** A scheduled span for labels: "10m", "6d", "4mo". */
export function formatInterval(ms: number): string {
  if (ms < HOUR_MS) return `${Math.max(1, Math.round(ms / MIN_MS))}m`
  if (ms < DAY_MS) return `${Math.round(ms / HOUR_MS)}h`
  if (ms < 30 * DAY_MS) return `${Math.round(ms / DAY_MS)}d`
  return `${Math.round(ms / (30 * DAY_MS))}mo`
}

/** How long until a card is due, for card list subtitles. */
export function dueLabel(card: Card, now: number): string {
  return card.due <= now ? 'Due now' : `In ${formatInterval(card.due - now)}`
}
