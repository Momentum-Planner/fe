import { ChartCard } from './ChartCard'
import { MomentumCard } from './MomentumCard'
import { StabilityCard } from './StabilityCard'
import { RsCard } from './RsCard'
import { RightTabs } from './RightTabs'

/**
 * 메인 — 차트와 랭킹을 6:4로 나눈다. 랭킹은 돌파성공/준비를 합친 하나다
 * (탭으로 고르지 않는다).
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
          <RightTabs />
        </div>
      </div>
    </main>
  )
}
