import { createFileRoute } from '@tanstack/react-router'
import { Showcase as Sdk } from '../hardware/showcase'
import { Architecture } from '../kit/architecture'
import { KitHero } from '../kit/hero'
import { Principles } from '../kit/rules'

// The platform in one page, top to bottom the way an app meets it: Duo taken
// apart, the rules it is built by, the kit an app draws with, then the SDK's
// buttons and sensors pressed live. Every export is documented under /kit/docs.
export const Route = createFileRoute('/kit/')({
  head: () => ({
    meta: [
      { title: 'Platform · Duo' },
      {
        name: 'description',
        content:
          'How Duo is built, layer by layer: the native window, the Three.js shell, two operating systems, the sandbox runtime, and the SDK and UI kit every app is made from.'
      }
    ]
  }),
  component: Index
})

function Index() {
  return (
    <>
      <Architecture />
      <Principles />
      <KitHero />
      <Sdk />
    </>
  )
}
