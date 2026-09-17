// The home screen, as data. LEFT is exactly what the cover display shows when
// the device is folded and RIGHT is what unfolding reveals. Two 2x2 widgets
// take rows 1-2 of LEFT, which is why LEFT's first row of icons is the third
// row on screen.
import type { App } from '../uikit/app.ts'
import { AppStore } from './appstore.tsx'
import { Books } from './books.tsx'
import { Calculator } from './calculator.tsx'
import { Calendar } from './calendar.tsx'
import { Camera } from './camera.tsx'
import { Clock } from './clock.tsx'
import { Contacts } from './contacts.tsx'
import { FaceTime } from './facetime.tsx'
import { Files } from './files.tsx'
import { FindMy } from './findmy.tsx'
import { Fitness } from './fitness.tsx'
import { Freeform } from './freeform.tsx'
import { Health } from './health.tsx'
import { Home } from './home.tsx'
import { Itunes } from './itunes.tsx'
import { Mail } from './mail.tsx'
import { Maps } from './maps.tsx'
import { Memos } from './memos.tsx'
import { Messages } from './messages.tsx'
import { Music } from './music.tsx'
import { News } from './news.tsx'
import { Notes } from './notes.tsx'
import { Phone } from './phone.tsx'
import { Photos } from './photos.tsx'
import { Podcasts } from './podcasts.tsx'
import { Preview } from './preview.tsx'
import { Reminders } from './reminders.tsx'
import { Safari } from './safari.tsx'
import { Settings } from './settings.tsx'
import { Shortcuts } from './shortcuts.tsx'
import { Siri } from './siri.tsx'
import { Stocks } from './stocks.tsx'
import { Tips } from './tips.tsx'
import { Tv } from './tv.tsx'
import { IN_FOLDER, Utilities } from './utilities.tsx'
import { Wallet } from './wallet.tsx'
import { Watch } from './watch.tsx'
import { Weather } from './weather.tsx'
import { YouTube } from './youtube.tsx'

/** Left half — the cover display, rows 3 to 6. */
export const LEFT: App[] = [
  { name: 'FaceTime', view: FaceTime },
  { name: 'Calendar', light: true, view: Calendar },
  { name: 'Photos', light: true, view: Photos },
  { name: 'Camera', view: Camera },
  { name: 'Mail', light: true, view: Mail },
  { name: 'Notes', view: Notes },
  { name: 'Clock', view: Clock },
  { name: 'Maps', light: true, view: Maps },
  { name: 'TV', view: Tv },
  { name: 'News', light: true, view: News },
  { name: 'Health', light: true, view: Health },
  { name: 'Wallet', view: Wallet },
  { name: 'Siri', view: Siri },
  { name: 'Settings', light: true, view: Settings }
]

/** Right half — only on the inner display, rows 1 to 6. */
export const RIGHT: App[] = [
  { name: 'Weather', view: Weather },
  { name: 'Stocks', view: Stocks },
  { name: 'Find My', light: true, view: FindMy },
  { name: 'Home', view: Home },
  { name: 'Fitness', view: Fitness },
  { name: 'Watch', view: Watch },
  { name: 'Reminders', light: true, view: Reminders },
  { name: 'Files', light: true, view: Files },
  { name: 'Preview', light: true, view: Preview },
  { name: 'Utilities', view: Utilities, folder: IN_FOLDER },
  { name: 'Contacts', light: true, view: Contacts },
  { name: 'iTunes Store', light: true, view: Itunes },
  { name: 'Freeform', light: true, view: Freeform },
  { name: 'Tips', light: true, view: Tips }
]

export const DOCK: App[] = [
  { name: 'Phone', view: Phone },
  { name: 'Safari', light: true, view: Safari },
  { name: 'Messages', light: true, view: Messages },
  { name: 'Music', view: Music }
]

/** Everything openable by name, including what only lives inside Utilities. */
export const APPS: App[] = [
  ...LEFT,
  ...RIGHT,
  ...DOCK,
  { name: 'Calculator', view: Calculator },
  { name: 'Voice Memos', view: Memos },
  { name: 'Shortcuts', light: true, view: Shortcuts },
  { name: 'Podcasts', light: true, view: Podcasts },
  { name: 'App Store', light: true, view: AppStore },
  { name: 'Books', light: true, view: Books },
  { name: 'YouTube', light: true, view: YouTube }
]

/** Look an app up by name, case-insensitively; undefined if nothing matches. */
export const byName = (n: string) => APPS.find((a) => a.name.toLowerCase() === n.toLowerCase())
