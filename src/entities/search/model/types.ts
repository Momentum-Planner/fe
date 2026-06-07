import type { ServerRegime } from '@/shared/lib/snapshots'

export interface StockSearchItem {
  stockCode: string
  stockName: string
  /** 백엔드 현재 구현은 price 를 null 로 반환할 수 있다. */
  price: number | null
  regime: ServerRegime
}

export interface StockSearchResponse {
  stocks: StockSearchItem[]
}
