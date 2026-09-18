import { createFileRoute, Navigate } from '@tanstack/react-router'

/** The SDK reference moved under Docs. A page is still prerendered here so old links land, then forward. */
export const Route = createFileRoute('/sdk')({
  head: () => ({ meta: [{ title: 'SDK · Duo' }, { httpEquiv: 'refresh', content: '0; url=/docs/sdk' }] }),
  component: () => <Navigate to="/docs/sdk" replace />
})
