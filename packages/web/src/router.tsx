import { createRouter } from '@tanstack/react-router'
import { routeTree } from './route-tree.gen'

export function getRouter() {
  return createRouter({ routeTree, scrollRestoration: true, defaultPreload: 'intent' })
}
