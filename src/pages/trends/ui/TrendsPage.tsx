import { useNavigate } from '@tanstack/react-router'
import { useMergedRanking } from '@/entities/ranking'
import { ChartCard } from './ChartCard'
import { EpsCard, MarginCard, RevenueCard } from './FundamentalCards'
import { RankingList } from './RankingList'

/**
 * 오늘의 후보 — 차트와 목록을 6:4로 나눈다. 목록은 돌파성공/준비를 합친 하나다
 * (레짐을 탭으로 고르지 않는다).
 *
 * **목록이 고르고, 차트 · 카드가 따라온다** (2026-09-19 · Q23 · 4장 ① 가).
 * 이 화면의 일은 「어느 후보부터 볼까」다 — 목록이 고르는 자리이고 차트와 카드 셋은
 * 고른 종목의 근거다. 처음엔 1위. 고른 종목은 `?code=` 에 둔다(새로고침 · 뒤로 가기).
 * 💀 전에는 차트 · 카드가 SK하이닉스 고정 상수였다 — 가장 큰 자리가 목록과 상관없는 종목을 보였다.
 *
 * 목록 높이는 왼쪽(차트 + 카드)에 맞추고 넘치는 줄은 목록 안에서 넘긴다 —
 * 1440×900 에서 왼쪽 862px · 목록 1093px 로 231px 어긋났다.
 *
 * 차트 밑 카드 셋은 **모멘텀 · 흐름 안정도 · RS** 였는데 **EPS · 매출 · 마진**으로
 * 갈아끼웠다 (Q6).
 */
export function TrendsPage({ code }: { code?: string }) {
  const { data: items } = useMergedRanking()
  const navigate = useNavigate()
  const selected = items.find((r) => r.stockCode === code) ?? items[0] ?? null

  const select = (next: string) =>
    void navigate({
      to: '/trends',
      search: { code: next },
      replace: true,
      resetScroll: false,
    })

  return (
    // 넓으면 화면 높이를 채운다 — 판이 770px 에 멈춰 1920×1080 · 2560×1300 에서 아래가 비었다 (2026-09-19 사용자).
    // 56 = 상단 바. 늘어난 만큼은 차트가 먹는다(카드 셋은 260 고정). 900 이하에선 지금 크기 그대로
    <main className="flex flex-col gap-4 px-6 pt-6 pb-6 lg:min-h-[calc(100dvh-56px)]">
      {/* 좁으면(lg 미만) 위아래로 — 옆에 두면 랭킹이 40% 폭으로 눌려 가격 · 이름이 꺾였다 (2026-09-19) */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:flex-1 lg:grid-cols-[6fr_4fr]">
        {/* 고른 종목의 근거가 한 판 — 차트와 카드 셋을 한 카드 면에 (4장 ④ 가 · 공통 영역).
            💀 차트 · 카드 셋 · 목록 다섯이 모두 16px 씩 떨어져 어느 것도 묶여 보이지 않았다.
            카드 셋은 판 안의 칸 — 바깥 8 + 칸 안쪽 12 = 20 이라 차트 이름과 한 세로선 (③) */}
        <section className="card flex min-w-0 flex-col">
          <ChartCard stock={selected} />
          <div className="grid grid-cols-1 gap-2 p-2 pt-0 sm:grid-cols-3">
            {/* 순서가 곧 계산 순서다 — 매출 × 마진 = 순이익, ÷ 주식 수 = EPS */}
            <RevenueCard quarters={selected?.quarters ?? null} />
            <MarginCard quarters={selected?.quarters ?? null} />
            <EpsCard quarters={selected?.quarters ?? null} />
          </div>
        </section>
        {/* 넓으면 왼쪽 높이를 따른다 — 목록을 absolute 로 띄워 행 높이 계산에서 뺀다 */}
        <div className="relative flex min-h-[480px] min-w-0">
          <div className="flex min-w-0 flex-1 lg:absolute lg:inset-0">
            <RankingList
              selected={selected?.stockCode ?? null}
              onSelect={select}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
