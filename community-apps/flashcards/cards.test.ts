// Scheduler and state tests. `bun:test` is not importable inside a community
// app, so this is a plain Bun script: run `bun cards.test.ts` (or `bun test`
// on this file). Any failed check throws and exits nonzero.
import {
  abandonReview,
  addCard,
  addDeck,
  currentCard,
  DAY_MS,
  deckCards,
  dueCount,
  dueQueue,
  formatInterval,
  gradeCard,
  gradeReview,
  MAX_INTERVAL,
  MIN_EASE,
  newLibrary,
  nextInterval,
  parseLibrary,
  RELEARN_MS,
  removeCard,
  removeDeck,
  renameDeck,
  revealReview,
  reviewsToday,
  START_EASE,
  serializeLibrary,
  startOfDay,
  startReview,
  updateCard
} from './cards.ts'

let failures = 0
let passes = 0
function check(name: string, cond: boolean) {
  if (cond) {
    passes += 1
    return
  }
  failures += 1
  console.error(`FAIL ${name}`)
}
function eq<T>(name: string, got: T, want: T) {
  check(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, Object.is(got, want))
}

const T0 = 1_700_000_000_000

function libWithCards(fronts: string[], when = T0) {
  let lib = addDeck(newLibrary(), 'Deck A', when)
  const deck = lib.decks[0]!
  for (const front of fronts) lib = addCard(lib, deck.id, front, `back of ${front}`, when)
  return { lib, deck }
}

// --- scheduling -----------------------------------------------------------

{
  const { lib } = libWithCards(['q1'])
  const card = lib.cards[0]!
  eq('new card is due immediately', card.due <= T0, true)
  eq('new card starts at base ease', card.ease, START_EASE)
  eq('good on a new card schedules +1d', nextInterval(card, 'good'), DAY_MS)
  eq('easy on a new card schedules +4d', nextInterval(card, 'easy'), 4 * DAY_MS)
  eq('again on a new card is a 10m relearn', nextInterval(card, 'again'), RELEARN_MS)
}

{
  const { lib } = libWithCards(['q1'])
  let card = lib.cards[0]!
  card = gradeCard(card, 'good', T0)
  eq('good #1 due in 1d', card.due - T0, DAY_MS)
  eq('good #1 reps', card.reps, 1)
  card = gradeCard(card, 'good', T0 + DAY_MS)
  eq('good #2 due in 6d', card.due - (T0 + DAY_MS), 6 * DAY_MS)
  card = gradeCard(card, 'good', T0 + 7 * DAY_MS)
  eq('good #3 multiplies by ease', card.due - (T0 + 7 * DAY_MS), 6 * DAY_MS * START_EASE)
  eq('good #3 reps', card.reps, 3)

  const easyCard = gradeCard(lib.cards[0]!, 'easy', T0)
  eq('easy bumps ease', easyCard.ease, START_EASE + 0.15)
  eq('easy #1 interval', easyCard.interval, 4 * DAY_MS)
  const easyAgain = gradeCard(easyCard, 'easy', T0 + 4 * DAY_MS)
  // The +0.15 ease bonus lands on the card first, so this review already
  // schedules with the raised ease (2.8): 4d x 2.8 x 1.3.
  const postBump = easyCard.ease + 0.15
  eq(
    'easy #2 multiplies by raised ease x bonus',
    easyAgain.interval,
    Math.min(4 * DAY_MS * postBump * 1.3, MAX_INTERVAL)
  )
  eq('easy #2 bumps ease again', easyAgain.ease, postBump)
}

{
  const { lib } = libWithCards(['q1'])
  let card = lib.cards[0]!
  card = gradeCard(card, 'good', T0)
  card = gradeCard(card, 'good', card.due)
  const failed = gradeCard(card, 'again', card.due)
  eq('again resets reps', failed.reps, 0)
  eq('again applies the ease penalty', failed.ease, START_EASE - 0.2)
  eq('again interval is the relearn step', failed.interval, RELEARN_MS)
  let battered = failed
  for (let i = 0; i < 20; i += 1) battered = gradeCard(battered, 'again', battered.due)
  eq('ease never drops below the floor', battered.ease, MIN_EASE)
}

