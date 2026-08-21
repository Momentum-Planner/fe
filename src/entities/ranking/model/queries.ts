import { useQuery } from '@tanstack/react-query'
import { rankingApi } from '../api/rankingApi'
import type { Regime } from './types'

export const rankingKeys = {
  all: ['ranking'] as const,
  byRegime: (regime: Regime) => [...rankingKeys.all, regime] as const,
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
