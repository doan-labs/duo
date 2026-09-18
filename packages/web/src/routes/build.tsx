import { createFileRoute } from '@tanstack/react-router'
import { Workspace } from '../builder/workspace'

export const Route = createFileRoute('/build')({
  head: () => ({ meta: [{ title: 'Build an app - Duo' }] }),
  component: Workspace
})
