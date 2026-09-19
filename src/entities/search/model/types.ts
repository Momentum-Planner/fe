import type { EntryState, ServerRegime } from '@/shared/lib/snapshots'

export interface StockSearchItem {
  stockCode: string
  stockName: string
  /** 백엔드 현재 구현은 price 를 null 로 반환할 수 있다. */
  price: number | null
  regime: ServerRegime
  /**
   * 마지막 스크리닝 판정의 진입 상태 (②). 판정이 한 번도 없던 종목은 null.
   * ⚠️ 백엔드 검색 응답에 아직 없다 — 목만 싣는다. 없으면 뱃지 자리가 비는 것으로 끝난다.
   */
  entryState?: EntryState | null
}

export interface StockSearchResponse {
  stocks: StockSearchItem[]
}
