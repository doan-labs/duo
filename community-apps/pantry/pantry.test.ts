// Deterministic checks for the pantry domain. Throw-based so the file runs
// under `bun pantry.test.ts` as well as `bun test`, without touching node or
// bun test APIs - the submission rules allow neither import.
import {
  addItem,
  addShop,
  badgeFor,
  cleanName,
  clearBought,
  countOut,
  type Doc,
  daysUntil,
  EMPTY_DOC,
  filterItems,
  formatQty,
  ITEMS_CAP,
  type Item,
  LIST_CAP,
  MAX_MILLI,
  metaLine,
  newItem,
  parseDoc,
  parseMirror,
  parseQty,
  qtyText,
  removeItem,
  removeShop,
  type ShopItem,
  serializeDoc,
  serializeMirror,
  soonItems,
  sortItems,
  stepFor,
  stepItem,
  todayKey,
  toggleShop,
  updateItem,
  validDay
} from './pantry.ts'

let n = 0
const ok = (cond: boolean, label: string) => {
  n++
  if (!cond) throw new Error(`FAIL ${label}`)
}
const eq = <T>(a: T, b: T, label: string) => {
  n++
  if (a !== b) throw new Error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)
}

const milk: Item = newItem('Milk', 2000, 'l', 'fridge', '2026-10-09', 1)
const eggs: Item = newItem('Eggs', 12000, 'pcs', 'fridge', '2026-10-20', 2)
const rice: Item = newItem('Rice', 2_500_000, 'g', 'pantry', null, 3)
const peas: Item = newItem('Peas', 500_000, 'g', 'freezer', '2026-10-01', 4)
const doc: Doc = { ...EMPTY_DOC, items: [milk, eggs, rice, peas] }

const TODAY = '2026-10-06'
const TOMORROW = '2026-10-07'

// --- quantities and units ----------------------------------------------------

eq(parseQty('2'), 2000, 'qty whole')
eq(parseQty('1.5'), 1500, 'qty decimal')
eq(parseQty('.5'), 500, 'qty leading dot')
eq(parseQty('0.001'), 1, 'qty milli edge')
eq(parseQty('0.0005'), null, 'qty below milli precision')
eq(parseQty('1.2345'), null, 'qty over three decimals')
eq(parseQty(''), null, 'qty empty')
eq(parseQty('abc'), null, 'qty not a number')
eq(parseQty('-2'), null, 'qty negative text')
eq(parseQty('2e3'), null, 'qty exponent rejected')
eq(parseQty('0'), null, 'qty zero needs flag')
eq(parseQty('0', true), 0, 'qty zero allowed in editor')
eq(parseQty('999999'), MAX_MILLI, 'qty at cap')
eq(parseQty('1000000'), null, 'qty over cap')

eq(formatQty(2000), '2', 'format whole')
eq(formatQty(1500), '1.5', 'format decimal')
eq(formatQty(100), '0.1', 'format tenth')
eq(formatQty(1), '0.001', 'format milli')
eq(formatQty(0), '0', 'format zero')
eq(formatQty(100_000), '100', 'format hundred grams')
eq(qtyText({ milli: 1000, unit: 'pcs' }), '1 pc', 'qty singular pc')
eq(qtyText({ milli: 1000, unit: 'pack' }), '1 pack', 'qty singular pack')
eq(qtyText({ milli: 2000, unit: 'ml' }), '2 ml', 'qty ml')
eq(stepFor('pcs'), 1000, 'pcs step is 1')
eq(stepFor('g'), 100_000, 'g step is 100')
eq(stepFor('kg'), 100, 'kg step is 0.1')

// --- dates -------------------------------------------------------------------

ok(validDay('2026-10-06'), 'valid day')
ok(validDay('2026-02-28'), 'valid feb')
ok(!validDay('2026-02-30'), 'feb 30 rejected')
ok(!validDay('2026-13-01'), 'month 13 rejected')
ok(!validDay('2026-10-6'), 'unpadded rejected')
ok(!validDay('10-06-2026'), 'reordered rejected')
ok(!validDay(''), 'empty rejected')

