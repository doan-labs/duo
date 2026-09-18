import type { ReactNode } from 'react'
import { Nav } from './nav.tsx'

/** Push navigation retaining the established Nav transition and useNavigation contract. */
export type NavigationStackProps = { children: ReactNode }
export function NavigationStack(props: NavigationStackProps) {
  return <Nav {...props} />
}
