import { createFileRoute, Outlet } from '@tanstack/react-router'

// `/kit` is the showcase and `/kit/docs` the reference under it. The layout
// only nests them: the sidebar belongs to the reference, not to the showcase.
export const Route = createFileRoute('/kit')({ component: Layout })

function Layout() {
  return <Outlet />
}
