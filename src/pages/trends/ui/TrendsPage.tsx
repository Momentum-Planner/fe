import { ChartCard } from './ChartCard'
import { MomentumCard } from './MomentumCard'
import { StabilityCard } from './StabilityCard'
import { RsCard } from './RsCard'
import { RankingList } from './RankingList'

/**
 * 오늘의 추세 — 차트와 목록을 6:4로 나눈다. 목록은 돌파성공/준비를 합친 하나다
 * (레짐을 탭으로 고르지 않는다).
 *
 * 「오늘의 계획」은 원래 여기 우측 탭이었는데 메뉴(`/plans`)로 갈라 나갔다 —
 * 한 메뉴가 탭 둘을 덮는 게 헷갈렸다.
 */
export function TrendsPage() {
  return (
    <main className="flex flex-col gap-4 px-6 pt-6 pb-6">
      <div className="grid grid-cols-[6fr_4fr] items-stretch gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <ChartCard />
          <div className="grid grid-cols-3 gap-4">
            <MomentumCard />
            <StabilityCard />
            <RsCard />
          </div>
        </div>
        <div className="flex min-w-0">
          <RankingList />
        </div>
      </div>
    </main>
  )
}
