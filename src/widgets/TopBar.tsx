import { Link, useNavigate } from '@tanstack/react-router'
import { ClipboardList, LogOut, TrendingUp, User } from 'lucide-react'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { MomentumLogo } from '@/shared/ui/MomentumLogo'
import { SearchBar } from '@/shared/ui/SearchBar'
import { WatchMenu } from '@/widgets/WatchMenu'
import { AuthModal } from '@/widgets/AuthModal'
import { useAccount, useLogout } from '@/entities/auth'

/** 상단 가로 바 높이. WatchPanel의 sticky 오프셋이 이 값에 맞물린다. */
export const TOPBAR_H = 56

type NavEntry = {
  to: '/trends' | '/plans' | '/stats'
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

/**
 * 「오늘의 계획」을 뺐다 (2026-09-09) — 안 쓰기로 했다.
 * ⚠️ Q3 이 이 줄을 「종목 · 계획 · 거래 기록 · 계좌」로 바꾸기로 했다. 아직 안 옮겼다.
 *
 * **「거래 계획」은 계획 «컬렉션»이다** — 목록을 모아 보는 자리.
 * `/plans/:id` 는 그 자식이 아니라 **종목 세부**다 (2026-09-11). 하이닉스를
 * 누르면 거기로 간다 — 차트·사슬·계획이 한 화면에 있는 그 화면이다.
 *
 * 여전히 메뉴가 아닌 것들:
 *   보유 중·관심  상단 바 드롭다운
 *   계획 작성     사슬의 «빈 자리»에서 시작 (Q8)
 *   거래 기록     거래 계획의 「+ 체결」 · 「+ 체결 기록」 (Q22) — 따로 탭이 없다
 *   계획 잇기     사슬에서 들어감
 */
const navItems: NavEntry[] = [
  // 「스크리너」 로 바꿨다가 되돌렸다 (2026-09-19 사용자) — 스크리너는 «도구» 이름이라 너무 기능적이었다.
  // 후보 · 종목 · 주도주 후보 … 열여덟 안 중 「오늘의 후보」
  { to: '/trends', label: '오늘의 후보', icon: TrendingUp },
  // 이 서비스의 집이다 (Q22) — 종목별 사슬 · 체결도 여기서 붙인다
  { to: '/plans', label: '거래 계획', icon: ClipboardList },
  // 「거래 통계」 는 마이페이지(닉네임 칩) 로 옮겼다 (2026-09-19)
]

// 글자 크기는 폭 따라 줄이지 않는다 (4장 ⑦ 가) — clamp(12.5~14) 가 1170px 아래에서 헤더를 «줄어든» 것처럼 보이게 했다
const itemClass =
  'flex shrink-0 items-center gap-2 rounded-[10px] px-2 py-2 text-[14px] min-[360px]:px-3 whitespace-nowrap text-white/60 transition-colors hover:text-white/90'

/**
 * 세로 사이드바를 대신하는 가로 바 (Q0 = C안).
 * 목록형인 관심 종목은 항목이 세로로 길어 가로 줄에 못 들어가므로
 * WatchMenu(드롭다운)로 접는다.
 */
export function TopBar() {
  const [authOpen, setAuthOpen] = useState(false)

  const { data: account } = useAccount()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-1 bg-[rgba(0,0,0,0.8)] px-5 backdrop-blur"
      style={{ height: TOPBAR_H }}
    >
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Brand — home button → 오늘의 후보 */}
      <Link
        to="/trends"
        aria-label="Momentum Planner — 오늘의 후보"
        className="mr-4 flex shrink-0 items-center gap-2"
      >
        {/* 두 줄 글자 높이(약 27px)에 맞춰 로고 20 → 28 */}
        <MomentumLogo size={28} />
        {/* 500px 미만에서 로고 글자를 뺀다 — 메뉴 글자보다 먼저 빠진다 (2026-09-19 · 440 에선 헤더가 41px 넘쳤다 · 「오늘의 후보」 로 되돌려 26px 길어져 484 → 500)
            「Momentum」 → 「Momentum / PLANNER」 두 줄 (2026-09-19 사용자 · Plan → Planner → 쌓기).
            Planner 가 길어 한 줄이면 198px — 쌓으면 Momentum 한 단어 폭. 회색 글씨 ✕ */}
        <span className="font-number hidden flex-col leading-[1.05] whitespace-nowrap text-white min-[500px]:flex">
          <span className="text-[15px] font-bold tracking-[-0.01em]">
            Momentum
          </span>
          <span className="text-[10px] font-semibold tracking-[0.24em]">
            PLANNER
          </span>
        </span>
      </Link>

      <nav className="flex shrink-0 items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={`${itemClass} [&.active]:bg-white/[0.08] [&.active]:font-bold [&.active]:text-white`}
            activeProps={{ className: 'active' }}
            /**
             * ⚠️ **정확히 그 주소일 때만 켜진다.**
             *
             * 기본값은 앞부분만 맞아도 켜져서, `/plans/12`(종목 세부)에 있을 때
             * 「거래 계획」이 흰색으로 섰다. 그 화면은 **컬렉션의 자식이 아니라
             * 다른 화면**이다 — 라우트 파일 이름의 밑줄(`plans_.$planId`)이
             * 이미 그 뜻이었는데 내비만 모르고 있었다.
             */
            activeOptions={{ exact: true, includeSearch: false }}
          >
            {/* 아이콘 + 글자 둘 다 (2026-09-19 사용자) — 메뉴가 둘뿐이라 좁아도 들어간다.
                아이콘만 남기면 두 아이콘이 무엇인지 눌러 봐야 알았다 */}
            {/* 410px 미만에선 아이콘을 뺀다 — 375 에서 넘쳤다 */}
            <span className="hidden min-[410px]:block">
              <Icon size={17} strokeWidth={2} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/*
        무리 셋을 gap으로 가른다 — 성격이 다른 것이 균등 간격이면 한 덩어리로 보인다.
        검색(전체 탐색) · 관심(내 목록) · 계정(나)
      */}
      <div className="ml-auto flex min-w-0 items-center gap-3 lg:gap-5">
        {/* 폭이 모자라면 여기가 줄어든다 — 검색어 칸은 좁아져도 읽히지만
            로그인·메뉴는 글자가 접히면 못 읽는다 */}
        {/* 좁으면(md 미만) 검색칸을 감춘다 — 거래 계획 · 후보에 저마다 찾기가 있다 */}
        {/* 검색칸은 남는 폭만큼 — 160 ~ 280 (4장 ⑦ 가 · 2026-09-19).
            💀 안쪽이 280 고정이고 감싼 칸만 줄어 800px 에서 「관심」 밑으로 파고들었다 */}
        <div className="hidden w-[280px] min-w-[160px] md:block">
          <SearchBar size="sm" className="w-full" />
        </div>

        {/* 「보유 중」 드롭다운은 Q4 에서 뺐다 — 보유 목록은 계좌에 붙는다.
            관심만 남는다 (Q0 이 「가로를 안 먹고 모든 화면에서 같은 자리」로 고른 것) */}
        <div className="flex shrink-0 items-center gap-1">
          <WatchMenu />
        </div>

        {account?.isLoggedIn ? (
          <div className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] pr-3 pl-3 min-[360px]:pr-1">
            {/* 닉네임 칩이 마이페이지로 간다 (Q5) */}
            <Link
              to="/profile"
              aria-label="마이페이지"
              className="flex items-center gap-1.5 truncate text-[13px] font-semibold whitespace-nowrap text-white hover:text-white/80"
            >
              <User size={15} strokeWidth={2} />
              <span className="hidden sm:inline">
                {account.nickname ?? '회원'}
              </span>
            </Link>
            <button
              type="button"
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => void navigate({ to: '/trends' }),
                })
              }
              disabled={logout.isPending}
              aria-label="로그아웃"
              // 360px 미만에선 뺀다 — 320 에서 상단 바가 20px 넘쳤다. 로그아웃은 마이페이지 머리에도 있다 (2026-09-19 사용자 · 가)
              className="hidden h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white min-[360px]:flex"
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
            className="flex h-9 shrink-0 items-center rounded-full border border-white/30 bg-white/[0.12] px-4 text-[14px] font-semibold whitespace-nowrap text-white transition-colors hover:border-white/45 hover:bg-white/[0.18]"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  )
}
