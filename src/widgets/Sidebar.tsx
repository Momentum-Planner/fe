import { Link } from '@tanstack/react-router'
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { MomentumLogo } from '@/shared/ui/MomentumLogo'
import { removeWatch, useWatchlist } from '@/shared/lib/watchlist'
import { AuthModal } from '@/widgets/AuthModal'

type NavEntry = {
  to: '/trends' | '/captures'
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

const navItems: NavEntry[] = [
  { to: '/trends', label: '오늘의 추세', icon: TrendingUp },
  { to: '/captures', label: '내 스냅샷', icon: ImageIcon },
]

const navItemClass =
  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[16px] text-white/60 transition-colors hover:text-white/90'

export function Sidebar() {
  const [authOpen, setAuthOpen] = useState(false)
  const [watchOpen, setWatchOpen] = useState(true)
  const watchlist = useWatchlist()

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-6 bg-[rgba(0,0,0,0.8)] px-5 pt-8 pb-6">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Brand — home button → 오늘의 추세 */}
      <Link to="/trends" className="flex items-center gap-2 pl-1">
        <MomentumLogo size={20} />
        <span className="font-number text-[18px] font-bold tracking-[-0.01em] text-white">
          Momentum
        </span>
      </Link>

      {/* Login */}
      <button
        type="button"
        onClick={() => setAuthOpen(true)}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-white/85 font-semibold text-[#7BA8FF] transition-colors hover:bg-white"
      >
        <User size={18} strokeWidth={2} />
        <span>로그인</span>
      </button>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`${navItemClass} [&.active]:bg-white/[0.04] [&.active]:font-bold [&.active]:text-white`}
            activeProps={{ className: 'active' }}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="flex-1">{label}</span>
          </Link>
        ))}

        {/* 관심 종목 — collapsible */}
        <button
          type="button"
          onClick={() => setWatchOpen((o) => !o)}
          aria-expanded={watchOpen}
          className={`${navItemClass} font-bold text-white`}
        >
          <Bookmark size={20} strokeWidth={2} />
          <span className="flex-1 text-left">관심 종목</span>
          {watchOpen ? (
            <ChevronUp size={18} strokeWidth={2} className="opacity-70" />
          ) : (
            <ChevronDown size={18} strokeWidth={2} className="opacity-70" />
          )}
        </button>
        {watchOpen && (
          <ul className="mt-0.5 ml-8 flex flex-col gap-0.5">
            {watchlist.map(({ name, date }) => (
              <li
                key={name}
                className="flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-white/[0.04]"
              >
                <Link
                  to="/stocks/$ticker"
                  params={{ ticker: name }}
                  className="flex-1 truncate text-white/80 hover:text-white"
                >
                  {name}
                </Link>
                <span className="font-number mr-1.5 text-[12px] text-white/50">
                  {date}
                </span>
                <button
                  type="button"
                  onClick={() => removeWatch(name)}
                  aria-label={`${name} 관심 종목에서 삭제`}
                  className="flex text-white/35 transition-colors hover:text-white"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </li>
            ))}
            {watchlist.length === 0 && (
              <li className="px-2 py-1.5 text-[12px] text-white/40">
                관심 종목이 없습니다.
              </li>
            )}
          </ul>
        )}
      </nav>
    </aside>
  )
}
