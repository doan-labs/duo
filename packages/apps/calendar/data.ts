/** A calendar in the sidebar. `color` is a hex, since event tints are chosen at runtime. */
export type Cal = { id: string; name: string; color: string; group: string }
/** `start`/`end` are local `YYYY-MM-DDTHH:mm`; all-day events keep 00:00 on both. */
export type Event = {
  id: string
  title: string
  calendar: string
  start: string
  end: string
  allDay?: boolean
  location?: string
  notes?: string
}

export type View = 'Day' | 'Week' | 'Month' | 'Year'
export const VIEWS: readonly View[] = ['Day', 'Week', 'Month', 'Year']

/** The calendars a fresh account has before the user adds any of their own. */
export const DEFAULT_CALENDARS: Cal[] = [
  { id: 'home', name: 'Home', color: '#0a84ff', group: 'iCloud' },
  { id: 'work', name: 'Work', color: '#ff453a', group: 'iCloud' },
  { id: 'birthdays', name: 'Birthdays', color: '#8e8e93', group: 'Other' },
  { id: 'siri', name: 'Siri Suggestions', color: '#ffd60a', group: 'Other' }
]

export const PALETTE = ['#0a84ff', '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#bf5af2', '#8e8e93']
