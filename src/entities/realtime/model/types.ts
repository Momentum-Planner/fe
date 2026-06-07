/** 실시간 랭킹 레짐 (돌파 성공/준비). */
export type RealtimeRegime = 'success' | 'ready'

/** SSE ranking-update 이벤트 1건. (RealtimeBreakout*Item) */
export interface RealtimeRankingItem {
  stockName: string
  stockCode: string
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
}

/** SSE tick 이벤트. (TickResponse) */
export interface TickEvent {
  stockCode: string
  currentPrice: number
}
