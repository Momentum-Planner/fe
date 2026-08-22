import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  ClipboardList,
  LogOut,
  TrendingUp,
  User,
} from 'lucide-react'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { MomentumLogo } from '@/shared/ui/MomentumLogo'
import { SearchBar } from '@/shared/ui/SearchBar'
import { HoldingMenu } from '@/widgets/HoldingMenu'
import { WatchMenu } from '@/widgets/WatchMenu'
import { AuthModal } from '@/widgets/AuthModal'
import { useAccount, useLogout } from '@/entities/auth'

/** 상단 가로 바 높이. WatchPanel의 sticky 오프셋이 이 값에 맞물린다. */
export const TOPBAR_H = 56

type NavEntry = {
  to: '/trends' | '/captures' | '/stats'
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

/**
 * 메뉴가 셋뿐인 이유 (Q1) — 나머지는 전부 메뉴가 아니다.
 *   오늘의 계획   /trends 우측 탭
 *   보유 중·관심  상단 바 드롭다운
 *   계획 작성     종목 상세에서 시작
 *   거래 기록     계획 카드에서 시작
 *   계획 잇기     계획 카드에서 들어감
 */
const navItems: NavEntry[] = [
  { to: '/trends', label: '랭킹', icon: TrendingUp },
  { to: '/captures', label: '거래 계획', icon: ClipboardList },
  { to: '/stats', label: '거래 통계', icon: BarChart3 },
]

const itemClass =
  'flex items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] text-white/60 transition-colors hover:text-white/90'

/**
 * 세로 사이드바를 대신하는 가로 바 (Q0 = C안).
 * 목록형인 관심 종목은 항목이 세로로 길어 가로 줄에 못 들어가므로
 * WatchMenu(드롭다운)로 접는다.
 */
export function TopBar() {
  const [authOpen, setAuthOpen] = useState(false)

  const { data: account } = useAccount()
  const logout = useLogout()

  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-1 bg-[rgba(0,0,0,0.8)] px-5 backdrop-blur"
      style={{ height: TOPBAR_H }}
    >
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Brand — home button → 랭킹 */}
      <Link to="/trends" className="mr-4 flex items-center gap-2">
        <MomentumLogo size={20} />
        <span className="font-number text-[17px] font-bold tracking-[-0.01em] text-white">
          Momentum
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`${itemClass} [&.active]:bg-white/[0.08] [&.active]:font-bold [&.active]:text-white`}
            activeProps={{ className: 'active' }}
          >
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <SearchBar size="sm" className="w-[280px]" />
        <HoldingMenu />
        <WatchMenu />

        {account?.isLoggedIn ? (
          <div className="flex h-9 items-center gap-1 rounded-full bg-white/[0.06] pr-1 pl-3">
            <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-white">
              <User size={15} strokeWidth={2} />
              {account.nickname ?? '회원'}
            </span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="로그아웃"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={15} strokeWidth={2} />
            </button>
          </div>
        ) : (
          // 흰색 반투명 채움 — 조용하되 강조는 남긴다.
          // 꽉 찬 흰색(bg-white/85)은 바에서 로고보다 밝아 시선을 다 가져갔고,
          // 글자색 #7BA8FF는 토큰에 없는 임의값이었다.
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="flex h-9 items-center rounded-full border border-white/30 bg-white/[0.12] px-4 text-[14px] font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/[0.18]"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  )
}
