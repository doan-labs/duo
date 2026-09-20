import type { Event } from './data.ts'
import { addDays, local, startOfWeek } from './dates.ts'

/**
 * One invented entry. `from` and `mins` make a timed event; `days` makes an
 * all-day one, counting the day it starts on.
 */
type Spec = {
  /** Weeks from the Monday of this week, then the day inside that week, 0 = Monday. */
  w: number
  d: number
  from?: string
  mins?: number
  days?: number
  cal: string
  title: string
  where?: string
}

const SPECS: Spec[] = [
  { w: -2, d: 0, from: '09:30', mins: 45, cal: 'work', title: 'Weekly plan', where: 'Studio' },
  { w: -2, d: 2, from: '14:00', mins: 60, cal: 'work', title: 'Hinge tolerance review' },
  { w: -2, d: 4, from: '19:30', mins: 120, cal: 'home', title: 'Dinner with Mai' },
  { w: -1, d: 0, from: '09:30', mins: 45, cal: 'work', title: 'Weekly plan', where: 'Studio' },
  { w: -1, d: 1, from: '11:00', mins: 30, cal: 'work', title: 'Render farm budget' },
  { w: -1, d: 3, from: '18:30', mins: 60, cal: 'home', title: 'Five-a-side' },
  { w: -1, d: 5, days: 2, cal: 'work', title: 'Fold rig teardown' },
  { w: 0, d: 0, from: '09:30', mins: 45, cal: 'work', title: 'Weekly plan', where: 'Studio' },
  { w: 0, d: 1, from: '15:30', mins: 30, cal: 'work', title: 'Macro shot re-render' },
  { w: 0, d: 2, days: 1, cal: 'siri', title: 'Flight VN254 to SFO' },
  { w: 0, d: 3, days: 4, cal: 'work', title: 'Cupertino trip' },
  { w: 0, d: 4, from: '20:00', mins: 120, cal: 'home', title: 'Film night' },
  { w: 1, d: 0, from: '09:30', mins: 45, cal: 'work', title: 'Weekly plan', where: 'Studio' },
  { w: 1, d: 2, days: 1, cal: 'birthdays', title: "Mai's birthday" },
  { w: 1, d: 3, from: '13:00', mins: 60, cal: 'work', title: 'Titanium finish samples' },
  { w: 2, d: 1, from: '09:00', mins: 480, cal: 'work', title: 'Colour grading day' },
  { w: 2, d: 3, from: '17:00', mins: 60, cal: 'home', title: 'Dentist' },
  { w: 3, d: 0, from: '09:30', mins: 45, cal: 'work', title: 'Weekly plan', where: 'Studio' }
]

const at = (day: Date, hm: string) => {
  const [h, m] = hm.split(':').map(Number)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
}

/**
 * What a fresh install opens on, anchored to the week `today` falls in so the
 * sheet is never blank. Ids are fixed, so both displays draw the same events
 * and the first edit writes the whole list to storage as the person's own.
 */
export const seedEvents = (today: Date): Event[] => [
  ...SPECS.map((s, i): Event => {
    const day = addDays(startOfWeek(today), s.w * 7 + s.d)
    const start = s.from ? at(day, s.from) : day
    return {
      id: `seed-${i}`,
      title: s.title,
      calendar: s.cal,
      start: local(start),
      end: local(s.days ? addDays(day, s.days - 1) : new Date(start.getTime() + (s.mins ?? 60) * 60e3)),
      ...(s.days ? { allDay: true } : {}),
      ...(s.where ? { location: s.where } : {})
    }
  }),
  // The home-screen widget draws this one, so the tile and the app agree.
  {
    id: 'seed-keynote',
    title: 'Duo keynote',
    calendar: 'work',
    location: 'Apple Park',
    start: local(at(today, '10:00')),
    end: local(at(today, '11:30'))
  }
]
