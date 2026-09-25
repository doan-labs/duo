import { createFileRoute } from '@tanstack/react-router'
import { Workspace } from '../builder/workspace'

// The browser AI builder: describe an app, each revision compiles locally and runs on the phone.
export const Route = createFileRoute('/build')({
  head: () => ({
    meta: [
      { title: 'Build · Duo' },
      {
        name: 'description',
        content:
          'Describe an app and Duo builds it in your browser: every revision compiles locally and runs on the phone beside the chat.'
      }
    ]
  }),
  component: Page
})

function Page() {
  return <Workspace />
}
