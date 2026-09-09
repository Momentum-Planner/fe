import { ChartCard } from './ChartCard'
import { EpsCard, MarginCard, RevenueCard } from './FundamentalCards'
import { RankingList } from './RankingList'

/**
 * 오늘의 후보 — 차트와 목록을 6:4로 나눈다. 목록은 돌파성공/준비를 합친 하나다
 * (레짐을 탭으로 고르지 않는다).
 *
 * 「오늘의 계획」은 원래 여기 우측 탭이었는데 메뉴(`/plans`)로 갈라 나갔다 —
 * 한 메뉴가 탭 둘을 덮는 게 헷갈렸다.
 *
 * 차트 밑 카드 셋은 **모멘텀 · 흐름 안정도 · RS** 였는데 **EPS · 매출 · 마진**으로
 * 갈아끼웠다 (Q6). 앞의 셋은 옛 순위 기준(모멘텀 → FIP 순)의 잔재였다 —
 * 순위 기준이 펀더멘털 점수로 바뀌었는데 그 설명이 안 따라왔던 것이다.
 */
export function TrendsPage() {
  return (
    <main className="flex flex-col gap-4 px-6 pt-6 pb-6">
      <div className="grid grid-cols-[6fr_4fr] items-stretch gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <ChartCard />
          <div className="grid grid-cols-3 gap-4">
            {/* 순서가 곧 계산 순서다 — 매출 × 마진 = 순이익, ÷ 주식 수 = EPS */}
            <RevenueCard />
            <MarginCard />
            <EpsCard />
          </div>
        </div>
        <div className="flex min-w-0">
          <RankingList />
        </div>
      </div>
    </main>
  )
}
