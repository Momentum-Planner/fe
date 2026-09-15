import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tradeRecordApi } from '../api/tradeRecordApi'
import type { TradeListFilters } from './types'

export const tradeRecordKeys = {
  all: ['tradeRecord'] as const,
  list: (filters: TradeListFilters) =>
    [...tradeRecordKeys.all, 'list', filters] as const,
  stats: (filters: TradeListFilters) =>
    [...tradeRecordKeys.all, 'stats', filters] as const,
}

export function useTradeList(filters: TradeListFilters = {}) {
  return useQuery({
    queryKey: tradeRecordKeys.list(filters),
    queryFn: () => tradeRecordApi.getList(filters),
    select: (res) => res.records,
    placeholderData: keepPreviousData,
  })
}

/**
 * ⑦ 통계.
 *
 * 기간 필터를 걸었다 풀 때 **앞의 값을 들고 있는다** — 화면이 위에서 아래로
 * 층을 이루고 있어서, 빈 응답이 한 번 지나가면 아래 층이 통째로 접혔다 다시
 * 열린다. 계획 싱글의 사슬과 같은 이유다.
 */
export function useTradeStats(filters: TradeListFilters = {}) {
  return useQuery({
    queryKey: tradeRecordKeys.stats(filters),
    queryFn: () => tradeRecordApi.getStats(filters),
    placeholderData: keepPreviousData,
  })
}