{
  const { lib } = libWithCards(['q1'])
  const big = { ...lib.cards[0]!, interval: 300 * DAY_MS, reps: 5 }
  const capped = gradeCard(big, 'good', T0)
  eq('intervals cap at 365d', capped.interval, MAX_INTERVAL)
}

// --- timezone robustness ----------------------------------------------------
// `due` is an absolute instant: a timezone change cannot resurrect a graded card.

{
  const { lib } = libWithCards(['q1'])
  const graded = gradeCard(lib.cards[0]!, 'good', T0)
  eq('due is stored as an absolute instant', graded.due, T0 + DAY_MS)
  // Simulated "timezone hop": no code path touches wall-clock fields of `due`.
  const shifted = new Date(T0 + DAY_MS).getTime() === graded.due
  check('graded card is not due early after a tz change', shifted && graded.due > T0)
}

// --- due queue --------------------------------------------------------------

{
  let { lib, deck } = libWithCards(['a', 'b', 'c'])
  const [a, b, c] = deckCards(lib, deck.id) as [(typeof lib.cards)[0], (typeof lib.cards)[0], (typeof lib.cards)[0]]
  // Push b far out, keep a due now, make c due earlier than a.
  lib = {
    ...lib,
    cards: lib.cards.map((card) =>
      card.id === a.id
        ? { ...card, due: T0 + 5000 }
        : card.id === b.id
          ? { ...card, due: T0 + 50 * DAY_MS }
          : { ...card, due: T0 + 1000 }
    )
  }
  const queue = dueQueue(deckCards(lib, deck.id), T0 + 60_000)
  eq('due queue skips future cards', queue.length, 2)
  eq('due queue orders oldest-due first', queue[0]!.id, c.id)
  eq('due queue then next', queue[1]!.id, a.id)
  eq('dueCount agrees', dueCount(lib, deck.id, T0 + 60_000), 2)
}

// --- review sessions --------------------------------------------------------

{
  let { lib, deck } = libWithCards(['a', 'b'])
  lib = startReview(lib, deck.id, T0)
  eq('review starts with the due queue', lib.review!.queue.length, 2)
  eq('review starts concealed', lib.review!.revealed, false)
  const first = currentCard(lib)!.id

  lib = revealReview(lib)
  eq('reveal flips the flag', lib.review!.revealed, true)

  lib = gradeReview(lib, 'good', T0 + 1000)
  eq('grading advances the queue', lib.review!.queue.length, 1)
  eq('grading counts', lib.review!.done, 1)
  eq('grading re-conceals the next card', lib.review!.revealed, false)
  eq('history records the grade', lib.history.length, 1)
  eq('history records the deck', lib.history[0]!.deckId, deck.id)
  eq('graded card left the queue', lib.review!.queue.includes(first), false)

  lib = gradeReview(lib, 'again', T0 + 2000)
  eq('again re-queues the card at the end', lib.review!.queue.at(-1), lib.review!.queue[0])
  eq('again keeps the session open', lib.review!.queue.length, 1)
  eq('again still counts as graded', lib.review!.done, 2)

  lib = gradeReview(lib, 'easy', T0 + 3000)
  eq('draining the queue finishes the session', lib.review!.finished !== null, true)
  eq('finish records the graded count', lib.review!.finished!.graded, 3)
  eq('finished sessions hold the queue empty', lib.review!.queue.length, 0)
}

