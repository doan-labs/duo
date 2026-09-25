import { createFileRoute } from '@tanstack/react-router'
import { Showcase } from '../hardware/showcase'

/** The SDK's hardware, pressed live. The reference itself is /docs/sdk. */
export const Route = createFileRoute('/sdk')({
  head: () => ({
    meta: [
      { title: 'SDK · Duo' },
      {
        name: 'description',
        content: 'Volume, Camera Control, the side button, the pose and the switches, as events your app hears.'
      }
    ]
  }),
  component: Showcase
})
