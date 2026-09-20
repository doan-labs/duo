import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { type Cal, DEFAULT_CALENDARS, type Event, VIEWS, type View } from './data.ts'
import { ymd } from './dates.ts'
import { seedEvents } from './seed.ts'

/** The calendar list and which ones are hidden; both displays share one copy. */
export function useCalendars() {
  const list = useJSON<Cal[]>(os.storage, 'calendars', DEFAULT_CALENDARS)
  const off = useJSON<string[]>(os.storage, 'hidden', [])
  const calendars = list.value
  const hidden = new Set(off.value)
  return {
    calendars,
    hidden,
    toggle: (id: string) => {
      hidden.has(id) ? hidden.delete(id) : hidden.add(id)
      off.set([...hidden])
    },
    add: (cal: Cal) => list.set([...calendars, cal])
  }
}

// ponytail: one JSON key holds every event, good to ~1500 of them under the 256 KB value cap; shard by month past that.
export function useEvents() {
  // Nothing written yet means a fresh install, not an empty calendar: seed it.
  const kv = useJSON<Event[]>(os.storage, 'events', seedEvents(new Date()))
  const events = kv.value
  return {
    events,
    save: (e: Event) => kv.set([...events.filter((x) => x.id !== e.id), e]),
    remove: (id: string) => kv.set(events.filter((x) => x.id !== id))
  }
}

/** Which view and day each display shows; session-scoped so a pick on one side follows on the other. */
export function useSelection() {
  const v = useKV(os.session, 'view')
  const d = useKV(os.session, 'date')
  const side = useKV(os.session, 'sidebar')
  const view = (VIEWS as readonly string[]).includes(v.value ?? '') ? (v.value as View) : 'Month'
  const date = d.value ? new Date(`${d.value}T00:00`) : new Date()
  return {
    view,
    setView: (x: View) => v.set(x),
    date,
    setDate: (x: Date) => d.set(ymd(x)),
    sidebar: side.value !== '0',
    setSidebar: (on: boolean) => side.set(on ? '1' : '0')
  }
}
