import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { type Cal, DEFAULT_CALENDARS, type Event, VIEWS, type View } from './data.ts'
import { ymd } from './dates.ts'

const parse = <T>(raw: string | null, fallback: T): T => (raw ? JSON.parse(raw) : fallback)

/** The calendar list and which ones are hidden; both displays share one copy. */
export function useCalendars() {
  const list = useKV(os.storage, 'calendars')
  const off = useKV(os.storage, 'hidden')
  const calendars = parse<Cal[]>(list.value, DEFAULT_CALENDARS)
  const hidden = new Set(parse<string[]>(off.value, []))
  return {
    calendars,
    hidden,
    toggle: (id: string) => {
      hidden.has(id) ? hidden.delete(id) : hidden.add(id)
      off.set(JSON.stringify([...hidden]))
    },
    add: (cal: Cal) => list.set(JSON.stringify([...calendars, cal]))
  }
}

// ponytail: one JSON key holds every event, good to ~1500 of them under the 256 KB value cap; shard by month past that.
export function useEvents() {
  const kv = useKV(os.storage, 'events')
  const events = parse<Event[]>(kv.value, [])
  const write = (next: Event[]) => kv.set(JSON.stringify(next))
  return {
    events,
    save: (e: Event) => write([...events.filter((x) => x.id !== e.id), e]),
    remove: (id: string) => write(events.filter((x) => x.id !== id))
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