eq(daysUntil('2026-10-09', '2026-10-06'), 3, 'days ahead')
eq(daysUntil('2026-10-06', '2026-10-06'), 0, 'same day')
eq(daysUntil('2026-10-01', '2026-10-06'), -5, 'days past')
eq(daysUntil('2026-11-01', '2026-10-30'), 2, 'month boundary')
eq(daysUntil('2027-01-01', '2026-12-30'), 2, 'year boundary')
eq(daysUntil('bad', TODAY), null, 'bad day null')

// Local-day expiry: an item best-before TODAY shows Today, not expired.
const todayItem = newItem('Yogurt', 500_000, 'g', 'fridge', TODAY, 5)
const tmrwItem = newItem('Cream', 200_000, 'ml', 'fridge', TOMORROW, 6)
eq(badgeFor(peas, TODAY)?.text, 'Expired', 'expired badge')
eq(badgeFor(todayItem, TODAY)?.text, 'Today', 'today badge')
eq(badgeFor(todayItem, TODAY)?.aria, 'expires today', 'today aria')
eq(badgeFor(milk, TODAY)?.text, '3 days', 'n days badge')
eq(badgeFor(tmrwItem, TODAY)?.text, '1 day', 'one day singular')
eq(badgeFor(eggs, TODAY), null, 'outside window no badge')
eq(badgeFor(rice, TODAY), null, 'undated no badge')
const emptyItem = newItem('Oil', 0, 'ml', 'pantry', '2030-01-01', 7)
eq(badgeFor(emptyItem, TODAY)?.text, 'Out', 'out badge')
eq(badgeFor(emptyItem, TODAY)?.tone, 'grey', 'out tone')
eq(badgeFor({ ...emptyItem, bestBefore: '2020-01-01' }, TODAY)?.text, 'Out', 'out outranks expired')
eq(metaLine(milk, TODAY), 'Fridge', 'soon meta stays location')
eq(metaLine(eggs, TODAY), 'Fridge · Oct 20', 'later meta shows date')
eq(metaLine(rice, TODAY), 'Pantry', 'undated meta is location')
ok(/^\d{4}-\d{2}-\d{2}$/.test(todayKey()), 'todayKey shape')

// --- sorting and filtering ---------------------------------------------------

const soonOrder = sortItems(doc.items, 'soon', TODAY)
eq(soonOrder[0]!.id, peas.id, 'expired first')
eq(soonOrder[1]!.id, milk.id, 'soonest dated next')
eq(soonOrder[2]!.id, eggs.id, 'later dated')
eq(soonOrder[3]!.id, rice.id, 'undated last')
const abc = sortItems(doc.items, 'name', TODAY)
eq(abc[0]!.name, 'Eggs', 'name sort a')
eq(abc[3]!.name, 'Rice', 'name sort z')

eq(soonItems(doc.items, TODAY).length, 2, 'soon window count')
eq(soonItems(doc.items, TODAY)[1]!.id, milk.id, 'soon order holds')

eq(filterItems(doc.items, 'all', '', TODAY).length, 4, 'filter all')
eq(filterItems(doc.items, 'fridge', '', TODAY).length, 2, 'filter fridge')
eq(filterItems(doc.items, 'soon', '', TODAY).length, 2, 'filter soon')
eq(filterItems(doc.items, 'all', 'mil', TODAY)[0]!.id, milk.id, 'search hit')
eq(filterItems(doc.items, 'all', 'MILK', TODAY).length, 1, 'search case-fold')
eq(filterItems(doc.items, 'fridge', 'rice', TODAY).length, 0, 'search+filter empty')
eq(filterItems(doc.items, 'all', '   ', TODAY).length, 4, 'blank search shows all')
eq(countOut(doc.items), 0, 'none out')
eq(countOut([...doc.items, emptyItem]), 1, 'one out')

