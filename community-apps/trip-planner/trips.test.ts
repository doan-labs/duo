// Pure model checks for Trip Planner. Runs with `bun trips.test.ts`:
// plain functions plus a throw-based runner, no test framework imports.
import {
  addDays,
  addLeg,
  addPack,
  addStay,
  addStop,
  addTrip,
  assembleLibrary,
  clearPacked,
  dayCount,
  dayDate,
  diffDays,
  insertLeg,
  insertPack,
  insertStay,
  insertStop,
  type Library,
  moveStop,
  newLibrary,
  packProgress,
  parseTime,
  rangeLabel,
  readIndex,
  readTrip,
  removeLeg,
  removePack,
  removeStay,
  removeStop,
  removeTrip,
  restoreTrip,
  serializeIndex,
  serializeTrip,
  stopsForDay,
  type Trip,
  timeLabel,
  todayIndex,
  togglePack,
  tripStatus,
  unscheduled,
  updateStop,
  updateTrip,
  validDate
} from './trips.ts'

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

function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got)
  const w = JSON.stringify(want)
  if (g === w) {
    passes += 1
    return
  }
  failures += 1
  console.error(`FAIL ${name}\n  got  ${g}\n  want ${w}`)
}

// --- dates: validity, including local-date boundaries ------------------------

check('leap day valid', validDate('2024-02-29'))
check('non-leap Feb 29 invalid', !validDate('2025-02-29'))
check('century non-leap invalid', !validDate('1900-02-29'))
check('400-year leap valid', validDate('2000-02-29'))
check('month 13 invalid', !validDate('2026-13-01'))
check('day 0 invalid', !validDate('2026-01-00'))
check('Apr 31 invalid', !validDate('2026-04-31'))
check(
  'format rejects sloppy',
  !validDate('2026-1-1') && !validDate('26-01-01') && !validDate('') && !validDate('2026-01-01x')
)

eq('addDays month rollover', addDays('2026-01-31', 1), '2026-02-01')
eq('addDays year rollover', addDays('2026-12-31', 1), '2027-01-01')
eq('addDays backwards', addDays('2026-03-01', -1), '2026-02-28')
eq('addDays leap boundary', addDays('2024-02-28', 1), '2024-02-29')
eq('addDays leap boundary next', addDays('2024-02-29', 1), '2024-03-01')
eq('addDays zero', addDays('2026-10-06', 0), '2026-10-06')

eq('diffDays same', diffDays('2026-10-06', '2026-10-06'), 0)
eq('diffDays forward', diffDays('2026-10-06', '2026-10-09'), 3)
eq('diffDays backward', diffDays('2026-10-09', '2026-10-06'), -3)
eq('diffDays across year', diffDays('2026-12-30', '2027-01-02'), 3)
// US DST springs forward on 2026-03-08; calendar-day counting must not care.
eq('diffDays across DST gap', diffDays('2026-03-07', '2026-03-09'), 2)
eq('diffDays across DST fall', diffDays('2026-10-31', '2026-11-02'), 2)

// --- trip/day arithmetic -------------------------------------------------------

function mkTrip(id = 't1', start = '2026-10-05', end = '2026-10-09'): { lib: Library; trip: Trip } {
  return addTrip(newLibrary(), { name: 'Kyoto week', start, end }, 1000, id)
}

{
  const { trip } = mkTrip()
  eq('dayCount inclusive', dayCount(trip), 5)
  eq('dayDate 0', dayDate(trip, 0), '2026-10-05')
  eq('dayDate last', dayDate(trip, 4), '2026-10-09')
  eq('single-day trip', dayCount(mkTrip('x', '2026-10-05', '2026-10-05').trip), 1)
  eq('tripStatus upcoming', tripStatus(trip, '2026-10-01'), 'upcoming')
  eq('tripStatus ongoing', tripStatus(trip, '2026-10-07'), 'ongoing')
  eq('tripStatus ongoing first day', tripStatus(trip, '2026-10-05'), 'ongoing')
  eq('tripStatus past', tripStatus(trip, '2026-10-20'), 'past')
  eq('todayIndex inside', todayIndex(trip, '2026-10-07'), 2)
  eq('todayIndex outside', todayIndex(trip, '2026-10-20'), null)
  eq('rangeLabel same month', rangeLabel('2026-10-05', '2026-10-09'), 'Oct 5 - 9')
  eq('rangeLabel across months', rangeLabel('2026-12-28', '2027-01-03'), 'Dec 28 - Jan 3')
}

