import { createFileRoute, Outlet } from '@tanstack/react-router'
import { docs, groups } from '../docs'
import { SideLink, SideList, Split } from '../layout'

export const Route = createFileRoute('/docs')({ component: Layout })

function Layout() {
  return (
    <Split
      aside={
        <>
          {groups.map((g) => (
            <SideList key={g} title={g}>
              {docs
                .filter((d) => d.group === g)
                .map((d) => (
                  <SideLink key={d.slug} to="/docs/$" params={{ _splat: d.slug }}>
                    {d.title}
                  </SideLink>
                ))}
              {g === 'Build' && <SideLink to="/docs/sdk">SDK reference</SideLink>}
            </SideList>
          ))}
          <SideList title="Reference">
            <SideLink to="/kit/docs">UI kit</SideLink>
            <SideLink to="/changelog">Changelog</SideLink>
          </SideList>
        </>
      }
    >
      <Outlet />
    </Split>
  )
}
