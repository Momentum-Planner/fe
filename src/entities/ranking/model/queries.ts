import { useQueries, useQuery } from '@tanstack/react-query'
import { rankingApi } from '../api/rankingApi'
import type { RankingItem, Regime } from './types'

export const rankingKeys = {
  all: ['ranking'] as const,
  byRegime: (regime: Regime) => [...rankingKeys.all, regime] as const,
}

const MERGED_REGIMES: Regime[] = ['success', 'ready']

/**
 * 펀더멘털 순. 랭킹 화면이 쓰는 유일한 정렬이다 (①-2).
 *
 * **모멘텀·FIP 를 안 쓴다.** 옛 순위 기준이라 Q6 에서 화면에서는 걷어냈는데
 * 정렬의 2·3차 기준으로는 남아 있었다 — 화면은 「펀더멘털 순위」라고 쓰고
 * 실제로는 모멘텀이 1위와 2위를 갈랐다.
 *
 * 동점은 **펀더멘털 안에서만** 가른다. 점수가 세 축을 하나로 더해 버려서
 * 값이 스무 칸도 안 나오고, 그래서 동점은 예외가 아니라 기본이다 (Q7 미결).
 *
 *   ① 점수          0~7
 *   ② 동반 개수      EPS·매출·마진 중 함께 오른 수 — 책 C §4 코드 33 에 가까운 쪽
 *   ③ EPS 증가율     수준의 원값
 *
 * 값이 없는 행(백엔드 미구현)은 각 단계에서 뒤로 민다.
 */
type Sortable = {
  fundamentalScore?: number | null
  up?: { eps: boolean; revenue: boolean; margin: boolean } | null
  epsGrowth?: number | null
}

export function sortRanking<T extends Sortable>(items: T[]): T[] {
  const score = (x: T) => x.fundamentalScore ?? -1
  const together = (x: T) =>
    x.up ? Number(x.up.eps) + Number(x.up.revenue) + Number(x.up.margin) : -1
  const eps = (x: T) => x.epsGrowth ?? -Infinity

  return [...items].sort(
    (a, b) =>
      score(b) - score(a) || together(b) - together(a) || eps(b) - eps(a),
  )
}

/** 같은 종목이 두 레짐에 걸쳐 있으면 하나로 접는다. */
export function dedupeRanking<
  T extends { stockCode: string | null; stockName: string },
>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((r) => {
    const key = r.stockCode ?? r.stockName
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 레짐별 랭킹 조회. `at` 은 queryFn 안에서 매 호출마다 현재 시각으로 계산하므로
 * 캐시 키에는 넣지 않는다(매초 키가 바뀌어 캐시가 무효화되는 것을 방지).
 */
export function useBreakoutRanking(regime: Regime) {
  return useQuery({
    queryKey: rankingKeys.byRegime(regime),
    queryFn: () => rankingApi.getRanking(regime),
    select: (res) => res.stocks,
  })
}

/**
 * 돌파성공 + 돌파준비를 합친 하나의 랭킹.
 * 탭으로 레짐을 고르지 않기로 해서(메인 화면) 둘을 합쳐 모멘텀 순으로 세운다.
 */
export function useMergedRanking() {
  return useQueries({
    queries: MERGED_REGIMES.map((regime) => ({
      queryKey: rankingKeys.byRegime(regime),
      queryFn: () => rankingApi.getRanking(regime),
      select: (res: { stocks: RankingItem[] }) => res.stocks,
    })),
    combine: (results) => ({
      data: sortRanking(dedupeRanking(results.flatMap((r) => r.data ?? []))),
      isLoading: results.some((r) => r.isLoading),
      isError: results.every((r) => r.isError),
    }),
  })
}
