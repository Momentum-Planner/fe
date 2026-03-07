import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import '@/app/styles.css'
import { Sidebar } from '@/widgets/Sidebar'
import type { NavItem } from '@/widgets/Sidebar'
import { PageFilledIcon, PageIcon } from '@/shared/assets'

export const Route = createRootRoute({
  component: RootComponent,
})

const navItems: NavItem[] = [
  {
    to: '/trends',
    label: '추세 페이지',
    icon: PageIcon,
    activeIcon: PageFilledIcon,
  },
  {
    to: '/market',
    label: '시장동향',
    icon: PageIcon,
    activeIcon: PageFilledIcon,
  },
  {
    to: '/captures',
    label: '내 캡쳐',
    icon: PageIcon,
    activeIcon: PageFilledIcon,
  },
]

function RootComponent() {
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar navItems={navItems} />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
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
