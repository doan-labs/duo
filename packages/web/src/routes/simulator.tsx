import { createFileRoute } from '@tanstack/react-router'
import { Workspace } from '../builder/workspace'

/** `?app=` is a deep link: the home screen name (or catalog id) the phone opens on, from /apps.
 *  `?arg=` reaches the app as `os.arg`; /apps sends a catalog id to open that page in the Store. */
export const Route = createFileRoute('/simulator')({
  validateSearch: (search: Record<string, unknown>): { app?: string; arg?: string } => ({
    app: typeof search.app === 'string' && search.app ? search.app : undefined,
    arg: typeof search.arg === 'string' && search.arg ? search.arg : undefined
  }),
  // Every other page separates with a middle dot; this one was the odd one out.
  head: () => ({
    meta: [
      { title: 'Simulator · Duo' },
      {
        name: 'description',
        content:
          'The phone in the browser: open an app, fold it, and watch the cover display and the inner display hand the session between them.'
      }
    ]
  }),
  component: Page
})

function Page() {
  const { app, arg } = Route.useSearch()
  return <Workspace upcoming app={app} arg={arg} />
}
