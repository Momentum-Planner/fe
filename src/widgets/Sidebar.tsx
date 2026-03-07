import { Link } from '@tanstack/react-router'
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
  return (
    <aside className="flex w-70 min-w-45 flex-col px-6 py-9">
      <span className="text-heading-24 [background-image:var(--gradation-red)] bg-clip-text font-semibold text-transparent">
        불타기
      </span>
      <nav className="flex flex-1 flex-col">
        {navItems.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 p-3 transition-all"
          >
            {({ isActive }) => {
              const CurrentIcon = isActive ? ActiveIcon : Icon
              return (
                <>
                  <CurrentIcon color="white" />
                  <span className="text-label-18">{label}</span>
                </>
              )
            }}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
