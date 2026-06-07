import { useState } from 'react'
import { SearchBar } from '@/shared/ui/SearchBar'
import { UnderlineTabs } from '@/shared/ui/UnderlineTabs'
import type { UnderlineTab } from '@/shared/ui/UnderlineTabs'
import { ChartCard } from './ChartCard'
import { MomentumCard } from './MomentumCard'
import { StabilityCard } from './StabilityCard'
import { RsCard } from './RsCard'
import { RankingList } from './RankingList'
import type { Regime } from '@/entities/ranking'

/** 돌파 성공 — rising line with an arrowhead. */
function BreakoutSuccessIcon() {
  return (
    <svg
      width="20"
      height="16"
      viewBox="-1 -1 32 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path d="M2 15 L7 14 L10 12 L13 8 L17 4 L23 1" />
      <path d="M18 3 L23 0.5 L24 6" />
    </svg>
  )
}

/** 돌파 준비 — flatter line with a gentle uptick. */
function BreakoutPrepIcon() {
  return (
    <svg
      width="20"
      height="16"
      viewBox="-1 -1 32 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path d="M2 8 L6 9 L10 7 L14 8 L18 6 L22 7" />
      <path d="M18 3 L22 6 L23 11" />
    </svg>
  )
}

const tabs: UnderlineTab[] = [
  {
    id: 'success',
    label: '돌파 성공',
    count: 24,
    icon: <BreakoutSuccessIcon />,
  },
  {
    id: 'prep',
    label: '돌파 준비',
    count: 12,
    icon: <BreakoutPrepIcon />,
    activeColor: '#F46B1A',
  },
]

/** 탭 id('success' | 'prep') → 백엔드 레짐('success' | 'ready') 매핑. */
const TAB_TO_REGIME: Record<string, Regime> = {
  success: 'success',
  prep: 'ready',
}

export function TrendsPage() {
  const [activeTab, setActiveTab] = useState('success')
  const regime = TAB_TO_REGIME[activeTab] ?? 'success'

  return (
    <main className="flex flex-col gap-4 pt-9 pr-6 pb-6 pl-2">
      <header className="grid grid-cols-[minmax(0,1fr)_616px] items-center gap-4">
        <SearchBar />
        <UnderlineTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_616px] items-stretch gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <ChartCard />
          <div className="grid grid-cols-3 gap-4">
            <MomentumCard />
            <StabilityCard />
            <RsCard />
          </div>
        </div>
        <div className="flex">
          <RankingList regime={regime} />
        </div>
      </div>
    </main>
  )
}
