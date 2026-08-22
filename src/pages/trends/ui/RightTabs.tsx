import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { useAccount } from '@/entities/auth'
import { RankingList } from './RankingList'

/**
 * /trends 우측 — 성격이 같은 목록이 한 자리를 나눠 쓴다 (Q7+Q3).
 *
 * 기본 탭은 상황이 정하지만 **선택은 언제나 사용자 몫**이다.
 *   로그인 X 또는 활성 계획 0건  → 오늘의 추세
 *   로그인 O · 활성 계획 ≥1건    → 오늘의 계획
 *
 * 💀 기본 탭이 곧 강제다 — 버튼으로 막는 게 아니라 먼저 보이는 것을 바꿔서 민다.
 */

/** 보유 중 · 관심은 상단 바 드롭다운에 있다 — 여기 또 두면 중복이다 (Q7+Q3). */
type TabId = 'rank' | 'plan'

const TABS: { id: TabId; label: string }[] = [
  { id: 'rank', label: '오늘의 추세' },
  { id: 'plan', label: '오늘의 계획' },
]

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 py-10 text-center text-[13px] text-white/40">
      {children}
    </p>
  )
}

export function RightTabs() {
  const { data: account } = useAccount()

  // ⚠️ TradePlan API가 아직 없다. 생기면 활성 계획 수로 바꾼다.
  const activePlanCount = 0
  const defaultTab: TabId =
    account?.isLoggedIn && activePlanCount > 0 ? 'plan' : 'rank'

  const [picked, setPicked] = useState<TabId | null>(null)
  const tab = picked ?? defaultTab

  return (
    <section className="flex h-full w-full min-w-0 flex-col gap-3">
      <nav className="flex items-center gap-5 border-b border-white/10">
        {TABS.map(({ id, label }) => {
          const on = id === tab
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPicked(id)}
              className={cn(
                'relative pb-2.5 text-[14px] transition-colors',
                on
                  ? 'font-bold text-white'
                  : 'text-white/45 hover:text-white/75',
              )}
            >
              {label}
              {on && (
                <span className="bg-brand-red absolute inset-x-0 -bottom-px h-[2px] rounded-[2px]" />
              )}
            </button>
          )
        })}
      </nav>

      {tab === 'rank' && (
        <div className="flex min-h-0 flex-1">
          <RankingList />
        </div>
      )}

      {tab === 'plan' && (
        <div className="card flex min-h-0 flex-1 flex-col px-5 pt-6 pb-3">
          <h3 className="text-[18px] font-bold text-white">오늘의 계획</h3>
          <Empty>
            {account?.isLoggedIn
              ? '오늘 실행할 계획이 없습니다.'
              : '로그인 후 이용할 수 있습니다.'}
          </Empty>
        </div>
      )}
    </section>
  )
}
