import { Link, useMatchRoute } from '@tanstack/react-router'
import type { SVGProps } from 'react'

export type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<SVGProps<SVGSVGElement>>
  activeIcon: React.ComponentType<SVGProps<SVGSVGElement>>
}

interface SidebarProps {
  navItems: NavItem[]
}

export function Sidebar({ navItems }: SidebarProps) {
  const matchRoute = useMatchRoute()

  return (
    <aside className="flex w-70 min-w-45 flex-col px-6 py-9">
      <span className="text-heading-24 [background-image:var(--gradation-red)] bg-clip-text font-semibold text-transparent">
        불타기
      </span>
      <nav className="flex flex-1 flex-col">
        {navItems.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const isActive = !!matchRoute({ to })
          const CurrentIcon = isActive ? ActiveIcon : Icon
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
            >
              <CurrentIcon color="white" />
              <span className="text-label-18">{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
