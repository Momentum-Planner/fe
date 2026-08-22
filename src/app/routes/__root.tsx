import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import '@/app/styles.css'
import { TopBar } from '@/widgets/TopBar'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Snapshot create/edit are focused, full-bleed flows without the app chrome.
  const fullBleed = pathname.startsWith('/snapshots')

  return (
    <>
      {fullBleed ? (
        <Outlet />
      ) : (
        <div className="bg-bg-page flex min-h-screen flex-col">
          <TopBar />
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      )}
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  )
}
