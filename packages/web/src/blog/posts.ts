// The blog: every MDX file under content/blog/ is a post at /blog/<name>. Each
// file exports its own `meta`; the raw text is read alongside for the outline
// and the reading time, so both are in the prerendered page.
import type { ComponentType } from 'react'
import { slug as idOf } from '../markdown'

export type Meta = {
  title: string
  /** One or two sentences under the title, and the card's text on the index. */
  lead: string
  /** ISO day, `2026-09-27`. */
  date: string
  /** Several names get a byline each. */
  author: string | string[]
  /** The still for the card and the social preview, under public/. */
  poster: string
  /** A 1200 × 630 social card, under public/og/; the poster stands in without one. */
  og?: string
}

type Mod = { default: ComponentType<{ components?: Record<string, ComponentType<never>> }>; meta: Meta }

const mods = import.meta.glob<Mod>('../../content/blog/*.mdx', { eager: true })
const raws = import.meta.glob<string>('../../content/blog/*.mdx', { query: '?raw', import: 'default', eager: true })

export type Post = Meta & {
  slug: string
  Body: Mod['default']
  minutes: number
  toc: { id: string; text: string }[]
}

export const posts: Post[] = Object.entries(mods)
  .map(([key, mod]) => {
    const raw = raws[key] ?? ''
    // Prose only: imports, exports and JSX lines are not reading.
    const words = raw
      .split('\n')
      .filter((l) => !/^\s*(import|export|<|\/?>)/.test(l))
      .join(' ')
      .split(/\s+/).length
    const toc = [...raw.matchAll(/^## (.+)$/gm)].map((m) => {
      const text = (m[1] ?? '').replace(/[`*]/g, '')
      return { id: idOf(text), text }
    })
    return {
      ...mod.meta,
      slug: key.slice(key.lastIndexOf('/') + 1, -'.mdx'.length),
      Body: mod.default,
      minutes: Math.max(1, Math.round(words / 230)),
      toc
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

export const post = (slug: string) => posts.find((p) => p.slug === slug)

/** `2026-09-27` as `September 27, 2026`, fixed to UTC so the server and the reader agree. */
export const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })
