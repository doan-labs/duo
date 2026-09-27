import { createFileRoute } from '@tanstack/react-router'
import { AppSheet, appForSlug } from '../home/apps'

// /apps/<slug>: the app's sheet over the catalog page. The slug is the app's
// last id segment (calculator, snake, tic-tac-toe); unknown slugs bounce to /apps.
export const Route = createFileRoute('/apps/$slug')({
  // ?from=<post slug>: opened from a blog post, so the sheet leads back to it. Only a slug, never a URL;
  // an explicit undefined, because the parents pass the raw query through and an absent key would keep it.
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === 'string' && /^[\w-]+$/.test(search.from) ? { from: search.from } : { from: undefined },
  head: ({ params }) => ({ meta: [{ title: `${appForSlug(params.slug)?.name ?? 'Apps'} · Duo` }] }),
  component: Page
})

function Page() {
  const { slug } = Route.useParams()
  const { from } = Route.useSearch()
  return <AppSheet slug={slug} from={from} />
}
