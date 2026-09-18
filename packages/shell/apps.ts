// The home screen, as data. LEFT is exactly what the cover display shows when
// the device is folded and RIGHT is what unfolding reveals. Two 2x2 widgets
// take rows 1-2 of LEFT, which is why LEFT's first row of icons is the third
// row on screen.

import { AppStore } from '@doan-labs/ipduo-app-appstore/index.tsx'
import { Books } from '@doan-labs/ipduo-app-books/index.tsx'
import { Calculator } from '@doan-labs/ipduo-app-calculator/index.tsx'
import { Calendar } from '@doan-labs/ipduo-app-calendar/index.tsx'
import { Camera } from '@doan-labs/ipduo-app-camera/index.tsx'
import { Clock } from '@doan-labs/ipduo-app-clock/index.tsx'
import { Contacts } from '@doan-labs/ipduo-app-contacts/index.tsx'
import { FaceTime } from '@doan-labs/ipduo-app-facetime/index.tsx'
import { Files } from '@doan-labs/ipduo-app-files/index.tsx'
import { FindMy } from '@doan-labs/ipduo-app-findmy/index.tsx'
import { Fitness } from '@doan-labs/ipduo-app-fitness/index.tsx'
import { Freeform } from '@doan-labs/ipduo-app-freeform/index.tsx'
import { Health } from '@doan-labs/ipduo-app-health/index.tsx'
import { Home } from '@doan-labs/ipduo-app-home/index.tsx'
import { Itunes } from '@doan-labs/ipduo-app-itunes/index.tsx'
import { Mail } from '@doan-labs/ipduo-app-mail/index.tsx'
import { Maps } from '@doan-labs/ipduo-app-maps/index.tsx'
import { Memos } from '@doan-labs/ipduo-app-memos/index.tsx'
import { Messages } from '@doan-labs/ipduo-app-messages/index.tsx'
import { Music } from '@doan-labs/ipduo-app-music/index.tsx'
import { News } from '@doan-labs/ipduo-app-news/index.tsx'
import { Phone } from '@doan-labs/ipduo-app-phone/index.tsx'
import { Photos } from '@doan-labs/ipduo-app-photos/index.tsx'
import { Podcasts } from '@doan-labs/ipduo-app-podcasts/index.tsx'
import { Preview } from '@doan-labs/ipduo-app-preview/index.tsx'
import { Reminders } from '@doan-labs/ipduo-app-reminders/index.tsx'
import { Safari } from '@doan-labs/ipduo-app-safari/index.tsx'
import { Settings } from '@doan-labs/ipduo-app-settings/index.tsx'
import { Shortcuts } from '@doan-labs/ipduo-app-shortcuts/index.tsx'
import { Siri } from '@doan-labs/ipduo-app-siri/index.tsx'
import { Stocks } from '@doan-labs/ipduo-app-stocks/index.tsx'
import { Tips } from '@doan-labs/ipduo-app-tips/index.tsx'
import { Tv } from '@doan-labs/ipduo-app-tv/index.tsx'
import { IN_FOLDER, Utilities } from '@doan-labs/ipduo-app-utilities/index.tsx'
import { Wallet } from '@doan-labs/ipduo-app-wallet/index.tsx'
import { Watch } from '@doan-labs/ipduo-app-watch/index.tsx'
import { YouTube } from '@doan-labs/ipduo-app-youtube/index.tsx'
import type { App } from '@doan-labs/ipduo-uikit/app.ts'

/** Left half — the cover display, rows 3 to 6. */
export const LEFT: App[] = [
  { name: 'FaceTime', view: FaceTime },
  { name: 'Calendar', light: true, view: Calendar },
  { name: 'Photos', light: true, view: Photos },
  { name: 'Camera', view: Camera },
  { name: 'Mail', light: true, view: Mail },
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
export const byName = (n: string) => APPS.find((a) => a.name.toLowerCase() === n.toLowerCase() || a.id === n)
