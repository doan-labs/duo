// The home screen, as data. LEFT is exactly what the cover display shows when
// the device is folded and RIGHT is what unfolding reveals. Two 2x2 widgets
// take rows 1-2 of LEFT, which is why LEFT's first row of icons is the third
// row on screen.

import { AppStore } from '@doan-labs/duo-app-appstore/index.tsx'
import { Books } from '@doan-labs/duo-app-books/index.tsx'
import { Camera } from '@doan-labs/duo-app-camera/index.tsx'
import { Contacts } from '@doan-labs/duo-app-contacts/index.tsx'
import { FaceTime } from '@doan-labs/duo-app-facetime/index.tsx'
import { Files } from '@doan-labs/duo-app-files/index.tsx'
import { FindMy } from '@doan-labs/duo-app-findmy/index.tsx'
import { Fitness } from '@doan-labs/duo-app-fitness/index.tsx'
import { Health } from '@doan-labs/duo-app-health/index.tsx'
import { Home } from '@doan-labs/duo-app-home/index.tsx'
import { Itunes } from '@doan-labs/duo-app-itunes/index.tsx'
import { Mail } from '@doan-labs/duo-app-mail/index.tsx'
import { Maps } from '@doan-labs/duo-app-maps/index.tsx'
import { Memos } from '@doan-labs/duo-app-memos/index.tsx'
import { Messages } from '@doan-labs/duo-app-messages/index.tsx'
import { Music } from '@doan-labs/duo-app-music/index.tsx'
import { Phone } from '@doan-labs/duo-app-phone/index.tsx'
import { Podcasts } from '@doan-labs/duo-app-podcasts/index.tsx'
import { Preview } from '@doan-labs/duo-app-preview/index.tsx'
import { Safari } from '@doan-labs/duo-app-safari/index.tsx'
import { Settings } from '@doan-labs/duo-app-settings/index.tsx'
import { Shortcuts } from '@doan-labs/duo-app-shortcuts/index.tsx'
import { Siri } from '@doan-labs/duo-app-siri/index.tsx'
import { Stocks } from '@doan-labs/duo-app-stocks/index.tsx'
import { Tips } from '@doan-labs/duo-app-tips/index.tsx'
import { Tv } from '@doan-labs/duo-app-tv/index.tsx'
import { Wallet } from '@doan-labs/duo-app-wallet/index.tsx'
import type { SettingsHost } from '@doan-labs/duo-sdk'
import type { App } from '@doan-labs/duo-uikit/app.ts'
import { createElement } from 'react'
import { claimSide } from './device.ts'
import { openExternal } from './native.ts'
import { erase } from './runtime/erase.ts'
import { BATTERY, flip, NETWORK, subscribeToggles, toggles, togglesRevision } from './springboard/toggles.ts'

// An entry with an `id` is an isolated release from the preinstalled catalog: it holds the
// slot, and runtime/registry.ts fills in its icon once the release is installed.
const RELEASE = { view: () => null }
// Baked apps never import the shell, so Settings is handed the device switches,
// the eraser and the link opener the way the Store is handed `openExternal`.
const SETTINGS_HOST: SettingsHost = {
  switches: toggles,
  subscribe: subscribeToggles,
  revision: togglesRevision,
  flip,
  network: NETWORK,
  battery: BATTERY,
  erase,
  openExternal,
  claimSide
}
/** The apps inside Utilities, Apple's one shipped folder: Spotlight finds them, the grid does not. */
const UTILITIES = ['Calculator', 'Voice Memos', 'Shortcuts', 'Podcasts', 'Books']

/** Left half — the cover display, rows 3 to 6. */
export const LEFT: App[] = [
  { name: 'FaceTime', mock: true, view: FaceTime },
  { name: 'Calendar', id: 'labs.doan.ipduo.calendar', ...RELEASE },
  { name: 'Photos', id: 'labs.doan.ipduo.photos', light: true, ...RELEASE },
  { name: 'Camera', view: Camera },
  { name: 'Mail', mock: true, light: true, view: Mail },
  { name: 'Clock', id: 'labs.doan.ipduo.clock', ...RELEASE },
  { name: 'Notes', id: 'labs.doan.ipduo.notes', light: true, ...RELEASE },
  { name: 'Maps', light: true, edge: true, view: Maps },
  { name: 'TV', mock: true, view: Tv },
  { name: 'News', id: 'labs.doan.ipduo.news', light: true, ...RELEASE },
  { name: 'Health', light: true, view: Health },
  { name: 'Wallet', light: true, view: Wallet },
  { name: 'Siri', mock: true, view: Siri },
  // `edge`: the sidebar's material runs to the top corner, so each column pads its own status band.
  {
    name: 'Settings',
    light: true,
    edge: true,
    view: (props) => createElement(Settings, { ...props, host: SETTINGS_HOST })
  }
]

/** Right half — only on the inner display, rows 1 to 6. */
export const RIGHT: App[] = [
  { name: 'Weather', id: 'labs.doan.ipduo.weather', edge: true, ...RELEASE },
  { name: 'Stocks', view: Stocks },
  { name: 'Find My', mock: true, light: true, view: FindMy },
  { name: 'Home', light: true, view: Home },
  { name: 'Fitness', view: Fitness },
  { name: 'Reminders', id: 'labs.doan.ipduo.reminders', light: true, ...RELEASE },
  { name: 'Files', mock: true, light: true, view: Files },
  { name: 'Preview', mock: true, light: true, view: Preview },
  // A folder opens on the home screen, never as a scene; springboard/grid.ts reads what it holds.
  { name: 'Utilities', folder: UTILITIES, view: () => null },
  { name: 'Contacts', light: true, view: Contacts },
  { name: 'iTunes Store', mock: true, light: true, view: Itunes },
  { name: 'Freeform', id: 'labs.doan.ipduo.freeform', light: true, ...RELEASE },
  { name: 'Tips', light: true, view: Tips }
]

/** The vertical dock on the hinge-free edge. A dock app is not also on a page. */
export const DOCK: App[] = [
  { name: 'Phone', mock: true, view: Phone },
  { name: 'Safari', light: true, rail: true, view: Safari },
  { name: 'Messages', mock: true, light: true, view: Messages },
  { name: 'Music', view: Music },
  // Baked apps never import the shell, so the Store gets its link opener as a prop.
  { name: 'App Store', light: true, view: (props) => createElement(AppStore, { ...props, openExternal }) }
]

/** Everything openable by name, including what only lives inside Utilities. */
export const APPS: App[] = [
  ...LEFT,
  ...RIGHT,
  ...DOCK,
  { name: 'Calculator', id: 'labs.doan.ipduo.calculator', ...RELEASE },
  { name: 'Voice Memos', view: Memos },
  { name: 'Shortcuts', mock: true, light: true, view: Shortcuts },
  { name: 'Podcasts', mock: true, light: true, view: Podcasts },
  { name: 'Books', light: true, view: Books }
]

/** Look an app up by name, case-insensitively; undefined if nothing matches. */
export const byName = (n: string) => APPS.find((a) => a.name.toLowerCase() === n.toLowerCase() || a.id === n)
