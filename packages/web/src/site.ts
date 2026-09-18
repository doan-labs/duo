// Facts the pages share. Change them here, not in a route.
export const REPO = 'https://github.com/doan-labs/duo'
export const DISCUSSIONS = `${REPO}/discussions`
export const LICENSE = `${REPO}/blob/main/LICENSE`
export const blob = (path: string) => `${REPO}/blob/main/${path}`
/** New pull request with the app submission template preselected. */
export const SUBMIT = `${REPO}/compare?template=app-submission.md`
/** The curated catalog the publish workflow writes to. */
export const CATALOG = 'https://duo.doan-labs.com/catalog/index.json'

/**
 * The global bar. `Try Duo` is the call to action and lives in the bar's right
 * group. `icon` is a 16 × 16 stroke path in the manner of SF Symbols: a grid of
 * apps, stacked components, a page, a phone.
 */
export const NAV = [
  {
    to: '/apps',
    label: 'Apps',
    icon: 'M2.5 2.5h4.25v4.25H2.5zM9.25 2.5h4.25v4.25H9.25zM2.5 9.25h4.25v4.25H2.5zM9.25 9.25h4.25v4.25H9.25z'
  },
  { to: '/kit', label: 'UI kit', icon: 'M2.5 2.5h8v8h-8zM5.5 5.5h8v8h-8' },
  { to: '/docs', label: 'Docs', icon: 'M4 1.75h5.5L13 5.25v9H4zM9.5 1.75v3.5H13M6.25 8.5h3.5M6.25 11h3.5' },
  {
    to: '/simulator',
    label: 'Simulator',
    icon: 'M4.75 1.75h6.5a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1V2.75a1 1 0 0 1 1-1zM6.75 3.5h2.5',
    highlight: true
  }
] as const

/** GitHub's mark, filled; the one icon in the bar that is a logo rather than a symbol. */
export const GITHUB_MARK =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z'

/** Every other page, reachable from the footer so nothing is orphaned. */
export const MORE = [
  { to: '/simulator', label: 'Simulator' },
  { to: '/publish', label: 'Submit an app' },
  { to: '/guidelines', label: 'Guidelines' },
  { to: '/changelog', label: 'Changelog' }
] as const

/** The studio behind Duo. */
export const DOAN = 'https://doan-labs.com'
