// Every Markdown file under docs/ becomes a page at /docs/<path without .md>.
// The files are bundled as strings at build time; the site never copies them.
import type { Status } from './status'

const files = import.meta.glob('../../../docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

export type Doc = {
  /** Repository path, `docs/platform/manifest.md`. */
  path: string
  /** Route param, `platform/manifest`. */
  slug: string
  title: string
  group: 'Platform plan' | 'Progress' | 'Repository'
  status: Status
  /** What the badge means for this file, one sentence. */
  note: string
  body: string
}

const ORDER = [
  'platform/README',
  'platform/monorepo',
  'platform/manifest',
  'platform/runtime',
  'platform/uikit',
  'platform/store',
  'platform/updates',
  'platform/dev',
  'platform/publishing',
  'platform/security',
  'platform/web',
  'platform/decisions',
  'platform/progress/README',
  'platform/progress/migration',
  'platform/progress/contract-review-1',
  'platform/progress/contract',
  'architecture',
  'working',
  'decisions',
  'debug'
]

function status(slug: string): Pick<Doc, 'status' | 'note'> {
  if (slug === 'platform/progress/migration')
    return { status: 'works', note: 'Implemented and accepted: the monorepo the site is built from.' }
  if (slug === 'platform/progress/contract')
    return {
      status: 'proposed',
      note: 'The stage 2 runtime contract, revision 2. Accepted as the design; the SDK, bridge and store it describes are being implemented and none of it ships yet.'
    }
  if (slug === 'platform/progress/contract-review-1')
    return {
      status: 'proposed',
      note: 'The review of revision 1, kept verbatim. Historical; superseded by revision 2.'
    }
  if (slug.startsWith('platform/'))
    return {
      status: 'plan',
      note: 'Intent, not shipped code. Commands, packages and APIs named here do not exist until a progress record says they do.'
    }
  return { status: 'works', note: 'Describes the current code in the repository.' }
}

export const docs: Doc[] = Object.entries(files)
  .map(([key, body]) => {
    const path = key.replace(/^(\.\.\/)+/, '')
    const slug = path.slice('docs/'.length, -'.md'.length)
    const title = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? slug
    const group: Doc['group'] = slug.startsWith('platform/progress/')
      ? 'Progress'
      : slug.startsWith('platform/')
        ? 'Platform plan'
        : 'Repository'
    return { path, slug, title, group, body, ...status(slug) }
  })
  .sort((a, b) => {
    const ia = ORDER.indexOf(a.slug)
    const ib = ORDER.indexOf(b.slug)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.slug.localeCompare(b.slug)
  })

export const known = new Set(docs.map((d) => d.path))
export const doc = (slug: string) => docs.find((d) => d.slug === slug)
export const groups = ['Platform plan', 'Progress', 'Repository'] as const
