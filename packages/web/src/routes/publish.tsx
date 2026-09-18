import { createFileRoute } from '@tanstack/react-router'
import { DocBody } from '../doc-body'
import { doc } from '../docs'
import { Section } from '../layout'

export const Route = createFileRoute('/publish')({
  head: () => ({ meta: [{ title: 'Publish · Duo' }] }),
  component: Page
})

/** The publishing guide, on its own URL because the footer and the apps page point here. */
function Page() {
  const d = doc('publishing')
  return <Section narrow>{d && <DocBody doc={d} />}</Section>
}
