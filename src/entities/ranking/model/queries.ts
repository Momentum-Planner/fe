import { useQueries, useQuery } from '@tanstack/react-query'
import { rankingApi } from '../api/rankingApi'
import { sortRanking } from './judge'
import type { RankingItem, Regime } from './types'

export const rankingKeys = {
  all: ['ranking'] as const,
  byRegime: (regime: Regime) => [...rankingKeys.all, regime] as const,
}

const MERGED_REGIMES: Regime[] = ['success', 'ready']

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