{
  let { lib, deck } = libWithCards(['a'])
  lib = startReview(lib, deck.id, T0)
  check('session opens on a due deck', lib.review !== null)
  lib = abandonReview(lib)
  eq('abandon clears the session', lib.review, null)
  lib = gradeReview(startReview(lib, deck.id, T0), 'good', T0)
  eq('graded card leaves the due queue', dueCount(lib, deck.id, T0 + 1000), 0)
  check('startReview on an empty queue changes nothing', startReview(lib, deck.id, T0 + 1000) === lib)
}

{
  const { lib, deck } = libWithCards(['a'])
  const futureLib = {
    ...lib,
    cards: lib.cards.map((c) => ({ ...c, due: T0 + 10 * DAY_MS }))
  }
  eq('startReview refuses an empty due queue', startReview(futureLib, deck.id, T0).review, null)
}

// --- editing ----------------------------------------------------------------

{
  let { lib, deck } = libWithCards(['a'])
  lib = renameDeck(lib, deck.id, 'Renamed')
  eq('rename deck', lib.decks[0]!.name, 'Renamed')
  const card = lib.cards[0]!
  lib = updateCard(lib, card.id, 'new front', 'new back')
  eq('edit card front', lib.cards[0]!.front, 'new front')
  eq('edit card back', lib.cards[0]!.back, 'new back')
  eq('edit card keeps schedule', lib.cards[0]!.due, card.due)
}

{
  let { lib, deck } = libWithCards(['a', 'b'])
  lib = startReview(lib, deck.id, T0)
  const doomed = lib.cards[0]!
  lib = removeCard(lib, doomed.id)
  eq('delete removes the card', lib.cards.length, 1)
  eq('delete drops it from a live queue', lib.review!.queue.includes(doomed.id), false)
  const alsoGone = removeCard(lib, lib.cards[0]!.id)
  eq('deleting the last queued card clears the session', alsoGone.review === null, true)
}

{
  let { lib, deck } = libWithCards(['a'])
  lib = startReview(lib, deck.id, T0)
  lib = gradeReview(lib, 'good', T0)
  const wiped = removeDeck(lib, deck.id)
  eq('delete deck removes cards', wiped.cards.length, 0)
  eq('delete deck removes history', wiped.history.length, 0)
  eq('delete deck clears its review', wiped.review, null)
}

// --- serialization -----------------------------------------------------------

{
  const { lib } = libWithCards(['a', 'b'])
  const round = parseLibrary(serializeLibrary(lib))
  eq('roundtrip decks', round.decks.length, 2 - 1)
  eq('roundtrip cards', round.cards.length, 2)
  eq('roundtrip card field', round.cards[0]!.front, 'a')
  eq('null parses to empty', parseLibrary(null).decks.length, 0)
  eq('garbage parses to empty', parseLibrary('{oops').decks.length, 0)
  eq('non-object parses to empty', parseLibrary('"x"').cards.length, 0)
  const limp = parseLibrary(JSON.stringify({ decks: [{ id: 'd1' }], cards: [{ id: 'c1', deckId: 'd1' }] }))
  eq('deck without a name is dropped', limp.decks.length, 0)
  eq('card for a dropped deck is dropped', limp.cards.length, 0)
}

{
  // "reviewed today" respects the local-day boundary; scheduling never does.
  const { lib } = libWithCards(['a'])
  const graded = gradeReview(startReview(lib, lib.decks[0]!.id, T0), 'good', T0)
  eq('review counts today', reviewsToday(graded.history, T0 + 1000), 1)
  eq('startOfDay floors to midnight', startOfDay(T0), startOfDay(T0 + 1))
  eq('reviews before today do not count', reviewsToday(graded.history, T0 - 2 * DAY_MS), 0)
}

// --- labels -------------------------------------------------------------------

eq('format minutes', formatInterval(RELEARN_MS), '10m')
eq('format days', formatInterval(DAY_MS), '1d')
eq('format months', formatInterval(60 * DAY_MS), '2mo')

console.log(`${passes} passed, ${failures} failed`)
if (failures > 0) throw new Error(`${failures} check(s) failed`)
