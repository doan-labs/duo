import { createFileRoute } from '@tanstack/react-router'
import { Showcase as Sdk } from '../hardware/showcase'
import { Architecture } from '../kit/architecture'
import { KitHero } from '../kit/hero'
import { Principles } from '../kit/rules'

// The platform in one page, top to bottom the way an app meets it: Duo taken
// apart, the rules it is built by, the kit an app draws with, then the SDK's
// buttons and sensors pressed live. Every export is documented under /kit/docs.
const TITLE = 'Duo, taken apart.'
const LEAD =
  'How Duo is built, layer by layer: the native window, the Three.js shell, two operating systems, the sandbox runtime, and the SDK and UI kit every app is made from.'
// Absolute for the crawlers; relative in dev, where the card is not deployed yet. Rendered from scripts/og/platform.html.
const IMAGE = `${import.meta.env.DEV ? '' : 'https://duo.doan-labs.com'}/og/platform.png`

export const Route = createFileRoute('/kit/')({
  head: () => ({
    meta: [
      { title: 'Platform · Duo' },
      { name: 'description', content: LEAD },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: LEAD },
      { property: 'og:image', content: IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: LEAD },
      { name: 'twitter:image', content: IMAGE }
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
