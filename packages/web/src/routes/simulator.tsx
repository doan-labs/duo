import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/simulator')({
  beforeLoad: () => {
    throw redirect({ to: '/build' })
  }
})
