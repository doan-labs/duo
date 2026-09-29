import { createFileRoute, redirect } from '@tanstack/react-router'

// The hardware showcase is a section of /kit now; the reference itself is /docs/sdk.
export const Route = createFileRoute('/sdk')({
  beforeLoad: () => {
    throw redirect({ to: '/kit', hash: 'sdk' })
  }
})
