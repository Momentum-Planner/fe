import { useQuery } from '@tanstack/react-query'
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
    select: (res) => res.stocks,
  })
}
