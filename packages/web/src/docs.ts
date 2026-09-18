// The developer documentation: every Markdown file under content/docs/ is a
// page at /docs/<name>. Bundled as strings at build time.
const files = import.meta.glob('../content/docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

/** Repository path the files live under; links in the Markdown resolve against it. */
export const ROOT = 'packages/web/content/docs/'
export const slugOf = (path: string) => path.slice(ROOT.length, -'.md'.length)

export type Doc = {
  /** Repository path, `packages/web/content/docs/manifest.md`. */
  path: string
  /** Route param, `manifest`. */
  slug: string
  title: string
  /** The first paragraph, plain text, for the index. */
  summary: string
  group: (typeof groups)[number]
  body: string
}

export const groups = ['Start', 'Build', 'Ship'] as const

const ORDER: Record<Doc['group'], string[]> = {
  Start: ['introduction', 'getting-started', 'your-first-app'],
  Build: ['manifest', 'lifecycle', 'displays', 'storage', 'permissions'],
  Ship: ['cli', 'catalogs', 'publishing']
}

const rank = (slug: string) => {
  const flat = Object.values(ORDER).flat()
  const i = flat.indexOf(slug)
  return i === -1 ? flat.length : i
}

export const docs: Doc[] = Object.entries(files)
  .map(([key, body]) => {
    const path = ROOT + key.slice(key.lastIndexOf('/') + 1)
    const slug = slugOf(path)
    const title = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? slug
    const summary =
      body
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .find((b) => b && !b.startsWith('#'))
        ?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*]/g, '')
        .replace(/\s+/g, ' ') ?? ''
    const group = (groups.find((g) => ORDER[g].includes(slug)) ?? 'Build') as Doc['group']
    return { path, slug, title, summary, group, body }
  })
  .sort((a, b) => rank(a.slug) - rank(b.slug))

export const known = new Set(docs.map((d) => d.path))
export const doc = (slug: string) => docs.find((d) => d.slug === slug)
