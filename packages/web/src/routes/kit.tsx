import { createFileRoute, Outlet } from '@tanstack/react-router'
import { api } from '../generated/api'
import { SideLink, SideList, Split } from '../layout'

export const kit = api.filter((e) => e.pkg === '@doan-labs/duo-uikit')

export const Route = createFileRoute('/kit')({ component: Layout })

function Layout() {
  const by = (kind: string) => kit.filter((e) => e.kind === kind)
  return (
    <Split
      aside={
        <>
          <SideList title="UI kit">
            <SideLink to="/kit">Overview</SideLink>
          </SideList>
          {(
            [
              ['Components', 'component'],
              ['Hooks', 'hook'],
              ['Functions', 'function'],
              ['Values', 'value'],
              ['Types', 'type']
            ] as const
          ).map(
            ([title, kind]) =>
              by(kind).length > 0 && (
                <SideList key={kind} title={title}>
                  {by(kind).map((e) => (
                    <SideLink key={e.name} to="/kit/$name" params={{ name: e.name }}>
                      {e.name}
                    </SideLink>
                  ))}
                </SideList>
              )
          )}
        </>
      }
    >
      <Outlet />
    </Split>
  )
}
