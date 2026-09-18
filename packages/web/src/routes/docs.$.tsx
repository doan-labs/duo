import { createFileRoute, notFound } from '@tanstack/react-router'
import { DocBody } from '../doc-body'
import { doc } from '../docs'

export const Route = createFileRoute('/docs/$')({
  loader: ({ params }) => {
    const d = doc(params._splat ?? '')
    if (!d) throw notFound()
    return d
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? 'Docs'} · Duo` }] }),
  component: Page
})

function Page() {
  return <DocBody doc={Route.useLoaderData()} />
}
