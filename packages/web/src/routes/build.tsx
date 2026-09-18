import { createFileRoute, redirect } from '@tanstack/react-router'

// The browser AI builder (src/builder) is parked as upcoming work; the live simulator is the public page.
export const Route = createFileRoute('/build')({
  beforeLoad: () => {
    throw redirect({ to: '/simulator' })
  }
})
