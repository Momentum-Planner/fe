/** 백엔드 RankingV1Dto 와 대응하는 랭킹 도메인 타입. */

/** 레짐. 돌파 실패는 폐기되어 둘만 남았고, 화면에서는 둘을 합쳐 하나로 보여준다. */
export type Regime = 'success' | 'ready'

/** 랭킹 1개 종목. 금액/지표는 BigDecimal → number 로 직렬화된다. */
export interface RankingItem {
  stockName: string
  stockCode: string
  /** 조회 시점 기준 최근 체결가. 틱이 없으면 null. */
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
  /**
   * ①-2 의 세 축과 그 합계.
   *
   *   수준  epsGrowth   분기 EPS 증가율 (%)
   *   방향  direction   증가율이 가속 / 유지 / 감속
   *   동반  up          EPS · 매출 · 마진이 함께 오르는가 (각 1점)
   *
   * ⚠️ **백엔드 DTO 에 넷 다 없다** — msw 목만 채운다. 그래서 전부 nullable 이다.
   */
  epsGrowth: number | null
  direction: 'accel' | 'flat' | 'decel' | null
  up: { eps: boolean; revenue: boolean; margin: boolean } | null
  fundamentalScore: number | null
}

export interface RankingResponse {
  stocks: RankingItem[]
}
