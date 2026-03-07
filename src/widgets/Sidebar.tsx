import { Link } from '@tanstack/react-router'

export type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

interface SidebarProps {
  navItems: NavItem[]
}

export function Sidebar({ navItems }: SidebarProps) {
  return (
    <aside className="flex w-70 flex-col px-6 py-9">
      <div className="flex h-14 items-center border-b border-(--line) px-6">
        <span className="font-semibold text-white">Burning In</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white transition-all"
            activeProps={{
              className: 'font-large',
            }}
          >
            <Icon size={17} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
