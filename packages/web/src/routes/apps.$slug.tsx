import { createFileRoute } from '@tanstack/react-router'
import { AppSheet, appForSlug } from '../home/apps'

// /apps/<slug>: the app's sheet over the catalog page. The slug is the app's
// last id segment (calculator, snake, tic-tac-toe); unknown slugs bounce to /apps.
export const Route = createFileRoute('/apps/$slug')({
  head: ({ params }) => ({ meta: [{ title: `${appForSlug(params.slug)?.name ?? 'Apps'} · Duo` }] }),
  component: Page
})

function Page() {
  const { slug } = Route.useParams()
  return <AppSheet slug={slug} />
}
