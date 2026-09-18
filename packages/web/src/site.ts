// Facts the pages share. Change them here, not in a route.
export const REPO = 'https://github.com/doan-labs/duo'
export const DISCUSSIONS = `${REPO}/discussions`
export const LICENSE = `${REPO}/blob/main/LICENSE`
export const blob = (path: string) => `${REPO}/blob/main/${path}`
/** New pull request with the app submission template preselected. */
export const SUBMIT = `${REPO}/compare?template=app-submission.md`
/** The curated catalog the publish workflow writes to. */
export const CATALOG = 'https://duo.doan-labs.com/catalog/index.json'

/** The global bar. `Try Duo` is the call to action and lives in the bar's right group. */
export const NAV = [
  { to: '/apps', label: 'Apps' },
  { to: '/kit', label: 'UI kit' },
  { to: '/docs', label: 'Docs' },
  { to: '/simulator', label: 'Simulator', highlight: true }
] as const

/** Every other page, reachable from the footer so nothing is orphaned. */
export const MORE = [
  { to: '/simulator', label: 'Simulator' },
  { to: '/publish', label: 'Submit an app' },
  { to: '/guidelines', label: 'Guidelines' },
  { to: '/changelog', label: 'Changelog' }
] as const

/** The studio behind Duo. */
export const DOAN = 'https://doan-labs.com'
