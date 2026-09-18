// Facts the pages share. Change them here, not in a route.
export const REPO = 'https://github.com/doan-labs/duo'
export const DISCUSSIONS = `${REPO}/discussions`
export const LICENSE = `${REPO}/blob/main/LICENSE`
export const blob = (path: string) => `${REPO}/blob/main/${path}`

/** The global bar. `Try Duo` is the call to action and lives in the bar's right group. */
export const NAV = [
  { to: '/apps', label: 'Apps' },
  { to: '/sdk', label: 'SDK' },
  { to: '/kit', label: 'UI kit' },
  { to: '/docs', label: 'Docs' },
  { to: '/get-started', label: 'Build an app' }
] as const

/** Every other page, reachable from the footer so nothing is orphaned. */
export const MORE = [
  { to: '/simulator', label: 'Simulator' },
  { to: '/publish', label: 'Publish' },
  { to: '/guidelines', label: 'Guidelines' },
  { to: '/changelog', label: 'Changelog' }
] as const

/** The studio behind Duo. */
export const DOAN = 'https://doan-labs.com'