// --- consume / restock ---------------------------------------------------------

const used = stepItem(doc, milk.id, 'use')
eq(used.milli, 1900, 'l use steps 0.1')
const used2 = stepItem(doc, eggs.id, 'use')
eq(used2.milli, 11000, 'pcs use steps 1')
const restocked = stepItem(doc, eggs.id, 'restock')
eq(restocked.milli, 13000, 'restock adds back')
const empty2 = stepItem({ ...doc, items: [{ ...emptyItem }] }, emptyItem.id, 'use')
eq(empty2.milli, 0, 'use at zero clamps at zero')
ok(empty2.milli! >= 0, 'never negative')
const topped = stepItem(doc, rice.id, 'restock')
eq(topped.milli, 2_500_000 + 100_000, 'g restock steps 100')
const maxed: Doc = { ...doc, items: [{ ...rice, milli: MAX_MILLI }] }
eq(stepItem(maxed, rice.id, 'restock').milli, MAX_MILLI, 'restock clamps at max')
eq(stepItem(doc, 'missing', 'use').milli, null, 'missing id is a no-op')
ok(doc.items.find((i) => i.id === milk.id)!.milli === 2000, 'step leaves doc untouched')

// --- add / merge / edit --------------------------------------------------------

const stocked = addItem(doc, { name: 'Flour', milli: 1000, unit: 'g', location: 'pantry', bestBefore: null })
eq(stocked.doc.items.length, 5, 'add appends')
eq(stocked.merged, false, 'add not merged')
const topped2 = addItem(doc, { name: 'milk', milli: 500, unit: 'l', location: 'fridge', bestBefore: '2026-10-09' })
eq(topped2.merged, true, 'same batch merges')
eq(topped2.doc.items.length, 4, 'merge adds no row')
eq(topped2.doc.items.find((i) => i.id === milk.id)!.milli, 2500, 'merge sums qty')
const otherDate = addItem(doc, { name: 'Milk', milli: 500, unit: 'l', location: 'fridge', bestBefore: '2026-10-12' })
eq(otherDate.merged, false, 'new date is a new batch')
const otherShelf = addItem(doc, { name: 'Milk', milli: 500, unit: 'l', location: 'pantry', bestBefore: '2026-10-09' })
eq(otherShelf.merged, false, 'other shelf is a new batch')
const capped: Doc = {
  ...doc,
  items: Array.from({ length: ITEMS_CAP }, (_, i) => newItem(`i${i}`, 1, 'pcs', 'pantry', null, i))
}
eq(
  addItem(capped, { name: 'overflow', milli: 1, unit: 'pcs', location: 'pantry', bestBefore: null }).full,
  true,
  'cap refuses add'
)

const renamed = updateItem(doc, { ...milk, name: 'Oat milk' })
eq(renamed.doc.items.find((i) => i.id === milk.id)!.name, 'Oat milk', 'edit renames')
const folded = updateItem(doc, {
  ...peas,
  name: 'Milk',
  location: 'fridge',
  unit: 'l',
  bestBefore: '2026-10-09',
  milli: 100
})
ok(folded.doc.items.length === 3 && folded.merged === true && folded.id === milk.id, 'edit collision merges')
eq(folded.doc.items.find((i) => i.id === milk.id)!.milli, 2000 + 100, 'collision sums qty')
eq(
  folded.doc.items.find((i) => i.id === peas.id),
  undefined,
  'merged source removed'
)
const ghost = updateItem(doc, { ...newItem('Ghost', 1, 'pcs', 'pantry', null, 9) })
eq(ghost.doc.items.length, 5, 'editing a deleted row appends it back')
eq(removeItem(doc, milk.id).items.length, 3, 'remove drops row')
eq(removeItem(doc, 'missing').items.length, 4, 'remove missing is a no-op')

// --- shopping list -------------------------------------------------------------