// --- time input -----------------------------------------------------------------

eq('parseTime pads', parseTime('9:05'), '09:05')
eq('parseTime keeps', parseTime('23:59'), '23:59')
eq('parseTime midnight', parseTime('0:00'), '00:00')
eq('parseTime rejects hour 24', parseTime('24:00'), null)
eq('parseTime rejects minute 60', parseTime('12:60'), null)
eq('parseTime rejects text', parseTime('noon'), null)
eq('parseTime rejects empty', parseTime(''), null)
eq('parseTime rejects seconds', parseTime('10:11:12'), null)
eq('timeLabel am', timeLabel('09:05'), '9:05 AM')
eq('timeLabel pm', timeLabel('13:30'), '1:30 PM')
eq('timeLabel noon', timeLabel('12:00'), '12:00 PM')
eq('timeLabel midnight', timeLabel('00:15'), '12:15 AM')
eq('timeLabel null', timeLabel(null), '')

// --- library ops -----------------------------------------------------------------

{
  let { lib } = mkTrip()
  eq('one trip in order', lib.order, ['t1'])
  const second = addTrip(lib, { name: 'Osaka', start: '2026-11-01', end: '2026-11-02' }, 2000, 't2')
  lib = second.lib
  eq('order appends', lib.order, ['t1', 't2'])

  // stops
  const a = addStop(lib, 't1', { day: 0, title: 'Land', time: '09:30' }, 's1')
  check('addStop returns stop', !!a)
  lib = a!.lib
  lib = addStop(lib, 't1', { day: 0, title: 'Check in' }, 's2')!.lib
  lib = addStop(lib, 't1', { day: 2, title: 'Fushimi Inari' }, 's3')!.lib
  lib = addStop(lib, 't1', { day: -1, title: 'Maybe: day trip' }, 's4')!.lib
  eq(
    'stops day 0 order',
    stopsForDay(lib.trips[0]!, 0).map((s) => s.id),
    ['s1', 's2']
  )
  eq(
    'unscheduled parked',
    unscheduled(lib.trips[0]!).map((s) => s.id),
    ['s4']
  )

  // out-of-range day is clamped into the trip rather than failing
  const c = addStop(lib, 't1', { day: 99, title: 'Oops' }, 's5')
  eq('day clamped to last day', c!.stop.day, 4)
  lib = c!.lib

  // blank titles rejected
  eq('empty title rejected', addStop(lib, 't1', { day: 0, title: '  ' }), null)

  // update
  lib = updateStop(lib, 't1', 's1', { title: 'Land at KIX', time: null })
  eq('updateStop title', lib.trips[0]!.stops[0]!.title, 'Land at KIX')
  eq('updateStop clears time', lib.trips[0]!.stops[0]!.time, null)

  // reorder within a day is stable
  lib = moveStop(lib, 't1', 's2', 0, 0)
  eq(
    'moved first',
    stopsForDay(lib.trips[0]!, 0).map((s) => s.id),
    ['s2', 's1']
  )
  lib = moveStop(lib, 't1', 's1', 2, 0)
  eq(
    'moved across days',
    stopsForDay(lib.trips[0]!, 2).map((s) => s.id),
    ['s1', 's3']
  )
  eq(
    'source day kept',
    stopsForDay(lib.trips[0]!, 0).map((s) => s.id),
    ['s2']
  )
  lib = moveStop(lib, 't1', 's3', -1, 0)
  eq(
    'moved to later',
    unscheduled(lib.trips[0]!).map((s) => s.id),
    ['s3', 's4']
  )
  // reorder with no change is identity
  lib = moveStop(lib, 't1', 's2', 0, 0)
  eq(
    'stable reorder same slot',
    stopsForDay(lib.trips[0]!, 0).map((s) => s.id),
    ['s2']
  )

  // delete + restore lands the stop back at its exact flat position
  const before = lib.trips[0]!.stops.map((s) => s.id)
  const del = removeStop(lib, 't1', 's2')
  check('removeStop finds index', del.index >= 0)
  lib = insertStop(del.lib, 't1', del.stop!, del.index)
  eq(
    'restored stop position',
    lib.trips[0]!.stops.map((s) => s.id),
    before
  )
  eq(
    'restored stop day grouping',
    stopsForDay(lib.trips[0]!, 0).map((s) => s.id),
    ['s2']
  )

  // shrinking the range parks out-of-range stops in Later, never drops them
  lib = updateTrip(lib, 't1', { end: '2026-10-06' })
  eq('shrunk day count', dayCount(lib.trips[0]!), 2)
  const parked = unscheduled(lib.trips[0]!).map((s) => s.id)
  check('out-of-range parked', parked.includes('s5') && parked.includes('s3') && parked.includes('s4'))

  // trip delete + undo
  const gone = removeTrip(lib, 't1')
  eq('trip gone', gone.lib.order, ['t2'])
  eq('trip index recorded', gone.index, 0)
  const back = restoreTrip(gone.lib, gone.trip!, gone.index)
  eq('trip restored at index', back.order, ['t1', 't2'])
  eq('trip restored in trips array', back.trips[0]!.id, 't1')
  eq('trip payload intact', back.trips[0]!.stops.length, gone.trip!.stops.length)
}

