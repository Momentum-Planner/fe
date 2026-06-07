import { api } from '@/shared/api'
import type { StockSearchResponse } from '../model/types'

export const searchApi = {
  searchStocks: (query: string) =>
    api.get<StockSearchResponse>('/api/v1/search/stocks', {
      searchParams: { query },
    }),
}
