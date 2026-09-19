import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'

/** A calendar in the sidebar. `color` is any CSS colour, since event tints are chosen at runtime. */
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
  { id: 'home', name: 'Home', color: colors.blueDark, group: 'iCloud' },
  { id: 'work', name: 'Work', color: colors.redDark, group: 'iCloud' },
  { id: 'birthdays', name: 'Birthdays', color: colors.grey, group: 'Other' },
  { id: 'siri', name: 'Siri Suggestions', color: colors.yellowDark, group: 'Other' }
]
