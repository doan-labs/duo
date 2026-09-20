import { createFileRoute, Outlet } from '@tanstack/react-router'
import { kit } from '../kit/data'
import { SideLink, SideList, Split } from '../side-nav'

export const Route = createFileRoute('/kit/docs')({ component: Layout })

function Layout() {
  const by = (kind: string) => kit.filter((e) => e.kind === kind)
  return (
    <Split
      aside={
        <>
          <SideList title="UI kit">
            <SideLink to="/kit">Showcase</SideLink>
            <SideLink to="/kit/docs">Overview</SideLink>
            {/* The guidelines are the kit's other half: the colours, type and
                easings every component below is drawn from. They keep their own
                top-level route, and this is where they are looked for. */}
            <SideLink to="/guidelines">Guidelines</SideLink>
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
                    <SideLink key={e.name} to="/kit/docs/$name" params={{ name: e.name }}>
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
