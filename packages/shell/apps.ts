// The home screen, as data. LEFT is exactly what the cover display shows when
// the device is folded and RIGHT is what unfolding reveals. Two 2x2 widgets
// take rows 1-2 of LEFT, which is why LEFT's first row of icons is the third
// row on screen.

import { AppStore } from '@doan-labs/duo-app-appstore/index.tsx'
import { Books } from '@doan-labs/duo-app-books/index.tsx'
import { Calculator } from '@doan-labs/duo-app-calculator/index.tsx'
import { Calendar } from '@doan-labs/duo-app-calendar/index.tsx'
import { Camera } from '@doan-labs/duo-app-camera/index.tsx'
import { Clock } from '@doan-labs/duo-app-clock/index.tsx'
import { Contacts } from '@doan-labs/duo-app-contacts/index.tsx'
import { FaceTime } from '@doan-labs/duo-app-facetime/index.tsx'
import { Files } from '@doan-labs/duo-app-files/index.tsx'
import { FindMy } from '@doan-labs/duo-app-findmy/index.tsx'
import { Fitness } from '@doan-labs/duo-app-fitness/index.tsx'
import { Freeform } from '@doan-labs/duo-app-freeform/index.tsx'
import { Health } from '@doan-labs/duo-app-health/index.tsx'
import { Home } from '@doan-labs/duo-app-home/index.tsx'
import { Itunes } from '@doan-labs/duo-app-itunes/index.tsx'
import { Mail } from '@doan-labs/duo-app-mail/index.tsx'
import { Maps } from '@doan-labs/duo-app-maps/index.tsx'
import { Memos } from '@doan-labs/duo-app-memos/index.tsx'
import { Messages } from '@doan-labs/duo-app-messages/index.tsx'
import { Music } from '@doan-labs/duo-app-music/index.tsx'
import { News } from '@doan-labs/duo-app-news/index.tsx'
import { Phone } from '@doan-labs/duo-app-phone/index.tsx'
import { Photos } from '@doan-labs/duo-app-photos/index.tsx'
import { Podcasts } from '@doan-labs/duo-app-podcasts/index.tsx'
import { Preview } from '@doan-labs/duo-app-preview/index.tsx'
import { Reminders } from '@doan-labs/duo-app-reminders/index.tsx'
import { Safari } from '@doan-labs/duo-app-safari/index.tsx'
import { Settings } from '@doan-labs/duo-app-settings/index.tsx'
import { Shortcuts } from '@doan-labs/duo-app-shortcuts/index.tsx'
import { Siri } from '@doan-labs/duo-app-siri/index.tsx'
import { Stocks } from '@doan-labs/duo-app-stocks/index.tsx'
import { Tips } from '@doan-labs/duo-app-tips/index.tsx'
import { Tv } from '@doan-labs/duo-app-tv/index.tsx'
import { IN_FOLDER, Utilities } from '@doan-labs/duo-app-utilities/index.tsx'
import { Wallet } from '@doan-labs/duo-app-wallet/index.tsx'
import { Watch } from '@doan-labs/duo-app-watch/index.tsx'
import { YouTube } from '@doan-labs/duo-app-youtube/index.tsx'
import type { App } from '@doan-labs/duo-uikit/app.ts'
import { createElement } from 'react'
import { openExternal } from './native.ts'

/** Left half — the cover display, rows 3 to 6. */
export const LEFT: App[] = [
  { name: 'FaceTime', mock: true, view: FaceTime },
  { name: 'Calendar', light: true, view: Calendar },
  { name: 'Photos', light: true, edge: true, view: Photos },
  { name: 'Camera', view: Camera },
  { name: 'Mail', mock: true, light: true, view: Mail },
  { name: 'Clock', view: Clock },
  { name: 'Maps', light: true, edge: true, view: Maps },
  { name: 'TV', mock: true, view: Tv },
  { name: 'News', light: true, view: News },
  { name: 'Health', mock: true, light: true, view: Health },
  { name: 'Wallet', mock: true, view: Wallet },
  { name: 'Siri', mock: true, view: Siri },
  { name: 'Settings', mock: true, light: true, view: Settings }
]

/** Right half — only on the inner display, rows 1 to 6. */
export const RIGHT: App[] = [
  { name: 'Stocks', mock: true, view: Stocks },
  { name: 'Find My', mock: true, light: true, view: FindMy },
  { name: 'Home', mock: true, view: Home },
  { name: 'Fitness', mock: true, view: Fitness },
  { name: 'Watch', mock: true, view: Watch },
  { name: 'Reminders', light: true, view: Reminders },
  { name: 'Files', mock: true, light: true, view: Files },
  { name: 'Preview', mock: true, light: true, view: Preview },
  { name: 'Utilities', view: Utilities, folder: IN_FOLDER },
  { name: 'Contacts', mock: true, light: true, view: Contacts },
  { name: 'iTunes Store', mock: true, light: true, view: Itunes },
  { name: 'Freeform', light: true, view: Freeform },
  { name: 'Tips', mock: true, light: true, view: Tips }
]

export const DOCK: App[] = [
  { name: 'Phone', mock: true, view: Phone },
  { name: 'Safari', light: true, view: Safari },
  { name: 'Messages', mock: true, light: true, view: Messages },
  { name: 'Music', mock: true, view: Music }
]

/** Everything openable by name, including what only lives inside Utilities. */
export const APPS: App[] = [
  ...LEFT,
  ...RIGHT,
  ...DOCK,
  { name: 'Calculator', view: Calculator },
  { name: 'Voice Memos', view: Memos },
  { name: 'Shortcuts', mock: true, light: true, view: Shortcuts },
  { name: 'Podcasts', mock: true, light: true, view: Podcasts },
  // Baked apps never import the shell, so the Store gets its link opener as a prop.
  { name: 'App Store', light: true, view: (props) => createElement(AppStore, { ...props, openExternal }) },
  { name: 'Books', mock: true, light: true, view: Books },
  { name: 'YouTube', light: true, view: YouTube }
]

/** Look an app up by name, case-insensitively; undefined if nothing matches. */
export const byName = (n: string) => APPS.find((a) => a.name.toLowerCase() === n.toLowerCase() || a.id === n)