// --- legs and stays --------------------------------------------------------------

{
  let { lib } = mkTrip()
  const leg = addLeg(
    lib,
    't1',
    {
      kind: 'flight',
      from: 'SFO',
      to: 'KIX',
      date: '2026-10-05',
      depart: '11:20',
      arrive: null,
      ref: 'UA 35',
      notes: ''
    },
    'l1'
  )
  check('addLeg ok', !!leg)
  lib = leg!.lib
  eq('leg stored', lib.trips[0]!.legs.length, 1)
  eq(
    'leg needs an end',
    addLeg(lib, 't1', { kind: 'bus', from: '', to: '', date: null, depart: null, arrive: null, ref: '', notes: '' }),
    null
  )
  const goneLeg = removeLeg(lib, 't1', 'l1')
  eq('leg removed', goneLeg.lib.trips[0]!.legs.length, 0)
  lib = insertLeg(goneLeg.lib, 't1', goneLeg.leg!, goneLeg.index)
  eq('leg restored', lib.trips[0]!.legs[0]!.ref, 'UA 35')

  const stay = addStay(
    lib,
    't1',
    { name: 'Hotel Granvia', address: 'Kyoto Station', checkIn: '2026-10-05', checkOut: '2026-10-09', notes: '' },
    'h1'
  )
  lib = stay!.lib
  eq('stay stored', lib.trips[0]!.stays[0]!.name, 'Hotel Granvia')
  eq(
    'stay needs a name',
    addStay(lib, 't1', { name: ' ', address: '', checkIn: null, checkOut: null, notes: '' }),
    null
  )
  const goneStay = removeStay(lib, 't1', 'h1')
  lib = insertStay(goneStay.lib, 't1', goneStay.stay!, goneStay.index)
  eq('stay restored', lib.trips[0]!.stays.length, 1)
}

// --- packing -----------------------------------------------------------------------

