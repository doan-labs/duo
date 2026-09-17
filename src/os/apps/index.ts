// The home screen, as data. LEFT is exactly what the cover display shows when
// the device is folded and RIGHT is what unfolding reveals. Two 2x2 widgets
// take rows 1-2 of LEFT, which is why LEFT's first row of icons is the third
// row on screen.
import type { App } from '../uikit/app.ts'
import { AppStore } from './appstore/index.tsx'
import { Books } from './books/index.tsx'
import { Calculator } from './calculator/index.tsx'
import { Calendar } from './calendar/index.tsx'
import { Camera } from './camera/index.tsx'
import { Clock } from './clock/index.tsx'
import { Contacts } from './contacts/index.tsx'
import { FaceTime } from './facetime/index.tsx'
import { Files } from './files/index.tsx'
import { FindMy } from './findmy/index.tsx'
import { Fitness } from './fitness/index.tsx'
import { Freeform } from './freeform/index.tsx'
import { Health } from './health/index.tsx'
import { Home } from './home/index.tsx'
import { Itunes } from './itunes/index.tsx'
import { Mail } from './mail/index.tsx'
import { Maps } from './maps/index.tsx'
import { Memos } from './memos/index.tsx'
import { Messages } from './messages/index.tsx'
import { Music } from './music/index.tsx'
import { News } from './news/index.tsx'
import { Notes } from './notes/index.tsx'
import { Phone } from './phone/index.tsx'
import { Photos } from './photos/index.tsx'
import { Podcasts } from './podcasts/index.tsx'
import { Preview } from './preview/index.tsx'
import { Reminders } from './reminders/index.tsx'
import { Safari } from './safari/index.tsx'
import { Settings } from './settings/index.tsx'
import { Shortcuts } from './shortcuts/index.tsx'
import { Siri } from './siri/index.tsx'
import { Stocks } from './stocks/index.tsx'
import { Tips } from './tips/index.tsx'
import { Tv } from './tv/index.tsx'
import { IN_FOLDER, Utilities } from './utilities/index.tsx'
import { Wallet } from './wallet/index.tsx'
import { Watch } from './watch/index.tsx'
import { Weather } from './weather/index.tsx'
import { YouTube } from './youtube/index.tsx'

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
  { name: 'Weather', view: Weather, edge: true },
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
