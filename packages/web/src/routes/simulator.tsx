import { createFileRoute } from '@tanstack/react-router'
import { Workspace } from '../builder/workspace'

export const Route = createFileRoute('/simulator')({
  head: () => ({ meta: [{ title: 'Simulator - Duo' }] }),
  component: () => <Workspace upcoming />
})
