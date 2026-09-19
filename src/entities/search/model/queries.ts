import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchApi } from '../api/searchApi'

export const searchKeys = {
  all: ['search'] as const,
  stocks: (query: string) => [...searchKeys.all, 'stocks', query] as const,
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: searchKeys.stocks(query),
    queryFn: () => searchApi.searchStocks(query),
    enabled: query.trim().length > 0,
    // 치는 동안 글자마다 목록이 「불러오는 중」으로 비었다 채워지지 않게 앞 결과를 들고 있는다
    placeholderData: keepPreviousData,
    select: (res) => res.stocks,
  })
}