{
  let { lib } = mkTrip()
  lib = addPack(lib, 't1', 'Passport', 'p1')!.lib
  lib = addPack(lib, 't1', 'Charger', 'p2')!.lib
  eq('pack empty label rejected', addPack(lib, 't1', ' '), null)
  eq('packProgress', packProgress(lib.trips[0]!), { done: 0, total: 2 })
  eq('clearPacked no-op', clearPacked(lib, 't1').items.length, 0)
  lib = togglePack(lib, 't1', 'p1')
  eq('pack toggled', lib.trips[0]!.packing[0]!.done, true)
  eq('packProgress one done', packProgress(lib.trips[0]!), { done: 1, total: 2 })
  const cleared = clearPacked(lib, 't1')
  eq(
    'clearPacked removes done',
    cleared.items.map((p) => p.id),
    ['p1']
  )
  lib = insertPack(cleared.lib, 't1', cleared.items)
  eq('pack restored', lib.trips[0]!.packing.length, 2)
  const rm = removePack(lib, 't1', 'p2')
  eq('pack removed', rm.lib.trips[0]!.packing.length, 1)
}

// --- persistence round-trip ------------------------------------------------------

{
  let { lib } = mkTrip()
  lib = addTrip(lib, { name: 'Jeju', start: '2027-04-01', end: '2027-04-04' }, 3000, 't9').lib
  lib = addStop(
    lib,
    't1',
    { day: 1, title: 'Arashiyama', time: '8:00', address: 'Kyoto', notes: 'Go early' },
    's1'
  )!.lib
  lib = addStop(lib, 't1', { day: -1, title: 'Optional', time: null }, 's2')!.lib
  lib = addLeg(
    lib,
    't1',
    {
      kind: 'train',
      from: 'Kyoto',
      to: 'Nara',
      date: '2026-10-08',
      depart: '10:05',
      arrive: '10:50',
      ref: '',
      notes: 'JR'
    },
    'l1'
  )!.lib
  lib = addStay(
    lib,
    't1',
    { name: 'Ryokan', address: 'Gion', checkIn: '2026-10-05', checkOut: '2026-10-09', notes: '' },
    'h1'
  )!.lib
  lib = addPack(lib, 't1', 'Umbrella', 'p1')!.lib
  lib = togglePack(lib, 't1', 'p1')

  // Serialize exactly the way main.tsx writes the KV keys, then reassemble.
  const records = new Map<string, string>()
  for (const t of lib.trips) records.set(`trip.${t.id}`, serializeTrip(t))
  const index = serializeIndex(lib.order)
  const back = assembleLibrary(index, records)
  eq('order round-trips', back.order, lib.order)
  eq('trip count round-trips', back.trips.length, 2)
  const t1 = back.trips.find((t) => t.id === 't1')!
  eq(
    'stop fields survive',
    t1.stops.map((s) => [s.id, s.day, s.time]),
    [
      ['s1', 1, '08:00'],
      ['s2', -1, null]
    ]
  )
  eq('leg survives', t1.legs[0]!.depart, '10:05')
  eq('stay survives', t1.stays[0]!.checkOut, '2026-10-09')
  eq('pack survives', t1.packing[0]!.done, true)

  // Torn and hostile records degrade without taking the library down.
  records.set('trip.broken', '{not json')
  records.set('trip.bad', JSON.stringify({ id: 'bad', start: '2026-13-99', end: 'x' }))
  records.set('trip.orphan', serializeTrip(mkTrip('orphan', '2026-05-01', '2026-05-02').trip))
  const salvaged = assembleLibrary(index, records)
  eq('bad records skipped', salvaged.trips.filter((t) => t.id === 'bad' || t.id === 'broken').length, 0)
  eq('index-less trip appended', salvaged.order.at(-1), 'orphan')

  const empty = assembleLibrary(null, new Map())
  eq('empty library', empty.trips.length, 0)
  eq('readIndex garbage', readIndex({ v: 1, order: [1, 'x', null] }), ['x'])

  // A trip whose stored range inverted (tampered) is dropped.
  const inverted = serializeTrip({ ...t1, start: '2026-10-09', end: '2026-10-05' })
  eq('inverted range rejected', readTrip(JSON.parse(inverted)), null)
}

console.log(`trip-planner: ${passes} passed, ${failures} failed`)
if (failures > 0) throw new Error(`${failures} checks failed`)
