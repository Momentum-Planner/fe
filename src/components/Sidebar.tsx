import { Link } from '@tanstack/react-router'
import { BarChart2, Camera, TrendingUp, User } from 'lucide-react'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

const navItems: NavItem[] = [
  { to: '/profile', label: '내 정보', icon: User },
  { to: '/trends', label: '추세 페이지', icon: TrendingUp },
  { to: '/market', label: '시장 동향', icon: BarChart2 },
  { to: '/captures', label: '내 캡쳐', icon: Camera },
]

export function Sidebar() {
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
