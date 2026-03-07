import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import '@/app/styles.css'
import { Sidebar } from '@/widgets/Sidebar'
import type { NavItem } from '@/widgets/Sidebar'
import { BarChart2, Camera, TrendingUp, User } from 'lucide-react'

export const Route = createRootRoute({
  component: RootComponent,
})

const navItems: NavItem[] = [
  { to: '/profile', label: '내 정보', icon: User },
  { to: '/trends', label: '추세 페이지', icon: TrendingUp },
  { to: '/market', label: '시장 동향', icon: BarChart2 },
  { to: '/captures', label: '내 캡쳐', icon: Camera },
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