const listed = addShop(doc, 'Olive oil', '500 ml')
eq(listed.doc.list.length, 1, 'shop add')
eq(listed.doc.list[0]!.done, false, 'shop starts open')
eq(listed.doc.list[0]!.note, '500 ml', 'shop keeps note')
const bought = toggleShop(listed.doc, listed.doc.list[0]!.id)
eq(bought.list[0]!.done, true, 'toggle marks bought')
const reopened = toggleShop(bought, listed.doc.list[0]!.id)
eq(reopened.list[0]!.done, false, 'toggle reopens')
const two = addShop(bought, 'Bread', '')
eq(two.doc.list.length, 2, 'second row')
eq(clearBought(two.doc).list.length, 1, 'clear drops bought only')
eq(clearBought(two.doc).list[0]!.name, 'Bread', 'open row survives clear')
eq(removeShop(two.doc, two.doc.list[0]!.id).list.length, 1, 'shop remove')
const fullList: Doc = {
  ...doc,
  list: Array.from(
    { length: LIST_CAP },
    (_, i) => ({ id: `s${i}`, name: `s${i}`, note: '', done: false, addedAt: i }) satisfies ShopItem
  )
}
eq(addShop(fullList, 'over', '').full, true, 'list cap refuses')
eq(addShop(doc, '   ', '').doc.list.length, 0, 'blank name adds nothing at call site')

// --- persistence -----------------------------------------------------------------

const doc2: Doc = {
  ...EMPTY_DOC,
  items: [milk, peas],
  list: [{ id: 'a', name: 'Bread', note: '', done: true, addedAt: 2 }],
  muted: true
}
const round = parseDoc(serializeDoc(doc2))
eq(round.items.length, 2, 'round-trip items')
eq(round.list.length, 1, 'round-trip list')
eq(round.muted, true, 'round-trip muted')
eq(round.items[0]!.id, milk.id, 'round-trip ids')
eq(round.items[0]!.bestBefore, '2026-10-09', 'round-trip date')

eq(parseDoc(null).items.length, 0, 'null parses empty')
eq(parseDoc('not json').items.length, 0, 'junk parses empty')
eq(parseDoc('{"v":1}').muted, false, 'missing muted defaults')
const dirty = parseDoc(
  JSON.stringify({
    v: 1,
    items: [milk, { bad: true }, null, milk],
    list: [{ id: 'x', name: 'a', note: '', done: false, addedAt: 1 }],
    muted: false
  })
)
eq(dirty.items.length, 1, 'invalid rows drop')
eq(dirty.items[0]!.id, milk.id, 'dedupes ids')
const badMilli = parseDoc(
  JSON.stringify({
    v: 1,
    items: [
      { ...milk, milli: -5 },
      { ...milk, id: 'b', milli: 1.5 }
    ],
    list: [],
    muted: false
  })
)
eq(badMilli.items.length, 0, 'negative and fractional milli rejected')
const badLoc = parseDoc(JSON.stringify({ v: 1, items: [{ ...milk, location: 'attic' }], list: [], muted: false }))
eq(badLoc.items.length, 0, 'unknown location rejected')

const m1 = parseMirror(serializeMirror('me', 'freezer', 'fish', 'name'))!
eq(m1.loc, 'freezer', 'mirror loc')
eq(m1.q, 'fish', 'mirror query')
eq(m1.sort, 'name', 'mirror sort')
eq(m1.by, 'me', 'mirror writer')
eq(parseMirror(null), null, 'mirror null')
eq(parseMirror('junk'), null, 'mirror junk')
eq(parseMirror(JSON.stringify({ by: 'x', loc: 'attic', q: 5, sort: 'soon' }))!.loc, 'all', 'mirror bad loc defaults')

// name cleaning
eq(cleanName('  Eggs   Benny '), 'Eggs Benny', 'name collapses space')
ok(cleanName('x'.repeat(200)).length === 48, 'name capped')

console.log(`pantry: ${n} checks passed`)
