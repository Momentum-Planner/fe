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
    <aside className="w-[288px] shrink-0 h-screen sticky top-0 bg-[#A6A5B9] border-r border-(--line) flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-(--line)">
        <span className="font-semibold text-white">Burning In</span>
      </div>
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white transition-all"
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
