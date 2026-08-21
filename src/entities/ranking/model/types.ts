/** 백엔드 RankingV1Dto 와 대응하는 랭킹 도메인 타입. */

/** 오늘의 추세 탭 = 레짐. (돌파 실패 탭은 폐기되어 2개만 제공) */
export type Regime = 'success' | 'ready'

/** 랭킹 1개 종목. 금액/지표는 BigDecimal → number 로 직렬화된다. */
export interface RankingItem {
  stockName: string
  stockCode: string
  /** 조회 시점 기준 최근 체결가. 틱이 없으면 null. */
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
}

export interface RankingResponse {
  stocks: RankingItem[]
}
