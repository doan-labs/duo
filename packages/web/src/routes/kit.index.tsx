import { createFileRoute } from '@tanstack/react-router'
import { KitHero } from '../kit/hero'

// One hero and nothing else: the kit in a sentence, running, with the door to
// the reference. Every export is documented under /kit/docs.
export const Route = createFileRoute('/kit/')({
  head: () => ({
    meta: [
      { title: 'UI kit · Duo' },
      {
        name: 'description',
        content:
          'The components every Duo app is built from: iOS controls, lists, navigation and widgets that already know about the cover display, the inner display and the fold between them.'
      }
    ]
  }),
  component: Index
})

function Index() {
  return <KitHero />
}
