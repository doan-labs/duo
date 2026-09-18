import { createFileRoute, notFound } from '@tanstack/react-router'
import { ApiCard } from '../api-card'
import { Prose } from '../layout'
import { kit } from './kit'

export const Route = createFileRoute('/kit/$name')({
  loader: ({ params }) => {
    const e = kit.find((x) => x.name === params.name)
    if (!e) throw notFound()
    return e
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? 'UI kit'} · Duo` }] }),
  component: Page
})

function Page() {
  return (
    <Prose>
      <ApiCard entry={Route.useLoaderData()} heading="h1" />
    </Prose>
  )
}
